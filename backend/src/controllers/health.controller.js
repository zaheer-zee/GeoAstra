import { config } from "../config/env.js";
import { aiEngineService } from "../services/aiEngine.service.js";

export const healthController = {
  getHealth(req, res) {
    return res.status(200).json({
      status: "healthy",
      service: "geoastra-backend",
      version: "0.1.0",
      environment: config.env,
      timestamp: new Date().toISOString(),
    });
  },

  async getServicesHealth(req, res) {
    const aiEngineHealth = await aiEngineService.checkHealth();

    const isSystemHealthy = aiEngineHealth.healthy;
    const statusCode = isSystemHealthy ? 200 : 503;

    return res.status(statusCode).json({
      status: isSystemHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        backend: {
          status: "healthy",
          service: "geoastra-backend",
          version: "0.1.0",
        },
        aiEngine: {
          status: aiEngineHealth.healthy ? "healthy" : "unreachable",
          latencyMs: aiEngineHealth.latencyMs,
          details: aiEngineHealth.data || null,
          error: aiEngineHealth.error || null,
        },
      },
    });
  },
};

