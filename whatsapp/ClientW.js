const qrcode = require("qrcode-terminal");
const fuzz = require("fuzzball");
const { getWASocket } = require("./WASocket");
const { WASocket, DisconnectReason } = require("@whiskeysockets/baileys");
const { SESSION_PATH } = require("../utils/config");
const fs = require("fs");
const { getAllChats, postChats } = require("../utils/functions");
const { MqttHandler } = require("../mqtt_connection/callbacks");

class ClientW {
  constructor(sessionName) {
    this.sessionName = sessionName;
    this.sock = null;
    this.chats = [];
    this.mqttClient = new MqttHandler();
  }
  async connectWASocket() {
    this.sock = await getWASocket(this.sessionName);
    const connectionClient = { qrcode: "", code: "" };
    this.sock.ev.on("connection.update", async (update) => {
      const { connection, qr, lastDisconnect } = update;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (connection == "open") {
        console.log(`${this.sessionName} connected!`);
        this.chats = await getAllChats(this.sessionName);
        this.mqttClient.connect();
      }

      if (connection == "close") {
        if (statusCode == 515 || statusCode == DisconnectReason.timedOut)
          return this.connectWASocket();
        return this.deleteSession();
      }
      if (qr && this.sessionName && !this.sock?.authState?.creds?.registered) {
        qrcode.generate(qr, { small: true });
        const code = await this.sock.requestPairingCode(this.sessionName);
        connectionClient.code = code;
        connectionClient.qrcode = qr;
        setTimeout(() => !this.sock.user && this.deleteSession(), 10 * 1000);
      }
    });

    this.sock.ev.on("messaging-history.set", async (data) => {
      const contacts = data.contacts;
      if (!this.chats.length || contacts.length > this.chats.length)
        this.getAllChats(contacts);
    });
    return connectionClient;
  }

  async deleteSession() {
    fs.rmSync(SESSION_PATH + this.sessionName, { recursive: true });
  }

  async getAllChats(chats) {
    try {
      let count = 0;
      chats.map((chat) => {
        const id = chat.id;
        console.log(id);
        let name = chat.name;
        if (!name) name = !chat.name ? chat.notify : `Unknown-${count++}`;
        this.chats.push({ chat_id: id, chat_name: name });
      });
    } catch {
    } finally {
      await postChats(this.chats, this.sessionName);
    }
  }

  async sendMessageByChatName({ chatName, chatId, message }) {
    try {
      if (!this.chats.length) await getAllChats(this.sessionName);
      if (chatId) {
        await this.sock.sendMessage(chatId, { text: message });
        return true;
      }

      /** @type {{chat_id: string, chat_name: string}} */
      const contactsWithPattern = this.chats.filter(
        (chat) => fuzz.ratio(chat.chat_name, chatName) >= 70
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
      console.error(err);
    }
  }
}

module.exports = { ClientW };
