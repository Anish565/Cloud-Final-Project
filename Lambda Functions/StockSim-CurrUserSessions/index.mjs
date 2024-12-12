import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const dynamoDb = new DynamoDBClient({ region: "us-east-1" });

export const handler = async (event) => {
  const { userId } = event;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing required parameter: userId." }),
    };
  }

  try {
    const params = {
      TableName: "Sessions",
      IndexName: "userId-index", // GSI name for querying by userId
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": { S: userId },
      },
    };

    const command = new QueryCommand(params);
    const response = await dynamoDb.send(command);

    if (response.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No sessions found for userId ${userId}.` }),
      };
    }
    console.log(response.Items)

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully retrieved sessions for userId ${userId}.`,
        sessions: response.Items,
      }),
    };
  } catch (error) {
    console.error("Error retrieving sessions for user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to retrieve sessions.", error: error.message }),
    };
  }
};
