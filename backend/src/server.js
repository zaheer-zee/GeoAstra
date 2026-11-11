import app from "./app.js";
import { config } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { connectDatabase } from "./config/database.js";
import { startAnalysisWorker } from "./workers/analysis.worker.js";

const startServer = async () => {
  try {
    await connectDatabase();
    const worker = startAnalysisWorker();
    logger.info("BullMQ Analysis Worker initialized");

    const server = app.listen(config.port, () => {
      logger.info(`GeoAstra Backend listening on port ${config.port}`, {
        port: config.port,
        environment: config.env,
        aiEngineUrl: config.aiEngine.url,
      });
    });

    const shutdown = async () => {
      logger.info("Shutting down gracefully...");
      await worker.close();
      server.close(() => {
        logger.info("Process terminated");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
};

startServer();

