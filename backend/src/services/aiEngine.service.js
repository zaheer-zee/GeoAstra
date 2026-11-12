import axios from "axios";
import { config } from "../config/env.js";

const client = axios.create({
  baseURL: config.aiEngine.url,
  timeout: config.aiEngine.timeoutMs,
  headers: {
    "X-Internal-API-Key": config.aiEngine.internalApiKey,
  },
});

export const aiEngineService = {
  /**
   * Ping ai-engine /health endpoint
   */
  async checkHealth() {
    const startTime = Date.now();
    try {
      const response = await client.get("/health");
      const latencyMs = Date.now() - startTime;
      return {
        healthy: true,
        latencyMs,
        data: response.data,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        healthy: false,
        latencyMs,
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Run scientific analysis pipeline on ai-engine
   */
  async triggerAnalysis(payload) {
    const response = await client.post("/internal/v1/analysis/run", payload);
    return response.data;
  },

  /**
   * Trigger multi-provider AI explanation on ai-engine
   */
  async explainAnalysis(payload) {
    const response = await client.post("/internal/v1/ai/explain", payload);
    return response.data;
  },

  /**
   * Query registered AI providers and their configuration status
   */
  async getAiProviders() {
    const response = await client.get("/internal/v1/ai/providers");
    return response.data;
  },
};
