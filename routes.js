const express = require("express");
const fs = require("fs");
const { Worker } = require("node:worker_threads");
const routes = express.Router();
const { verifySessionExists } = require("./utils/functions");
const { SESSIONS_FOLDER } = require("./utils/config");

const arraySessions = fs.readdirSync(SESSIONS_FOLDER);

/**@type {{[_:string]:Worker}} */
const workers = {};

let currentSession = "";

routes.get("/", (req, res) => {
  res.send(JSON.stringify({ message: "Hello, world!" }));
});

routes.get("/connect-session/:sessionName", async (req, res) => {
  const { sessionName } = req.params;
  verifySessionExists(sessionName, res);
  currentSession = sessionName;
  new Promise(() => {
    workers[currentSession] = new Worker("./whatsapp/client.js", {
      argv: [currentSession, res],
    });
  });
});

routes.post("/send-message", async (req, res) => {
  /**@type {{chatName: string, message: string}} */
  const { chatName, message } = req.body;
  if (!chatName || !message) {
    return res.end(
      JSON.stringify({ res: "Missing chatName or message in request body" })
    );
  }
  workers[currentSession].postMessage({
    event: "send-message",
    data: { chatName, message },
  });
  return res.end(JSON.stringify({ res: "Message sent!" }));
});

routes.post("/send-message-by-id", async (req, res) => {
  const { chatId, message } = req.body;
  workers[currentSession].postMessage({ chatId, message, res });
  return res.end(JSON.stringify({ res: "Sending message!" }));
});

(function main() {
  arraySessions.forEach((sessionName) => {
    const name = sessionName.replace("session-", "");
    currentSession = name;
    new Promise(() => {
      workers[name] = new Worker("./whatsapp/client.js", {
        argv: [name, null],
      });
    });
  });
})();

module.exports = { routes };
