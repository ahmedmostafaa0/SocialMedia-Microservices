require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

const Redis = require("ioredis");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");

const logger = require("./utils/logger");
const userRoutes = require("./routes/identity");
const errorHandler = require("./middleware/errorHandler");

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((error) => logger.error("Mongo Connection Error", error));

// Redis connection
const redisClient = new Redis(process.env.REDIS_URI);

// Express app setup
const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request Body: ${req.body}`);
  next();
});

// General rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip) 
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceed for ip: ${req.ip}`);
      res.status(429).json({ success: false, message: "Too many requests" });
    });
});

// Sensitive endpoints rate limiter
const sensetiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: `Too many requests` });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// Apply rate limiter to sensitive routes
app.use("/api/auth/register", sensetiveEndpointsLimiter);

// Routes
app.use("/api/auth", userRoutes);

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`identity service running on PORT: ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`UnHandled Rejection! Shutting down...`);
  logger.error(reason)
  server.close(() => {
    process.exit(1)
  })
});
