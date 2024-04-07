const express = require("express");
const routes = express.Router();
const { Worker } = require("worker_threads");
const fs = require("fs");
const { SESSION_PATH } = require("./utils/config");

/**@type {{[_:string]: Worker}} */
const workers = {};

let sessionName = "";

const listeners = {
  async "qr-code"(value) {
    return value;
  },
  async "all-chats"(value) {
    return value;
  },
  async any(value) {
    return value;
  },
};

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
  workers[sessionName] = new Worker("./whatsapp/bot.js", {
    argv: [sessionName],
  });
  workers[sessionName].on("message", async (message) => {
    const signal = message.signal;
    const value = message.value;
    if (signal == "qr-code") {
      const { qr, code } = await listeners[signal](value);
      return res.status(200).end(
        JSON.stringify({
          qr,
          code,
        })
      );
    }
    listeners[signal](value);
  });
});

routes.post("/send-message", async (req, res) => {
  const { chatName, message } = req.body;
  if (!chatName || !message) {
    return res
      .status(400)
      .end(
        JSON.stringify({ res: "Missing chatName or message in request body" })
      );
  }
  workers[sessionName].postMessage({
    signal: "send-message-by-chat-name",
    value: { chatName, message },
  });
  workers[sessionName].on("message", (message) => {
    const { signal, value } = message;
    if (signal == "any") {
      return res.status(value.status).end(JSON.stringify({ res: value.res }));
    }
  });
});

routes.get("/get-all-chats", (req, res) => {
  workers[sessionName].postMessage({ signal: "get-all-chats", value: 1 });
  workers[sessionName].on("message", (message) => {
    const { signal, value } = message;
    if (signal == "all-chats") {
      return res
        .status(200)
        .end(JSON.stringify({ count: value.length, chats: value }));
    }
    if (signal == "any") {
      return res.status(value.status).end(JSON.stringify({ res: value.res }));
    }
  });
});

(function () {
  if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH);
  const allSessions = fs.readdirSync(SESSION_PATH);
  allSessions.forEach((folder) => {
    sessionName = folder;
    workers[folder] = new Worker("./whatsapp/bot.js", {
      argv: [folder],
    });
  });
})();

module.exports = { routes };
