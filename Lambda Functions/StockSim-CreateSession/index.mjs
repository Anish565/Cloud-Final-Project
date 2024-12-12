import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";


function generateId() {
  return randomUUID();
}

const dynamoDb = new DynamoDBClient({ region: "us-east-1" });

export const handler = async (event) => {
  const { name, startAmount, targetAmount, duration, userId  } = event;

  if ( !name || !startAmount || !targetAmount || !duration) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing required session parameters." }),
    };
  }

  try {
    const sessionId = generateId();
    // Step 1: Create session metadata
    const sessionMetadataParams = {
      TableName: "Sessions",
      Item: {
        sessionId: { S: sessionId },
        sortKey: { S: "info" },
        userId: { S: userId },
        name: { S: name },
        startAmount: { N: startAmount.toString() },
        targetAmount: { N: targetAmount.toString() },
        finishingFunds: { N: "0" },
        endDate: { S: duration },
        inProgress: { BOOL: true },
      },
    };

    await dynamoDb.send(new PutItemCommand(sessionMetadataParams));

    // Step 2: Initialize empty orders
    const ordersParams = {
      TableName: "Sessions",
      Item: {
        sessionId: { S: sessionId },
        sortKey: { S: "orders" },
        orders: { L: [] }, // Empty list for orders
      },
    };

    await dynamoDb.send(new PutItemCommand(ordersParams));

    // Step 3: Initialize current info
    // const currentInfoParams = {
    //   TableName: "Sessions",
    //   Item: {
    //     sessionId: { S: sessionId },
    //     sortKey: { S: "currentInfo" },
    //     walletBalance: { N: startAmount.toString() }, // Start balance equals the initial amount
    //     totalStockValue: { N: "0" }, // No stock initially
    //     currentWorth: { N: startAmount.toString() }, // Current worth equals the start amount initially
    //   },
    // };

    // await dynamoDb.send(new PutItemCommand(currentInfoParams));

    // Step 4: Initialize empty portfolio
    const portfolioParams = {
      TableName: "Sessions",
      Item: {
        sessionId: { S: sessionId },
        sortKey: { S: "portfolio" },
        portfolio: { L: [] }, // Empty list for portfolio
        totalStockValue: { N: "0" },
        pendingAmount: { N: "0"},
        walletBalance: { N: startAmount.toString() },
        currentWorth: { N: startAmount.toString() },
      },
    };

    await dynamoDb.send(new PutItemCommand(portfolioParams));

    // Step 5: Initialize empty watchlist
    const watchlistParams = {
      TableName: "Sessions",
      Item: {
        sessionId: { S: sessionId },
        sortKey: { S: "watchlist" },
        watchlist: { L: [] }, // Empty list for watchlist
      },
    };

    await dynamoDb.send(new PutItemCommand(watchlistParams));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Session created successfully.", sessionId,
        sessionId: sessionId  }),
    };
  } catch (error) {
    console.error("Error creating session:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create session.", error: error.message }),
    };
  }
};
