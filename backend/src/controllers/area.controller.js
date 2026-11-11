import { areaService } from "../services/area.service.js";

export const areaController = {
  async createArea(req, res, next) {
    try {
      const { name, geometry, crs } = req.body;
      const area = await areaService.createArea(req.user.id, { name, geometry, crs });
      return res.status(201).json({
        success: true,
        message: "Area created successfully",
        data: { area },
      });
    } catch (error) {
      next(error);
    }
  },

  async listAreas(req, res, next) {
    try {
      const areas = await areaService.listAreas(req.user.id);
      return res.status(200).json({
        success: true,
        data: { areas, count: areas.length },
      });
    } catch (error) {
      next(error);
    }
  },

  async getArea(req, res, next) {
    try {
      const area = await areaService.getAreaById(req.user.id, req.params.areaId);
      return res.status(200).json({
        success: true,
        data: { area },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateArea(req, res, next) {
    try {
      const area = await areaService.updateArea(req.user.id, req.params.areaId, req.body);
      return res.status(200).json({
        success: true,
        message: "Area updated successfully",
        data: { area },
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteArea(req, res, next) {
    try {
      const result = await areaService.deleteArea(req.user.id, req.params.areaId);
      return res.status(200).json({
        success: true,
        message: "Area deleted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};

