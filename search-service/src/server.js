require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const Redis = require("ioredis");
const {rateLimit} = require('express-rate-limit')
const {RedisStore} = require('rate-limit-redis')

const logger = require("./utils/logger");
const errorHandler = require("./middlewares/errorHandler");
const searchRoutes = require("./routes/search");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const {handlePostCreated, handlePostDeleted} = require('./middlewares/eventHandler')

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to DB successfully!"))
  .catch((e) => logger.error(`Failed connect to DB: ${e}`));

const redisClient = new Redis(process.env.REDIS_URI)

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        logger.warn(`Rate limit exceed for ip: ${req.ip}`)
        return res.status(429).json({success: false, message: 'Too many requests!'})
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
})

const app = express()
const PORT = process.env.PORT || 3004

app.use(cors())
app.use(helmet())
app.use(express.json())

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`Request body: ${req.body}`)
    next()
})

app.use(rateLimiter)

app.use('/api/search', searchRoutes)

app.use(errorHandler)

async function connectServer() {
    try {
        await connectToRabbitMQ()
        await consumeEvent('post.created', handlePostCreated)
        await consumeEvent('post.deleted', handlePostDeleted)
        app.listen(PORT, () => logger.info(`Server running on port: ${PORT}`))
    } catch (error) {
        logger.error(`Failed to connect server: ${error}`)
        process.exit(1)
    }
}

connectServer()

process.on('unhandledRejection', (reason, promise) =>{
    logger.error('Unhandled Rejection! Shutting down...')
    logger.error(reason)
})