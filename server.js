const express = require("express");
const app = express();
const { PORT } = require("./utils/config");
const { routes } = require("./routes");
const { checkToken, startConnectioDB } = require("./utils/functions");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Whatsapp API",
      version: "1.0.0",
      description:
        'APIs direcionadas para o whatsapp ultilizando a biblioteca <a href="https://docs.wwebjs.dev/">whatsapp-web.js</a>',
    },
  },
  apis: ["routes.js"],
};

const specs = swaggerJsdoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use(checkToken);
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
  startConnectioDB();
  console.log(`Servidor rodando na porta ${PORT}`);
});
