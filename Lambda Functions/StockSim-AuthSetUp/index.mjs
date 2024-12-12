import { CognitoIdentityProviderClient, AssociateSoftwareTokenCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

export const handler = async (event) => {
  // TODO implement
  const { session, app_name, username} = event;

  try {
    const command = new AssociateSoftwareTokenCommand({
      Session: session
    });
    const response = await cognitoClient.send(command);

    console.log("MFA Setup Response: ", response);
    const secretCode = response.SecretCode;
    const qrUrl = `otpauth://totp/${app_name}:${username}?secret=${secretCode}&issuer=${app_name}`
    return {
      statusCode: 200,
      QRUrl: qrUrl,
      secretCode: response.SecretCode,
      session: response.Session,
      body: JSON.stringify({
        message: "MFA setup required. Configure your authenticator app.",
      }),
    };
  } catch (error) {
    console.error("Error during MFA setup", error);
    return {
      statusCode: 400,
      error: error.message,
      body: JSON.stringify({
        message: "MFA setup failed.",
      }),
    };
  }
};