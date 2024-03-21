const fs = require("fs");
let sessionName = "aaaa";
fs.rmSync(`.wwebjs_auth/session-${sessionName}`, {
  recursive: true,
});
