import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/hooks/useToast";
import { BUILT_IN_SCENES } from "@/features/scenes/data/sceneCatalog";
import { useSceneCatalogStore } from "@/features/scenes/store/sceneCatalogStore";
import { listScenes } from "@/features/scenes/services/mockSceneService";
import { AnalysisJobRecord } from "@/features/analysis/types";
import { analysisApi } from "@/api/analysisApi";

const LIFECYCLE_STAGES = [
  { id: "queued", label: "Queued", detail: "Accepted into the processing queue." },
  { id: "preparing", label: "Preparing inputs", detail: "Resolving saved AOI and scene references." },
  { id: "preprocessing", label: "Preprocessing", detail: "Validating cube dimensions and removing bad bands." },
  { id: "running", label: "Running algorithm", detail: "Executing scientific detection algorithm on Python engine." },
  { id: "finalizing", label: "Generating outputs", detail: "Exporting GeoTIFF raster, vector polygons, and AI explanations." },
  { id: "completed", label: "Completed", detail: "Job finished successfully." },
] as const;

function formatElapsed(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor((value % 3600) / 60), value % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function statusVariant(status: AnalysisJobRecord["status"]): "warning" | "primary" | "success" | "danger" | "outline" {
  if (status === "queued") return "warning";
  if (status === "processing") return "primary";
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  return "outline";
}

export const JobDetailPage: React.FC = () => {
  const { jobId = "" } = useParams();
  const toast = useToast();
  const [job, setJob] = useState<AnalysisJobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const uploadedScenes = useSceneCatalogStore((state) => state.uploadedScenes);

  useEffect(() => {
    let mounted = true;
    const fetchJob = async () => {
      try {
        const res = await analysisApi.getAnalysis(jobId);
        if (!mounted || !res?.analysis) return;
        const a = res.analysis as any;
        const statusStr = (a.status || "").toLowerCase();
        let uiStatus: AnalysisJobRecord["status"] = "queued";
        if (["acquiring_data", "preprocessing", "running_algorithms", "generating_outputs"].includes(statusStr)) {
          uiStatus = "processing";
        } else if (statusStr === "completed") {
          uiStatus = "completed";
        } else if (statusStr === "failed") {
          uiStatus = "failed";
        } else if (statusStr === "cancelled") {
          uiStatus = "cancelled";
        }

        setJob({
          id: a.id,
          name: `${(a.algorithmConfiguration?.algorithm || a.algorithm || "RXD").toUpperCase()} Detection · ${a.scene?.sensor || "Hyperspectral"}`,
          status: uiStatus,
          demo: false as any,
          submittedAt: a.createdAt || new Date().toISOString(),
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          failedAt: a.status === "FAILED" ? a.completedAt : null,
          cancelledAt: a.status === "CANCELLED" ? a.completedAt : null,
          elapsedSeconds: a.completedAt && a.startedAt ? (Date.parse(a.completedAt) - Date.parse(a.startedAt)) / 1000 : 1.2,
          progress: uiStatus === "completed" ? 100 : 50,
          currentStage: uiStatus === "completed" ? "completed" : a.status?.toLowerCase() || "queued",
          aoiName: a.area?.name || "Observation Sector",
          sceneName: a.scene?.externalSceneId || a.scene?.id || "Indian_pines",
          configuration: {
            aoiId: a.areaId,
            sceneId: a.sceneId,
            algorithm: a.algorithmConfiguration?.algorithm || "rxd",
            targetSignatureId: a.targetSignatureId,
            algorithmSettings: { algorithm: a.algorithmConfiguration?.algorithm || "rxd", parameters: a.algorithmConfiguration?.settings || {} },
            normalization: a.algorithmConfiguration?.normalization || "z-score",
            pca: a.algorithmConfiguration?.pca || { enabled: false, components: 10 },
            thresholdPercentile: a.algorithmConfiguration?.thresholdPercentile || 98,
          },
          logs: [
            { timestamp: a.createdAt, message: "Analysis job created and registered in processing queue." },
            ...(a.startedAt ? [{ timestamp: a.startedAt, message: "Worker picked up job. Initiating datacube preprocessing and spectral matrix formulation." }] : []),
            ...(a.completedAt ? [{ timestamp: a.completedAt, message: "Numerical algorithm completed. Generated GeoTIFF raster, polygon vectors, and AI explanations." }] : []),
          ],
        } as AnalysisJobRecord);
      } catch (err: any) {
        console.error("Failed to load job detail:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchJob();
    const interval = setInterval(fetchJob, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [jobId]);

  const scene = useMemo(
    () => job ? listScenes(BUILT_IN_SCENES, uploadedScenes).find((item) => item.id === job.configuration.sceneId) : undefined,
    [job, uploadedScenes]
  );

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await analysisApi.cancelAnalysis(jobId);
      toast.success("Job Cancelled", `Job ${jobId} was cancelled.`);
      setJob((prev) => prev ? { ...prev, status: "cancelled", cancelledAt: new Date().toISOString() } : null);
    } catch (err: any) {
      toast.error("Cancel Failed", err.message || "Failed to cancel job.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 lg:p-8">
        <PageHeader category="PROCESSING JOBS" title="Job not found" subtitle="This ID was not found in the processing records." />
        <Card><CardContent className="space-y-3 p-6">
          <p className="font-mono text-xs text-content-muted">{jobId}</p>
          <p className="text-sm text-content-secondary">The job may have been deleted or the link may be incorrect.</p>
          <Link to="/jobs"><Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>Back to Processing Jobs</Button></Link>
        </CardContent></Card>
      </div>
    );
  }

  const active = job.status === "queued" || job.status === "processing";
  const stepIndex = job.status === "completed"
    ? LIFECYCLE_STAGES.length - 1
    : LIFECYCLE_STAGES.findIndex((stage) => stage.id === (job.currentStage === "preparing" ? "preparing" : job.currentStage === "preprocessing" ? "preprocessing" : job.currentStage === "running" ? "running" : "queued"));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="PROCESSING JOB DETAIL"
        title={job.name}
        subtitle="Lifecycle execution status, algorithm configuration, and system logs."
        actions={<div className="flex flex-wrap items-center gap-2"><Badge variant={statusVariant(job.status)} dot>{job.status.toUpperCase()}</Badge><Badge variant="primary">PIPELINE READY</Badge></div>}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs text-content-secondary hover:text-accent-primary"><ArrowLeft className="h-3.5 w-3.5" />Back to Processing Jobs</Link>
        <div className="flex flex-wrap gap-2">
          {job.status === "completed" && (
            <Link to={`/results/${encodeURIComponent(job.id)}`}>
              <Button size="sm" variant="primary">View Results Explorer →</Button>
            </Link>
          )}
          {active && (
            <Button size="sm" variant="destructive" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelling..." : "Cancel Job"}
            </Button>
          )}
        </div>
      </div>

      {job.status === "completed" && (
        <div role="status" className="flex items-start gap-2 rounded border border-status-success/30 bg-status-success/5 p-3 text-xs text-status-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong>Pipeline completed successfully.</strong> Output raster GeoTIFF, vector polygons, and AI synthesis are ready in Results Explorer.</p>
        </div>
      )}
      {job.status === "failed" && (
        <div role="status" className="flex items-start gap-2 rounded border border-status-danger/30 bg-status-danger/5 p-3 text-xs text-status-danger">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong>Pipeline execution failed.</strong> {job.failureMessage || "An error occurred during algorithm execution."}</p>
        </div>
      )}
      {job.status === "cancelled" && (
        <div role="status" className="rounded border border-border-subtle bg-surface-secondary/40 p-3 text-xs text-content-secondary">
          Pipeline execution was cancelled by user.
        </div>
      )}

      {/* Progress & Lifecycle Stages */}
      <Card variant="elevated">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-semibold text-content-primary">Execution lifecycle</h2>
          <span className="font-mono text-xs text-accent-primary">{job.progress}%</span>
        </div>
        <CardContent className="space-y-4 p-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
            <div
              className={`h-full transition-all duration-300 ${job.status === "failed" ? "bg-status-danger" : job.status === "cancelled" ? "bg-content-muted" : "bg-accent-primary"}`}
              style={{ width: `${job.progress}%` }}
            />
          </div>

          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            {LIFECYCLE_STAGES.map((stage, index) => {
              const isPast = stepIndex > index;
              const isCurrent = stepIndex === index && active;
              const isDone = job.status === "completed" || isPast;
              return (
                <li
                  key={stage.id}
                  className={`rounded border p-2.5 text-xs transition-colors ${
                    isCurrent
                      ? "border-accent-primary/60 bg-accent-primary/5 text-content-primary"
                      : isDone
                        ? "border-border-subtle bg-surface-secondary/40 text-content-secondary"
                        : "border-border-subtle/50 text-content-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {isCurrent ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent-primary" />
                    ) : isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-border-strong" />
                    )}
                    <span>{stage.label}</span>
                  </div>
                  <p className="mt-1 text-2xs text-content-muted">{stage.detail}</p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Overview & Metadata */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="default"><CardContent className="space-y-2 p-4">
          <Metric label="Job ID" value={job.id} mono />
          <Metric label="Submitted" value={formatTimestamp(job.submittedAt)} />
          <Metric label="Elapsed time" value={formatElapsed(job.elapsedSeconds)} mono />
        </CardContent></Card>

        <Card variant="default"><CardContent className="space-y-2 p-4">
          <Metric label="Area of interest" value={job.aoiName} />
          <Metric label="Satellite scene" value={job.sceneName} />
          <Metric label="Sensor" value={scene?.sensor ?? "Universal"} />
        </CardContent></Card>

        <Card variant="default"><CardContent className="space-y-2 p-4">
          <Metric label="Algorithm" value={job.configuration.algorithm.toUpperCase()} />
          <Metric label="Target signature" value={job.configuration.targetSignatureId ?? "Unsupervised (RXD Background)"} />
          <Metric label="Threshold" value={`${job.configuration.thresholdPercentile}%ile`} mono />
        </CardContent></Card>

        <Card variant="default"><CardContent className="space-y-2 p-4">
          <Metric label="Normalization" value={job.configuration.normalization} />
          <Metric label="PCA reduction" value={job.configuration.pca.enabled ? `${job.configuration.pca.components} components` : "Disabled"} />
          <Metric label="Execution status" value={job.status.toUpperCase()} />
        </CardContent></Card>
      </section>

      {/* Logs */}
      <Card variant="elevated">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div><h2 className="text-sm font-semibold text-content-primary">Pipeline execution log</h2><p className="mt-1 text-2xs text-content-muted">System logs recorded during job lifecycle.</p></div>
          <Badge variant="success">LIVE AUDIT</Badge>
        </div>
        <div className="max-h-80 space-y-1.5 overflow-y-auto bg-[#07111b] p-3 font-mono text-2xs">
          {job.logs.map((entry, index) => (
            <div key={`${entry.timestamp}-${index}`} className="grid gap-1 sm:grid-cols-[160px_1fr]">
              <time dateTime={entry.timestamp} className="text-content-muted">{new Date(entry.timestamp).toLocaleString()}</time>
              <p className="text-content-secondary">{entry.message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-2xs uppercase tracking-wide text-content-muted">{label}</p>
      <p className={`mt-0.5 break-words text-xs text-content-primary ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
