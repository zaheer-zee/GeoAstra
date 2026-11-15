import { BENCHMARK_SCENES } from "../../geospatial/data/mockScenes";
import { SceneFeature } from "../../geospatial/types/geospatial.types";
import { SceneCatalogItem } from "../types";

type SceneEnrichment = Pick<
  SceneCatalogItem,
  | "datasetId"
  | "provider"
  | "groundTruthAvailable"
  | "groundTruthClasses"
  | "dimensions"
  | "dataSizeBytes"
  | "cloudCoverPercent"
  | "tags"
  | "description"
  | "source"
  | "metadataNote"
  | "isSample"
>;

const enrichments: Record<string, SceneEnrichment> = {
  Indian_pines: {
    datasetId: "AVIRIS_INDIAN_PINES_1992",
    provider: "NASA Jet Propulsion Laboratory",
    groundTruthAvailable: true,
    groundTruthClasses: ["Corn", "Soybean", "Grass", "Woods"],
    dimensions: [145, 145],
    dataSizeBytes: 150_000_000,
    cloudCoverPercent: 0,
    tags: ["Indian Pines", "AVIRIS Benchmark", "Ground Truth Verified"],
    description: "Benchmark AVIRIS airborne hyperspectral observation over Purdue agricultural test site in northwestern Indiana. Calibrated across 200 bands.",
    source: "NASA / Purdue University",
    metadataNote: "Verified scientific hyperspectral datacube ready for spectral analysis.",
    isSample: false,
  },
  PaviaU: {
    datasetId: "ROSIS_PAVIA_UNIVERSITY_2001",
    provider: "DLR / University of Pavia",
    groundTruthAvailable: true,
    groundTruthClasses: ["Asphalt", "Meadows", "Gravel", "Trees", "Buildings"],
    dimensions: [610, 340],
    dataSizeBytes: 180_000_000,
    cloudCoverPercent: 0,
    tags: ["Pavia University", "ROSIS Benchmark", "High Resolution Urban"],
    description: "ROSIS airborne hyperspectral flightline over the University of Pavia campus in northern Italy. 103 spectral bands.",
    source: "DLR / University of Pavia",
    metadataNote: "Verified scientific hyperspectral datacube ready for spectral analysis.",
    isSample: false,
  },
  EMIT_L2A_RFL_INDIA_001: {
    datasetId: "EMIT_L2A_RFL_001_20230305T062334",
    provider: "NASA EMIT / JPL",
    groundTruthAvailable: false,
    groundTruthClasses: [],
    dimensions: [1280, 1242],
    dataSizeBytes: 650_000_000,
    cloudCoverPercent: 0.05,
    tags: ["NASA EMIT", "Mineral Dust", "Spaceborne Imaging Spectroscopy"],
    description: "NASA Earth Surface Mineral Dust Source Investigation (EMIT) imaging spectroscopy survey over western India. 285 contiguous SWIR/VNIR bands.",
    source: "NASA / JPL",
    metadataNote: "Verified scientific hyperspectral datacube ready for spectral analysis.",
    isSample: false,
  },
  "scene-aviris-permian": {
    datasetId: "AVIRIS-NG-PERMIAN-2024-03A",
    provider: "NASA Jet Propulsion Laboratory",
    groundTruthAvailable: false,
    groundTruthClasses: [],
    dimensions: null,
    dataSizeBytes: 1_820_000_000,
    cloudCoverPercent: 0.2,
    tags: ["Methane Plume", "Oil & Gas", "SWIR Calibrated"],
    description: "AVIRIS-NG airborne hyperspectral scene over the Permian Basin. Existing project catalogue metadata; not a live acquisition.",
    source: "GeoAstra project benchmark catalogue",
    metadataNote: "Project sample metadata; original scene product details should be verified before scientific use.",
    isSample: true,
  },
  "scene-indian-pines": {
    datasetId: "INDIAN-PINES-AVIRIS",
    provider: "Purdue University benchmark archive",
    groundTruthAvailable: true,
    groundTruthClasses: ["Corn", "Soybean", "Grass", "Woods"],
    dimensions: [145, 145],
    dataSizeBytes: null,
    cloudCoverPercent: 0,
    tags: ["Indian Pines", "AVIRIS benchmark", "Ground truth"],
    description: "Well-known AVIRIS land-cover classification benchmark from northwestern Indiana.",
    source: "Indian Pines AVIRIS benchmark",
    metadataNote: "Benchmark identity and 145 × 145 spatial dimensions are commonly documented; date and footprint shown here follow project sample metadata.",
    isSample: true,
  },
  "scene-pavia-university": {
    datasetId: "PAVIA-UNIVERSITY-ROSIS",
    provider: "University of Pavia benchmark archive",
    groundTruthAvailable: true,
    groundTruthClasses: ["Asphalt", "Trees", "Gravel", "Buildings", "Meadows"],
    dimensions: [610, 340],
    dataSizeBytes: null,
    cloudCoverPercent: 0,
    tags: ["Pavia University", "ROSIS benchmark", "Ground truth"],
    description: "ROSIS-03 hyperspectral urban classification benchmark over Pavia University, Italy.",
    source: "Pavia University ROSIS benchmark",
    metadataNote: "Dimensions and class labels identify the benchmark; acquisition details and footprint are illustrative project sample metadata.",
    isSample: true,
  },
  "scene-emit-algeria": {
    datasetId: "EMIT-L2A-ALGERIA-MINERAL-22",
    provider: "NASA Jet Propulsion Laboratory",
    groundTruthAvailable: false,
    groundTruthClasses: [],
    dimensions: null,
    dataSizeBytes: 620_000_000,
    cloudCoverPercent: 1.1,
    tags: ["Kaolinite", "Iron Oxide", "Mineral Mapping"],
    description: "EMIT imaging spectrometer sample scene for mineral mapping in the Hoggar region.",
    source: "GeoAstra project benchmark catalogue",
    metadataNote: "Project sample metadata; verify acquisition identifier and product level against the original EMIT archive.",
    isSample: true,
  },
  "scene-enmap-atacama": {
    datasetId: "ENMAP-SALAR-ATACAMA-04",
    provider: "German Aerospace Center (DLR)",
    groundTruthAvailable: false,
    groundTruthClasses: [],
    dimensions: null,
    dataSizeBytes: 1_240_000_000,
    cloudCoverPercent: 0,
    tags: ["Lithium Brine", "Evaporite Minerals", "VNIR/SWIR"],
    description: "EnMAP sample footprint over the Salar de Atacama, included for mineral-mapping catalogue workflows.",
    source: "GeoAstra project benchmark catalogue",
    metadataNote: "Project sample metadata; acquisition identifier and footprint require verification against the source product.",
    isSample: true,
  },
  "scene-prisma-gulf": {
    datasetId: "PRISMA-GULF-COAST-L2D-901",
    provider: "Italian Space Agency (ASI)",
    groundTruthAvailable: false,
    groundTruthClasses: [],
    dimensions: null,
    dataSizeBytes: 840_000_000,
    cloudCoverPercent: 3.4,
    tags: ["Petroleum Sheen", "Coastal Estuary", "L2D Surface"],
    description: "PRISMA L2D sample scene for coastal and offshore hyperspectral inspection.",
    source: "GeoAstra project benchmark catalogue",
    metadataNote: "Project sample metadata; confirm product identifier and processing level against the ASI archive.",
    isSample: true,
  },
};

