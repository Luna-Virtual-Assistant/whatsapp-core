const qrcode = require("qrcode-terminal");
const fuzz = require("fuzzball");
const { getWASocket } = require("./WASocket");
const {
  WASocket,
  GroupMetadata,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

/**@type {WASocket} */
let sock;

/**
 * @type {{id: string, name: string}[]}
 */
let allChats = [];

/**
 * @param {string} chatName
 * @param {string} message
 * @returns {Promise<boolean>}
 */
async function sendMessageByChatName(chatName, message) {
  if (!allChats.length) getParticipatingGroups(sock);
  /** @type {{id: string, name: string}} */
  let chatToSend;
  allChats.forEach((chat) => {
    if (fuzz.ratio(chat.name, chatName) >= 95) {
      chatToSend = chat;
    }
  });
  if (!chatToSend) return false;
  chatToSend = await sock.groupMetadata(chatToSend.id);
  await sock.sendMessage(chatToSend.id, { text: message });
}

/**
 * @param {WASocket} session
 */
async function getParticipatingGroups(session) {
  const allChatsParticipanting = await session.groupFetchAllParticipating();
  allChats = Object.entries(allChatsParticipanting).map(([id, group]) => ({
    id,
    name: group.subject,
  }));
}

async function connectWASocket() {
  if (sock) return;
  sock = await getWASocket("session-teste");

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    if (connection == "open") {
      getParticipatingGroups(sock);
      console.log("Connected to WhatsApp");
    }

    if (connection == "close") {
      if (statusCode == 515 || statusCode == DisconnectReason.timedOut)
        return connectWASocket();
      console.log("Disconnected from WhatsApp");
    }

    if (qr) {
      qrcode.generate(qr, { small: true });
    }
  });
}

module.exports = { connectWASocket, sendMessageByChatName };
