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
    this.mqttClient.subscribe("/whatsapp/duplicated", { qos: 0 });
  };

  onDuplicatedContacts = (data) => {
    if (this.mqttClient) {
      const stringifiedContacts = JSON.stringify({
        contacts: data.contacts,
        message: data.message,
      });
      this.mqttClient.publish("/luna/duplicated", stringifiedContacts, {
        qos: 0,
        retain: false,
      });
    } else {
      console.error("MQTT client is not initialized.");
    }
  };

  connect() {
    console.log("aqui1");
    this.mqttClient = mqtt.connect({
      host: this.host,
      port: this.port,
      clientId: this.clientName,
      protocol: "mqtt",
    });

    this.mqttClient.on("connect", () => {
      this.onConnect;
    });
    this.mqttClient.on("message", () => {
      this.onMessage;
    });
  }

  disconnect() {
    if (this.mqttClient) {
      this.mqttClient.end();
    } else {
      console.error("MQTT client is not initialized.");
    }
  }
}

module.exports = { MqttHandler };
