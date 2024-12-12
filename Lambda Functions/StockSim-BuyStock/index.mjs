import { SQSClient, SendMessageCommand  } from "@aws-sdk/client-sqs"; // AWS SDK v3
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";


function generateId() {
  return randomUUID();
}


const sqsClient = new SQSClient();

const dynamoDBClient = new DynamoDBClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIAZI2LHLFXQE4MB2QP',
    secretAccessKey:'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', 
  },
})

const SQS_URL = "https://sqs.us-east-1.amazonaws.com/637423540591/BuyQueue";


// Stock(Buy)
// { 
//      "SessionID"
//      "userId"
//      "Stock Symbol"
//      "quantity"
//      "price"
//      "current_market_vol"
// }


export const handler = async (event) => {

  const { sessionId, symbol, quantity, price, current_market_vol } = event;
  try {

    if (quantity > current_market_vol){
      return {
        statusCode: 422,
        message: "Invalid quantity"
      }
    }


    const params = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "portfolio" },
      },
    };

    const command = new GetItemCommand(params);
    const response = await dynamoDBClient.send(command);

    let walletBalance = response.Item.walletBalance.N;
    const totalPrice = quantity * price;
    console.log(totalPrice)
    if (walletBalance < totalPrice){
      return {
        statusCode: 401,
        message: "Insufficient Funds"
      }
    }

    console.log(walletBalance);
    walletBalance -= totalPrice;

    const orderId = generateId();

    const queueMessage = JSON.stringify({
      SessionID: sessionId,
      Symbol: symbol,
      Quantity: quantity,
      Price: price,
      orderId: orderId
    })

    const paramsQueue = {
      QueueUrl: SQS_URL,
      MessageBody: queueMessage,
     };
    try {
        const commandQueue = new SendMessageCommand(paramsQueue);
        const result = await sqsClient.send(commandQueue);
        console.log('Message sent to SQS:', result.MessageId);
    } catch (error) {
        console.error('Error sending message to SQS:', error);
    }

    const paramsTable = {
      TableName: "Sessions", // Replace with your table name
      Key: {
          sessionId: { S: sessionId },
          sortKey: { S: "portfolio" },
      },
      UpdateExpression: "SET walletBalance = :walletBalance",
      ExpressionAttributeValues: {
          ":walletBalance": { N: walletBalance.toString() },
      },
      ReturnValues: "ALL_NEW", // Returns the updated item
  };

  const commandTable = new UpdateItemCommand(paramsTable);
  const responseTable = await dynamoDBClient.send(commandTable);
  const timestamp = new Date().toISOString();
  const newItem = {
    M: {
      orderId: { S: orderId },
      symbol: { S: symbol },
      quantity: { N: quantity.toString() },
      price: { N: price.toString() },
      totalPrice: { N: totalPrice.toString() },
      timestamp: { S: timestamp },
      status: { S: "Pending" },
      purpose: { S: "Buy"}
      },
  }
  const orderParams = {
    TableName: "Sessions", // Replace with your table name
    Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "orders" }
    },
    UpdateExpression: "SET orders = list_append(if_not_exists(orders, :emptyList), :newItem)",
    ExpressionAttributeValues: {
        ":emptyList": { L: [] }, // Empty list to initialize `orders` if it doesn't exist
        ":newItem": { L: [newItem] } // Append the new item to the list
    },
    ReturnValues: "ALL_NEW" // Optional: Returns the updated item
};

  const commandOrders = new UpdateItemCommand(orderParams);
  const responseOrders = await dynamoDBClient.send(commandOrders);
  console.log("check the orders");

  const newItemWatch = {
    S: symbol
  };
  const paramsWatchList = {
    TableName: "Sessions", // Replace with your table name
    Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "watchlist" }
    },
    UpdateExpression: "SET watchlist = list_append(if_not_exists(watchlist, :emptyList), :newItem)",
    ExpressionAttributeValues: {
        ":emptyList": { L: [] }, // Empty list to initialize `orders` if it doesn't exist
        ":newItem": { L: [newItemWatch] } // Append the new item to the list
    },
    ReturnValues: "ALL_NEW" // Optional: Returns the updated item
  };

  const commandWatch = new UpdateItemCommand(paramsWatchList);
  const responseWatchlist = await dynamoDBClient.send(commandWatch);
  console.log("check watchlist");
  return {
    statusCode: 200
  }
  } catch (error) {
      console.log(error);
      return {
        statusCode: 500
      }

  }
};
