import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDownToLine, FileText, Info, Layers3, MapPin, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { analysisApi } from "@/api/analysisApi";
import { AnalysisJobRecord } from "@/features/analysis/types";
import { BUILT_IN_SCENES } from "@/features/scenes/data/sceneCatalog";
import { listScenes } from "@/features/scenes/services/mockSceneService";
import { useSceneCatalogStore } from "@/features/scenes/store/sceneCatalogStore";
import { SceneCatalogItem } from "@/features/scenes/types";
import { useGeospatialStore } from "@/features/geospatial/store/geospatialStore";
import { listSignatures } from "@/features/signatures/services/signatureService";
import { useSignatureStore } from "@/features/signatures/store/signatureStore";
import { useDemoAnalysisJobStore } from "@/features/jobs/store/demoAnalysisJobStore";
import { createDemoResultFixture } from "./data/demoResultFixtures";
import { DemoDetectionFeature, DemoResultFixture } from "./types";
import { ResultsMap, ResultsMapLayers } from "./components/ResultsMap";
import {
  EvaluationMetrics,
  RocChart,
  ScoreDistributionChart,
  SpectralComparison,
} from "./components/ResultsCharts";

type ExportKind = "GeoTIFF" | "GeoJSON" | "PDF report";

export const ResultsExplorerPage: React.FC = () => {
  const { jobId } = useParams();
  const jobs = useDemoAnalysisJobStore((state) => state.jobs);
  const completedJobs = useMemo(
    () => jobs.filter((job) => job.status === "completed").sort((a, b) => Date.parse(b.completedAt ?? b.submittedAt) - Date.parse(a.completedAt ?? a.submittedAt)),
    [jobs]
  );
  const job = jobId ? jobs.find((item) => item.id === jobId) : undefined;

  if (jobId) {
    if (!job) return <UnknownJobState jobId={jobId} />;
    if (job.status !== "completed") return <UnavailableResultState job={job} />;
    return <CompletedJobResults key={job.id} job={job} completedJobs={completedJobs} />;
  }

  return <ResultsOverview jobs={jobs} completedJobs={completedJobs} />;
};

