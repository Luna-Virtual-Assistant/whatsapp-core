const express = require("express");
const routes = express.Router();
const { ClientW } = require("./whatsapp/ClientW");
const fs = require("fs");
const { SESSION_PATH } = require("./utils/config");

/**@type {{[_:string]: ClientW}} */
const workers = {};

let sessionName = "";

/**
 * @swagger
 * tags:
 *   name: WhatsApp APIs
 *   description: Endpoints para o WhatsApp
 */

/**
 * @swagger
 * /new-session:
 *  get:
 *     summary: Connect session by session name
 *     tags: [Client]
 *     parameters:
 *         - in: query
 *           name: sessionName
 *           required: true
 *           description: session name
 *           schema:
 *             type: string
 *         - in: query
 *           name: token
 *           required: true
 *           description: token autentication
 *           schema:
 *             type: string
 *     responses:
 *       200:
 *         description: Returns qr code and code to connection
 *       400:
 *         Missing sessionName in query
 */
routes.get("/new-session", async (req, res) => {
  if (!req.query.sessionName) {
    return res
      .status(400)
      .end(JSON.stringify({ res: "Missing sessionName in query" }));
  }
  sessionName = req.query.sessionName;
  if (workers[sessionName]) {
    res.statusCode = 400;
    return res
      .status(400)
      .end(JSON.stringify({ res: "Session already exists" }));
  }
  workers[sessionName] = new ClientW(sessionName);
  const qrCode  = await workers[sessionName].connectWASocket();
  if (!qrCode)
    return res
      .status(400)
      .end(JSON.stringify({ res: "Error: Unable to establish connection!" }));

  return res.status(200).end(JSON.stringify({ qrCode }));
});

/**
 * @swagger
 * /send-message:
 *   post:
 *     summary: Send message by chat name
 *     tags: [Message]
 *     parameters:
 *         - in: query
 *           name: token
 *           required: true
 *           description: token autentication
 *           schema:
 *             type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatName:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns status sending
 */
routes.post("/send-message", async (req, res) => {
  const { chatId, chatName, message, sessionName } = req.body;
  if (!message || !sessionName) {
    return res
      .status(400)
      .end(JSON.stringify({ res: "Not all values ​​were provided!" }));
  }
  const status = await workers[sessionName].sendMessageByChatName({
    chatName,
    chatId,
    message,
  });
  if (!status)
    return res.status(400).end(JSON.stringify({ res: "Message not send!" }));
  return res.status(200).end(JSON.stringify({ res: "Message sent!" }));
});

/**
 * @swagger
 * /get-all-chats:
 *  get:
 *     summary: Get all chats
 *     tags: [Chat]
 *     parameters:
 *         - in: query
 *           name: token
 *           required: true
 *           description: token autentication
 *           schema:
 *             type: string
 *     responses:
 *       200:
 *         description: Returns a message if the client already exists, if it does not exist return the qr code
 */
routes.get("/get-all-chats/:sessionName", (req, res) => {
  const { sessionName } = req.params;
  if (!workers[sessionName])
    return res
      .status(404)
      .end(JSON.stringify({ res: "Could not find a session" }));
  const chats = workers[sessionName].chats;
  return res.status(200).end(JSON.stringify({ count: chats.length, chats }));
});

(function () {
  if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH);
  const allSessions = fs.readdirSync(SESSION_PATH);
  allSessions.forEach((folder) => {
    sessionName = folder;
    workers[folder] = new ClientW(folder);
    workers[folder].connectWASocket();
  });
})();

module.exports = { routes };
