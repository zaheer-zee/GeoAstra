import prisma from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";

export const areaService = {
  async createArea(userId, { name, geometry, crs = "EPSG:4326" }) {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      throw ApiError.badRequest("Invalid GeoJSON geometry structure");
    }

    if (!["Polygon", "MultiPolygon"].includes(geometry.type)) {
      throw ApiError.badRequest("Area of Interest geometry must be a Polygon or MultiPolygon");
    }

    const area = await prisma.area.create({
      data: {
        userId,
        name: name.trim(),
        geometry,
        crs,
      },
    });

    return area;
  },

  async listAreas(userId) {
    return prisma.area.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async getAreaById(userId, areaId) {
    const area = await prisma.area.findUnique({
      where: { id: areaId },
    });

    if (!area) {
      throw ApiError.notFound("Area not found");
    }

    if (area.userId !== userId) {
      throw ApiError.forbidden("Access denied: You do not own this area");
    }

    return area;
  },

  async updateArea(userId, areaId, updates) {
    await this.getAreaById(userId, areaId);

    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.crs !== undefined) updateData.crs = updates.crs;
    if (updates.geometry !== undefined) {
      if (!updates.geometry.type || !updates.geometry.coordinates) {
        throw ApiError.badRequest("Invalid GeoJSON geometry structure");
      }
      updateData.geometry = updates.geometry;
    }

    const updated = await prisma.area.update({
      where: { id: areaId },
      data: updateData,
    });

    return updated;
  },

  async deleteArea(userId, areaId) {
    await this.getAreaById(userId, areaId);

    await prisma.area.delete({
      where: { id: areaId },
    });

    return { id: areaId, deleted: true };
  },
};

