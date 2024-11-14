const WebSocket = require('websocket').w3cwebsocket;
const { logger } = require('../utils/logger');
const { loadOrCreateConfig } = require('../utils/configReader');
const dbClient = require('../config/dbConfig');
const protobuf = require('protobufjs');
const path = require('path');

// Load the protobuf schema
const protoPath = path.resolve(__dirname, '../config/yaticker.proto');
const YAHOO_WS_URL = 'wss://streamer.finance.yahoo.com';

// This will hold the decoded protobuf message type
let YatickerMessage;

// Load and parse the protobuf schema
protobuf.load(protoPath, (err, root) => {
    if (err) {
        console.error("Failed to load protobuf schema:", err.message);
        log.error("Failed to load protobuf schema:", err.message);
        return;
    }
    YatickerMessage = root.lookupType('yaticker'); // Adjust based on the message type in your proto file
});


async function streamFinanceData() {
    
    function createWebSocketConnection() {
        try {
            // Load configuration
            const config = loadOrCreateConfig();
            const tickers = config.tickers || [];
            
            if (tickers.length === 0) {
                logger.warn('No tickers configured. Skipping WebSocket connection.');
                return;
            }
            logger.info(`Subscribing to tickers: ${tickers.join(', ')}`);

            // Create WebSocket connection
            const ws = new WebSocket(YAHOO_WS_URL);
            logger.info("WebSocket connection opened");

            // Connection established
            ws.onopen = () => {
                try {
                    const subscribeMessage = JSON.stringify({
                        subscribe: tickers
                    });
                    
                    // Send subscription request
                    ws.send(subscribeMessage);
                    logger.info("Sent subscription message:", subscribeMessage);
                } catch (subscribeError) {
                    logger.error(`Subscription error: ${subscribeError.message}`);
                }
            };

            // Handle incoming messages
            ws.onmessage = async (event) => {
                if (!YatickerMessage) {
                    console.error("Protobuf schema not loaded yet.");
                    return;
                }
                try {
                    // Decode the Base64 message and then use protobuf to decode it
                    const decodedBuffer = Buffer.from(event.data, 'base64');
                    const message = YatickerMessage.decode(decodedBuffer);

                    // Log the decoded message content
                    logger.info("Decoded message:", message);
                    logger.info(`Symbol: ${message.id}, Price: ${message.price}, Timestamp: ${message.time}`);
                    logger.info(`Day High: ${message.dayHigh}, Day Low: ${message.dayLow}, Volume: ${message.dayVolume}`);

                } catch (processingError) {
                    logger.error(`Message processing error: ${processingError.message}`);
                }
            };

            // Handle connection closure
            ws.onclose = (event) => {
                logger.warn(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
                // Implement exponential backoff for reconnection
                setTimeout(createWebSocketConnection, 5000);
            };

            // Handle WebSocket errors
            ws.onerror = (error) => {
                logger.error(`WebSocket error: ${error.message}`);
                ws.close(); // Trigger reconnection
            };

        } catch (setupError) {
            logger.error(`WebSocket setup error: ${setupError.message}`);
            // Implement reconnection strategy
            setTimeout(createWebSocketConnection, 5000);
        }
    }

    // Initial connection attempt
    createWebSocketConnection();
}

module.exports = { streamFinanceData };