function fromBenchmark(feature: SceneFeature): SceneCatalogItem {
  const properties = feature.properties;
  const enrichment = enrichments[properties.id];
  const range = properties.spectralRange.match(/([\d.]+)\s*[–-]\s*([\d.]+)/);

  return {
    id: properties.id,
    name: properties.id === "scene-emit-algeria"
      ? "EMIT_ALGERIA_MINERAL_22"
      : properties.name,
    datasetId: enrichment.datasetId,
    sensor: properties.satellite,
    sensorType: properties.platform,
    provider: enrichment.provider,
    acquisitionDate: properties.id === "scene-emit-algeria"
      ? "2024-04-02"
      : properties.acquisitionDate,
    location: properties.id === "scene-indian-pines"
      ? "Northwestern Indiana, USA"
      : properties.id === "scene-pavia-university"
        ? "Pavia, Lombardy, Italy"
        : properties.id === "scene-emit-algeria"
          ? "Hoggar Mountains, Algeria"
          : properties.id === "scene-enmap-atacama"
            ? "Salar de Atacama, Chile"
            : properties.id === "scene-prisma-gulf"
              ? "Gulf Coast Offshore, Louisiana, USA"
              : "Permian Basin, Texas, USA",
    coordinates: properties.centroid,
    crs: properties.crs,
    spatialResolutionM: Number.parseFloat(properties.spatialResolution),
    spectralBands: properties.bandsCount,
    wavelengthRangeNm: range ? [Number(range[1]), Number(range[2])] : null,
    dataFormat: "GeoTIFF (project sample)",
    groundTruthAvailable: enrichment.groundTruthAvailable,
    groundTruthClasses: enrichment.groundTruthClasses,
    dimensions: enrichment.dimensions,
    dataSizeBytes: enrichment.dataSizeBytes,
    availability: properties.status,
    cloudCoverPercent: enrichment.cloudCoverPercent,
    tags: enrichment.tags,
    description: enrichment.description,
    source: enrichment.source,
    metadataNote: enrichment.metadataNote,
    footprint: feature,
    isSample: enrichment.isSample,
  };
}

export const BUILT_IN_SCENES: SceneCatalogItem[] = BENCHMARK_SCENES.map(fromBenchmark).concat({
  id: "scene-emit-western-india",
  name: "EMIT Western India (sample record)",
  datasetId: "EMIT-WESTERN-INDIA-SAMPLE",
  sensor: "NASA EMIT (ISS)",
  sensorType: "Spaceborne",
  provider: "NASA Jet Propulsion Laboratory",
  acquisitionDate: null,
  location: "Western India (location details unavailable)",
  coordinates: null,
  crs: null,
  spatialResolutionM: null,
  spectralBands: null,
  wavelengthRangeNm: null,
  dataFormat: null,
  groundTruthAvailable: null,
  groundTruthClasses: [],
  dimensions: null,
  dataSizeBytes: null,
  availability: "Available",
  cloudCoverPercent: null,
  tags: [],
  description: "Catalogue placeholder for the requested EMIT Western India benchmark entry.",
  source: "GeoAstra sample catalogue",
  metadataNote: "No scene-specific product metadata or verified footprint was available in the existing project data. Values are intentionally unknown.",
  footprint: null,
  isSample: true,
});
