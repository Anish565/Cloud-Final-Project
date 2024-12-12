import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";


const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

export const handler = async (event) => {
  const { username, email, password, DOB, firstName, lastName } = event;

  const userPoolId = "us-east-1_zqUlecQq6";
  const appClientId = "64e8qanipc9od0cb9h0rs5piao";

  try {
    const params = {
      ClientId: appClientId,
      Username: username,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "birthdate", Value: DOB },
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
      ],

    };

    const signUpCommand = new SignUpCommand(params);
    const signUpResult = await cognitoClient.send(signUpCommand);
    console.log(signUpResult);

    // this is for confirming the account
    const confirmParams = {
      UserPoolId: userPoolId,
      Username: username,
    };

    const confirmCommand = new AdminConfirmSignUpCommand(confirmParams);
    const confirmResult = await cognitoClient.send(confirmCommand);
    console.log("user has been confirmed", confirmResult)

    // Set the email as verified
    const verifyParams = {
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [
        { Name: "email_verified", Value: "true" },
      ],
    }

    const verifyCommand = new AdminUpdateUserAttributesCommand(verifyParams);
    const verifyResult = await cognitoClient.send(verifyCommand);
    console.log("user has been verified");


    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Allow all origins (use specific origins for production)
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        message: "User registration successful",
        userSub: signUpResult.UserSub,
      }),
    };
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*", // Allow all origins (use specific origins for production)
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        message: "User registration failed",
        error: error.message,
      }),
    };
  }
};
