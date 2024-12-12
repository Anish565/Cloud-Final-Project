import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamoDBClient = new DynamoDBClient({
  region: "us-east-1",
});

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


export const handler = async () => {
  const sessionId = "GOOGL";
  try {
    const params = {
      TableName: "websocket_data",
      Key: {
        sessionId: { S: sessionId },
        sortKey: { S: "10" },
      },
    };
    console.log(params);
    //const command = new GetItemCommand(params);
    //const response = await dynamoDBClient.send(command);
    
  } catch (error) {
    console.error("Error: ", error);
  }
};