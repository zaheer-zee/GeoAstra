import prisma from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const DEFAULT_BENCHMARK_SCENES = [
  {
    id: "Indian_pines",
    provider: "NASA/JPL",
    sensor: "AVIRIS",
    externalSceneId: "AVIRIS_INDIAN_PINES_1992",
    acquisitionTime: new Date("1992-06-12T12:00:00.000Z"),
    footprint: {
      type: "Polygon",
      coordinates: [
        [
          [-87.05, 40.40],
          [-87.00, 40.40],
          [-87.00, 40.45],
          [-87.05, 40.45],
          [-87.05, 40.40],
        ],
      ],
    },
    productLevel: "L2A_Surface_Reflectance",
    spatialResolution: 20.0,
    storageKey: "storage/input/Indian_pines_corrected.mat",
    metadataJson: {
      bands_count: 200,
      spectral_range: "0.4 - 2.5 µm",
      description: "Indian Pines agricultural test site with verified ground truth crops.",
      has_ground_truth: true,
    },
  },
  {
    id: "PaviaU",
    provider: "University of Pavia",
    sensor: "ROSIS",
    externalSceneId: "ROSIS_PAVIA_UNIVERSITY_2001",
    acquisitionTime: new Date("2001-07-08T10:30:00.000Z"),
    footprint: {
      type: "Polygon",
      coordinates: [
        [
          [9.15, 45.18],
          [9.18, 45.18],
          [9.18, 45.20],
          [9.15, 45.20],
          [9.15, 45.18],
        ],
      ],
    },
    productLevel: "L2A_Reflectance",
    spatialResolution: 1.3,
    storageKey: "storage/input/PaviaU.mat",
    metadataJson: {
      bands_count: 103,
      spectral_range: "0.43 - 0.86 µm",
      description: "Pavia University urban flight line with 9 urban ground truth classes.",
      has_ground_truth: true,
    },
  },
  {
    id: "EMIT_L2A_RFL_INDIA_001",
    provider: "NASA/JPL",
    sensor: "EMIT",
    externalSceneId: "EMIT_L2A_RFL_001_20230305T062334_2306404_008",
    acquisitionTime: new Date("2023-03-05T06:23:34.000Z"),
    footprint: {
      type: "Polygon",
      coordinates: [
        [
          [74.5, 23.0],
          [75.5, 23.0],
          [75.5, 24.0],
          [74.5, 24.0],
          [74.5, 23.0],
        ],
      ],
    },
    productLevel: "L2A_RFL",
    spatialResolution: 60.0,
    storageKey: null,
    metadataJson: {
      bands_count: 285,
      spectral_range: "381 - 2493 nm",
      orbit: "ISS",
      cloud_fraction: 0.05,
      description: "NASA Earth Surface Mineral Dust Source Investigation over western India.",
    },
  },
];

export const satelliteService = {
  /**
   * Seed default hyperspectral benchmark scenes
   */
  async ensureDefaultScenes() {
    for (const scene of DEFAULT_BENCHMARK_SCENES) {
      await prisma.satelliteScene.upsert({
        where: { id: scene.id },
        update: {},
        create: scene,
      });
    }
  },

  /**
   * List available scenes
   */
  async listScenes({ provider, sensor, limit = 50, offset = 0 } = {}) {
    await this.ensureDefaultScenes();

    const where = {};
    if (provider) where.provider = provider;
    if (sensor) where.sensor = sensor;

    const [total, scenes] = await Promise.all([
      prisma.satelliteScene.count({ where }),
      prisma.satelliteScene.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: [{ storageKey: "asc" }, { acquisitionTime: "desc" }],
      }),
    ]);

    return { total, count: scenes.length, scenes };
  },

  /**
   * Get single scene by ID
   */
  async getSceneById(sceneId) {
    await this.ensureDefaultScenes();

    const scene = await prisma.satelliteScene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      throw ApiError.notFound(`Scene '${sceneId}' not found`);
    }

    return scene;
  },

  /**
   * Spatial / temporal search for scenes
   */
  async searchScenes({ sensor, provider, startDate, endDate } = {}) {
    await this.ensureDefaultScenes();

    const where = {};
    if (sensor) where.sensor = sensor;
    if (provider) where.provider = provider;

    if (startDate || endDate) {
      where.acquisitionTime = {};
      if (startDate) where.acquisitionTime.gte = new Date(startDate);
      if (endDate) where.acquisitionTime.lte = new Date(endDate);
    }

    const scenes = await prisma.satelliteScene.findMany({
      where,
      orderBy: { acquisitionTime: "desc" },
    });

    return {
      query: { sensor, provider, startDate, endDate },
      resultsCount: scenes.length,
      scenes,
    };
  },
};
