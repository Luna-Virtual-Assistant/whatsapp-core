const WAWebJS = require("whatsapp-web.js");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fuzz = require("fuzzball");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const {
  HEADLEES_BROWSER,
  JSON_FOLDER,
  GROUPS_IDS,
  SESSIONS_FOLDER,
  TIME_TO_DELETE_SESSION,
} = require("../utils/config");

let numberClient;

/** @type {{[_:string]: Client}} */
const sessions = {};

/**@type {WAWebJS.Chat[]} */
let allChats;

/**@type {string} */
let sessionName;

async function connectClient(name, res) {
  sessionName = name;
  let sessionConnected = false;
  let count = TIME_TO_DELETE_SESSION;

  if (!sessions[sessionName]) sessions[sessionName] = {};
  const client = new Client({
    webVersionCache: {
      type: "remote",
      remotePath:
        "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html",
    },
    puppeteer: {
      headless: HEADLEES_BROWSER,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    },
    authStrategy: new LocalAuth({ clientId: sessionName }),
  });

  client.initialize();

  client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
    res.send(JSON.stringify({ qr }));
  });

  sessions[sessionName] = client;

  const interval = setInterval(() => {
    if (!count && !sessionConnected) {
      sessions[sessionName].destroy();
      fs.rmSync(`${SESSIONS_FOLDER}/session-${sessionName}`, {
        recursive: true,
      });
      delete sessions[sessionName];
      clearInterval(interval);
    }
    count--;
  }, 1000);

  client.on("ready", async () => {
    numberClient = client.info.wid.user;
    sessionConnected = true;
    console.log("Client is ready!");
    if (!fs.existsSync(JSON_FOLDER)) {
      fs.mkdirSync(JSON_FOLDER, { recursive: true });
      fs.writeFileSync(JSON_FOLDER + GROUPS_IDS, JSON.stringify([]));
    }
    allChats = JSON.parse(fs.readFileSync(JSON_FOLDER + GROUPS_IDS));
    if (!allChats || !allChats.length) return await saveGroupsIds();
  });
}

/**
 * @param {string} chatName
 * @param {string} message */
async function sendMessageByChatName(chatName, message, res) {
  let chatToSend;
  allChats.forEach((chat) => {
    if (fuzz.ratio(chat.name.toLowerCase(), chatName) >= 95) {
      chatToSend = chat;
    }
  });
  if (!chatToSend) return res.end(JSON.stringify({ res: "Chat not found" }));
  const chat = await sessions[sessionName].getChatById(chatToSend.id);
  await chat.sendMessage(message);
}

async function saveGroupsIds() {
  allChats = await sessions[sessionName].getChats();
  allChats = allChats.map((group) => {
    return { id: group.id._serialized, name: group.name };
  });
  fs.writeFileSync(JSON_FOLDER + GROUPS_IDS, JSON.stringify(allChats));
}

/**
 * @param {string} chatId
 * @param {string} message
 */
async function sendMessageByChatId(chatId, message) {
  const chat = await sessions[sessionName].getChatById(chatId);
  await chat.sendMessage(message);
}

module.exports = { connectClient, sendMessageByChatName, sendMessageByChatId };
