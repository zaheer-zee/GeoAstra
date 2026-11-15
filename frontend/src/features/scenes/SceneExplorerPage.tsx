import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SceneDetailPanel } from "./components/SceneDetailPanel";
import { DatasetUploadModal } from "./components/DatasetUploadModal";
import { sceneApi } from "@/api/sceneApi";
import { BUILT_IN_SCENES } from "./data/sceneCatalog";
import { getSceneDetails, listScenes, queryScenes } from "./services/mockSceneService";
import { useSceneCatalogStore } from "./store/sceneCatalogStore";
import {
  EMPTY_SCENE_FILTERS,
  SceneCatalogItem,
  SceneFilters,
  SceneSortField,
  SortDirection,
} from "./types";
import { useGeospatialStore } from "../geospatial/store/geospatialStore";

type CatalogueView = "grid" | "table";

const SORT_LABELS: Record<SceneSortField, string> = {
  name: "Scene name",
  acquisitionDate: "Acquisition date",
  spatialResolutionM: "Spatial resolution",
  spectralBands: "Spectral bands",
};

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function statusVariant(status: SceneCatalogItem["availability"]): "success" | "warning" | "primary" | "outline" {
  if (status === "Available") return "success";
  if (status === "Calibrated") return "primary";
  if (status === "Demo Upload") return "warning";
  return "outline";
}

function hasActiveFilters(filters: SceneFilters): boolean {
  return Boolean(
    filters.sensors.length ||
    filters.providers.length ||
    filters.startDate ||
    filters.endDate ||
    filters.groundTruth !== "all" ||
    filters.minResolution ||
    filters.maxResolution ||
    filters.availability !== "all"
  );
}

function updateFilter(setFilters: React.Dispatch<React.SetStateAction<SceneFilters>>, key: keyof SceneFilters, value: string) {
  setFilters((filters) => ({ ...filters, [key]: value }));
}

function SchematicFootprint({ scene }: { scene: SceneCatalogItem }) {
  const palette = ["#38bdf8", "#34d399", "#f59e0b", "#a78bfa", "#fb7185", "#22d3ee"];
  const color = palette[Math.abs(scene.id.split("").reduce((total, char) => total + char.charCodeAt(0), 0)) % palette.length];
  return (
    <div className="relative h-28 overflow-hidden rounded border border-border-subtle bg-[#08141c]" aria-label="Schematic scene footprint preview">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.18) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      {scene.footprint ? (
        <svg viewBox="0 0 240 110" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M22 18 L206 27 L222 84 L91 96 L34 72 Z" fill={`${color}22`} stroke={color} strokeWidth="2" strokeDasharray="5 3" />
          <circle cx="128" cy="57" r="3" fill={color} />
        </svg>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-content-muted">Footprint unavailable</div>
      )}
      <span className="absolute bottom-1.5 left-2 font-mono text-[9px] uppercase tracking-wide text-content-muted">
        {scene.footprint ? "Schematic footprint · not imagery" : "No verified footprint"}
      </span>
    </div>
  );
}

