const {
  useMultiFileAuthState,
  default: makeWASocket,
  Browsers,
} = require("@whiskeysockets/baileys");
const { default: pino } = require("pino");
const { SESSION_PATH } = require(".././utils/config");

const LINK_PREVIEW_TIMEOUT = 1000 * 30;

async function getWASocket(path) {
  const { state, saveCreds } = await useMultiFileAuthState(
    `${SESSION_PATH}/${path}`
  );
  const WASock = makeWASocket({
    auth: state,
    options: {
      timeout: LINK_PREVIEW_TIMEOUT,
    },
    browser: Browsers.macOS("Desktop"),
    syncFullHistory: false,
    logger: pino({ level: "fatal" }),
    linkPreviewImageThumbnailWidth: 852,
    generateHighQualityLinkPreview: true,
    defaultQueryTimeoutMs: undefined,
  });

  WASock.ev.on("creds.update", saveCreds);

  return WASock;
}

module.exports = {
  getWASocket,
};
