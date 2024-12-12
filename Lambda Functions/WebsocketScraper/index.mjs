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
  const symbolList = ["GOOGL","AAPL","MSFT"];
  try {
    for(const symbol of symbolList)
    {
      for(const i=0;i<60;i++)
      {
        const min = i.toString();
        const params = {
          TableName: "websocket_data",
          Key: {
            symbol: { S: symbol },
            sortKey: { S: min },
          },
        };
        const command = new GetItemCommand(params);
        const response = await dynamoDBClient.send(command);
        const parsedBody = parseDynamoDBResponse(response.Item);
        const hour = new Date(parsedBody.timeStamp).getUTCHours()-5;
        if(hour == 9)
        {
          const newDate = new Date(parsedBody.timeStamp).toISOString();
          const dataToAppend = {
            M: {
                volume: { N: parsedBody.dayVolume.toString()}, // Default to "0" if null
                close: { N: parsedBody.price.toString()},   // Default to "0" if null
                date: { S: newDate}, // Default to "N/A" if date is missing
            }
          }
          const orderParams = {
            TableName: "StockSim_Historical_Data", // Replace with your table name
            Key: {
                symbol: { S: symbol },
                sortKey: { S: "1D" },
            },
            UpdateExpression: "SET priceList = :temp",
            ExpressionAttributeValues: {
                ":temp": { L: [dataToAppend] } 
            },
            ReturnValues: "ALL_NEW" 
          };
          const commandTable = new UpdateItemCommand(orderParams);
          const responseTable = await dynamoDBClient.send(commandTable);
        }
        else
        {
          const params2 = {
            TableName: "StockSim_Historical_Data",
            Key: {
              symbol: { S: symbol },
              sortKey: { S: "1D" },
            },
          };
          const command = new GetItemCommand(params2);
          const response2 = await dynamoDBClient.send(command);
          const parsedBody2 = parseDynamoDBResponse(response2.Item);
          
          const newDate = new Date(parsedBody.timeStamp).toISOString();
          const dataToAppend = {
            M: {
                volume: { N: parsedBody.dayVolume.toString()}, // Default to "0" if null
                close: { N: parsedBody.price.toString()},   // Default to "0" if null
                date: { S: newDate}, // Default to "N/A" if date is missing
            }
          }
          const orderParams = {
            TableName: "StockSim_Historical_Data", // Replace with your table name
            Key: {
                symbol: { S: symbol },
                sortKey: { S: "1D" },
            },
            UpdateExpression: "SET priceList = list_append(if_not_exists(priceList, :emptyList), :temp)",
            ExpressionAttributeValues: {
                ":emptyList": { L: [] }, // Empty list to initialize `orders` if it doesn't exist
                ":temp": { L: [dataToAppend] } // Append the new item to the list
            },
            ReturnValues: "ALL_NEW" // Optional: Returns the updated item
          };
          const commandTable = new UpdateItemCommand(orderParams);
          const responseTable = await dynamoDBClient.send(commandTable);
          
        }
      }
    }
    
  } catch (error) {
    console.error("Error: ", error);
  }
};