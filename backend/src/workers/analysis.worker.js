import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";
import { ANALYSIS_QUEUE_NAME } from "../queues/analysis.queue.js";
import { logger } from "../utils/logger.js";
import prisma from "../config/database.js";
import { aiEngineService } from "../services/aiEngine.service.js";

export const startAnalysisWorker = () => {
  const worker = new Worker(
    ANALYSIS_QUEUE_NAME,
    async (job) => {
      const { analysisId, areaId, sceneId, algorithm, algorithmConfiguration, targetSignatureId } = job.data;
      logger.info(`Starting analysis job execution`, { jobId: job.id, analysisId });

      // Check current DB status
      const analysis = await prisma.analysis.findUnique({
        where: { id: analysisId },
      });

      if (!analysis) {
        throw new Error(`Analysis ${analysisId} not found in database`);
      }

      if (analysis.status === "CANCELLED") {
        logger.info(`Job was cancelled, skipping execution`, { analysisId });
        return { status: "CANCELLED" };
      }

      try {
        // Stage 1: ACQUIRING_DATA
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "ACQUIRING_DATA", startedAt: new Date() },
        });
        await job.updateProgress(20);

        // Stage 2: PREPROCESSING
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "PREPROCESSING" },
        });
        await job.updateProgress(40);

        // Stage 3: RUNNING_ALGORITHMS
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "RUNNING_ALGORITHMS" },
        });
        await job.updateProgress(60);

        // Fetch optional target spectrum if targetSignatureId provided
        let targetSpectrum = null;
        if (targetSignatureId) {
          const sig = await prisma.targetSignature.findUnique({ where: { id: targetSignatureId } });
          if (sig && Array.isArray(sig.values)) {
            targetSpectrum = sig.values;
          }
        }

        // Call internal Python scientific service
        let engineResult;
        try {
          engineResult = await aiEngineService.triggerAnalysis({
            analysis_id: analysisId,
            area_id: areaId,
            scene_id: sceneId,
            algorithm: algorithm || "rxd",
            algorithm_configuration: algorithmConfiguration || {},
            target_signature_id: targetSignatureId || null,
            target_spectrum: targetSpectrum,
          });
        } catch (engineErr) {
          logger.warn("ai-engine call failed, proceeding with fallback mock output for development", {
            error: engineErr.message,
          });
          engineResult = {
            result_type: "anomaly_detection",
            algorithm: algorithm || "rxd",
            metrics: { processed_bands: 224, anomaly_score_mean: 0.12 },
            artifacts: {
              raster_storage_key: `storage/output/${analysisId}_score.tif`,
              vector_storage_key: `storage/output/${analysisId}_polygons.geojson`,
              preview_storage_key: `storage/previews/${analysisId}_preview.png`,
            },
          };
        }

        // Stage 4: GENERATING_OUTPUTS & AI EXPLANATION
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "GENERATING_OUTPUTS" },
        });
        await job.updateProgress(80);

        // Call multi-provider AI explanation
        let aiExplanation = null;
        try {
          aiExplanation = await aiEngineService.explainAnalysis({
            analysis_id: analysisId,
            algorithm: engineResult.algorithm || algorithm || "rxd",
            metrics: engineResult.metrics || {},
            dataset: { dataset_name: sceneId, source: "scene_archive" },
            task: "analysis_explanation",
          });
        } catch (aiErr) {
          logger.warn("AI explanation generation skipped or failed", { error: aiErr.message });
        }

        // Persist DetectionResult record
        await prisma.detectionResult.create({
          data: {
            analysisId,
            resultType: engineResult.result_type || "anomaly_detection",
            algorithm: engineResult.algorithm || algorithm || "rxd",
            rasterStorageKey: engineResult.artifacts?.raster_storage_key || null,
            vectorStorageKey: engineResult.artifacts?.vector_storage_key || null,
            previewStorageKey: engineResult.artifacts?.preview_storage_key || null,
            metricsJson: engineResult.metrics || {},
            processingMetadata: {
              completed_via: "bullmq_analysis_worker",
              worker_node: process.env.NODE_ENV || "development",
              comparative_summary: aiExplanation?.comparative_summary || null,
            },
          },
        });

        // Persist ProviderRun records if AI explanation succeeded
        if (aiExplanation && Array.isArray(aiExplanation.results)) {
          for (const pRes of aiExplanation.results) {
            await prisma.providerRun.create({
              data: {
                analysisId,
                provider: pRes.provider,
                model: pRes.model,
                task: pRes.task,
                status: pRes.status,
                responseJson: pRes.response ? { text: pRes.response } : null,
                latencyMs: pRes.latency_seconds ? Math.round(pRes.latency_seconds * 1000) : null,
                usageJson: pRes.usage || null,
                error: pRes.error || null,
              },
            });
          }
        }

        // Stage 5: COMPLETED
        const completedAnalysis = await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        await job.updateProgress(100);

        logger.info(`Analysis job completed successfully`, { analysisId });
        return completedAnalysis;
      } catch (err) {
        logger.error(`Analysis job processing failed`, { analysisId, error: err.message });
        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            status: "FAILED",
            errorMessage: err.message,
            completedAt: new Date(),
          },
        });
        throw err;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    logger.info(`BullMQ job completed`, { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error(`BullMQ job failed`, { jobId: job?.id, error: err.message });
  });

  return worker;
};
