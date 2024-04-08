const qrcode = require("qrcode-terminal");
const fuzz = require("fuzzball");
const { getWASocket } = require("./WASocket");
const { WASocket, DisconnectReason } = require("@whiskeysockets/baileys");
const { parentPort } = require("worker_threads");
const { SESSION_PATH } = require("../utils/config");
const fs = require("fs");
const { getAllChats, postChats } = require("../utils/functions");

const SESSION_NAME = process.argv[2];

/**@type {WASocket} */
let sock;

/**
 * @type {{chat_id: string, chat_name: string}[]}
 */
let allChats = [];

/**
 * @param {string} chatName
 * @param {string} message
 * @returns {Promise<boolean>}
 */
async function sendMessageByChatName({ chatName, message }) {
  try {
    if (!allChats.length) await getAllChats(SESSION_NAME);
    /** @type {{chat_id: string, chat_name: string}} */
    let chatToSend;
    allChats.forEach((chat) => {
      if (fuzz.ratio(chat.chat_name, chatName) >= 95) {
        chatToSend = chat;
      }
    });
    if (!chatToSend)
      return parentPort.postMessage({
        signal: "any",
        value: { res: "Chat not found", status: 404 },
      });
    await sock.sendMessage(chatToSend.chat_id, { text: message });
    parentPort.postMessage({
      signal: "any",
      value: { res: "Message sent", status: 200 },
    });
  } catch {
    parentPort.postMessage({
      signal: "any",
      value: { res: "Error, message not sent", status: 400 },
    });
  }
}
async function deleteSession() {
  fs.rmSync(SESSION_PATH + SESSION_NAME, { recursive: true });
  parentPort.close();
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
      parentPort.postMessage({ signal: "qr-code", value: { qr, code } });
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
      parentPort.postMessage({
        signal: "any",
        value: { res: "No chats found", status: 404 },
      });
    parentPort.postMessage({ signal: "all-chats", value: allChats });
  },
};

parentPort.on("message", (message) => {
  const { value, signal } = message;
  signals[signal] && signals[signal](value);
});
