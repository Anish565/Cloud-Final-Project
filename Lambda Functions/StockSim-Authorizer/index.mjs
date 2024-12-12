import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import nodeJose from 'node-jose';

// JWKS URL from Cognito
const JWKS_URL = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_zqUlecQq6/.well-known/jwks.json';

export const handler = async (event) => {
  const token = event.authorizationToken?.split(' ')[1]; // Extract token from "Bearer <token>"
  
  // const token = event.headers?.Authorization?.split(' ')[1]; // Extract token from Bearer Authorization header
  if (!token) {
    return generatePolicy('user', 'Deny', event.methodArn, 'Access token is required');
  }

  try {
    // Fetch the JWKS
    const response = await fetch(JWKS_URL);
    const { keys } = await response.json();

    // Decode the JWT header to get the `kid`
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new Error('Invalid token header');
    }

    // Find the matching key in the JWKS
    const key = keys.find((k) => k.kid === decodedHeader.header.kid);
    if (!key) {
      throw new Error('No matching key found in JWKS');
    }

    // Convert the key to a PEM format using node-jose
    const keyStore = await nodeJose.JWK.asKeyStore({ keys: [key] });
    const jwkKey = keyStore.get(key.kid);
    const publicKey = jwkKey.toPEM();

    // Verify the JWT
    const verifiedToken = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_zqUlecQq6',
    });

    // Return Allow policy for valid token
    return generatePolicy(
      verifiedToken.sub || 'user', // Use the 'sub' (subject) claim as the principal ID
      'Allow',
      event.methodArn,
      'Token verified successfully'
    );
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return generatePolicy('user', 'Deny', event.methodArn, 'Token verification failed');
  }
};

// Helper function to generate IAM policy
const generatePolicy = (principalId, effect, resource, message) => {
  const authResponse = {
    principalId,
  }; 

  if (effect && resource) {
    authResponse.policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    };
  }

  authResponse.context = {
    message, // Custom context with a message
  };

  return authResponse;
};
