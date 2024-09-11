const qrcode = require("qrcode-terminal");
const fuzz = require("fuzzball");
const { getWASocket } = require("./WASocket");
const { WASocket, DisconnectReason } = require("@whiskeysockets/baileys");
const { SESSION_PATH } = require("../utils/config");
const fs = require("fs");
const SQLiteDB = require("../utils/database");
const { MqttHandler } = require("../mqtt_connection/callbacks");

class ClientW {
  constructor(sessionName) {
    this.sessionName = sessionName;
    this.sock = null;
    this.chats = [];
    this.mqttClient = new MqttHandler();
    this.database = new SQLiteDB();
  }

  disconectClient() {
    this.sock.end();
  }

  async connectWASocket() {
    this.sock = await getWASocket(this.sessionName);

    return new Promise((resolve, reject) => {
      this.sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        if (connection === "open") {
          console.log(`${this.sessionName} connected!`);
          this.chats = await this.database.getAllChats(this.sessionName);
          this.mqttClient.connect();
        }

        if (connection === "close") {
          if (statusCode === 515 || statusCode === DisconnectReason.timedOut)
            return this.connectWASocket();
        }

        if (qr && this.sessionName) {
          qrcode.generate(qr, { small: true });
          resolve(qr);
          setTimeout(() => {
            if (!this.sock.user) {
              this.disconectClient();
              this.deleteSession();
            }
          }, 50 * 1000);
        }
      });

      this.sock.ev.on("messaging-history.set", async (data) => {
        const contacts = data.contacts;
        if (!this.chats.length || contacts.length > this.chats.length)
          this.getAllChats(contacts);
      });
    });
  }

  async deleteSession() {
    fs.rmSync(SESSION_PATH + this.sessionName, { recursive: true });
  }

  async getAllChats(chats) {
    try {
      let count = 0;
      chats.map((chat) => {
        const id = chat.id;
        let name = chat.name;
        if (!name) name = !chat.name ? chat.notify : `Unknown-${count++}`;
        this.chats.push({ chat_id: id, chat_name: name });
      });
    } catch {
    } finally {
      await this.database.postChats(this.chats, this.sessionName);
    }
  }

  async sendMessageByChatName({ chatName, chatId, message }) {
    try {
      if (!this.chats.length) await this.getAllChats(this.sessionName);
      if (chatId) {
        await this.sock.sendMessage(chatId, { text: message });
        return true;
      }

      /** @type {{chat_id: string, chat_name: string}} */
      const contactsWithPattern = this.chats.filter(
        (chat) => fuzz.ratio(chat.chat_name, chatName) >= 85
      );
      if (contactsWithPattern.length === 1) {
        await this.sock.sendMessage(contactsWithPattern[0].chat_id, {
          text: message,
        });
        return true;
      }
      this.mqttClient.onDuplicatedContacts({
        contacts: contactsWithPattern,
        message,
      });
      return false;
    } catch (err) {
      this.mqttClient.onDuplicatedContacts({
        contacts: contactsWithPattern,
        message,
      });
      console.error(err);
    }
  }
}

module.exports = { ClientW };
