const express = require("express");
const routes = express.Router();
const {
  connectClient,
  sendMessageByChatName,
  sendMessageByChatId,
} = require("./whatsapp/client");
const { verifySessionExists } = require("./utils/functions");

/**
 * @swagger
 * tags:
 *   name: WhatsApp APIs
 *   description: Endpoints para o WhatsApp
 */

/**
 * @swagger
 * /connect-session/{sessionName}:
 *  get:
 *     summary: Connect session by session name
 *     tags: [Client]
 *     parameters:
 *         - in: path
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
 *         description: Returns a message if the client already exists, if it does not exist return the qr code
 */
routes.get("/connect-session/:sessionName", async (req, res) => {
  const { sessionName } = req.params;
  verifySessionExists(sessionName, res);
  return await connectClient(sessionName, res);
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
  /**@type {{chatName: string, message: string}} */
  const { chatName, message } = req.body;
  if (!chatName || !message) {
    return res.end(
      JSON.stringify({ res: "Missing chatName or message in request body" })
    );
  }
  await sendMessageByChatName(chatName.toLowerCase(), message, res);
  return res.end(JSON.stringify({ res: "Message sent!" }));
});

/**
 * @swagger
 * /send-message-by-id/:
 *   post:
 *     summary: Send message by chat id
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
 *               chatId:
 *                 type: number
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: returns satus sending
 */
routes.post("/send-message-by-id", async (req, res) => {
  const { chatId, message } = req.body;
  await sendMessageByChatId(chatId, message, res);
  return res.end(JSON.stringify({ res: "Sending message!" }));
});

module.exports = { routes };
