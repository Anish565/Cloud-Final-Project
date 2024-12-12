import { DynamoDBClient, QueryCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDb = new DynamoDBClient({ region: "us-east-1" });

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // Allow all origins (for development)
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allowed HTTP methods
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
  };

  // when testing the API from external source
  // const { sessionId } = event.pathParameters || {};

  const { queryStringParameters } = event;
  if (!queryStringParameters) {
      throw new Error("Missing query parameters");
  }
  const { sessionId } = queryStringParameters;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: "Missing required parameter: sessionId." }),
    };
  }

  try {
    // Step 1: Query all items associated with the sessionId
    const queryParams = {
      TableName: "Sessions",
      KeyConditionExpression: "sessionId = :sessionId",
      ExpressionAttributeValues: {
        ":sessionId": { S: sessionId },
      },
    };

    const queryCommand = new QueryCommand(queryParams);
    const queryResponse = await dynamoDb.send(queryCommand);

    if (queryResponse.Items.length === 0) {
      return {
        statusCode: 404,
        headers: headers,
        body: JSON.stringify({ message: `No data found for sessionId ${sessionId}.` }),
      };
    }

    // Step 2: Delete each item associated with the sessionId
    for (const item of queryResponse.Items) {
      const deleteParams = {
        TableName: "Sessions",
        Key: {
          sessionId: item.sessionId,
          sortKey: item.sortKey,
        },
      };

      const deleteCommand = new DeleteItemCommand(deleteParams);
      await dynamoDb.send(deleteCommand);
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ message: `Session ${sessionId} and all associated data have been deleted successfully.` }),
    };
  } catch (error) {
    console.error("Error deleting session:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ message: "Failed to delete session.", error: error.message }),
    };
  }
};
