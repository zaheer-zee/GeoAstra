/**
 * Geospatial Studio Zustand Store
 * Centralized state management for MapLibre GL map, Terra Draw state,
 * saved AOIs with localStorage persistence, benchmark scenes, and layer styling.
 */

import { create } from "zustand";
import { Feature, Polygon, MultiPolygon } from "geojson";
import {
  AOIFeature,
  SceneFeature,
  BasemapId,
  LayerConfig,
  DrawingMode,
  AOIProperties,
} from "../types/geospatial.types";
import { INITIAL_MOCK_AOIS } from "../data/mockAOIs";
import { BENCHMARK_SCENES } from "../data/mockScenes";
import { calculateSpatialMetrics } from "../services/turfUtils";

const AOI_STORAGE_KEY = "geoastra_saved_aois";

function loadSavedAOIs(): AOIFeature[] {
  try {
    const raw = localStorage.getItem(AOI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out legacy mock IDs that don't match backend database
        const valid = parsed.filter((item: any) => item?.properties?.id && !item.properties.id.startsWith("aoi-"));
        if (valid.length > 0) {
          return valid;
        }
      }
    }
  } catch (err) {
    console.error("Failed to load saved AOIs from localStorage:", err);
  }
  return INITIAL_MOCK_AOIS;
}

function persistAOIs(aois: AOIFeature[]): void {
  try {
    localStorage.setItem(AOI_STORAGE_KEY, JSON.stringify(aois));
  } catch (err) {
    console.error("Failed to persist AOIs to localStorage:", err);
  }
}

export interface GeospatialState {
  // Spatial Data
  aois: AOIFeature[];
  scenes: SceneFeature[];
  selectedAoiId: string | null;
  selectedSceneId: string | null;

  // Viewport & Telemetry
  activeBasemap: BasemapId;
  cursorCoords: { lng: number; lat: number } | null;
  currentZoom: number;
  currentCenter: [number, number];

  // Layers Tree
  layers: Record<string, LayerConfig>;

  // Workstation UI State
  drawingMode: DrawingMode;
  isLeftSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  activeLeftTab: "aois" | "scenes" | "layers";

  // Pending Modal Action (for saving freshly drawn polygon)
  pendingFeatureForModal: Feature<Polygon | MultiPolygon> | null;
  editingAoiId: string | null;
  geometryEditingAoiId: string | null;
  geometryEditDraft: Polygon | MultiPolygon | null;

  // Actions
  addAOI: (aoi: AOIFeature) => void;
  updateAOI: (
    id: string,
    updates: Partial<AOIProperties>,
    newGeometry?: Polygon | MultiPolygon
  ) => void;
  deleteAOI: (id: string) => void;
  selectAOI: (id: string | null) => void;
  selectScene: (id: string | null) => void;
  clearSelection: () => void;
  setBasemap: (basemap: BasemapId) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setDrawingMode: (mode: DrawingMode) => void;
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  setActiveLeftTab: (tab: "aois" | "scenes" | "layers") => void;
  setCursorCoords: (coords: { lng: number; lat: number } | null) => void;
  setZoom: (zoom: number) => void;
  setCenter: (center: [number, number]) => void;
  setPendingFeatureForModal: (feature: Feature<Polygon | MultiPolygon> | null) => void;
  setEditingAoiId: (id: string | null) => void;
  startAOIGeometryEdit: (id: string) => void;
  setGeometryEditDraft: (geometry: Polygon | MultiPolygon) => void;
  saveAOIGeometryEdit: () => void;
  cancelAOIGeometryEdit: () => void;
  resetAOIsToDefault: () => void;
}

const DEFAULT_LAYERS: Record<string, LayerConfig> = {
  aois: {
    id: "aois",
    name: "AOI Boundaries",
    description: "Vector polygons of user monitoring sectors and test regions",
    visible: true,
    opacity: 0.85,
    color: "#F59E0B",
    type: "vector",
  },
  scenes: {
    id: "scenes",
    name: "Scene Footprints",
    description: "Spatial boundaries of calibrated satellite and airborne datacubes",
    visible: true,
    opacity: 0.75,
    color: "#38BDF8",
    type: "vector",
  },
  detections: {
    id: "detections",
    name: "Detection Overlays",
    description: "Target detection and anomaly score overlays",
    visible: false,
    opacity: 0.6,
    color: "#10B981",
    type: "overlay",
  },
};

