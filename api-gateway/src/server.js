require('dotenv').config()

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const Redis = require("ioredis");
const Proxy = require("express-http-proxy");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");

const errorHandler = require("./middleware/errorHandler");
const {validataToken} = require('./middleware/auth')
const logger = require("./utils/logger");

const redisClient = new Redis(process.env.REDIS_URI);

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests!" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

const proxyOpts = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, '/api')
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.stack}`)
    return res.status(500).json({success: false, message: `Internal server error`, error: err.message})
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request Body: ${req.body}`);
  next();
});

app.use(rateLimiter);

app.use('/v1/auth', Proxy(process.env.IDENTITY_SERVICE_URI, {
  ...proxyOpts,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
  proxyReqOpts.headers['Content-Type'] = 'application/json'
  return proxyReqOpts
},
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response recieved from Identity service ${proxyRes.statusCode}`)
    return proxyResData
  }
}))

app.use('/v1/posts', validataToken, Proxy(process.env.POST_SERVICE_URI, {
  ...proxyOpts,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json'
    proxyReqOpts.headers['x-user-id'] = srcReq.user.userId

    return proxyReqOpts
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Post service: ${proxyRes.statusCode}`)
    return proxyResData
  }
}))

app.use('/v1/media', validataToken,Proxy(process.env.MEDIA_SERVICE_URI, {
  ...proxyOpts,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['x-user-id'] = srcReq.user.userId
    if(!srcReq.headers['content-type'].startsWith('multipart/form-data')){
      proxyReqOpts.headers['Content-Type'] = 'application/json'
    }
    return proxyReqOpts
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response recieved Media service: ${proxyRes.statusCode}`)
    return proxyResData
  },
  parseReqBody: false
}))

app.use('/v1/search', validataToken,Proxy(process.env.SEARCH_SERVICE_URI, {
  ...proxyOpts,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['x-user-id'] = srcReq.user.userId
      proxyReqOpts.headers['Content-Type'] = 'application/json'
    return proxyReqOpts
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response recieved Search service: ${proxyRes.statusCode}`)
    return proxyResData
  }
}))

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`API Gateway running on port: ${PORT}`);
  logger.info(
    `Identity service is running on PORT: ${process.env.IDENTITY_SERVICE_URI}`
  );
  logger.info(
    `Post service is running on PORT: ${process.env.POST_SERVICE_URI}`
  );
  logger.info(
    `Media service is running on PORT: ${process.env.MEDIA_SERVICE_URI}`
  );
  logger.info(
    `Search service is running on PORT: ${process.env.SEARCH_SERVICE_URI}`
  );
  logger.info(`Redis URI: ${process.env.REDIS_URI}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("UnHandled Rejection! Shutting down...");
  logger.error(reason);
  server.close(() => {
    process.exit(1);
  });
});
