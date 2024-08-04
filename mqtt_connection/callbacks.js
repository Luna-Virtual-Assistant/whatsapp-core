const mqtt = require("mqtt");
const dotenv = require("dotenv");
const Core = require("./core").Core;

dotenv.config();

const REQ_TOPIC = process.env.REQ_TOPIC;
const core = new Core();

const client = mqtt.connect("mqtt://broker_address");

client.on("connect", (connack) => {
  if (connack.returnCode === 0) {
    console.log(
      `[${new Date().toISOString()}] ${
        client.options.clientId
      } connected to broker successfully`
    );
    client.subscribe(REQ_TOPIC, (err) => {
      if (err) {
        console.log(`Subscribe error: ${err}`);
      }
    });
  } else {
    console.log(`Connection failed with code ${connack.returnCode}`);
  }
});

client.on("subscribe", (topic, granted) => {
  console.log(
    `[${new Date().toISOString()}] ${
      client.options.clientId
    } subscribed to topic with granted QOS ${granted[0].qos} on ${REQ_TOPIC}`
  );
});

client.on("message", (topic, message) => {
  console.log(
    `[${new Date().toISOString()}] Received a message on topic ${topic}`
  );
  const messagePayload = message.toString();
  const videoTitle = messagePayload.split(" ").slice(1).join(" ");
  core.playVideo(videoTitle);
  console.log(
    `[${new Date().toISOString()}] Message payload: ${messagePayload}`
  );
});
