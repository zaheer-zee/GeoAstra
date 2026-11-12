import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import prisma from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";
import { addAnalysisJob, cancelQueueJob } from "../queues/analysis.queue.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

export const analysisService = {
  async createAnalysis(
    userId,
    {
      areaId,
      sceneId,
      algorithm = "rxd",
      anomalyMethod,
      targetMethod,
      targetSignatureId,
      runProviderComparison = false,
      algorithmConfiguration = {},
    }
  ) {
    // 1. Verify Area ownership
    const area = await prisma.area.findUnique({
      where: { id: areaId },
    });

    if (!area) {
      throw ApiError.notFound("Area not found");
    }

    if (area.userId !== userId) {
      throw ApiError.forbidden("Access denied: You do not own this area");
    }

    // 2. Verify or resolve Scene
    let scene = await prisma.satelliteScene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      scene = await prisma.satelliteScene.create({
        data: {
          id: sceneId,
          provider: "nasa_emit",
          sensor: "EMIT",
          externalSceneId: `EMIT_L2A_RFL_${Date.now()}`,
          acquisitionTime: new Date(),
          footprint: area.geometry,
          productLevel: "L2A",
          wavelengthMetadata: { bands_count: 285, range_nm: [381, 2493] },
          spatialResolution: 60.0,
        },
      });
    }

    // 3. Verify TargetSignature if specified
    if (targetSignatureId) {
      const signature = await prisma.targetSignature.findUnique({
        where: { id: targetSignatureId },
      });
      if (!signature) {
        throw ApiError.notFound("Target signature not found");
      }
    }

    // 4. Construct configuration
    const mergedConfig = {
      ...algorithmConfiguration,
      algorithm: algorithm || "rxd",
      anomalyMethod: anomalyMethod || (algorithm === "rxd" ? "rxd" : null),
      targetMethod: targetMethod || null,
      runProviderComparison: Boolean(runProviderComparison),
    };

    // 5. Create Analysis record
    const analysis = await prisma.analysis.create({
      data: {
        userId,
        areaId,
        sceneId: scene.id,
        status: "QUEUED",
        algorithmConfiguration: mergedConfig,
        targetSignatureId: targetSignatureId || null,
      },
    });

    // 6. Enqueue BullMQ job
    await addAnalysisJob({
      analysisId: analysis.id,
      userId,
      areaId,
      sceneId: scene.id,
      algorithm,
      algorithmConfiguration: mergedConfig,
      targetSignatureId: targetSignatureId || null,
    });

    return {
      analysisId: analysis.id,
      status: analysis.status,
      message: "Analysis job created",
    };
  },

  async getAnalysis(userId, analysisId) {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        area: true,
        scene: true,
        targetSignature: true,
        detectionResults: true,
        providerRuns: true,
      },
    });

    if (!analysis) {
      throw ApiError.notFound("Analysis not found");
    }

    if (analysis.userId !== userId) {
      throw ApiError.forbidden("Access denied: You do not own this analysis");
    }

    return analysis;
  },

  async listAnalyses(userId) {
    return prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        area: { select: { id: true, name: true } },
        scene: { select: { id: true, sensor: true, externalSceneId: true } },
        detectionResults: { select: { id: true, resultType: true, algorithm: true } },
      },
    });
  },

  async cancelAnalysis(userId, analysisId) {
    const analysis = await this.getAnalysis(userId, analysisId);

    if (["COMPLETED", "FAILED"].includes(analysis.status)) {
      throw ApiError.badRequest(`Cannot cancel an analysis with status ${analysis.status}`);
    }

    await cancelQueueJob(analysisId);

    const cancelled = await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "CANCELLED",
        errorMessage: "Analysis cancelled by user",
        completedAt: new Date(),
      },
    });

    return cancelled;
  },

  /**
   * Get consolidated results (detection metrics, AI provider comparisons)
   */
  async getAnalysisResults(userId, analysisId) {
    const analysis = await this.getAnalysis(userId, analysisId);

    const detection = analysis.detectionResults[0] || null;

    return {
      analysisId: analysis.id,
      status: analysis.status,
      algorithm: analysis.algorithmConfiguration?.algorithm || "rxd",
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt,
      scene: {
        id: analysis.scene.id,
        sensor: analysis.scene.sensor,
        productLevel: analysis.scene.productLevel,
      },
      detectionResults: analysis.detectionResults,
      providerRuns: analysis.providerRuns,
      metrics: detection?.metricsJson || null,
      artifacts: {
        previewUrl: `/api/v1/analysis/${analysisId}/preview`,
        rasterUrl: `/api/v1/analysis/${analysisId}/raster`,
        polygonsUrl: `/api/v1/analysis/${analysisId}/polygons`,
      },
      aiExplanations: {
        comparativeSummary: detection?.processingMetadata?.comparative_summary || null,
        providerRuns: analysis.providerRuns.map((r) => ({
          provider: r.provider,
          model: r.model,
          status: r.status,
          latencyMs: r.latencyMs,
          response: r.responseJson?.text || null,
          error: r.error,
        })),
      },
    };
  },

  /**
   * Helper to resolve artifact file path on disk
   */
  async getArtifactFilePath(userId, analysisId, type) {
    const analysis = await this.getAnalysis(userId, analysisId);
    const detection = analysis.detectionResults[0];

    let relativeKey = null;
    if (type === "preview") {
      relativeKey = detection?.previewStorageKey || `storage/previews/${analysisId}_preview.png`;
    } else if (type === "raster") {
      relativeKey = detection?.rasterStorageKey || `storage/output/${analysisId}_score.tif`;
    } else if (type === "polygons") {
      relativeKey = detection?.vectorStorageKey || `storage/output/${analysisId}_polygons.geojson`;
    } else {
      throw ApiError.badRequest(`Unknown artifact type '${type}'`);
    }

    const absolutePath = path.resolve(REPO_ROOT, relativeKey);
    // Path traversal check
    if (!absolutePath.startsWith(REPO_ROOT)) {
      throw ApiError.forbidden("Access denied: Invalid file path");
    }

    if (!fs.existsSync(absolutePath)) {
      throw ApiError.notFound(`Artifact '${type}' not found on disk`);
    }

    return absolutePath;
  },
};
