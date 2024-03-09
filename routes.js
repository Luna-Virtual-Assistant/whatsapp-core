const express = require("express");
const routes = express.Router();
const {
  connectWASocket,
  sendMessageByChatName,
} = require("./whatsapp/session");

routes.get("/", (req, res) => {
  res.send(JSON.stringify({ message: "Hello, world!" }));
});

routes.get("/connect-session", async (req, res) => {
  await connectWASocket();
  res.send(JSON.stringify({ res: "Connecting to WhatsApp!" }));
});

routes.post("/send-message", async (req, res) => {
  const { chatName, message } = req.body;
  if (!chatName || !message) {
    return res.end(
      JSON.stringify({ res: "Missing chatName or message in request body" })
    );
  }
  await sendMessageByChatName(chatName, message);
  return res.end(JSON.stringify({ res: "Sending message!" }));
});

module.exports = { routes };
