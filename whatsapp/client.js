const WAWebJS = require("whatsapp-web.js");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fuzz = require("fuzzball");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const { parentPort } = require("worker_threads");
const {
  HEADLEES_BROWSER,
  JSON_FOLDER,
  GROUPS_IDS,
  SESSIONS_FOLDER,
  TIME_TO_DELETE_SESSION,
} = require("../utils/config");

const SESSION_NAME = process.argv[2];
const RESPONSE = process.argv[3];

/** @type {{[_:string]: Client}} */
const sessions = {};

/**@type {WAWebJS.Chat[]} */
let allChats;

/**@type {string} */
let sessionName;

connectClient(SESSION_NAME, RESPONSE);

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
    if (sessionConnected) clearInterval(interval);
    count--;
  }, 1000);

  client.on("ready", async () => {
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
async function sendMessageByChatName({ chatName, message, res }) {
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
async function sendMessageByChatId({ chatId, message, res }) {
  if (!sessions[sessionName])
    return res.end(JSON.stringify({ res: "Session not found" }));
  const chat = await sessions[sessionName].getChatById(chatId);
  await chat.sendMessage(message);
}

const events = {
  "send-message": sendMessageByChatName,
  "send-message-by-id": sendMessageByChatId,
};

parentPort.on("message", async (message) => {
  const { event, data } = message;
  await events[event](data);
});
