import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createSignature,
  listSignatures,
  getSignature,
  deleteSignature,
} from "../controllers/signature.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", createSignature);
router.get("/", listSignatures);
router.get("/:signatureId", getSignature);
router.delete("/:signatureId", deleteSignature);

export default router;

