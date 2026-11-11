import { config } from "./env.js";

const parseRedisUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port || "6379", 10),
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
};

export const redisConnectionOptions = parseRedisUrl(config.redis.url);
