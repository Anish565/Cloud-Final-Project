import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDBClient({
  region: "us-east-1",
  credentials: {
      accessKeyId: "AKIAZI2LHLFXQE4MB2QP",
      secretAccessKey: "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",
  },
  });

  function convertDynamoDBJson(dynamoObj) {
    if (!dynamoObj) return null;

    // If it's a string attribute
    if (dynamoObj.S) return dynamoObj.S;

    // If it's a number attribute
    if (dynamoObj.N) return parseFloat(dynamoObj.N);

    // If it's a boolean attribute
    if (dynamoObj.BOOL) return dynamoObj.BOOL;

    // If it's a list (array)
    if (dynamoObj.L) return dynamoObj.L.map(convertDynamoDBJson);

    // If it's a map (object)
    if (dynamoObj.M) {
        const result = {};
        for (const key in dynamoObj.M) {
            result[key] = convertDynamoDBJson(dynamoObj.M[key]);
        }
        return result;
    }

    // If it's null
    if (dynamoObj.NULL) return null;

    return dynamoObj;
}

export const handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*", // Allow all origins (for development)
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allowed HTTP methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
      };
    try {
        // Fetch all news items from the DynamoDB table
        const params = {
            TableName: "Stock_Sim_News_Data", // Replace with your table name
        };

        const command = new ScanCommand(params);
        const response = await dynamodb.send(command);
        console.log(response);

        const newsData = response.Items.map((item) => ({
          rank: convertDynamoDBJson(item.rank),
          news: convertDynamoDBJson(item.news),
      }));
        // Parse and sort items by rank
        const sortedNews = newsData
            .sort((a, b) => a.rank - b.rank); // Sort by rank in ascending order
        console.log(sortedNews);
        // Return sorted news
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                news: sortedNews,
            }),
        };
    } catch (error) {
        console.error("Error fetching news:", error.message);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                error: "Failed to fetch news items.",
                details: error.message,
            }),
        };
    }
};
