import { satelliteService } from "../services/satellite.service.js";

export const listScenes = async (req, res, next) => {
  try {
    const { provider, sensor, limit, offset } = req.query;
    const result = await satelliteService.listScenes({
      provider,
      sensor,
      limit,
      offset,
    });
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getScene = async (req, res, next) => {
  try {
    const scene = await satelliteService.getSceneById(req.params.sceneId);
    res.status(200).json({ status: "success", data: scene });
  } catch (error) {
    next(error);
  }
};

export const searchScenes = async (req, res, next) => {
  try {
    const { sensor, provider, startDate, endDate } = req.query;
    const result = await satelliteService.searchScenes({
      sensor,
      provider,
      startDate,
      endDate,
    });
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

