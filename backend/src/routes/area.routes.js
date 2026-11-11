import { Router } from "express";
import { z } from "zod";
import { areaController } from "../controllers/area.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

const createAreaSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Area name is required"),
    geometry: z.object({
      type: z.enum(["Polygon", "MultiPolygon"]),
      coordinates: z.array(z.any()),
    }),
    crs: z.string().optional(),
  }),
});

const updateAreaSchema = z.object({
  params: z.object({
    areaId: z.string().uuid("Invalid area ID format"),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    geometry: z
      .object({
        type: z.enum(["Polygon", "MultiPolygon"]),
        coordinates: z.array(z.any()),
      })
      .optional(),
    crs: z.string().optional(),
  }),
});

const areaIdParamSchema = z.object({
  params: z.object({
    areaId: z.string().uuid("Invalid area ID format"),
  }),
});

// All area routes require authentication
router.use(requireAuth);

router.post("/areas", validate(createAreaSchema), areaController.createArea);
router.get("/areas", areaController.listAreas);
router.get("/areas/:areaId", validate(areaIdParamSchema), areaController.getArea);
router.patch("/areas/:areaId", validate(updateAreaSchema), areaController.updateArea);
router.delete("/areas/:areaId", validate(areaIdParamSchema), areaController.deleteArea);

export default router;

