import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import areaRoutes from "./routes/area.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());

// Base health endpoints
app.use("/", healthRoutes);

// Versioned API routes
app.use("/api/v1", healthRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", areaRoutes);
app.use("/api/v1", analysisRoutes);

// Root informational endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    service: "GeoAstra AI Application Backend",
    version: "0.1.0",
    status: "online",
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;

