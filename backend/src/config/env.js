import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5001", 10),
  jwt: {
    secret: process.env.JWT_SECRET || "geospectra_dev_jwt_secret_key_2026_super_secure",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  aiEngine: {
    url: process.env.AI_ENGINE_URL || "http://localhost:8000",
    internalApiKey: process.env.INTERNAL_API_KEY || "dev-secret-key-geospectra",
    timeoutMs: parseInt(process.env.AI_ENGINE_TIMEOUT_MS || "10000", 10),
  },
  database: {
    url: process.env.DATABASE_URL || "postgresql://geospectra:geospectra_dev_password@localhost:5432/geospectra?schema=public",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
};

