const dotenv = require("dotenv");
const MqttClientConnection = require("./mqtt_client_connection");

dotenv.config({ override: true });

function start() {
  const mqttClient = new MqttClientConnection(
    process.env.HOST,
    parseInt(process.env.PORT),
    process.env.CLIENT_NAME,
    parseInt(process.env.KEEP_ALIVE)
  );

  mqttClient.startConnection();

  process.on("SIGINT", () => {
    mqttClient.endConnection();
    process.exit();
  });

  setInterval(() => {}, 1);
}

start();
