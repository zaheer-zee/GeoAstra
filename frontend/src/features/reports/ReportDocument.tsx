import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AnalysisJobRecord } from "@/features/analysis/types";
import { AOIFeature } from "@/features/geospatial/types/geospatial.types";
import { SceneCatalogItem } from "@/features/scenes/types";
import { SpectralSignature } from "@/features/signatures/types";
import { DemoDetectionFeature, DemoResultFixture } from "@/features/results/types";
import { ResultsMap } from "@/features/results/components/ResultsMap";
import { ScoreDistributionChart } from "@/features/results/components/ResultsCharts";
import { Badge } from "@/components/ui/Badge";

interface ReportDocumentProps {
  reportId: string;
  title: string;
  createdAt: string | null;
  job: AnalysisJobRecord;
  fixture: DemoResultFixture;
  aoi?: AOIFeature;
  scene?: SceneCatalogItem;
  targetSignature?: SpectralSignature | null;
}

const algorithmDescriptions: Record<AnalysisJobRecord["configuration"]["algorithm"], string> = {
  rxd: "RXD is configured for unsupervised anomaly scoring against estimated background statistics.",
  mf: "Matched Filter is configured to score resemblance to a selected target signature.",
  cem: "CEM is configured to emphasize a selected target signature while constraining background response.",
  fusion: "Fusion records configured spatial and spectral contributions for a hypothetical combined workflow.",
};

