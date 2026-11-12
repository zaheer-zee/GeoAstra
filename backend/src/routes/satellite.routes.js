import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listScenes,
  getScene,
  searchScenes,
} from "../controllers/satellite.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/search", searchScenes);
router.get("/", listScenes);
router.get("/:sceneId", getScene);

export default router;