export const useGeospatialStore = create<GeospatialState>((set, get) => ({
  aois: loadSavedAOIs(),
  scenes: BENCHMARK_SCENES,
  selectedAoiId: null,
  selectedSceneId: null,

  activeBasemap: "liberty",
  cursorCoords: null,
  currentZoom: 4,
  currentCenter: [-48, 8],

  layers: DEFAULT_LAYERS,

  drawingMode: "idle",
  isLeftSidebarOpen: typeof window === "undefined" || window.innerWidth >= 900,
  isRightPanelOpen: false,
  activeLeftTab: "aois",

  pendingFeatureForModal: null,
  editingAoiId: null,
  geometryEditingAoiId: null,
  geometryEditDraft: null,

  addAOI: (aoi: AOIFeature) => {
    const current = get().aois;
    const updated = [aoi, ...current];
    persistAOIs(updated);
    set({
      aois: updated,
      selectedAoiId: aoi.properties.id,
      selectedSceneId: null,
      isRightPanelOpen: true,
    });
  },

  updateAOI: (id: string, updates: Partial<AOIProperties>, newGeometry?: Polygon | MultiPolygon) => {
    const current = get().aois;
    const updated = current.map((aoi) => {
      if (aoi.properties.id !== id) return aoi;

      let geometry = aoi.geometry;
      let calculatedProps: Partial<AOIProperties> = {};

      if (newGeometry) {
        geometry = newGeometry;
        const metrics = calculateSpatialMetrics({
          ...aoi,
          geometry: newGeometry,
        });
        calculatedProps = {
          areaKm2: metrics.areaKm2,
          perimeterKm: metrics.perimeterKm,
          centroid: metrics.centroid,
          bbox: metrics.bbox,
        };
      }

      return {
        ...aoi,
        geometry,
        properties: {
          ...aoi.properties,
          ...updates,
          ...calculatedProps,
          updatedAt: new Date().toISOString(),
        },
      };
    });

    persistAOIs(updated);
    set({ aois: updated });
  },

  deleteAOI: (id: string) => {
    const current = get().aois;
    const updated = current.filter((aoi) => aoi.properties.id !== id);
    persistAOIs(updated);
    set((state) => ({
      aois: updated,
      selectedAoiId: state.selectedAoiId === id ? null : state.selectedAoiId,
      geometryEditingAoiId: state.geometryEditingAoiId === id ? null : state.geometryEditingAoiId,
      geometryEditDraft: state.geometryEditingAoiId === id ? null : state.geometryEditDraft,
      drawingMode: state.geometryEditingAoiId === id ? "idle" : state.drawingMode,
    }));
  },

  selectAOI: (id: string | null) => {
    set({
      selectedAoiId: id,
      selectedSceneId: null,
      isRightPanelOpen: id !== null ? true : get().isRightPanelOpen,
    });
  },

  selectScene: (id: string | null) => {
    set({
      selectedSceneId: id,
      selectedAoiId: null,
      isRightPanelOpen: id !== null ? true : get().isRightPanelOpen,
    });
  },

  clearSelection: () => {
    set({
      selectedAoiId: null,
      selectedSceneId: null,
    });
  },

  setBasemap: (basemap: BasemapId) => {
    set({ activeBasemap: basemap });
  },

  setLayerVisibility: (layerId: string, visible: boolean) => {
    set((state) => ({
      layers: {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          visible,
        },
      },
    }));
  },

  setLayerOpacity: (layerId: string, opacity: number) => {
    set((state) => ({
      layers: {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          opacity,
        },
      },
    }));
  },

  setDrawingMode: (drawingMode: DrawingMode) => {
    set({ drawingMode });
  },

  toggleLeftSidebar: () => {
    set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen }));
  },

  toggleRightPanel: () => {
    set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen }));
  },

  setActiveLeftTab: (activeLeftTab: "aois" | "scenes" | "layers") => {
    set({ activeLeftTab });
  },

  setCursorCoords: (cursorCoords) => {
    set({ cursorCoords });
  },

  setZoom: (currentZoom: number) => {
    set({ currentZoom });
  },

  setCenter: (currentCenter: [number, number]) => {
    set({ currentCenter });
  },

  setPendingFeatureForModal: (pendingFeatureForModal) => {
    set({ pendingFeatureForModal });
  },

  setEditingAoiId: (editingAoiId: string | null) => {
    set({ editingAoiId });
  },

  startAOIGeometryEdit: (id) => {
    if (!get().aois.some((aoi) => aoi.properties.id === id)) return;
    set({
      geometryEditingAoiId: id,
      geometryEditDraft: null,
      drawingMode: "editing",
      selectedAoiId: id,
      selectedSceneId: null,
      isRightPanelOpen: true,
      editingAoiId: null,
      pendingFeatureForModal: null,
    });
  },

  setGeometryEditDraft: (geometryEditDraft) => {
    set({ geometryEditDraft });
  },

  saveAOIGeometryEdit: () => {
    const { geometryEditingAoiId, geometryEditDraft } = get();
    if (geometryEditingAoiId && geometryEditDraft) {
      get().updateAOI(geometryEditingAoiId, {}, geometryEditDraft);
    }
    set({
      geometryEditingAoiId: null,
      geometryEditDraft: null,
      drawingMode: "idle",
    });
  },

  cancelAOIGeometryEdit: () => {
    set({
      geometryEditingAoiId: null,
      geometryEditDraft: null,
      drawingMode: "idle",
    });
  },

  resetAOIsToDefault: () => {
    persistAOIs(INITIAL_MOCK_AOIS);
    set({
      aois: INITIAL_MOCK_AOIS,
      selectedAoiId: null,
      selectedSceneId: null,
      geometryEditingAoiId: null,
      geometryEditDraft: null,
      drawingMode: "idle",
    });
  },
}));
