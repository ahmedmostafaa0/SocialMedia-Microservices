const winston = require("winston");
const {json, errors, timestamp, splat, colorize, combine, simple} = winston.format

const logger = winston.createLogger({
  level: process.env.NODE_ENV ? "info" : 'debug',
  format: combine(
    json(),
    errors({stack: true}),
    timestamp(),
    splat()
  ),
  defaultMeta: { service: "identity-service" },
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    }),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

module.exports = logger
