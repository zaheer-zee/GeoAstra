import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully via Prisma");
  } catch (error) {
    logger.error("Failed to connect to database", { error: error.message });
    throw error;
  }
};

export default prisma;

