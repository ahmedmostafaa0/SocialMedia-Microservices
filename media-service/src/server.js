require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const mediaRoutes = require("./routes/media");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./middlewares/eventHandler");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info(`Connected to MongoDB`))
  .catch((e) => logger.error(`MongoDB connection error: ${e}`));

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Recived ${req.method} request to ${req.url}`);
  logger.info(`Request body: ${req.body}`);
  next();
});

app.use('/api/media', mediaRoutes)

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ()
    await consumeEvent('post.deleted', handlePostDeleted)
    app.listen(PORT, () => {
      logger.info(`Media service running on PORT: ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to connect server: ', error)
    process.env(1)
  }
}


startServer()

process.on("unhandledRejection", (reason, promise) => {
  logger.error("UnHandled Rejection! Shutting down...");
  logger.error(reason);
});
