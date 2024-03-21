const { Pool } = require('pg');
const dotenv = require("dotenv");
dotenv.config();

const USER = process.env.BD_USER;
const PASSWORD = process.env.BD_PASSWORD;
const HOST = process.env.BD_HOST;
const PORT = process.env.BD_PORT;
const NAME = process.env.BD_NAME;

const cursor = new Pool({
  user: USER,
  host: HOST,
  database: NAME,
  password: PASSWORD,
  port: PORT,
});

module.exports = {cursor};