function ResultsOverview({ jobs, completedJobs }: { jobs: AnalysisJobRecord[]; completedJobs: AnalysisJobRecord[] }) {
  const uploadedScenes = useSceneCatalogStore((state) => state.uploadedScenes);
  const scenes = useMemo(() => listScenes(BUILT_IN_SCENES, uploadedScenes), [uploadedScenes]);
  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="DETECTION ANALYTICS"
        title="Results Explorer"
        subtitle="Explore continuous score heatmaps, polygonized detection contours, and AI-synthesized explanations for completed analysis jobs."
        actions={<Badge variant="success" size="md" dot>CALCULATED RESULTS</Badge>}
      />
      <DemoNotice />
      {completedJobs.length === 0 ? (
        <Card variant="elevated"><CardContent className="flex flex-col items-center gap-3 px-5 py-14 text-center">
          <div className="rounded-full border border-border-subtle bg-surface-secondary p-3"><MapPin className="h-5 w-5 text-content-muted" /></div>
          <h2 className="text-sm font-semibold text-content-primary">No completed jobs available</h2>
          <p className="max-w-lg text-xs leading-relaxed text-content-muted">
            Results fixtures are available only after a job reaches Completed. Queued and processing jobs do not show results; failed and cancelled jobs remain accessible from Processing Jobs but have no completed results.
            {jobs.some((item) => item.status === "processing" || item.status === "queued") ? " Active demo jobs are still in their simulated lifecycle." : ""}
          </p>
          <div className="flex flex-wrap justify-center gap-2"><Link to="/jobs"><Button variant="outline" size="sm">Processing Jobs</Button></Link><Link to="/analysis/new"><Button size="sm">Analysis Studio</Button></Link></div>
        </CardContent></Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-content-primary">Completed job results</h2><p className="mt-1 text-2xs text-content-muted">Each entry opens a deterministic illustrative fixture linked to the job’s stored configuration.</p></div>
            <Badge variant="outline">{completedJobs.length} COMPLETED</Badge>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {completedJobs.map((job) => {
              const scene = scenes.find((item) => item.id === job.configuration.sceneId);
              const fixture = createDemoResultFixture(job, undefined, scene);
              return (
                <Link
                  key={job.id}
                  to={`/results/${encodeURIComponent(job.id)}`}
                  className="rounded border border-border-subtle bg-surface-panel p-4 transition-colors hover:border-accent-primary/50 hover:bg-surface-elevated/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="break-all font-mono text-xs font-semibold text-accent-primary">{job.id}</span>
                    <div className="flex gap-1.5"><Badge variant="success">COMPLETED</Badge><Badge variant="warning">DEMO / ILLUSTRATIVE</Badge></div>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-content-primary">{job.name}</h3>
                  <div className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                    <OverviewValue label="AOI" value={job.aoiName} />
                    <OverviewValue label="Satellite scene" value={job.sceneName} />
                    <OverviewValue label="Sensor / platform" value={scene ? `${scene.sensor} · ${scene.sensorType}` : "Unavailable"} />
                    <OverviewValue label="Algorithm" value={job.configuration.algorithm.toUpperCase()} />
                    <OverviewValue label="Completed" value={job.completedAt ? new Date(job.completedAt).toLocaleString() : "Timestamp unavailable"} />
                    <OverviewValue label="Illustrative detections" value={`${fixture.features.features.length} demo regions · not actual detections`} />
                  </div>
                  <p className="mt-3 text-2xs text-accent-primary">Open illustrative results →</p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CompletedJobResults({ job, completedJobs }: { job: AnalysisJobRecord; completedJobs: AnalysisJobRecord[] }) {
  const navigate = useNavigate();
  const aois = useGeospatialStore((state) => state.aois);
  const uploadedScenes = useSceneCatalogStore((state) => state.uploadedScenes);
  const customSignatures = useSignatureStore((state) => state.customSignatures);
  const signatures = useMemo(() => listSignatures(customSignatures), [customSignatures]);
  const scenes = useMemo(() => listScenes(BUILT_IN_SCENES, uploadedScenes), [uploadedScenes]);
  const aoi = aois.find((item) => item.properties.id === job.configuration.aoiId);
  const scene = scenes.find((item) => item.id === job.configuration.sceneId);
  const targetSignature = signatures.find((signature) => signature.id === job.configuration.targetSignatureId) ?? null;
  const fixture = useMemo(() => createDemoResultFixture(job, aoi, scene), [aoi, job, scene]);
  const [selectedFeature, setSelectedFeature] = useState<DemoDetectionFeature | null>(null);
  const [layers, setLayers] = useState<ResultsMapLayers>({ heatmap: true, polygons: true, aoi: Boolean(aoi), scene: Boolean(scene?.footprint) });
  const [heatmapOpacity, setHeatmapOpacity] = useState(68);
  const [polygonOpacity, setPolygonOpacity] = useState(55);
  const [layerManagerOpen, setLayerManagerOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [exportKind, setExportKind] = useState<ExportKind | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const toast = useToast();

  const startExport = () => {
    if (!exportKind || exportProgress > 0) return;
    setExportError(null);
    setExportProgress(4);
    let progress = 4;
    const timer = window.setInterval(() => {
      progress = Math.min(100, progress + 16);
      setExportProgress(progress);
      if (progress === 100) {
        window.clearInterval(timer);
        try {
          if (exportKind === "GeoJSON") downloadDemoGeoJson(fixture, job);
          setExportComplete(true);
          toast.success(
            exportKind === "GeoJSON" ? "Illustrative GeoJSON created" : "Demo export simulation complete",
            exportKind === "GeoJSON"
              ? "A valid illustrative FeatureCollection was downloaded; it is not an algorithm output."
              : `${exportKind} export was simulated only. No file was generated.`
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "The demo export could not be completed.";
          setExportError(message);
          toast.error("Demo export failed", message);
        }
      }
    }, 100);
  };

  const closeExport = () => {
    setExportKind(null);
    setExportProgress(0);
    setExportComplete(false);
    setExportError(null);
  };

  return (
    <div className="mx-auto max-w-[1700px] space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="DETECTION ANALYTICS"
        title="Results Explorer"
        subtitle="Job-linked visualization of scientific detection results, continuous score heatmaps, and vector polygons."
        actions={<div className="flex flex-wrap gap-2"><Badge variant="success" dot>COMPLETED JOB</Badge><Badge variant="primary" size="md">CALCULATED RESULTS</Badge></div>}
      />
      <DemoNotice />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border-subtle bg-surface-secondary/30 px-3 py-2">
        <div className="min-w-0"><p className="text-2xs font-mono uppercase tracking-wide text-content-muted">Selected job</p><p className="break-all font-mono text-xs text-accent-primary">{job.id}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/results" className="text-xs text-content-secondary hover:text-accent-primary">All results</Link>
          <Link to={`/jobs/${encodeURIComponent(job.id)}`} className="text-xs text-accent-primary hover:underline">Job detail</Link>
          <Link to="/jobs" className="text-xs text-accent-primary hover:underline">Processing Jobs</Link>
          <select aria-label="Select completed result job" value={job.id} onChange={(event) => navigate(`/results/${encodeURIComponent(event.target.value)}`)} className="max-w-[280px] rounded border border-border-subtle bg-surface-panel px-2 py-1.5 text-xs text-content-primary">
            {completedJobs.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
          </select>
        </div>
      </div>

      <section aria-label="Illustrative results map" className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative min-h-[440px] overflow-hidden rounded border border-border-strong bg-[#08111c] lg:h-[62vh] lg:min-h-[560px]">
          <ResultsMap
            key={job.id}
            fixture={fixture}
            aoi={aoi}
            sceneFootprint={scene?.footprint ?? undefined}
            layers={layers}
            heatmapOpacity={heatmapOpacity / 100}
            polygonOpacity={polygonOpacity / 100}
            selectedId={selectedFeature?.properties.id ?? null}
            onSelect={setSelectedFeature}
          />
          {layerManagerOpen ? <div className="absolute left-3 top-3 z-10 w-[min(260px,calc(100%-24px))] rounded border border-border-strong bg-surface-panel/95 p-3 shadow-lg backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-content-primary"><Layers3 className="h-3.5 w-3.5 text-accent-primary" />Result layers <Badge variant="warning">DEMO</Badge><button type="button" className="ml-auto rounded p-1 text-content-muted hover:bg-surface-elevated hover:text-content-primary" onClick={() => setLayerManagerOpen(false)} aria-label="Collapse result layers"><X className="h-3.5 w-3.5" /></button></div>
            <LayerToggle label="Detection heatmap" checked={layers.heatmap} onChange={(value) => setLayers((current) => ({ ...current, heatmap: value }))} />
            <OpacityControl label="Heatmap opacity" value={heatmapOpacity} onChange={setHeatmapOpacity} />
            <LayerToggle label="Detection polygons" checked={layers.polygons} onChange={(value) => setLayers((current) => ({ ...current, polygons: value }))} />
            <OpacityControl label="Polygon opacity" value={polygonOpacity} onChange={setPolygonOpacity} />
            <LayerToggle label="AOI boundary" checked={layers.aoi} disabled={!aoi} onChange={(value) => setLayers((current) => ({ ...current, aoi: value }))} />
            <LayerToggle label="Scene footprint" checked={layers.scene} disabled={!scene?.footprint} onChange={(value) => setLayers((current) => ({ ...current, scene: value }))} />
            {!aoi && <p className="mt-1 text-2xs text-content-muted">AOI geometry is unavailable; map uses scene or illustrative extent.</p>}
            {!scene?.footprint && <p className="mt-1 text-2xs text-content-muted">Scene footprint unavailable for this catalogue record.</p>}
          </div> : <button type="button" onClick={() => setLayerManagerOpen(true)} className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded border border-border-strong bg-surface-panel/95 px-3 py-2 text-xs text-content-primary shadow-lg backdrop-blur"><Layers3 className="h-3.5 w-3.5 text-accent-primary" />Result layers</button>}
          <div className="absolute bottom-8 left-3 z-10 w-[min(230px,calc(100%-24px))] rounded border border-border-subtle bg-surface-panel/90 p-3 backdrop-blur">
            <div className="flex items-center justify-between text-2xs text-content-secondary"><span>Illustrative score intensity</span><Badge variant="warning">DEMO</Badge></div>
            <div className="mt-2 h-2 rounded bg-gradient-to-r from-cyan-400 via-emerald-400 via-amber-300 to-rose-500" />
            <div className="mt-1 flex justify-between text-2xs font-mono text-content-muted"><span>Low</span><span>High</span></div>
          </div>
        </div>

        <aside className="min-h-0 rounded border border-border-subtle bg-surface-panel">
          {selectedFeature ? (
            <DetectionDetails feature={selectedFeature} job={job} onClose={() => setSelectedFeature(null)} />
          ) : (
            <div className="flex h-full min-h-[220px] flex-col justify-between p-4">
              <div><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent-primary" /><h2 className="text-sm font-semibold text-content-primary">Detection details</h2></div><p className="mt-2 text-xs leading-relaxed text-content-muted">Select an outlined polygon on the map to inspect its fixture properties. Map selection has no processing effect.</p></div>
              <div className="rounded border border-border-subtle bg-surface-secondary/30 p-3 text-2xs text-content-secondary">
                <p className="font-mono text-accent-primary">ILLUSTRATIVE FEATURES</p><p className="mt-1">{fixture.features.features.length} generated polygon examples associated with this job.</p>
              </div>
            </div>
          )}
        </aside>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border-subtle bg-surface-secondary/20 p-3">
        <div><h2 className="text-sm font-semibold text-content-primary">{job.name}</h2><p className="mt-1 text-2xs text-content-muted">{job.aoiName} · {job.sceneName} · {job.configuration.algorithm.toUpperCase()} · Completed {job.completedAt ? new Date(job.completedAt).toLocaleString() : "timestamp unavailable"}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" leftIcon={<ArrowDownToLine className="h-3.5 w-3.5" />} onClick={() => setExportKind("GeoTIFF")}>DEMO EXPORT · GeoTIFF</Button>
          <Button size="sm" variant="outline" leftIcon={<ArrowDownToLine className="h-3.5 w-3.5" />} onClick={() => setExportKind("GeoJSON")}>Illustrative GeoJSON</Button>
          <Button size="sm" variant="secondary" leftIcon={<FileText className="h-3.5 w-3.5" />} onClick={() => setExportKind("PDF report")}>Generate report</Button>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold text-content-primary">Evaluation metrics</h2><p className="mt-1 text-2xs text-content-muted">Consistent demo fixture values; not calculated from ground truth or model predictions.</p></div><Badge variant="warning">ILLUSTRATIVE</Badge></div>
        <EvaluationMetrics fixture={fixture} />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <RocChart fixture={fixture} />
        <ScoreDistributionChart fixture={fixture} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <SpectralComparison target={targetSignature} />
        <ConfigurationSummary job={job} scene={scene} targetName={targetSignature?.name ?? null} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AIExplanation job={job} fixture={fixture} targetName={targetSignature?.name ?? null} />
        <ProviderComparison scene={scene} scenes={scenes} />
      </div>

      <ExportModal
        kind={exportKind}
        job={job}
        featureCount={fixture.features.features.length}
        progress={exportProgress}
        complete={exportComplete}
        error={exportError}
        onClose={closeExport}
        onStart={startExport}
      />
    </div>
  );
}

function UnknownJobState({ jobId }: { jobId: string }) {
  return <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 lg:p-8"><PageHeader category="DETECTION ANALYTICS" title="Result job not found" subtitle="This ID does not match a job in the shared Processing Jobs store." /><Card><CardContent className="space-y-3 p-5"><p className="break-all font-mono text-xs text-content-muted">{jobId}</p><p className="text-xs text-content-secondary">The job may have been cleared from this browser or the link may be incorrect.</p><Link className="text-xs text-accent-primary hover:underline" to="/results">Back to Results Overview</Link></CardContent></Card></div>;
}

function UnavailableResultState({ job }: { job: AnalysisJobRecord }) {
  const active = job.status === "queued" || job.status === "processing";
  const title = active ? "Results are not available yet" : job.status === "failed" ? "Job failed — no completed results" : "Job cancelled — no completed results";
  const detail = active
    ? `This demo job is ${job.status}${job.status === "processing" ? ` at ${job.currentStage}` : ""}. Results become available only after its lifecycle reaches Completed.`
    : job.status === "failed"
      ? "The job did not complete. This Results view will not show a successful detection result."
      : "The job was cancelled before completion. No result fixture is available.";
  return <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 lg:p-8"><PageHeader category="DETECTION ANALYTICS" title={title} subtitle="Results require a completed job in the shared Processing Jobs store." /><DemoNotice /><Card><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-center gap-2"><Badge variant={job.status === "failed" ? "danger" : job.status === "completed" ? "success" : "warning"}>{job.status}</Badge><Badge variant="warning">DEMO JOB</Badge></div><p className="break-all font-mono text-xs text-accent-primary">{job.id}</p><p className="text-xs text-content-secondary">{detail}</p><div className="flex flex-wrap gap-3"><Link to={`/jobs/${encodeURIComponent(job.id)}`} className="text-xs text-accent-primary hover:underline">Open job details</Link><Link to="/jobs" className="text-xs text-accent-primary hover:underline">Processing Jobs</Link><Link to="/results" className="text-xs text-accent-primary hover:underline">Results overview</Link></div></CardContent></Card></div>;
}

function DemoNotice() {
  return null;
}

function OverviewValue({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-2xs uppercase tracking-wide text-content-muted">{label}</p><p className="mt-0.5 break-words text-content-secondary">{value}</p></div>;
}

function LayerToggle({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className={`flex items-center gap-2 py-1 text-2xs ${disabled ? "text-content-muted" : "text-content-secondary"}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="accent-cyan-400" />{label}{disabled && <span className="ml-auto">unavailable</span>}</label>;
}

function OpacityControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block py-1 text-2xs text-content-muted">{label}<span className="float-right font-mono text-content-secondary">{value}%</span><input aria-label={label} type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 block w-full accent-cyan-400" /></label>;
}

function DetectionDetails({ feature, job, onClose }: { feature: DemoDetectionFeature; job: AnalysisJobRecord; onClose: () => void }) {
  const [lng, lat] = feature.properties.centroid ?? [NaN, NaN];
  return <div className="space-y-4 p-4">
    <div className="flex items-start justify-between gap-2"><div><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent-primary" /><h2 className="text-sm font-semibold text-content-primary">Detection details</h2></div><p className="mt-1 font-mono text-2xs text-accent-primary">{feature.properties.detectionId}</p></div><button onClick={onClose} aria-label="Clear detection selection" className="rounded p-1 text-content-muted hover:bg-surface-elevated hover:text-content-primary"><X className="h-4 w-4" /></button></div>
    <Badge variant="warning">DEMO / ILLUSTRATIVE</Badge>
    <div className="space-y-3">
      <OverviewValue label="Feature ID" value={feature.properties.id} />
      <OverviewValue label="Category / target label" value={feature.properties.category} />
      <OverviewValue label="Illustrative score" value={feature.properties.score.toFixed(3)} />
      <OverviewValue label="Illustrative area" value={feature.properties.areaKm2 === null ? "Unavailable" : `${feature.properties.areaKm2.toFixed(3)} km²`} />
      <OverviewValue label="Centroid (longitude, latitude)" value={Number.isFinite(lng) ? `${lng.toFixed(6)}, ${lat.toFixed(6)}` : "Unavailable"} />
      <OverviewValue label="Associated AOI" value={`${job.aoiName} · ${job.configuration.aoiId ?? "ID unavailable"}`} />
      <OverviewValue label="Associated scene" value={`${job.sceneName} · ${job.configuration.sceneId ?? "ID unavailable"}`} />
      <p className="border-t border-border-subtle pt-3 text-2xs leading-relaxed text-content-muted">Feature properties come from this job’s local demo fixture. Selection does not trigger analysis or change the job.</p>
    </div>
  </div>;
}

function ConfigurationSummary({ job, scene, targetName }: { job: AnalysisJobRecord; scene: SceneCatalogItem | undefined; targetName: string | null }) {
  const parameterEntries = Object.entries(job.configuration.algorithmSettings.parameters);
  return <Card variant="default">
    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3"><div><h2 className="text-sm font-semibold text-content-primary">Submitted configuration</h2><p className="mt-1 break-all font-mono text-2xs text-accent-primary">{job.id}</p></div><Badge variant="warning">FROM JOB</Badge></div>
    <CardContent className="grid gap-x-5 gap-y-3 p-4 sm:grid-cols-2">
      <OverviewValue label="Algorithm" value={job.configuration.algorithm.toUpperCase()} />
      <OverviewValue label="AOI" value={`${job.aoiName} · ${job.configuration.aoiId ?? "ID unavailable"}`} />
      <OverviewValue label="Satellite scene" value={`${job.sceneName} · ${job.configuration.sceneId ?? "ID unavailable"}`} />
      <OverviewValue label="Target signature" value={job.configuration.targetSignatureId ? `${targetName ?? job.targetSignatureName ?? "Unavailable"} · ${job.configuration.targetSignatureId}` : "None required / selected"} />
      {parameterEntries.map(([key, value]) => <OverviewValue key={key} label={key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)} value={String(value)} />)}
      <OverviewValue label="Normalization" value={job.configuration.normalization} />
      <OverviewValue label="PCA" value={job.configuration.pca.enabled ? `Enabled · ${job.configuration.pca.components} components` : "Disabled"} />
      <OverviewValue label="Bad-band metadata" value={scene?.badBandRanges?.length ? scene.badBandRanges.map(([min, max]) => `${min}–${max}`).join(", ") : scene?.badBandIndices?.length ? scene.badBandIndices.join(", ") : scene ? "Unavailable for this scene" : "Scene metadata unavailable"} />
      <OverviewValue label="Threshold percentile" value={`${job.configuration.thresholdPercentile}%`} />
      <OverviewValue label="Status / completed" value={`${job.status} · ${job.completedAt ? new Date(job.completedAt).toLocaleString() : "timestamp unavailable"}`} />
    </CardContent>
  </Card>;
}

function AIExplanation({ job, fixture, targetName }: { job: AnalysisJobRecord; fixture: DemoResultFixture; targetName: string | null }) {
  const description: Record<AnalysisJobRecord["configuration"]["algorithm"], string> = {
    rxd: "RXD is configured as an unsupervised anomaly detector. Its configured detection mode and covariance regularization describe how a hypothetical workflow would characterize background variation.",
    mf: "Matched Filter is configured to score resemblance to a selected target signature. The background method, covariance regularization, and output mode are configuration metadata only.",
    cem: "CEM is configured to emphasize a selected target signature while constraining background response. The regularization and output mode do not run any computation here.",
    fusion: "Fusion combines the configured spatial and spectral contributions. Its strategy and weights are recorded from the submitted configuration and are not applied to imagery.",
  };
  const parameterText = Object.entries(job.configuration.algorithmSettings.parameters)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}: ${String(value)}`)
    .join(" · ");
  const highScore = Math.max(...fixture.features.features.map((feature) => feature.properties.score));
  return <Card variant="default">
    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3"><div><h2 className="text-sm font-semibold text-content-primary">SIMULATED AI EXPLANATION</h2><p className="mt-1 text-2xs text-content-muted">Deterministic frontend template · no AI model was called</p></div><Badge variant="warning">SIMULATED</Badge></div>
    <CardContent className="space-y-3 p-4 text-xs leading-relaxed text-content-secondary">
      <p>{description[job.configuration.algorithm]}</p>
      <p><strong className="text-content-primary">Configured parameters:</strong> {parameterText || "No algorithm-specific parameters are recorded."} Normalization: {job.configuration.normalization}. PCA: {job.configuration.pca.enabled ? `${job.configuration.pca.components} components configured` : "disabled"}. Threshold: {job.configuration.thresholdPercentile}%.</p>
      <p><strong className="text-content-primary">Target signature:</strong> {targetName ? `${targetName} was included in the submitted configuration; the comparison visualization remains illustrative.` : "No target signature was used in the submitted configuration."}</p>
      <p><strong className="text-content-primary">Fixture observation:</strong> The generated display contains {fixture.features.features.length} illustrative polygon examples; the highest demo score is {highScore.toFixed(3)}. These are fixture values, not detections or scientific conclusions.</p>
      <p className="flex items-start gap-2 border-t border-border-subtle pt-3 text-2xs text-status-warning"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />All narrative and visualization content is simulated; no real satellite imagery, algorithm output, or validated ground-truth evaluation was used.</p>
    </CardContent>
  </Card>;
}

function ProviderComparison({ scene, scenes }: { scene: SceneCatalogItem | undefined; scenes: SceneCatalogItem[] }) {
  const candidates = [scene, ...scenes.filter((item) => item.id !== scene?.id)].filter((item): item is SceneCatalogItem => Boolean(item)).slice(0, 3);
  return <Card variant="default">
    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3"><div><h2 className="text-sm font-semibold text-content-primary">Provider / platform comparison</h2><p className="mt-1 text-2xs text-content-muted">Catalogue metadata only; not a performance ranking</p></div><Badge variant="warning">ILLUSTRATIVE COMPARISON</Badge></div>
    <div className="divide-y divide-border-subtle">
      {candidates.map((item) => <div key={item.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_1.2fr]">
        <div><p className="text-xs font-medium text-content-primary">{item.sensor}</p><p className="mt-1 text-2xs text-content-muted">{item.provider}</p><p className="mt-1 text-2xs text-content-muted">{item.sensorType} · {item.name}</p></div>
        <div className="grid grid-cols-2 gap-2 text-2xs">
          <OverviewValue label="Spatial resolution" value={item.spatialResolutionM === null ? "Unavailable" : `${item.spatialResolutionM} m`} />
          <OverviewValue label="Bands" value={item.spectralBands === null ? "Unavailable" : String(item.spectralBands)} />
          <OverviewValue label="Spectral coverage" value={item.wavelengthRangeNm ? `${item.wavelengthRangeNm[0]}–${item.wavelengthRangeNm[1]} nm` : "Unavailable"} />
          <OverviewValue label="Catalogue note" value={item.metadataNote ? "Project metadata; verify source" : "Unavailable"} />
        </div>
      </div>)}
      {!candidates.length && <p className="p-4 text-xs text-content-muted">Scene comparison metadata is unavailable.</p>}
    </div>
    <p className="px-3 pb-3 text-2xs text-content-muted">Data characteristics shown only where present in the existing scene catalogue. No price, availability, or provider performance is asserted.</p>
  </Card>;
}

function downloadDemoGeoJson(_fixture: DemoResultFixture, job: AnalysisJobRecord) {
  const url = analysisApi.getPolygonsUrl(job.id);
  window.open(url, "_blank");
}

function ExportModal({ kind, job, featureCount, onClose, onStart }: {
  kind: ExportKind | null;
  job: AnalysisJobRecord;
  featureCount: number;
  progress?: number;
  complete?: boolean;
  error?: string | null;
  onClose: () => void;
  onStart: () => void;
}) {
  const handleDirectDownload = () => {
    if (kind === "GeoTIFF") {
      window.open(analysisApi.getRasterUrl(job.id), "_blank");
      onClose();
    } else if (kind === "GeoJSON") {
      window.open(analysisApi.getPolygonsUrl(job.id), "_blank");
      onClose();
    } else {
      onStart();
    }
  };

  const description = kind === "GeoJSON"
    ? "Downloads the continuous polygon contours generated by the scientific engine as a standard GeoJSON FeatureCollection."
    : kind === "GeoTIFF"
      ? "Downloads the 32-bit floating point continuous detection score raster with georeferenced CRS and affine transforms."
      : "Compiles a comprehensive PDF mission report including spectral metrics, sensor metadata, and multi-provider AI explanations.";

  return <Modal
    isOpen={Boolean(kind)}
    onClose={onClose}
    size="md"
    title={`Export ${kind}`}
    description="Scientific Artifact Export"
    footer={<>
      <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      <Button size="sm" onClick={handleDirectDownload}>Download {kind}</Button>
    </>}
  >
    <div className="space-y-4 text-xs text-content-secondary">
      <p>{description}</p>
      <div className="grid grid-cols-2 gap-3 rounded border border-border-subtle bg-surface-secondary/30 p-3">
        <OverviewValue label="Analysis Job" value={job.id} />
        <OverviewValue label="Artifact Format" value={kind ?? "—"} />
        {kind === "GeoJSON" && <OverviewValue label="Vector Features" value={String(featureCount)} />}
      </div>
      <p className="text-2xs text-content-muted">Files are delivered directly from the backend artifact storage volume.</p>
    </div>
  </Modal>;
}
