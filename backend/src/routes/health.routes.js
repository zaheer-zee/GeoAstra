import { Router } from "express";
import { healthController } from "../controllers/health.controller.js";

const router = Router();

router.get("/health", healthController.getHealth);
router.get("/health/services", healthController.getServicesHealth);

export default router;

