// Database configuration setup
const fs = require('fs');
const path = require('path');

// Path to dbConfig.json
const configFilePath = path.join(__dirname, 'dbConfig.json');

// Function to load or create dbConfig.json
function loadOrCreateDBConfig() {
  if (!fs.existsSync(configFilePath)) {
    const defaultConfig = {
      region: 'us-east-1',
      credentials: {
        accessKeyId: '<YOUR_ACCESS_KEY_ID>',
        secretAccessKey: '<YOUR_SECRET_ACCESS_KEY>',
      },
    };
    // Write defaultConfig to dbConfig.json
    fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    console.log('dbConfig.json created with default values.');
    return defaultConfig;
  }
  // Read and parse existing dbConfig.json
  return JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
}

// Export the configuration
module.exports = loadOrCreateDBConfig();