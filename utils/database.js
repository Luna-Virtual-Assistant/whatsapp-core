const sqlite3 = require('sqlite3').verbose();
const { TABLE_NAME } = require('./config');

class SQLiteDB {
  constructor() {
    this.db = null;
  }

  startConnectionDB() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database('database.db', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Cria a tabela se não existir
   */
  async createTable() {
    if (!this.db) await this.startConnectionDB();
    const query = `
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_name TEXT,
        chat_name TEXT,
        chat_id TEXT,
        UNIQUE(session_name, chat_name, chat_id)
      )
    `;
    return new Promise((resolve, reject) => {
      this.db.run(query, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * @param {{ chat_name: string, chat_id: string }[]} chats
   * @param {string} session_name
   */
  async postChats(chats, session_name) {
    if (!this.db) await this.startConnectionDB();
    
    const query = `INSERT OR IGNORE INTO ${TABLE_NAME} (session_name, chat_name, chat_id) VALUES (?, ?, ?)`;
    
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(query);
      
      chats.forEach(chat => {
        stmt.run(session_name, chat.chat_name, chat.chat_id, (err) => {
          if (err) {
            reject(err);
          }
        });
      });

      stmt.finalize((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * @param {string} sessionName
   * @returns {Promise<{ chat_id: string, chat_name: string }[]>}
   */
  async getAllChats(sessionName) {
    if (!this.db) await this.startConnectionDB();

    const query = `SELECT chat_name, chat_id FROM ${TABLE_NAME} WHERE session_name = ?`;

    return new Promise((resolve, reject) => {
      this.db.all(query, [sessionName], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const chats = rows.map(row => ({
            chat_name: row.chat_name,
            chat_id: row.chat_id
          }));
          resolve(chats);
        }
      });
    });
  }
}

module.exports = SQLiteDB;
