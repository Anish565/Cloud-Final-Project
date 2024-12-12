import { CognitoIdentityProviderClient, RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

export const handler = async (event) => {
  console.log(event);
  const {session, clientId, username, mfaCode} = event;
  try {
    // Respond to the authentication challenge
    const command = new RespondToAuthChallengeCommand({
      ClientId: clientId,
      ChallengeName: "SOFTWARE_TOKEN_MFA", // Specify the challenge type
      Session: session,                // Session from the previous step
      ChallengeResponses: {
        USERNAME: username,             // Username of the user
        SOFTWARE_TOKEN_MFA_CODE: mfaCode, // Code from the user's authenticator app
      },
    });

    const response = await cognitoClient.send(command);

    console.log("Login Complete Response:", response);

    // Return the tokens
    return {
      statusCode: 200,
      tokens: response.AuthenticationResult, // Contains accessToken, idToken, refreshToken
      body: JSON.stringify({
        message: "Login successful.",
      }),
    };
  } catch (error) {
    console.error("Error completing login:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Login completion failed.",
        error: error.message,
      }),
    };
  }
};
