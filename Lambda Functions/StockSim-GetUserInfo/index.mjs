import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  const { accessToken } = event; // Access token from the user

  if (!accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Access token is required to retrieve user information." }),
    };
  }

  try {
    // Call the GetUserCommand to retrieve user information
    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const userData = await cognitoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User information retrieved successfully.",
        userData,
      }),
    };
  } catch (error) {
    console.error("Error retrieving user information:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to retrieve user information.", error: error.message }),
    };
  }
};
