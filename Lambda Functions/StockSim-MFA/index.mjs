import { CognitoIdentityProviderClient, VerifySoftwareTokenCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1"
});

export const handler = async (event) => {
  const { session, userCode, username } = event;
  try {
    const command = new VerifySoftwareTokenCommand({
      Session: session,
      UserCode: userCode,
      FriendlyDeviceName: `${username}'s Device`
    });

    const response = await cognitoClient.send(command);

    console.log("MFA verification response: ", response);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "MFA verified successfully",
        session: session
      }),
    };
  } catch (error){
    console.error("Error verifying MFA: ", error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "MFA verification failed",
        error: error.message,
      }),
    };
  }
};