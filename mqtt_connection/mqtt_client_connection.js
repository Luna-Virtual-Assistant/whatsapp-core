const mqtt = require('mqtt');
const { onConnect, onSubscribe, onMessage } = require('./callbacks');

class MqttClientConnection {
    constructor(brokerIp, port, clientName, keepAlive = 60) {
        this._brokerIp = brokerIp;
        this._port = port;
        this._clientName = clientName;
        this._keepAlive = keepAlive;
        this._mqttClient = null;
    }

    startConnection() {
        const mqttClient = mqtt.connect({
            host: this._brokerIp,
            port: this._port,
            clientId: this._clientName,
            keepalive: this._keepAlive
        });

        mqttClient.on('connect', onConnect);
        mqttClient.on('subscribe', onSubscribe);
        mqttClient.on('message', onMessage);

        this._mqttClient = mqttClient;
    }

    endConnection() {
        try {
            if (this._mqttClient) {
                this._mqttClient.end(false, () => {
                    console.log('Disconnected successfully');
                });
            }
            return true;
        } catch (error) {
            console.error('Error while disconnecting:', error);
            return false;
        }
    }
}

module.exports = MqttClientConnection;
