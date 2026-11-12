import { Router } from "express";
import { z } from "zod";
import { analysisController } from "../controllers/analysis.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

const createAnalysisSchema = z.object({
  body: z.object({
    areaId: z.string().uuid("Invalid area ID format"),
    sceneId: z.string().min(1, "Scene ID is required"),
    algorithm: z.enum(["rxd", "matched_filter", "cem", "combined", "fusion"]).default("rxd"),
    anomalyMethod: z.string().optional(),
    targetMethod: z.string().optional(),
    targetSignatureId: z.string().optional(),
    runProviderComparison: z.boolean().default(false),
    algorithmConfiguration: z.record(z.any()).optional(),
  }),
});

const analysisIdParamSchema = z.object({
  params: z.object({
    analysisId: z.string().uuid("Invalid analysis ID format"),
  }),
});

// All analysis routes require authentication
router.use(requireAuth);

router.post("/analysis", validate(createAnalysisSchema), analysisController.createAnalysis);
router.get("/analysis", analysisController.listAnalyses);
router.get("/analysis/:analysisId", validate(analysisIdParamSchema), analysisController.getAnalysis);
router.get("/analysis/:analysisId/results", validate(analysisIdParamSchema), analysisController.getResults);
router.get("/analysis/:analysisId/preview", validate(analysisIdParamSchema), analysisController.getPreview);
router.get("/analysis/:analysisId/raster", validate(analysisIdParamSchema), analysisController.getRaster);
router.get("/analysis/:analysisId/polygons", validate(analysisIdParamSchema), analysisController.getPolygons);
router.post("/analysis/:analysisId/cancel", validate(analysisIdParamSchema), analysisController.cancelAnalysis);

export default router;
