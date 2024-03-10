const ALLOWED_ORIGINS = ["*"];
const SESSION_PATH = "session/";
const HEADLEES_BROWSER = true;
const PORT = 7000;
const JSON_FOLDER = "json";
const GROUPS_IDS = "/groups.json";
const SESSIONS_FOLDER = ".wwebjs_auth";
const TIME_TO_DELETE_SESSION = 60;

module.exports = {
  ALLOWED_ORIGINS,
  PORT,
  SESSION_PATH,
  HEADLEES_BROWSER,
  JSON_FOLDER,
  GROUPS_IDS,
  TIME_TO_DELETE_SESSION,
  SESSIONS_FOLDER,
};
