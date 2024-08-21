const { cursor } = require("./connectionDB");
const { TABLE_NAME } = require("./config");

/**@type {import("pg").PoolClient} */
let db = null;

async function startConnectioDB() {
  db = await cursor.connect();
}

/**
 * @param {{chat_name: string, chat_id: string}[]} chats
 * @param {string} sessionName
 */
async function postChats(chats, session_name) {
  if (!db) await startConnectioDB();
  const values = chats
    .map(
      (chat) => `('${session_name}', '${chat.chat_name}', '${chat.chat_id}')`
    )
    .join(",");
  try {
    await db.query(
      `INSERT INTO ${TABLE_NAME} (session_name, chat_name, chat_id) VALUES ${values} ON CONFLICT DO NOTHING`
    );
  } catch (error) {
    throw error;
  }
}

/**
 * @param {string} sessionName
 * @returns {{chat_id: string, chat_name: string}[]}
 */
async function getAllChats(sessionName) {
  if (!db) await startConnectioDB();
  /**@type {{id: string, name: string}[]} */
  let arrayChats = [];
  const { rows } = await db.query(
    `SELECT * FROM ${TABLE_NAME} WHERE session_name = '${sessionName}'`
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

async function createTable() {
  if (!db) await startConnectioDB();
  try {
    await db.query(
      `
      CREATE TABLE IF NOT EXISTS whatsapp_chat_history (
        id serial primary key,
        session_name varchar(200),
        chat_name varchar(200),
        chat_id varchar(200)
      )`
    );
  } catch (error) {
    console.log(error);
  }
}

module.exports = { postChats, getAllChats, createTable };
