const winston = require("winston");
const { combine, colorize, json, simple, splat, errors, timestamp } =
  winston.format;

const logger = winston.createLogger({
  level: "info",
  format: combine(splat(), json(), timestamp(), errors({ stack: true })),
  defaultMeta: { service: "post-service" },
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    }),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

module.exports = logger;
