const {SESSIONS_FOLDER} = require("./config");
const fs = require("fs");
const dotenv = require('dotenv');
dotenv.config();

function verifySessionExists(sessionName, res) {
  if (!fs.existsSync(SESSIONS_FOLDER)) return;
  const arraySessions = fs.readdirSync(SESSIONS_FOLDER);
  if (arraySessions.includes(`session-${sessionName}`)) {
    res.end(JSON.stringify({res: "This section already exists!"}));
  }
}

function checkToken(req, res, next) {
  const token = req.query.token;
  const expectedToken = process.env.TOKEN;
  if (!token) return res.status(401).json({error: 'Unauthorized'});
  if (token !== expectedToken) return res.status(403).json({error: 'Forbidden'});
  next();
}

module.exports = {verifySessionExists, checkToken};
