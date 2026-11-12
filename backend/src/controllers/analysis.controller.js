import { analysisService } from "../services/analysis.service.js";

export const analysisController = {
  async createAnalysis(req, res, next) {
    try {
      const result = await analysisService.createAnalysis(req.user.id, req.body);
      return res.status(202).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listAnalyses(req, res, next) {
    try {
      const analyses = await analysisService.listAnalyses(req.user.id);
      return res.status(200).json({
        success: true,
        data: { analyses, count: analyses.length },
      });
    } catch (error) {
      next(error);
    }
  },

  async getAnalysis(req, res, next) {
    try {
      const analysis = await analysisService.getAnalysis(req.user.id, req.params.analysisId);
      return res.status(200).json({
        success: true,
        data: { analysis },
      });
    } catch (error) {
      next(error);
    }
  },

  async getResults(req, res, next) {
    try {
      const results = await analysisService.getAnalysisResults(req.user.id, req.params.analysisId);
      return res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPreview(req, res, next) {
    try {
      const filePath = await analysisService.getArtifactFilePath(req.user.id, req.params.analysisId, "preview");
      res.setHeader("Content-Type", "image/png");
      return res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  },

  async getRaster(req, res, next) {
    try {
      const filePath = await analysisService.getArtifactFilePath(req.user.id, req.params.analysisId, "raster");
      res.setHeader("Content-Type", "image/tiff");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.analysisId}_score.tif"`);
      return res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  },

  async getPolygons(req, res, next) {
    try {
      const filePath = await analysisService.getArtifactFilePath(req.user.id, req.params.analysisId, "polygons");
      res.setHeader("Content-Type", "application/geo+json");
      return res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  },

  async cancelAnalysis(req, res, next) {
    try {
      const cancelled = await analysisService.cancelAnalysis(req.user.id, req.params.analysisId);
      return res.status(200).json({
        success: true,
        message: "Analysis job cancelled",
        data: { analysis: cancelled },
      });
    } catch (error) {
      next(error);
    }
  },
};
