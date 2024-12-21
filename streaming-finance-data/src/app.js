const express = require('express');
const http = require('http'); // Required for Socket.IO
const socketIo = require('socket.io'); // Real-time communication
const { fetchHistoricalDataFromYahoo } = require('./services/yahooFinanceService');
const { streamFinanceData } = require('./services/websocketService');
const { getTrendingStocks } = require('./controllers/trendingController');
const { getNews, getNews2pretty } = require('./controllers/newsController');
const { healthCheck } = require('./controllers/healthCheckController');
const { initializeLogger, logger } = require('./utils/logger');
const { daemonFetchNewsForTickers } = require('./services/ploygonService');

const cors = require('cors');

const app = express();
const port = require('./config/serverConfig').port;

// Initialize Logger
initializeLogger()

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // Enable CORS for frontend
app.use(express.json());

// Global Error Handlers
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    logger.error(err.stack);
    console.error(`Uncaught Exception: ${err.stack}`);
    process.exit(1); // Exit on critical error
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    console.error(`Unhandled Rejection: ${reason}`);
    process.exit(1); // Exit on critical error
});

// Routes
app.get('/api/fetched-data', fetchHistoricalDataFromYahoo);  // Fetch historical data API
// app.get('/api/news', getNews); // GetNews
app.get('/api/polygon/news', getNews2pretty);
app.get('/api/trending-stocks', getTrendingStocks); // Trending stocks API
app.get('/health', healthCheck); //healthCheck

// Create HTTP Server and Attach Socket.IO
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:5173', // Allow frontend origin
        methods: ['GET', 'POST'],
        credentials: true, // Allow credentials (if needed)
    },
});



try {
    // Handle Client Connections for Real-Time Updates
    io.on('connection', (socket) => {
        logger.info('New client connected for real-time stock updates');
        socket.on('disconnect', () => {
            logger.info('Client disconnected');
        });
    });

    // Start server
    server.listen(port, () => {
        logger.info(`Server running on http://localhost:${port}`);
        console.log(`Server running on http://localhost:${port}`);
    });
} catch (error) {
    logger.error(`Error while starting server: ${error}`);
    console.log(`Error while starting server: ${error}`);
}

// Initialize Background Services
async function startApp() {
    try {
        logger.info("Initializing Background Services...");
        const periods = ["5D", "1M", "6M", "YTD", "1Y","5Y"];
        for (const period of periods) {
            await fetchHistoricalDataFromYahoo(period);
        }
        daemonFetchNewsForTickers(10);
        streamFinanceData(io); // Start real-time data streaming (runs continuously)
        
    } catch (error) {
        logger.error(`Error initializing application services: ${error.message}`);
        process.exit(1); // Exit the application if initialization fails
    }
}

// Start background services after server starts
try {
    logger.info(`Launching startApp`);
    console.log(`Launching startApp`);
    startApp()
} catch (error) {
    logger.error(`app.js: Failed to start application: ${error.message}`);
    console.log(`app.js: Failed to start application: ${error.message}`);
}

module.exports = app;
