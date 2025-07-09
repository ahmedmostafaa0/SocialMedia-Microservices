const winston = require("winston");
const { combine, colorize, errors, json, timestamp, simple, splat } =
  winston.format;
const logger = winston.createLogger({
  level: "info",
  format: combine(json(), timestamp(), splat(), errors({ stack: true })),
  defaultMeta: { service: "api-gateway-service" },
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    }),

    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

module.exports = logger;
