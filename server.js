const express = require("express");
const app = express();
const { PORT } = require("./utils/config");
const { routes } = require("./routes");
const dotenv = require("dotenv");
dotenv.config();

function checkToken(req, res, next) {
  const token = req.query.token;
  const expectedToken = process.env.TOKEN;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  if (token !== expectedToken)
    return res.status(403).json({ error: "Forbidden" });
  next();
}

app.use((req, res, next) => {
  const origin = req.headers.origin || "*";

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  next();
});

app.use(checkToken);

app.use(express.json());

app.use((req, res, next) => {
  const parsedURL = new URL(req.url, `http://${req.headers.host}`);
  req.parsedURL = parsedURL;
  next();
});

app.use(routes);

app.all("*", (req, res) => {
  return res.status(404).json({ error: "Not Found" });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
