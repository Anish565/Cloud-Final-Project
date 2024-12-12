const WebSocket = require('websocket').w3cwebsocket;
const { logger } = require('../utils/logger');
const { loadOrCreateConfig } = require('../utils/configReader');
const protobuf = require('protobufjs');
const path = require('path');
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const AWS = require('aws-sdk');
const { min } = require('moment');
const dbConfig = require('../config/dbConfig');

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

function ConvertToUTC(timestamp) {
    timestamp = Number(timestamp);
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
        return false;
    }
    const timestampInMilliseconds = timestamp > 9999999999 ? timestamp : timestamp * 1000;
    const date = new Date(timestampInMilliseconds);
    return date.toUTCString();
}

async function streamFinanceData(io) {
    
    function createWebSocketConnection() {
        try {
            // Load configuration
            const config = loadOrCreateConfig();
            const tickers = config.tickers || [];
            
            if (tickers.length === 0) {
                logger.warn('streamFinanceData: No tickers configured. Skipping WebSocket connection.');
                return;
            }
            logger.info(`streamFinanceData: Subscribing to tickers: ${tickers.join(', ')}`);

            // Create WebSocket connection
            const ws = new WebSocket(YAHOO_WS_URL);
            logger.info("streamFinanceData: WebSocket connection opened");

            // Connection established
            ws.onopen = () => {
                try {
                    const subscribeMessage = JSON.stringify({
                        subscribe: tickers
                    });
                    
                    // Send subscription request
                    ws.send(subscribeMessage);
                    logger.info(`streamFinanceData: Sent subscription message: ${subscribeMessage}`);
                } catch (subscribeError) {
                    logger.error(`streamFinanceData: Subscription error: ${subscribeError.message}`);
                }
            };

            // Handle incoming messages
            ws.onmessage = async (event) => {
                if (!YatickerMessage) {
                    log.error("streamFinanceData: Protobuf schema not loaded yet.");
                    console.error("streamFinanceData: Protobuf schema not loaded yet.");
                    return;
                }
                try {
                    // Decode the Base64 message and then use protobuf to decode it
                    const decodedBuffer = Buffer.from(event.data, 'base64');
                    
                    const message = YatickerMessage.decode(decodedBuffer);

                    const symbol = message.id;
                    const price = message.price;
                    const shortName = message.shortName;
                    const timeStamp = message.time;
                    const timeStampUTC = ConvertToUTC(timeStamp);
                    const minutes = (new Date(timeStampUTC).getUTCMinutes()).toString();
                    const dayHigh = message.dayHigh;
                    const dayLow = message.dayLow;
                    const dayVolume = message.dayVolume.low;
                    const changePercent = message.changePercent;
                    const openPrice = message.openPrice;
                    const previousClose = message.previousClose;

                    logger.debug(`streamFinanceData: Raw decoded buffer: ${decodedBuffer.toString('utf-8')}`);

                    // Log the decoded message content
                    logger.debug("Decoded message:", message);
                    // Log the decoded message as JSON
                    logger.debug(`Full decoded message: ${JSON.stringify(message, (key, value) =>
                        typeof value === 'bigint' ? value.toString() : value // Convert BigInt to string for JSON compatibility
                    )}`);
                    logger.debug(`streamFinanceData: Symbol: ${symbol}, shortName: ${shortName}, Price: ${price}, Timestamp: ${timeStamp}, Day High: ${dayHigh}, Day Low: ${dayLow}, Volume: ${dayVolume}, ChangePercent: ${changePercent}, openPrice: ${openPrice}, previousClose: ${previousClose}`);
                    

                    // Insert into Dynamo
                    AWS.config.update({ region: 'us-east-1' });
                        const dynamodb = new DynamoDBClient({
                        region: dbConfig.region,
                        credentials: {
                            accessKeyId: dbConfig.credentials.accessKeyId,
                            secretAccessKey: dbConfig.credentials.secretAccessKey,
                        },
                    });

                    const formatItem = (item) => {
                        if (typeof item === "string") {
                          return { S: item };
                        }
                        if (typeof item === "number") {
                          return { N: item.toString() };
                        }
                        if (typeof item === "boolean") {
                          return { BOOL: item };
                        }
                        if (item instanceof Date) {
                          return { S: item.toISOString() };
                        }
                        if (Array.isArray(item)) {
                          return { L: item.map(formatItem) };
                        }
                        if (item && typeof item === "object") {
                          return {
                            M: Object.fromEntries(
                              Object.entries(item).map(([key, value]) => [key, formatItem(value)])
                            ),
                          };
                        }
                        return { NULL: true };
                      };
                      
                      io.emit('stock-update', {
                        symbol: symbol,
                        shortName: shortName,
                        price: price,
                        dayHigh: dayHigh,
                        dayLow: dayLow,
                        dayVolume: dayVolume,
                        timestamp: timeStamp,
                        changePercent: changePercent,
                        openPrice: openPrice,
                        previousClose: previousClose
                    });

                    // This should run in async and should push data every one min
                      try {
                        // Insert the `meta` fields
                        const params = {
                            symbol: {S:symbol},
                            sortKey: {S:minutes.toString()},
                            price: {N:price.toString()},
                            dayVolume: {N:dayVolume.toString()},
                            timeStamp: {S:timeStampUTC.toString()},
                            changePercent: {N:changePercent.toString()},
                            openPrice: {N:openPrice.toString()},
                            previousClose: {N:previousClose.toString()}
                        };
                        // 
                        // const metaCommand = new PutItemCommand({
                        //   TableName: "websocket_data", 
                        //   Item: params,
                        // });
                        // const response = await dynamodb.send(metaCommand);
                        //console.log(response);
                        //logger.info(response);
                    } catch (error) {
                        log.error("Error inserting data into DynamoDB:", error);
                        console.error("Error inserting data into DynamoDB:", error);
                    }


                    // Log the decoded message as JSON
                    // logger.info(`Full decoded message: ${JSON.stringify(message, (key, value) =>
                    //     typeof value === 'bigint' ? value.toString() : value // Convert BigInt to string for JSON compatibility
                    // )}`);
                    // logger.info(`streamFinanceData: Symbol: ${symbol}, Price: ${price}, Timestamp: ${timeStamp}, Day High: ${dayHigh}, Day Low: ${dayLow}, Volume: ${dayVolume}, ChangePercent: ${changePercent}, openPrice: ${openPrice}, previousClose: ${previousClose} shortName: ${shortName}`);
                    
                    // Broadcast to frontend
                    
                    // localhost websocket url
                    logger.debug("streamFinanceData: Broadcasted to frontend", "http://localhost:3000");
                    //console.log("streamFinanceData: Broadcasted to frontend", "http://localhost:3000");
                } catch (processingError) {
                    logger.error(`streamFinanceData: Message processing error: ${processingError.message}`);
                }
            };

            // Handle connection closure
            ws.onclose = (event) => {
                logger.warn(`streamFinanceData: WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
                // Implement exponential backoff for reconnection
                setTimeout(createWebSocketConnection, 5000);
            };

            // Handle WebSocket errors
            ws.onerror = (error) => {
                logger.error(`streamFinanceData: WebSocket error: ${error.message}`);
                ws.close(); // Trigger reconnection
            };

        } catch (setupError) {
            logger.error(`streamFinanceData: WebSocket setup error: ${setupError.message}`);
            // Implement reconnection strategy
            setTimeout(createWebSocketConnection, 5000);
        }
    }

    // Initial connection attempt
    createWebSocketConnection();
}

module.exports = { streamFinanceData };
