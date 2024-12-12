import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const sqsClient = new SQSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIAZI2LHLFXQE4MB2QP",
    secretAccessKey: "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",
  },
});

const dynamoDBClient = new DynamoDBClient({
  region: "us-east-1",
});

const SQS_URL = "https://sqs.us-east-1.amazonaws.com/637423540591/SellQueue";

export const handler = async () => {
  try {
    const inputBody = {
      QueueUrl: SQS_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 5,
      MessageAttributeNames: ["All"],
    };

    // Receive a message from the SQS queue
    const command = new ReceiveMessageCommand(inputBody);
    const data = await sqsClient.send(command);
    if (data.Messages && data.Messages.length > 0) {
      const message = data.Messages[0];
      const messageBody = JSON.parse(message.Body);
      const { SessionID: sessionId, Symbol: symbol, Quantity: quantity, Price: price, OrderID: orderId } = messageBody;

      // Update Portfolio
      console.log(symbol);
      let totalSellPrice = quantity * price;
      await updatePortfolio(sessionId, symbol, quantity, price,totalSellPrice);

      // Update Orders
      await updateOrders(sessionId, orderId);

      // Delete the processed message from SQS
      // const deleteParams = {
      //   QueueUrl: SQS_URL,
      //   ReceiptHandle: message.ReceiptHandle,
      // };
      // const deleteCommand = new DeleteMessageCommand(deleteParams);
      // await sqsClient.send(deleteCommand);

      //console.log("Message processed and deleted:", message.MessageId);
    } else {
      console.log("No messages received from SQS.");
    }
  } catch (error) {
    console.error("Error processing SQS message:", error);
  }
};

// Update Portfolio
// Update Portfolio and Wallet Balance
const updatePortfolio = async (sessionId, symbol, quantity, price, totalSellPrice) => {
  try {
    const params = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "portfolio" },
      },
    };

    const command = new GetItemCommand(params);
    const response = await dynamoDBClient.send(command);
    
    console.log(response);

    let portfolio = response.Item?.portfolio?.L || [];
    let walletBalance = parseFloat(response.Item?.walletBalance?.N || "0");

    // let stockExists = false;
    console.log(portfolio);

    // Update the portfolio with the stock information
    // portfolio = portfolio.map((item) => {
    //   if (item.M.symbol.S === symbol) {
    //     stockExists = true;
    //     const currentQuantity = parseInt(item.M.quantity.N);
    //     const updatedQuantity = currentQuantity - quantity;
        
    //     console.log(quantity);

    //     // Calculate the sell price for the sold quantity
    //     totalSellPrice = quantity * parseFloat(price);

    //     if (updatedQuantity > 0) {
    //       return {
    //         M: {
    //           symbol: { S: symbol },
    //           quantity: { N: updatedQuantity.toString() },
    //           price: { N: item.M.price.N }, // Price remains unchanged
    //         },
    //       };
    //     }
    //     return null; // Remove the stock if quantity becomes 0
    //   }
    //   return item;
    // }).filter(Boolean); // Filter out null values

    // if (!stockExists) {
    //   console.error(`Error: Stock symbol ${symbol} not found in portfolio.`);
    //   return;
    // }

    // Update wallet balance
    console.log(walletBalance);
    console.log(totalSellPrice);
    walletBalance += totalSellPrice;
    console.log(walletBalance);
    //Update the portfolio and wallet balance in DynamoDB
    const updateParams = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "portfolio" },
      },
      UpdateExpression: "SET portfolio = :portfolio, walletBalance = :walletBalance, pendingAmount = :pendingAmount",
      ExpressionAttributeValues: {
        ":portfolio": { L: portfolio },
        ":walletBalance": { N: walletBalance.toString() },
        ":pendingAmount": { N: "0" }
      },
    };

    const updateCommand = new UpdateItemCommand(updateParams);
    await dynamoDBClient.send(updateCommand);

    // console.log(`Portfolio updated successfully. Wallet balance updated to ${walletBalance}.`);
  } catch (error) {
    console.error("Error updating portfolio:", error);
  }
};


// Update Orders
const updateOrders = async (sessionId, orderId) => {
  try {
    const params = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "orders" },
      },
    };

    const command = new GetItemCommand(params);
    const response = await dynamoDBClient.send(command);

    const orders = response.Item?.orders?.L || [];

    const updatedOrders = orders.map((order) => {
      if (order.M.orderId.S === orderId) {
        return {
          M: {
            ...order.M,
            status: { S: "completed" },
            timestamp: { S: new Date().toISOString() },
          },
        };
      }
      return order;
    });

    const updateParams = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "orders" },
      },
      UpdateExpression: "SET orders = :orders",
      ExpressionAttributeValues: {
        ":orders": { L: updatedOrders },
      },
    };

    const updateCommand = new UpdateItemCommand(updateParams);
    await dynamoDBClient.send(updateCommand);

    console.log(`Order with ID ${orderId} marked as completed.`);
  } catch (error) {
    console.error("Error updating orders:", error);
  }
};
