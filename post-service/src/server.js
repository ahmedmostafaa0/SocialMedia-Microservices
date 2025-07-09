require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const Redis = require("ioredis");
const { RedisStore } = require("rate-limit-redis");
const { rateLimit } = require("express-rate-limit");

const postRoutes = require("./routes/post");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const {connectToRabbitMQ} = require('./utils/rabbitmq')

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info(`Connected to MongoDB`))
  .catch((e) => logger.error(`MongoDB connection error: ${e}`));

const redisClient = new Redis(process.env.REDIS_URI);

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    logger.warn(`Rate limit exceed for ip: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Recived ${req.method} request to ${req.url}`);
  logger.info(`Request body: ${req.body}`);
  next();
});
app.use(rateLimiter);

app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next()
  },
  postRoutes
);

app.use(errorHandler);

async function connectServer() {
  try {
    await connectToRabbitMQ()
    app.listen(PORT, () => {
      logger.info(`Post service running on PORT: ${PORT}`);
    });
    
  } catch (error) {
    logger.error('Failed to connect server!', error)
    process.exit(1)
  }
  
}

connectServer()

process.on("unhandledRejection", (reason, promise) => {
  logger.error("UnHandled Rejection! Shutting down...");
  logger.error(reason);
});
