import { DynamoDBClient, QueryCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";

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
  console.log(queryStringParameters);
  if (!queryStringParameters) {
      throw new Error("Missing query parameters");
  }
  const { sessionId, sortKey } = queryStringParameters;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: "Missing required parameter: sessionId." }),
    };
  }
  // same function can be used with different sortkey value here. Smort
  try {
    if (sortKey) {
      // Retrieve specific part of the session (e.g., info, orders, currentInfo)
      const params = {
        TableName: "Sessions",
        Key: {
          sessionId: { S: sessionId },
          sortKey: { S: sortKey },
        },
      };

      const command = new GetItemCommand(params);
      var response = await dynamoDb.send(command);
      console.log(response);
      if (!response.Item) {
        return {
          statusCode: 404,
          headers: headers,
          body: JSON.stringify({ message: `No data found for sessionId ${sessionId} and sortKey ${sortKey}.` }),
        };
      }
      response = parseDynamoDBResponse(response.Item);

      console.log(response);
      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
          message: `Successfully retrieved ${sortKey} for session ${sessionId}.`,
          data: response,
        }),
      };
    } else {
      // Retrieve all data for the session
      const params = {
        TableName: "Sessions",
        KeyConditionExpression: "sessionId = :sessionId",
        ExpressionAttributeValues: {
          ":sessionId": { S: sessionId },
        },
      };

      const command = new QueryCommand(params);
      var response = await dynamoDb.send(command);
      console.log(response)
      if (response.Items.length === 0) {
        return {
          statusCode: 404,
          headers: headers,
          body: JSON.stringify({ message: `No data found for sessionId ${sessionId}.` }),
        };
      }
      response = response.Items.map((item) => parseDynamoDBResponse(item));
      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
          message: `Successfully retrieved session data for ${sessionId}.`,
          data: response,
        }),
      };
    }
  } catch (error) {
    console.error("Error retrieving session data:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ message: "Failed to retrieve session data.", error: error.message }),
    };
  }
};
