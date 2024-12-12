import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";

function generateId() {
  return randomUUID();
}

const sqsClient = new SQSClient();
const dynamoDBClient = new DynamoDBClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIAZI2LHLFXQE4MB2QP",
    secretAccessKey: "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",
  },
});

const SQS_URL = "https://sqs.us-east-1.amazonaws.com/637423540591/SellQueue";

export const handler = async (event) => {
  const { sessionId, symbol, quantity, price } = event;

  try {
    const params = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "portfolio" },
      },
    };

    // Retrieve portfolio from DynamoDB
    const command = new GetItemCommand(params);
    const response = await dynamoDBClient.send(command);

    const portfolioData = response.Item;
    const portfolio = portfolioData?.portfolio?.L || [];
    const stock = portfolio.find((item) => item.M.symbol.S === symbol);

    if (!stock || parseInt(stock.M.quantity.N) < quantity) {
      return {
        statusCode: 422,
        message: "Invalid quantity. Not enough stock available to sell.",
      };
    }

    const totalPrice = quantity * price;
    const orderId = generateId();
    const timestamp = new Date().toISOString();

    // Update the stock's quantity in the portfolio
    const updatedPortfolio = portfolio
      .map((item) => {
        if (item.M.symbol.S === symbol) {
          const updatedQuantity = parseInt(item.M.quantity.N) - quantity;
          if (updatedQuantity > 0) {
            return {
              M: {
                symbol: { S: symbol },
                quantity: { N: updatedQuantity.toString() },
                price: item.M.price, // Retain the price field
              },
            };
          }
          return null; // Remove the stock if quantity becomes zero
        }
        return item;
      })
      .filter(Boolean); // Remove null values (stocks with zero quantity)

      console.log(updatedPortfolio)
    // Calculate the new pendingAmount
    const newPendingAmount =
      (portfolioData.pendingAmount?.N || 0) + totalPrice;
    
      console.log(newPendingAmount)
    // Update the portfolio in DynamoDB
    const updatePortfolioParams = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "portfolio" },
      },
      UpdateExpression: `
        SET portfolio = :portfolio,
            pendingAmount = :pendingAmount
      `,
      ExpressionAttributeValues: {
        ":portfolio": { L: updatedPortfolio },
        ":pendingAmount": { N: newPendingAmount.toString() },
      },
    };

    await dynamoDBClient.send(new UpdateItemCommand(updatePortfolioParams));

    // Add sell order to orders table
    const newItem = {
      M: {
        orderId: { S: orderId },
        symbol: { S: symbol },
        quantity: { N: quantity.toString() },
        price: { N: price.toString() },
        totalPrice: { N: totalPrice.toString() },
        timestamp: { S: timestamp },
        status: { S: "Pending" },
        purpose: { S: "Sell" },
      },
    };

    const orderParams = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "orders" },
      },
      UpdateExpression: "SET orders = list_append(if_not_exists(orders, :emptyList), :newItem)",
      ExpressionAttributeValues: {
        ":emptyList": { L: [] },
        ":newItem": { L: [newItem] },
      },
    };

    await dynamoDBClient.send(new UpdateItemCommand(orderParams));

    // Send sell message to SQS
    const queueMessage = JSON.stringify({
      SessionID: sessionId,
      Symbol: symbol,
      Quantity: quantity,
      Price: price,
      OrderID: orderId,
    });

    const paramsQueue = {
      QueueUrl: SQS_URL,
      MessageBody: queueMessage,
    };

    await sqsClient.send(new SendMessageCommand(paramsQueue));

    console.log("Sell order created and portfolio updated successfully.");
    return {
      statusCode: 200,
      message: "Sell order processed successfully",
    };
  } catch (error) {
    console.error("Error in sellStock:", error);
    return {
      statusCode: 500,
      message: "Internal server error",
    };
  }
};
