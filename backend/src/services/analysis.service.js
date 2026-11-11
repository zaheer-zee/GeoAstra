import prisma from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";
import { addAnalysisJob, cancelQueueJob } from "../queues/analysis.queue.js";

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
      // In development/testing, if sceneId doesn't exist, create a baseline scene
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

    // Cancel in queue
    await cancelQueueJob(analysisId);

    // Update in DB
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
};

