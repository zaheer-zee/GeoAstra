/**
 * Initial Seed Areas of Interest (GeoJSON Polygons)
 * Geographically accurate polygons consistent with Dashboard and Scene footprints.
 */

import { AOIFeature } from "../types/geospatial.types";

export const INITIAL_MOCK_AOIS: AOIFeature[] = [
  {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-87.05, 40.4],
          [-87.0, 40.4],
          [-87.0, 40.45],
          [-87.05, 40.45],
          [-87.05, 40.4],
        ],
      ],
    },
    properties: {
      id: "a977389c-c845-4919-bc40-14e496664b5f",
      name: "Indian Pines Agricultural Sector",
      description: "Agricultural hyperspectral benchmark area with verified land-cover ground truth classes.",
      location: "Northwestern Indiana, USA",
      color: "#10B981", // emerald
      areaKm2: 42.5,
      perimeterKm: 26.2,
      crs: "EPSG:4326",
      createdAt: "2024-03-01T10:00:00Z",
      updatedAt: "2024-03-14T15:30:00Z",
      centroid: [-87.025, 40.425],
      bbox: [-87.05, 40.4, -87.0, 40.45],
      activeSceneName: "Indian_pines",
    },
  },
  {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [9.15, 45.18],
          [9.17, 45.18],
          [9.17, 45.2],
          [9.15, 45.2],
          [9.15, 45.18],
        ],
      ],
    },
    properties: {
      id: "b2881471-70e2-45e3-99b8-3924f7e2714c",
      name: "Pavia University Urban Sector",
      description: "High spatial resolution urban hyperspectral survey over the University of Pavia campus.",
      location: "Pavia, Northern Italy",
      color: "#38BDF8", // sky
      areaKm2: 12.8,
      perimeterKm: 14.4,
      crs: "EPSG:4326",
      createdAt: "2024-01-10T08:15:00Z",
      updatedAt: "2024-01-20T11:45:00Z",
      centroid: [9.16, 45.19],
      bbox: [9.15, 45.18, 9.17, 45.2],
      activeSceneName: "PaviaU",
    },
  },
  {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.85, 18.5],
          [73.9, 18.5],
          [73.9, 18.55],
          [73.85, 18.55],
          [73.85, 18.5],
        ],
      ],
    },
    properties: {
      id: "c7992582-81f3-46f4-a0c9-4035a8f3825d",
      name: "Western India Mineral Survey Sector",
      description: "NASA EMIT imaging spectroscopy sector mapping surface mineralogy and arid soil reflectance.",
      location: "Western India",
      color: "#F59E0B", // amber
      areaKm2: 64.0,
      perimeterKm: 32.0,
      crs: "EPSG:4326",
      createdAt: "2024-02-15T14:20:00Z",
      updatedAt: "2024-03-01T09:10:00Z",
      centroid: [73.875, 18.525],
      bbox: [73.85, 18.5, 73.9, 18.55],
      activeSceneName: "EMIT_L2A_RFL_INDIA_001",
    },
  },
  {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [5.46, 23.21],
          [5.6, 23.21],
          [5.59, 23.35],
          [5.45, 23.34],
          [5.46, 23.21],
        ],
      ],
    },
    properties: {
      id: "aoi-hoggar",
      name: "Hoggar Hydrothermal Alteration Zone",
      description: "High-temperature hydrothermal alteration zone mineral mapping using SWIR bands.",
      location: "Tamanrasset, Algeria",
      color: "#EC4899", // pink
      areaKm2: 520.8,
      perimeterKm: 94.2,
      crs: "EPSG:32631 (UTM 31N)",
      createdAt: "2024-02-20T16:00:00Z",
      updatedAt: "2024-03-03T18:20:00Z",
      centroid: [5.525, 23.275],
      bbox: [5.45, 23.21, 5.6, 23.35],
      activeSceneName: "EMIT_L2A_ALGERIA_MINERAL_22",
    },
  },
  {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-87.03, 40.47],
          [-86.98, 40.47],
          [-86.98, 40.5],
          [-87.03, 40.5],
          [-87.03, 40.47],
        ],
      ],
    },
    properties: {
      id: "aoi-indian-pines",
      name: "Indian Pines Agricultural Test Site",
      description: "Classic AVIRIS benchmark site for crop species and soil type spectral classification.",
      location: "Northwestern Indiana, USA",
      color: "#8B5CF6", // purple
      areaKm2: 24.6,
      perimeterKm: 20.1,
      crs: "EPSG:32616 (UTM 16N)",
      createdAt: "2023-06-01T09:00:00Z",
      updatedAt: "2023-06-15T12:00:00Z",
      centroid: [-87.005, 40.485],
      bbox: [-87.03, 40.47, -86.98, 40.5],
      activeSceneName: "INDIAN_PINES_AVIRIS_BENCHMARK",
    },
  },
];

