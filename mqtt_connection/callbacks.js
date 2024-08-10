const dotenv = require("dotenv");
const mqtt = require("mqtt");

dotenv.config({ override: true });

class MqttHandler {
  constructor() {
    this.mqttClient = null;
    this.host = process.env.HOST || "mqtt://localhost";
    this.port = Number(process.env.PORT) || 1884;
    this.clientName = process.env.CLIENT_NAME || "whatsapp-client";
    this.publisherName = process.env.PUBLISHER_NAME || "whatsapp-publisher";
    this.keepAlive = process.env.KEEP_ALIVE || 60;
  }

  onConnect = () => {
    console.log("Connected to MQTT Broker");
    this.mqttClient.subscribe("/whatsapp", { qos: 0 });
  };

  onMessage = (topic, message) => {
    console.log(`Received message: ${message.toString()} from topic ${topic}`);
  };

  onDuplicatedContacts = (contacts) => {
    const stringifiedContacts = JSON.stringify(contacts);
    console.log(this.mqttClient.publish);
    this.mqttClient.publish("/luna", stringifiedContacts, {
      qos: 0,
      retain: false,
    });
  };

  connect() {
    this.mqttClient = mqtt.connect({
      host: this.host,
      port: this.port,
      clientId: this.clientName,
      protocol: "mqtt",
    });

    this.mqttClient.on("connect", this.onConnect);
    this.mqttClient.on("message", this.onMessage);
  }
}

module.exports = new MqttHandler();
