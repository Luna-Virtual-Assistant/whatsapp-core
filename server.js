const express = require("express");
const app = express();
const { PORT } = require("./utils/config");
const { routes } = require("./routes");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { createTable } = require("./utils/functions");

dotenv.config();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Whatsapp API",
      version: "1.0.0",
      description:
        'APIs direcionadas para o whatsapp ultilizando a biblioteca <a href="https://github.com/WhiskeySockets/Baileys">Baileys</a>',
    },
  },
  apis: ["routes.js"],
};

const specs = swaggerJsdoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

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
  createTable()
  console.log(`Server running in: http://localhost:${PORT}`);
});
