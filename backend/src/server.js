import app from "./app.js";
import { config } from "./config/env.js";
import { logger } from "./utils/logger.js";

const server = app.listen(config.port, () => {
  logger.info(`GeoSpectra Backend listening on port ${config.port}`, {
    port: config.port,
    environment: config.env,
    aiEngineUrl: config.aiEngine.url,
  });
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
  });
});

