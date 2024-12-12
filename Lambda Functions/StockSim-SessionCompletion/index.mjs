import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDb = new DynamoDBClient({ region: "us-east-1" });

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // Allow all origins (for development)
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allowed HTTP methods
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
  };

  const { sessionId, stockData } = event;
  if (!sessionId) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: "Missing required parameter: sessionId." }),
    };
  }

  try {
    // Step 1: Fetch the portfolio for the session
    const getParams = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "portfolio" },
      },
    };

    const portfolioResponse = await dynamoDb.send(new GetItemCommand(getParams));
    if (!portfolioResponse.Item || !portfolioResponse.Item.portfolio) {
      return {
        statusCode: 404,
        headers: headers,
        body: JSON.stringify({ message: `Portfolio not found for sessionId: ${sessionId}` }),
      };
    }

    const portfolio = portfolioResponse.Item.portfolio.L || [];

    // Step 2: Calculate the total value of the portfolio
    let totalPortfolioValue = 0;
    portfolio.forEach((stock) => {
      const stockItem = stock.M;
      const quantity = parseFloat(stockItem.quantity.N);
      const price = parseFloat(stockData[stockItem.symbol.S].price).toFixed(2);
      totalPortfolioValue += quantity * price;
    });
    const walletBalance = parseFloat(portfolioResponse.Item.walletBalance.N);
    totalPortfolioValue += walletBalance;

    // Round totalPortfolioValue to 2 decimal places
    totalPortfolioValue = parseFloat(totalPortfolioValue.toFixed(2));

    // Step 3: Update the session info with finishing funds
    const updateParams = {
      TableName: "Sessions",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "info" },
      },
      UpdateExpression: "SET inProgress = :false, finishingFunds = :finishingFunds",
      ExpressionAttributeValues: {
        ":false": { BOOL: false },
        ":finishingFunds": { N: totalPortfolioValue.toString() },
      },
    };

    await dynamoDb.send(new UpdateItemCommand(updateParams));

    return {
      statusCode: 200,
      headers:  headers,
      body: JSON.stringify({
        message: `Session ${sessionId} marked as completed.`,
        finishingFunds: totalPortfolioValue,
      }),
    };
  } catch (error) {
    console.error("Error updating session:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        message: "Failed to mark session as completed.",
        error: error.message,
      }),
    };
  }
};
