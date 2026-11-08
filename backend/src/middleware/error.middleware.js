import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  logger.error("Unhandled error encountered", {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

