import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

// https://rs2qai0n3i.execute-api.us-east-1.amazonaws.com/DevStage/fetch/stocks?symbol=GOOGL&interval=1D

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

const client = new DynamoDBClient({
  region: "us-east-1",
  credentials: {
      accessKeyId: "AKIAZI2LHLFXQE4MB2QP",
      secretAccessKey: "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",
  },
  });

export const handler = async (event) => {
  // const { symbol, interval } = event.queryStringParameters;
  const headers = {
    "Access-Control-Allow-Origin": "*", // Allow all origins (for development)
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allowed HTTP methods
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
  };
  const { queryStringParameters } = event;
  if (!queryStringParameters) {
      throw new Error("Missing query parameters");
  }

  const { symbol, interval } = queryStringParameters;

  if (!symbol || !interval) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: "Missing required parameters: symbol and interval" }),
    };
  }

  const params = {
    TableName: "StockSim_Historical_Data", // Replace with your DynamoDB table name
    KeyConditionExpression: "symbol = :symbol AND sortKey = :sortKey",
    ExpressionAttributeValues: {
      ":symbol": { S: symbol },
      ":sortKey": { S: interval },
    },
  };

  try {
    const command = new QueryCommand(params);
    const response = await client.send(command);
    const parsedBody = parseDynamoDBResponse(response.Items[0]);
    console.log(parsedBody);
    let returnBody = null;
    if(interval === "meta"){
      returnBody = parsedBody.metaData;
    // } else if (interval === "1D"){
    //   returnBody= parsedBody.priceList
    }else{
      returnBody = parsedBody.values;
    }
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(returnBody),
    };
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ message: "Internal server error", error: error.message }),
    };
  }
};