function SceneCard({
  scene,
  selected,
  onToggleSelection,
  onDetails,
}: {
  scene: SceneCatalogItem;
  selected: boolean;
  onToggleSelection: () => void;
  onDetails: () => void;
}) {
  return (
    <Card
      variant="elevated"
      className={`flex h-full flex-col overflow-hidden transition-colors ${selected ? "border-accent-primary ring-1 ring-accent-primary/30" : "hover:border-border-strong"}`}
    >
      <div className="p-3 pb-0">
        <SchematicFootprint scene={scene} />
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="break-words text-sm font-semibold text-content-primary">{scene.name}</h2>
            <p className="mt-1 break-all font-mono text-2xs text-content-muted">{scene.datasetId}</p>
          </div>
          <Badge variant={statusVariant(scene.availability)} size="sm">{scene.availability}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded border border-border-subtle bg-surface-secondary/40 p-3 text-xs">
          <SceneMetric label="Sensor" value={scene.sensor} />
          <SceneMetric label="Provider" value={scene.provider} />
          <SceneMetric label="Acquired" value={formatDate(scene.acquisitionDate)} />
          <SceneMetric label="Location" value={scene.location} />
          <SceneMetric label="Resolution" value={scene.spatialResolutionM === null ? "Unknown" : `${scene.spatialResolutionM} m`} />
          <SceneMetric label="Bands" value={scene.spectralBands === null ? "Unknown" : `${scene.spectralBands}`} />
        </div>

        {scene.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {scene.tags.map((tag) => (
              <span key={tag} className="rounded border border-border-subtle bg-surface-panel px-1.5 py-0.5 text-[10px] text-content-muted">#{tag}</span>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <Button
            variant={selected ? "secondary" : "outline"}
            size="sm"
            leftIcon={selected ? <Check className="h-3.5 w-3.5" /> : undefined}
            aria-pressed={selected}
            onClick={onToggleSelection}
          >
            {selected ? "Selected" : "Select Scene"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDetails}>
            View Details / Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SceneMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-2xs font-mono uppercase text-content-muted">{label}</span>
      <span className="mt-0.5 block truncate text-content-primary" title={value}>{value}</span>
    </div>
  );
}

export const SceneExplorerPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SceneFilters>(EMPTY_SCENE_FILTERS);
  const [sortField, setSortField] = useState<SceneSortField>("acquisitionDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [view, setView] = useState<CatalogueView>("grid");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectionOpen, setSelectionOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const uploadedScenes = useSceneCatalogStore((state) => state.uploadedScenes);
  const selectedIds = useSceneCatalogStore((state) => state.selectedSceneIds);
  const toggleSelectedScene = useSceneCatalogStore((state) => state.toggleSelectedScene);
  const removeSelectedScene = useSceneCatalogStore((state) => state.removeSelectedScene);
  const clearSelectedScenes = useSceneCatalogStore((state) => state.clearSelectedScenes);
  const addUploadedScene = useSceneCatalogStore((state) => state.addUploadedScene);
  const selectMapScene = useGeospatialStore((state) => state.selectScene);

  const [backendScenes, setBackendScenes] = useState<SceneCatalogItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchScenes = async () => {
      try {
        const res = await sceneApi.listScenes();
        if (!mounted || !res || !res.scenes) return;
        const mapped: SceneCatalogItem[] = res.scenes.map((s: any) => ({
          id: s.id,
          name: s.id === "Indian_pines" ? "Indian Pines Agricultural Flightline" : s.id === "PaviaU" ? "Pavia University Urban Flightline" : s.id === "EMIT_L2A_RFL_INDIA_001" ? "Western India Surface Mineral Dust Survey" : s.externalSceneId || s.id,
          datasetId: s.externalSceneId || s.id,
          sensor: s.sensor || "AVIRIS",
          sensorType: s.sensor === "AVIRIS" || s.sensor === "ROSIS" ? "Airborne" : "Spaceborne",
          provider: s.provider || "NASA/JPL",
          acquisitionDate: s.acquisitionTime ? s.acquisitionTime.split("T")[0] : null,
          location: s.id === "Indian_pines" ? "Northwestern Indiana, USA" : s.id === "PaviaU" ? "Pavia, Northern Italy" : s.id.includes("INDIA") ? "Western India" : "Acquisition Target",
          coordinates: s.footprint?.coordinates?.[0]?.[0] || null,
          crs: "EPSG:4326",
          spatialResolutionM: s.spatialResolution || 20,
          spectralBands: s.metadataJson?.bands_count || (s.sensor === "AVIRIS" ? 200 : s.sensor === "ROSIS" ? 103 : 285),
          wavelengthRangeNm: s.sensor === "AVIRIS" ? [400, 2500] : s.sensor === "ROSIS" ? [430, 860] : [381, 2493],
          dataFormat: s.productLevel || "L2A_Surface_Reflectance",
          groundTruthAvailable: s.metadataJson?.has_ground_truth ?? (s.id === "Indian_pines" || s.id === "PaviaU"),
          groundTruthClasses: s.id === "Indian_pines" ? ["Corn", "Soybean", "Grass", "Woods"] : s.id === "PaviaU" ? ["Asphalt", "Meadows", "Trees", "Buildings"] : [],
          dimensions: s.id === "Indian_pines" ? [145, 145] : s.id === "PaviaU" ? [610, 340] : [100, 100],
          dataSizeBytes: 1024 * 1024 * 150,
          availability: "Calibrated",
          cloudCoverPercent: s.metadataJson?.cloud_fraction ? s.metadataJson.cloud_fraction * 100 : 0,
          tags: [s.sensor, s.productLevel || "L2A", "Calibrated"],
          description: s.metadataJson?.description || `Calibrated ${s.sensor} hyperspectral observation.`,
          source: s.provider || "GeoAstra Satellite Catalog",
          metadataNote: "Verified scientific hyperspectral datacube ready for spectral analysis.",
          footprint: s.footprint ? ({
            type: "Feature",
            geometry: s.footprint,
            properties: {
              id: s.id,
              name: s.id,
              satellite: s.sensor || "AVIRIS",
              platform: s.sensor === "AVIRIS" || s.sensor === "ROSIS" ? "Airborne" : "Spaceborne",
              acquisitionDate: s.acquisitionTime ? s.acquisitionTime.split("T")[0] : "",
              bandsCount: s.metadataJson?.bands_count || 200,
              spectralRange: s.sensor === "AVIRIS" ? "0.4-2.5µm" : "0.4-1.0µm",
              spatialResolution: `${s.spatialResolution || 20}m`,
              cloudCover: 0,
              status: "Calibrated",
              isBenchmark: false,
              crs: "EPSG:4326",
              centroid: [0, 0],
              bbox: [0, 0, 0, 0],
            }
          } as any) : null,
          isSample: false,
        }));
        if (mapped.length > 0) {
          setBackendScenes(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch live scenes from backend, using catalog cache:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchScenes();
    return () => { mounted = false; };
  }, []);

  const allScenes = useMemo(
    () => (backendScenes.length > 0 ? [...uploadedScenes, ...backendScenes] : listScenes(BUILT_IN_SCENES, uploadedScenes)),
    [backendScenes, uploadedScenes]
  );
  const visibleScenes = useMemo(
    () => queryScenes(allScenes, query, filters, sortField, sortDirection),
    [allScenes, query, filters, sortField, sortDirection]
  );
  const selectedScenes = useMemo(
    () => allScenes.filter((scene) => selectedIds.includes(scene.id)),
    [allScenes, selectedIds]
  );
  const detailScene = detailId ? getSceneDetails(allScenes, detailId) : undefined;
  const sensors = useMemo(() => [...new Set(allScenes.map((scene) => scene.sensor))].sort(), [allScenes]);
  const providers = useMemo(() => [...new Set(allScenes.map((scene) => scene.provider))].sort(), [allScenes]);
  const statuses = useMemo(() => [...new Set(allScenes.map((scene) => scene.availability))].sort(), [allScenes]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!detailId) return;
    setDetailLoading(true);
    const timer = window.setTimeout(() => setDetailLoading(false), 220);
    return () => window.clearTimeout(timer);
  }, [detailId]);

  const clearFilters = () => {
    setFilters(EMPTY_SCENE_FILTERS);
  };
  const clearSearchAndFilters = () => {
    clearFilters();
    setQuery("");
  };

  const openDetails = (scene: SceneCatalogItem) => {
    setDetailId(scene.id);
    if (scene.footprint) selectMapScene(scene.id);
  };

  const sortBy = (field: SceneSortField) => {
    if (sortField === field) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  };

  const isSelected = (sceneId: string) => selectedIds.includes(sceneId);
  const filterActive = hasActiveFilters(filters);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="DATA CATALOG"
        title="Scene Explorer"
        subtitle="Browse, filter, and inspect verified hyperspectral benchmark and satellite scene records indexed in the live catalog."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" size="md">{allScenes.length} TOTAL</Badge>
            <Badge variant="success" size="md">{allScenes.filter((scene) => scene.availability === "Available" || scene.availability === "Calibrated").length} AVAILABLE</Badge>
            <Badge variant="secondary" size="md">{selectedIds.length} SELECTED</Badge>
            <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => setUploadOpen(true)}>
              Upload Dataset
            </Button>
          </div>
        }
      />


      {!detailScene ? (
        <>
          <Card variant="elevated">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <Input
                    type="search"
                    placeholder="Search scene, dataset ID, sensor, provider, or location..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                    clearable
                    onClear={() => setQuery("")}
                    aria-label="Search scene catalogue"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-content-muted" htmlFor="scene-sort">Sort by</label>
                  <Select
                    id="scene-sort"
                    className="min-w-[170px]"
                    value={sortField}
                    onChange={(event) => setSortField(event.target.value as SceneSortField)}
                    options={Object.entries(SORT_LABELS).map(([value, label]) => ({ value, label }))}
                    aria-label="Sort scenes by"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    title={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
                    aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
                    onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}
                  >
                    {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </Button>
                  <div className="flex rounded border border-border-subtle bg-surface-secondary p-0.5" role="group" aria-label="Catalogue view">
                    <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
                      <Grid2X2 className="h-4 w-4" />
                    </Button>
                    <Button variant={view === "table" ? "secondary" : "ghost"} size="icon" aria-label="Table view" aria-pressed={view === "table"} onClick={() => setView("table")}>
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />} rightIcon={filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
                    Filters {filterActive && <span className="rounded-full bg-accent-primary px-1.5 text-[10px] text-surface-main">Active</span>}
                  </Button>
                  <span className="text-xs text-content-muted">Showing <strong className="text-content-primary">{visibleScenes.length}</strong> of {allScenes.length} scenes</span>
                  {filterActive && <Button variant="ghost" size="xs" onClick={clearFilters}>Clear all filters</Button>}
                </div>
                <p className="text-2xs font-mono text-content-muted">SORT: {SORT_LABELS[sortField].toUpperCase()} · {sortDirection.toUpperCase()}</p>
              </div>

              {filtersOpen && (
                <FilterPanel
                  sensors={sensors}
                  providers={providers}
                  statuses={statuses}
                  filters={filters}
                  setFilters={setFilters}
                />
              )}
              {filterActive && (
                <ActiveFilterChips filters={filters} setFilters={setFilters} clearFilters={clearFilters} />
              )}
            </CardContent>
          </Card>

          <SceneSelectionPanel
            scenes={selectedScenes}
            expanded={selectionOpen}
            onToggleExpanded={() => setSelectionOpen((expanded) => !expanded)}
            onRemove={removeSelectedScene}
            onClear={clearSelectedScenes}
            onDetails={openDetails}
          />

          {loading ? (
            <div className={`grid grid-cols-1 gap-4 ${view === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded border border-border-subtle bg-surface-panel" />
              ))}
            </div>
          ) : visibleScenes.length === 0 ? (
            <div className="rounded border border-border-subtle bg-surface-panel px-6 py-14 text-center">
              <Search className="mx-auto h-8 w-8 text-content-muted" />
              <h2 className="mt-3 text-base font-semibold text-content-primary">{query && !filterActive ? "No scenes match your search" : "No scenes match these filters"}</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-content-muted">Try another search term or clear some catalogue filters.</p>
              <Button className="mt-4" variant="outline" onClick={clearSearchAndFilters}>Clear search and filters</Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleScenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  selected={isSelected(scene.id)}
                  onToggleSelection={() => toggleSelectedScene(scene.id)}
                  onDetails={() => openDetails(scene)}
                />
              ))}
            </div>
          ) : (
            <SceneTable
              scenes={visibleScenes}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelectedScene}
              onDetails={openDetails}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={sortBy}
            />
          )}
        </>
      ) : detailLoading ? (
        <div className="h-96 animate-pulse rounded border border-border-subtle bg-surface-panel" />
      ) : (
        <SceneDetailPanel
          scene={detailScene}
          selected={isSelected(detailScene.id)}
          onToggleSelection={() => toggleSelectedScene(detailScene.id)}
          onReturn={() => setDetailId(null)}
        />
      )}

      <DatasetUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={addUploadedScene}
      />
    </div>
  );
};

function FilterPanel({
  sensors,
  providers,
  statuses,
  filters,
  setFilters,
}: {
  sensors: string[];
  providers: string[];
  statuses: string[];
  filters: SceneFilters;
  setFilters: React.Dispatch<React.SetStateAction<SceneFilters>>;
}) {
  const toggleOption = (key: "sensors" | "providers", value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };
  const checkboxGroup = (title: string, key: "sensors" | "providers", options: string[]) => (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-1 text-2xs font-mono uppercase tracking-wide text-content-muted">{title}</legend>
      <div className="max-h-28 space-y-1 overflow-y-auto">
        {options.map((option) => (
          <label key={option} className="flex cursor-pointer items-start gap-2 text-xs text-content-secondary">
            <input type="checkbox" checked={filters[key].includes(option)} onChange={() => toggleOption(key, option)} className="mt-0.5 accent-accent-primary" />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
  const fieldClass = "h-8 w-full rounded border border-border-subtle bg-surface-secondary px-2 text-xs text-content-primary focus:border-accent-primary focus:outline-none";

  return (
    <div className="grid grid-cols-1 gap-4 border-t border-border-subtle pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {checkboxGroup("Sensor / Instrument", "sensors", sensors)}
      {checkboxGroup("Data provider", "providers", providers)}
      <fieldset className="space-y-2">
        <legend className="mb-1 text-2xs font-mono uppercase tracking-wide text-content-muted">Acquisition date</legend>
        <label className="block text-2xs text-content-muted">From<input aria-label="Acquisition start date" type="date" value={filters.startDate} onChange={(event) => updateFilter(setFilters, "startDate", event.target.value)} className={fieldClass} /></label>
        <label className="block text-2xs text-content-muted">To<input aria-label="Acquisition end date" type="date" value={filters.endDate} onChange={(event) => updateFilter(setFilters, "endDate", event.target.value)} className={fieldClass} /></label>
      </fieldset>
      <div className="space-y-2">
        <label className="text-2xs font-mono uppercase tracking-wide text-content-muted" htmlFor="ground-truth-filter">Ground truth</label>
        <Select id="ground-truth-filter" value={filters.groundTruth} onChange={(event) => updateFilter(setFilters, "groundTruth", event.target.value)} options={[{ value: "all", label: "Any availability" }, { value: "available", label: "Available" }, { value: "unavailable", label: "Unavailable" }]} />
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-2xs font-mono uppercase tracking-wide text-content-muted">Resolution (metres)</legend>
        <Input aria-label="Minimum spatial resolution in metres" type="number" min="0" placeholder="Minimum" value={filters.minResolution} onChange={(event) => updateFilter(setFilters, "minResolution", event.target.value)} className="h-8 text-xs" />
        <Input aria-label="Maximum spatial resolution in metres" type="number" min="0" placeholder="Maximum" value={filters.maxResolution} onChange={(event) => updateFilter(setFilters, "maxResolution", event.target.value)} className="h-8 text-xs" />
      </fieldset>
      <div className="space-y-2">
        <label className="text-2xs font-mono uppercase tracking-wide text-content-muted" htmlFor="availability-filter">Scene status</label>
        <Select id="availability-filter" value={filters.availability} onChange={(event) => updateFilter(setFilters, "availability", event.target.value)} options={[{ value: "all", label: "All statuses" }, ...statuses.map((status) => ({ value: status, label: status }))]} />
      </div>
    </div>
  );
}

function ActiveFilterChips({
  filters,
  setFilters,
  clearFilters,
}: {
  filters: SceneFilters;
  setFilters: React.Dispatch<React.SetStateAction<SceneFilters>>;
  clearFilters: () => void;
}) {
  const chips: { label: string; clear: () => void }[] = [
    ...filters.sensors.map((sensor) => ({ label: `Sensor: ${sensor}`, clear: () => setFilters((f) => ({ ...f, sensors: f.sensors.filter((item) => item !== sensor) })) })),
    ...filters.providers.map((provider) => ({ label: `Provider: ${provider}`, clear: () => setFilters((f) => ({ ...f, providers: f.providers.filter((item) => item !== provider) })) })),
    ...(filters.startDate ? [{ label: `From: ${filters.startDate}`, clear: () => setFilters((f) => ({ ...f, startDate: "" })) }] : []),
    ...(filters.endDate ? [{ label: `To: ${filters.endDate}`, clear: () => setFilters((f) => ({ ...f, endDate: "" })) }] : []),
    ...(filters.groundTruth !== "all" ? [{ label: `Ground truth: ${filters.groundTruth}`, clear: () => setFilters((f) => ({ ...f, groundTruth: "all" })) }] : []),
    ...(filters.minResolution ? [{ label: `Min GSD: ${filters.minResolution} m`, clear: () => setFilters((f) => ({ ...f, minResolution: "" })) }] : []),
    ...(filters.maxResolution ? [{ label: `Max GSD: ${filters.maxResolution} m`, clear: () => setFilters((f) => ({ ...f, maxResolution: "" })) }] : []),
    ...(filters.availability !== "all" ? [{ label: `Status: ${filters.availability}`, clear: () => setFilters((f) => ({ ...f, availability: "all" })) }] : []),
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-3" aria-label="Active filters">
      {chips.map((chip) => (
        <button key={chip.label} type="button" onClick={chip.clear} className="inline-flex items-center gap-1 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-2 py-1 text-2xs text-accent-primary">
          {chip.label}<X className="h-3 w-3" />
        </button>
      ))}
      <button type="button" onClick={clearFilters} className="ml-auto text-2xs text-content-muted underline">Clear all</button>
    </div>
  );
}

function SortHeader({
  field,
  label,
  sortField,
  sortDirection,
  onSort,
}: {
  field: SceneSortField;
  label: string;
  sortField: SceneSortField;
  sortDirection: SortDirection;
  onSort: (field: SceneSortField) => void;
}) {
  const active = sortField === field;
  return (
    <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 whitespace-nowrap hover:text-content-primary" aria-label={`Sort by ${label}`}>
      {label}
      {active ? sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );
}

function SceneTable({
  scenes,
  selectedIds,
  onToggleSelection,
  onDetails,
  sortField,
  sortDirection,
  onSort,
}: {
  scenes: SceneCatalogItem[];
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onDetails: (scene: SceneCatalogItem) => void;
  sortField: SceneSortField;
  sortDirection: SortDirection;
  onSort: (field: SceneSortField) => void;
}) {
  return (
    <Card variant="elevated">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-xs">
          <thead className="bg-surface-secondary/60 text-2xs font-mono uppercase tracking-wide text-content-muted">
            <tr>
              <th className="w-10 p-3"><span className="sr-only">Select</span></th>
              <th className="p-3"><SortHeader field="name" label="Scene name" sortField={sortField} sortDirection={sortDirection} onSort={onSort} /></th>
              <th className="p-3">Sensor</th>
              <th className="p-3">Provider</th>
              <th className="p-3"><SortHeader field="acquisitionDate" label="Acquisition date" sortField={sortField} sortDirection={sortDirection} onSort={onSort} /></th>
              <th className="p-3"><SortHeader field="spatialResolutionM" label="Resolution" sortField={sortField} sortDirection={sortDirection} onSort={onSort} /></th>
              <th className="p-3"><SortHeader field="spectralBands" label="Bands" sortField={sortField} sortDirection={sortDirection} onSort={onSort} /></th>
              <th className="p-3">Ground truth</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {scenes.map((scene) => {
              const selected = selectedIds.includes(scene.id);
              return (
                <tr key={scene.id} className={`border-t border-border-subtle ${selected ? "bg-accent-primary/10" : "hover:bg-surface-secondary/40"}`}>
                  <td className="p-3">
                    <input type="checkbox" checked={selected} onChange={() => onToggleSelection(scene.id)} aria-label={`Select ${scene.name}`} className="accent-accent-primary" />
                  </td>
                  <td className="max-w-[240px] p-3">
                    <p className="truncate font-semibold text-content-primary" title={scene.name}>{scene.name}</p>
                    <p className="mt-1 truncate font-mono text-2xs text-content-muted">{scene.datasetId}</p>
                  </td>
                  <td className="p-3 text-content-secondary">{scene.sensor}</td>
                  <td className="p-3 text-content-secondary">{scene.provider}</td>
                  <td className="whitespace-nowrap p-3 text-content-secondary">{formatDate(scene.acquisitionDate)}</td>
                  <td className="p-3 text-content-secondary">{scene.spatialResolutionM === null ? "Unknown" : `${scene.spatialResolutionM} m`}</td>
                  <td className="p-3 font-mono text-content-secondary">{scene.spectralBands ?? "Unknown"}</td>
                  <td className="p-3 text-content-secondary">{scene.groundTruthAvailable === null ? "Unknown" : scene.groundTruthAvailable ? "Available" : "No"}</td>
                  <td className="p-3"><Badge variant={statusVariant(scene.availability)} size="sm">{scene.availability}</Badge></td>
                  <td className="p-3"><Button variant="ghost" size="xs" onClick={() => onDetails(scene)}>View Details</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border-subtle p-2 text-right text-2xs text-content-muted">
        {scenes.length} scenes · horizontally scroll for all columns
      </div>
    </Card>
  );
}

function SceneSelectionPanel({
  scenes,
  expanded,
  onToggleExpanded,
  onRemove,
  onClear,
  onDetails,
}: {
  scenes: SceneCatalogItem[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onDetails: (scene: SceneCatalogItem) => void;
}) {
  return (
    <Card variant="default">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <button type="button" className="flex items-center gap-2 text-sm font-semibold text-content-primary" onClick={onToggleExpanded} aria-expanded={expanded}>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          Selected scenes <Badge variant="secondary" size="sm">{scenes.length}</Badge>
        </button>
        {scenes.length > 0 && <Button variant="ghost" size="xs" onClick={onClear}>Clear selection</Button>}
      </div>
      {expanded && (
        <div className="border-t border-border-subtle px-3 py-2">
          {scenes.length === 0 ? (
            <p className="py-2 text-xs text-content-muted">Select scenes in the grid or table to keep them available for frontend analysis workflows.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {scenes.map((scene) => (
                <li key={scene.id} className="flex items-center gap-1 rounded border border-border-subtle bg-surface-secondary/60 px-2 py-1">
                  <button type="button" onClick={() => onDetails(scene)} className="max-w-[240px] truncate text-xs text-content-primary hover:text-accent-primary">{scene.name}</button>
                  <button type="button" aria-label={`Remove ${scene.name} from selection`} onClick={() => onRemove(scene.id)} className="rounded p-0.5 text-content-muted hover:text-status-danger"><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
