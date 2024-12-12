import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1"
})

export const handler = async (event) => {
  const { username, password } = event;

  const appClientId = "64e8qanipc9od0cb9h0rs5piao"
  try {
    const params = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: appClientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    };

    const command = new InitiateAuthCommand(params);
    const result = await cognitoClient.send(command);

    console.log(result);
    
    if (result.ChallengeName === "MFA_SETUP"){
      return {
        statusCode: 200,
        challengeName: result.ChallengeName,
        session: result.Session,
        body: JSON.stringify({
          message: "MFA required. Please provide the code.",
        }),
      };
    }
    if (result.ChallengeName === "SOFTWARE_TOKEN_MFA"){
      return {
        statusCode: 200,
        challengeName: result.ChallengeName,
        session: result.Session,
        body: JSON.stringify({
          message: "MFA required. Please provide the code.",
        }),
      };
    }
    return {
      statusCode: 200,
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      body: JSON.stringify({
        message: "Login Successful",
      })
    };
  } catch (error) { 
    console.error("Error during login: ", error);

    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Login failed",
        error: error.message
      })
    }
  }
}