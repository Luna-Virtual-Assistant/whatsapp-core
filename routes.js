const express = require("express");
const routes = express.Router();
const {
  connectClient,
  sendMessageByChatName,
  sendMessageByChatId,
} = require("./whatsapp/client");
const { verifySessionExists } = require("./utils/functions");

routes.get("/", (req, res) => {
  res.send(JSON.stringify({ message: "Hello, world!" }));
});

routes.get("/connect-session/:sessionName", async (req, res) => {
  const { sessionName } = req.params;
  verifySessionExists(sessionName, res);
  return await connectClient(sessionName, res);
});

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

routes.post("/send-message-by-id", async (req, res) => {
  const { chatId, message } = req.body;
  await sendMessageByChatId(chatId, message, res);
  return res.end(JSON.stringify({ res: "Sending message!" }));
});

module.exports = { routes };
