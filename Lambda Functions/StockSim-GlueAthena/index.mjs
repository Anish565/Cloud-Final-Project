import { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } from "@aws-sdk/client-athena";

const athenaClient = new AthenaClient({
  region: "us-east-1", 
  credentials: {
    accessKeyId: "AKIAZI2LHLFXQE4MB2QP", 
    secretAccessKey: "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",
  },
});

export const handler = async (event) => {
  const databaseName = "stocksimathena"; 
  const tableName = "stocksim_historical_data";
  const outputLocation = "s3://glueathena/";

  const query = `SELECT * FROM \"${tableName}\" LIMIT 10;`;

  console.log(query);

  try {
    const startQueryCommand = new StartQueryExecutionCommand({
      QueryString: query,
      QueryExecutionContext: { Database: databaseName },
      ResultConfiguration: { OutputLocation: outputLocation },
    });

    const startQueryResponse = await athenaClient.send(startQueryCommand);
    const queryExecutionId = startQueryResponse.QueryExecutionId;

    console.log(`Query started with execution ID: ${queryExecutionId}`);

    let queryStatus;
    do {
      const getQueryExecutionCommand = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
      const executionResponse = await athenaClient.send(getQueryExecutionCommand);
      queryStatus = executionResponse.QueryExecution.Status.State;

      if (queryStatus === "FAILED" || queryStatus === "CANCELLED") {
        throw new Error(`Query failed or was cancelled: ${executionResponse.QueryExecution.Status.StateChangeReason}`);
      }

      console.log(`Current query status: ${queryStatus}`);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 2 seconds before checking again
    } while (queryStatus !== "SUCCEEDED");

    const getQueryResultsCommand = new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId });
    const resultsResponse = await athenaClient.send(getQueryResultsCommand);

    console.log("Query Results:");
    console.log(resultsResponse.ResultSet.Rows);
  } catch (error) {
    console.error("Error querying Athena:", error);
  }
}
