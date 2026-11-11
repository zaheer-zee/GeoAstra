import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";
import { logger } from "../utils/logger.js";

export const ANALYSIS_QUEUE_NAME = "analysis-queue";

let _analysisQueue = null;

export const getAnalysisQueue = () => {
  if (!_analysisQueue) {
    _analysisQueue = new Queue(ANALYSIS_QUEUE_NAME, {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        attempts: 1, // Fail immediately in dev as configured
        removeOnComplete: {
          age: 24 * 3600,
          count: 100,
        },
        removeOnFail: {
          age: 48 * 3600,
          count: 200,
        },
      },
    });
  }
  return _analysisQueue;
};

export const closeAnalysisQueue = async () => {
  if (_analysisQueue) {
    await _analysisQueue.close();
    _analysisQueue = null;
  }
};

export const addAnalysisJob = async (jobData) => {
  logger.info(`Enqueueing analysis job`, { analysisId: jobData.analysisId });
  const queue = getAnalysisQueue();
  return queue.add("run-analysis", jobData, {
    jobId: jobData.analysisId,
  });
};

export const cancelQueueJob = async (jobId) => {
  const queue = getAnalysisQueue();
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
    logger.info(`Removed job from queue`, { jobId });
    return true;
  }
  return false;
};
