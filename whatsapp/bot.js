const qrcode = require("qrcode-terminal");
const fuzz = require("fuzzball");
const { getWASocket } = require("./WASocket");
const { WASocket, DisconnectReason } = require("@whiskeysockets/baileys");
const { SESSION_PATH } = require("../utils/config");
const fs = require("fs");
const { getAllChats, postChats } = require("../utils/functions");

const mqttClient = require("../mqtt_connection/callbacks");

mqttClient.connect();

const SESSION_NAME = process.argv[2];

/**@type {WASocket} */
let sock;

/**
 * @type {{chat_id: string, chat_name: string}[]}
 */
let allChats = [];

/**
 * @param {string} chatName
 * @param {string} chatId
 * @param {string} message
 * @returns {Promise<boolean>}
 */
async function sendMessageByChatName({ chatName, chatId, message }) {
  try {
    if (!allChats.length) await getAllChats(SESSION_NAME);

    if (chatId) {
      await sock.sendMessage(chatId, { text: message });
      process.send({
        signal: "any",
        value: { res: "Message sent", status: 200 },
      });
      return;
    }

    /** @type {{chat_id: string, chat_name: string}} */
    const contactsWithPattern = allChats.filter(
      (chat) => fuzz.ratio(chat.chat_name, chatName) >= 70
    );

    if (contactsWithPattern.length === 1) {
      await sock.sendMessage(contactsWithPattern[0].chat_id, { text: message });
      process.send({
        signal: "any",
        value: { res: "Message sent", status: 200 },
      });
    }
    mqttClient.onDuplicatedContacts({ contacts: contactsWithPattern, message });
  } catch (err) {
    console.error(err);
  }
}

async function deleteSession() {
  fs.rmSync(SESSION_PATH + SESSION_NAME, { recursive: true });
  process.exit();
}

/**
 * @param {import("@whiskeysockets/baileys").Contact[]} chats
 */
async function getAllChatsToClient(chats) {
  try {
    let count = 0;
    chats.map((chat) => {
      const id = chat.id;
      console.log(id);
      let name = chat.name;
      if (!name) name = !chat.name ? chat.notify : `Unknown-${count++}`;
      allChats.push({ chat_id: id, chat_name: name });
    });
  } catch {
  } finally {
    await postChats(allChats, SESSION_NAME);
  }
}

async function connectWASocket() {
  sock = await getWASocket(SESSION_NAME);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    if (connection == "open") {
      console.log(`${SESSION_NAME} connected!`);
      allChats = await getAllChats(SESSION_NAME);
    }

    if (connection == "close") {
      if (statusCode == 515 || statusCode == DisconnectReason.timedOut)
        return connectWASocket();
      return deleteSession();
    }
    if (qr && SESSION_NAME && !sock?.authState?.creds?.registered) {
      qrcode.generate(qr, { small: true });
      const code = await sock.requestPairingCode(SESSION_NAME);
      process.send({ signal: "qr-code", value: { qr, code } });
      setTimeout(() => !sock.user && deleteSession(), 50 * 1000);
    }
  });

  sock.ev.on("messaging-history.set", async (data) => {
    const contacts = data.contacts;
    if (!allChats.length || contacts.length > allChats.length)
      getAllChatsToClient(contacts);
  });
}

connectWASocket();

const signals = {
  "send-message-by-chat-name": sendMessageByChatName,
  "get-all-chats": () => {
    if (!allChats.length)
      process.send({
        signal: "any",
        value: { res: "No chats found", status: 404 },
      });
    process.send({ signal: "all-chats", value: allChats });
  },
};

process.on("message", (message) => {
  const { value, signal } = message;
  signals[signal] && signals[signal](value);
});