export const ReportDocument: React.FC<ReportDocumentProps> = ({
  reportId,
  title,
  createdAt,
  job,
  fixture,
  aoi,
  scene,
  targetSignature,
}) => {
  const [selectedFeature, setSelectedFeature] = useState<DemoDetectionFeature | null>(null);
  const detections = fixture.features.features;
  const highestDetection = detections.reduce<DemoDetectionFeature | null>(
    (highest, feature) => !highest || feature.properties.score > highest.properties.score ? feature : highest,
    null
  );
  const algorithm = job.configuration.algorithm;
  const parameters = Object.entries(job.configuration.algorithmSettings.parameters);
  const signatureName = job.configuration.targetSignatureId
    ? targetSignature?.name ?? job.targetSignatureName ?? "Not available"
    : "None required / selected";
  const interpretation = algorithmDescriptions[algorithm];

  return (
    <article className="mx-auto max-w-5xl space-y-5 text-content-primary">
      <header className="border-b border-border-strong pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-2xs uppercase tracking-[0.18em] text-accent-primary">GeoAstra · Hyperspectral analysis report</p>
            <h1 className="mt-2 text-xl font-semibold leading-tight sm:text-2xl">{title}</h1>
          </div>
          <Badge variant="success">CALCULATED REPORT</Badge>
        </div>
        <div className="mt-4 grid gap-2 text-2xs text-content-secondary sm:grid-cols-2 lg:grid-cols-4">
          <DocumentMeta label="Report ID" value={reportId} mono />
          <DocumentMeta label="Analysis job" value={job.id} mono />
          <DocumentMeta label="Report status" value="Ready · completed analysis" />
          <DocumentMeta label="Created" value={formatDate(createdAt)} />
        </div>
      </header>

      <section className="space-y-3">
        <SectionHeading index="01" title="Executive analysis summary" />
        <div className="border-l-2 border-accent-primary/70 bg-surface-secondary/25 p-4">
          <p className="text-sm leading-relaxed text-content-primary">{algorithm.toUpperCase()} analysis was completed for {job.aoiName}, using scene {job.sceneName}. This report summarizes {detections.length} detected feature clusters and the mathematical configuration recorded on the original analysis run.</p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading index="02" title="Study area and scene" />
        <div className="grid gap-x-6 gap-y-3 border-y border-border-subtle py-4 sm:grid-cols-2 lg:grid-cols-3">
          <DocumentMeta label="Area of interest" value={job.aoiName || "Not available"} />
          <DocumentMeta label="AOI ID" value={job.configuration.aoiId ?? "Not available"} mono />
          <DocumentMeta label="AOI area" value={aoi ? `${aoi.properties.areaKm2.toLocaleString()} km²` : "Not available"} />
          <DocumentMeta label="Satellite scene" value={scene?.name ?? job.sceneName ?? "Not available"} />
          <DocumentMeta label="Sensor / platform" value={scene ? `${scene.sensor} · ${scene.sensorType}` : "Not available"} />
          <DocumentMeta label="Provider" value={scene?.provider ?? "Not available"} />
          <DocumentMeta label="Acquisition date" value={scene?.acquisitionDate ?? "Not available"} />
          <DocumentMeta label="Algorithm" value={algorithm.toUpperCase()} />
          <DocumentMeta label="Target signature" value={signatureName} />
          <DocumentMeta label="Analysis completion" value={`${job.status} · ${formatDate(job.completedAt)}`} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading index="03" title="Algorithm and submitted configuration" />
        <div className="space-y-3 border border-border-subtle bg-surface-secondary/15 p-4">
          <p className="text-xs leading-relaxed text-content-secondary">{interpretation} No algorithm was executed to create this report.</p>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <DocumentMeta label="Job ID" value={job.id} mono />
            {parameters.map(([key, value]) => <DocumentMeta key={key} label={humanize(key)} value={String(value)} />)}
            <DocumentMeta label="Normalization" value={job.configuration.normalization} />
            <DocumentMeta label="PCA" value={job.configuration.pca.enabled ? `Enabled · ${job.configuration.pca.components} components` : "Disabled"} />
            <DocumentMeta label="Threshold percentile" value={`${job.configuration.thresholdPercentile}%`} />
            <DocumentMeta
              label="Bad-band metadata"
              value={scene
                ? scene.badBandRanges?.length
                  ? scene.badBandRanges.map(([low, high]) => `${low}–${high} nm`).join(", ")
                  : scene.badBandIndices?.length ? scene.badBandIndices.join(", ") : "Not available"
                : "Not available"}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionHeading index="04" title="Scientific metrics" />
          <Badge variant="warning">ILLUSTRATIVE FIXTURE</Badge>
        </div>
        <p className="text-xs text-content-muted">Values are reused from the Phase 9 fixture associated with this job; they are simulated, not measured or validated.</p>
        <div className="grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-3 lg:grid-cols-6">
          <MetricCell name="Precision" value={formatMetric(fixture.metrics.precision)} description="Illustrative positive predictive value." />
          <MetricCell name="Recall" value={formatMetric(fixture.metrics.recall)} description="Illustrative sensitivity." />
          <MetricCell name="F1 score" value={formatMetric(fixture.metrics.f1)} description="Illustrative harmonic mean of precision and recall." />
          <MetricCell name="AUC" value={formatMetric(fixture.metrics.auc)} description="Illustrative area under the ROC curve." />
          <MetricCell name="Regions" value={String(detections.length)} description="Illustrative polygon examples in this fixture." />
          <MetricCell name="Mean score" value="Not available" description="No mean score is stored in this result fixture." />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading index="05" title="Map snapshot · illustrative result preview" />
        <p className="text-xs leading-relaxed text-content-muted">Interactive map preview of the same job-associated Phase 9 fixture. The basemap is geographic context only; no satellite image was generated or exported.</p>
        <div className="h-[420px] min-w-0 overflow-hidden border border-border-subtle bg-surface-secondary/20 sm:h-[440px]" aria-label="Report map snapshot">
          <ResultsMap
            fixture={fixture}
            aoi={aoi}
            sceneFootprint={scene?.footprint ?? undefined}
            layers={{ heatmap: true, polygons: true, aoi: Boolean(aoi), scene: Boolean(scene?.footprint) }}
            heatmapOpacity={0.68}
            polygonOpacity={0.55}
            selectedId={selectedFeature?.properties.id ?? null}
            onSelect={setSelectedFeature}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border border-border-subtle bg-surface-secondary/20 p-3 text-2xs text-content-secondary">
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 border border-amber-400 bg-amber-400/20" />AOI boundary</span>
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 border border-cyan-400 bg-cyan-400/30" />Illustrative detection regions</span>
          {scene?.footprint && <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 border border-sky-400" />Scene footprint</span>}
          <div className="flex min-w-[170px] items-center gap-2">
            <span>Heatmap intensity</span>
            <span className="h-2 min-w-16 flex-1 bg-gradient-to-r from-cyan-400 via-emerald-400 via-amber-300 to-rose-500" aria-label="Low-to-high heatmap intensity" />
            <span>Low → High</span>
          </div>
          <span className="ml-auto">Map data: OpenFreeMap · OpenStreetMap · illustrative overlays</span>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading index="06" title="Detection summary" />
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCell label="Illustrative regions" value={String(detections.length)} />
          <SummaryCell label="Highest fixture score" value={highestDetection?.properties.score.toFixed(3) ?? "Not available"} />
          <SummaryCell label="Highest-scoring category" value={highestDetection?.properties.category ?? "Not available"} />
        </div>
        <ScoreDistributionChart fixture={fixture} />
        <div className="overflow-x-auto border border-border-subtle">
          <table className="w-full min-w-[620px] border-collapse text-left text-xs">
            <thead className="bg-surface-secondary/50 text-2xs uppercase tracking-wide text-content-muted">
              <tr><th className="p-3">Feature</th><th className="p-3">Illustrative category</th><th className="p-3">Score</th><th className="p-3">Area</th><th className="p-3">Centroid (lon, lat)</th></tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {detections.map((feature) => <DetectionRow key={feature.properties.id} feature={feature} />)}
              {!detections.length && <tr><td className="p-4 text-content-muted" colSpan={5}>No detection features are available in this result fixture.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-content-muted">Spatial context: {aoi ? `the fixture uses the stored geometry for ${aoi.properties.name}` : scene?.footprint ? "the fixture uses the scene footprint because AOI geometry is unavailable" : "neither AOI geometry nor scene footprint is available; map extent is illustrative"}. The listed regions are generated examples, not verified detections or a scientific spatial-distribution finding.</p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHeading index="07" title="Demo interpretation" />
          <Badge variant="warning">SIMULATED · NO AI SERVICE</Badge>
        </div>
        <div className="space-y-3 border border-border-subtle bg-surface-secondary/15 p-4 text-xs leading-relaxed text-content-secondary">
          <p><strong className="text-content-primary">Overall interpretation.</strong> {interpretation} This report summarizes a deterministic interface fixture for job {job.id}; it is not an algorithm conclusion.</p>
          <p><strong className="text-content-primary">Key observation.</strong> The fixture includes {detections.length} illustrative regions{highestDetection ? `; its highest displayed score is ${highestDetection.properties.score.toFixed(3)} for ${highestDetection.properties.detectionId}` : ""}. {job.configuration.targetSignatureId ? `The submitted job references ${signatureName} as a target signature.` : "The submitted job does not reference a target signature."}</p>
          <p><strong className="text-content-primary">Possible significance.</strong> Any apparent pattern is suitable only for demonstrating report layout; it requires independent imagery, ground-truth, and domain review before interpretation.</p>
          <p><strong className="text-content-primary">Limitations and uncertainty.</strong> No imagery was processed, no AI model was called, and the fixture metrics and features are not scientific evidence.</p>
          <p><strong className="text-content-primary">Suggested next investigation.</strong> For a real study, verify source imagery and AOI geometry, run an approved analysis workflow, and validate candidate regions against independent reference data.</p>
        </div>
      </section>

      <footer className="border-t border-border-strong pt-4">
        <div className="flex items-start gap-2 text-xs leading-relaxed text-status-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong>Demo disclaimer.</strong> This report contains simulated job-linked result fixtures only. No scientific processing, validated model evaluation, satellite-image snapshot, or real AI interpretation is represented.</p>
        </div>
      </footer>
    </article>
  );
};

function SectionHeading({ index, title }: { index: string; title: string }) {
  return <h2 className="flex items-baseline gap-2 border-b border-border-subtle pb-2 text-sm font-semibold"><span className="font-mono text-2xs text-accent-primary">{index}</span>{title}</h2>;
}

function DocumentMeta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><p className="text-2xs uppercase tracking-wide text-content-muted">{label}</p><p className={`mt-1 break-words text-xs text-content-primary ${mono ? "font-mono" : ""}`}>{value || "Not available"}</p></div>;
}

function MetricCell({ name, value, description }: { name: string; value: string; description: string }) {
  return <div className="bg-surface-panel p-3" title={description}><p className="text-2xs text-content-muted">{name}</p><p className="mt-1 break-words font-mono text-sm text-content-primary">{value}</p><p className="mt-1 text-2xs leading-relaxed text-content-muted">{description}</p></div>;
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return <div className="border border-border-subtle bg-surface-secondary/20 p-3"><p className="text-2xs text-content-muted">{label}</p><p className="mt-1 break-words text-xs font-medium text-content-primary">{value}</p></div>;
}

function DetectionRow({ feature }: { feature: DemoDetectionFeature }) {
  const centroid = feature.properties.centroid;
  return <tr className="text-content-secondary">
    <td className="p-3 font-mono text-accent-primary">{feature.properties.detectionId}</td>
    <td className="p-3">{feature.properties.category}</td>
    <td className="p-3 font-mono">{feature.properties.score.toFixed(3)}</td>
    <td className="p-3">{feature.properties.areaKm2 === null ? "Not available" : `${feature.properties.areaKm2.toFixed(3)} km²`}</td>
    <td className="p-3 font-mono">{centroid ? `${centroid[0].toFixed(6)}, ${centroid[1].toFixed(6)}` : "Not available"}</td>
  </tr>;
}

function formatMetric(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "Not available";
}

function formatDate(value: string | null | undefined): string {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : "Not available";
}

function humanize(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replace(/^./, (letter) => letter.toUpperCase());
}
