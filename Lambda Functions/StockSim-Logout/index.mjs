import { CognitoIdentityProviderClient, GlobalSignOutCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  const { accessToken } = event; // Access token from the user

  if (!accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Access token is required to log out the user." }),
    };
  }

  try {
    // Call the GlobalSignOutCommand to log the user out
    const command = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });

    await cognitoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User successfully logged out." }),
    };
  } catch (error) {
    console.error("Error logging out user:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to log out user.", error: error.message }),
    };
  }
};
