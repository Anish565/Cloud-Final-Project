import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const dynamoDb = new DynamoDBClient({ region: "us-east-1" });

const parseDynamoDBResponse = (data) => {
  const parseValue = (value) => {
    if (value.M) {
      // If it's a map, recursively parse its properties
      const parsedMap = {};
      for (const [key, val] of Object.entries(value.M)) {
        parsedMap[key] = parseValue(val);
      }
      return parsedMap;
    } else if (value.L) {
      // If it's a list, recursively parse each item
      return value.L.map(parseValue);
    } else if (value.S !== undefined) {
      // If it's a string, return the string value
      return value.S;
    } else if (value.N !== undefined) {
      // If it's a number, convert to JavaScript number
      return parseFloat(value.N);
    } else if (value.BOOL !== undefined) {
      // If it's a boolean, return the boolean value
      return value.BOOL;
    } else {
      // Handle unsupported types or null
      return null;
    }
  };

  // Parse the main response object
  const parsedData = {};
  for (const [key, value] of Object.entries(data)) {
    parsedData[key] = parseValue(value);
  }

  return parsedData;
};

export const handler = async (event) => {

  const headers = {
    "Access-Control-Allow-Origin": "*", // Allow all origins (for development)
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allowed HTTP methods
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
  };
  const { queryStringParameters } = event;
  if (!queryStringParameters) {
      throw new Error("Missing query parameters");
  }
  const { userId, inProgress } = queryStringParameters;

  if (!userId) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: "Missing required parameter: userId." }),
    };
  }

  try {
    const params = {
      TableName: "Sessions",
      IndexName: "userId-index", // GSI to query by userId
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "inProgress = :inProgress",
      ExpressionAttributeValues: {
        ":userId": { S: userId },
        ":inProgress": { BOOL: inProgress },
      },
    };

    const command = new QueryCommand(params);
    var response = await dynamoDb.send(command);

    if (response.Items.length === 0) {
      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({ 
          statusCode: 404,
          message: `No completed sessions found for userId ${userId}.` }),
      };
    }
    console.log(response)
    response =  response.Items.map((item) => parseDynamoDBResponse(item));
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        message: `Successfully retrieved completed sessions for userId ${userId}.`,
        sessions: response,
      }),
    };
  } catch (error) {
    console.error("Error retrieving completed sessions:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ message: "Failed to retrieve completed sessions.", error: error.message }),
    };
  }
};
