const { SESSIONS_FOLDER } = require("./config");
const fs = require("fs");

function verifySessionExists(sessionName, res) {
  if (!fs.existsSync(SESSIONS_FOLDER)) return;
  const arraySessions = fs.readdirSync(SESSIONS_FOLDER);
  if (arraySessions.includes(`session-${sessionName}`)) {
    res.end(JSON.stringify({ res: "This section already exists!" }));
  }
}

module.exports = { verifySessionExists };
