require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const morgan = require('morgan');

// Import configuration
const connectDB = require('./config/database');
const socketService = require('./services/socket.service');
// const routes = require('../routes');
// const errorMiddleware = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

// initilaze app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();



// ✅ Strong CORS Configuration
// const corsOptions = {
//   origin: ["http://localhost:5000", "https://yourfrontend.com"], // Allow only specific domains
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true, // Allow cookies & authentication headers
// };


// Middleware
// app.use(cors(corsOptions));
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Parse JSON requests
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded requests
app.use(morgan('dev')); // HTTP request logger


// MongoDB Connection
// mongoose
//   .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log("MongoDB Connected"))
//   .catch((err) => console.error("MongoDB Connection Error:", err));


// default routes
app.get("/",(req,res)=>{
  res.status(201).send("your server run well");
})
// Import Routes
const athleteRoutes = require("./routes/athleteRoutes");
app.use("/athlete", athleteRoutes);

// Use Post Routes
const postRoutes = require("./routes/userPost");
app.use("/post", postRoutes);



// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
socketService.initialize(server);

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});



// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Do not crash the server, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Give the server time to log the error before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

module.exports = server; // Export for testing
