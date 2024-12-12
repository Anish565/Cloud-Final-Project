import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs"; // AWS SDK v3
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

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

const SQS_URL = "https://sqs.us-east-1.amazonaws.com/637423540591/BuyQueue";

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
    console.log(data);
    if (data.Messages && data.Messages.length > 0) {
      const message = data.Messages[0];
      const messageBody = JSON.parse(message.Body);
      const { SessionID: sessionId, Symbol: symbol, Quantity: quantity, Price: price, orderId: orderId } = messageBody;

      const totalPrice = quantity * price;
      const timestamp = new Date().toISOString();

      // Update Portfolio
      await updatePortfolio(sessionId, symbol, quantity, price);

      // Update Orders
      console.log('Calling update orders');
      console.log('Order ID', orderId)
      await updateOrders(sessionId, orderId, timestamp);

      // Delete the processed message from SQS
      const deleteParams = {
        QueueUrl: SQS_URL,
        ReceiptHandle: message.ReceiptHandle,
      };
      const deleteCommand = new DeleteMessageCommand(deleteParams);
      await sqsClient.send(deleteCommand);

      console.log("Message processed and deleted:", message.MessageId);
    } else {
      console.log("No messages received from SQS.");
    }
  } catch (error) {
    console.error("Error processing SQS message:", error);
  }
};

// Update Portfolio
const updatePortfolio = async (sessionId, symbol, quantity, price) => {
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
    let stockExists = false;

    // Update the portfolio with the stock information
    portfolio = portfolio.map((item) => {
      if (item.M.symbol.S === symbol) {
        console.log("match");
        stockExists = true;
        const updatedQuantity = parseInt(item.M.quantity.N) + quantity;
        const updatedAveragePrice =
          (parseInt(item.M.quantity.N) * parseFloat(item.M.price.N) +
            quantity * price) /
          updatedQuantity;

        return {
          M: {
            symbol: { S: symbol },
            quantity: { N: updatedQuantity.toString() },
            price: { N: updatedAveragePrice.toString() },
          },
        };
      }
      return item;
    });

    if (!stockExists) {
      console.log("not match");
      portfolio.push({
        M: {
          symbol: { S: symbol },
          quantity: { N: quantity.toString() },
          price: { N: price.toString() },
        },
      });
    }

    // Update the portfolio in DynamoDB
    console.log(portfolio);
    const updateParams = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "portfolio" },
      },
      UpdateExpression: "SET portfolio = :portfolio",
      ExpressionAttributeValues: {
        ":portfolio": { L: portfolio },
      },
    };

    const updateCommand = new UpdateItemCommand(updateParams);
    await dynamoDBClient.send(updateCommand);
    console.log("Portfolio updated successfully.");
  } catch (error) {
    console.error("Error updating portfolio:", error);
  }
};

// Update Orders
const updateOrders = async (sessionId, orderId, timestamp) => {
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
            timestamp: { S: timestamp }, // Update the timestamp
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

    console.log(`Order with ID ${orderId} marked as completed and timestamp updated.`);
  } catch (error) {
    console.error("Error updating orders:", error);
  }
};
