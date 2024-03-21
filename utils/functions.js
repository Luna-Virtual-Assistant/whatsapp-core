const { SESSIONS_FOLDER } = require("./config");
const { cursor } = require("./connectionDB");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

let client = null;

function verifySessionExists(sessionName, res) {
  if (!fs.existsSync(SESSIONS_FOLDER)) return;
  const arraySessions = fs.readdirSync(SESSIONS_FOLDER);
  if (arraySessions.includes(`session-${sessionName}`)) {
    res.end(JSON.stringify({ res: "This section already exists!" }));
  }
}

function checkToken(req, res, next) {
  const token = req.query.token;
  const expectedToken = process.env.TOKEN;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  if (token !== expectedToken)
    return res.status(403).json({ error: "Forbidden" });
  next();
}

async function startConnectioDB() {
  client = await cursor.connect();
}

/**
 * @param {{chat_name: string, chat_id: string}[]} chats
 * @param {string} table_name
 * @param {string} sessionName
 */
async function postChatsClient(chats, table_name, session_name) {
  const values = chats
    .map(
      (chat) => `('${session_name}', '${chat.chat_name}', '${chat.chat_id}')`
    )
    .join(",");
  try {
    await client.query(
      `INSERT INTO ${table_name} (session_name, chat_name, chat_id) VALUES ${values}`
    );
  } catch (error) {
    throw error;
  }
}

/**
 * @param {string} table_name
 * @param {string} sessionName
 * @returns {{chat_id: string, chat_name: string}[]}
 */
async function getAllChats(table_name, sessionName) {
  /**@type {{id: string, name: string}[]} */
  let arrayChats = [];
  const { rows } = await client.query(
    `SELECT * FROM ${table_name} WHERE session_name = '${sessionName}'`
  );
  rows.forEach((row) => {
    arrayChats.push({
      chat_name: row.chat_name,
      chat_id: row.chat_id,
      session_name: row.session_name,
    });
  });
  return arrayChats;
}

module.exports = {
  verifySessionExists,
  checkToken,
  startConnectioDB,
  postChatsClient,
  getAllChats,
};
