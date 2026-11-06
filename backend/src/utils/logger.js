export const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({ level: "INFO", message: msg, ...meta, timestamp: new Date().toISOString() }));
  },
  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({ level: "WARN", message: msg, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (msg, meta = {}) => {
    console.error(JSON.stringify({ level: "ERROR", message: msg, ...meta, timestamp: new Date().toISOString() }));
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(JSON.stringify({ level: "DEBUG", message: msg, ...meta, timestamp: new Date().toISOString() }));
    }
  },
};

