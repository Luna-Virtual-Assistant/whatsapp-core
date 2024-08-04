const mqtt = require("mqtt");
const dotenv = require("dotenv");

dotenv.config();

const mqttClient = mqtt.connect({
  host: process.env.HOST,
  port: parseInt(process.env.PORT),
  clientId: process.env.PUBLISHER_NAME,
});

mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker");
});

function publish(text) {
  console.log(
    `[${new Date().toISOString()}] publishing to ${process.env.RES_TOPIC}`
  );
  mqttClient.publish(process.env.RES_TOPIC, text);
}

module.exports = { publish };
