import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Clock3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { AnalysisJobRecord, DEFAULT_RXD_SETTINGS } from "@/features/analysis/types";
import { analysisApi } from "@/api/analysisApi";

type JobFilter = "all" | AnalysisJobRecord["status"];
const FILTERS: JobFilter[] = ["all", "queued", "processing", "completed", "failed", "cancelled"];

function statusVariant(status: AnalysisJobRecord["status"]): "warning" | "primary" | "success" | "danger" | "outline" {
  if (status === "queued") return "warning";
  if (status === "processing") return "primary";
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  return "outline";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function mapBackendJob(a: any): AnalysisJobRecord {
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

  const progress =
    a.status === "COMPLETED" ? 100 :
    a.status === "GENERATING_OUTPUTS" ? 85 :
    a.status === "RUNNING_ALGORITHMS" ? 65 :
    a.status === "PREPROCESSING" ? 45 :
    a.status === "ACQUIRING_DATA" ? 25 : 10;

  return {
    id: a.id,
    name: `${(a.algorithm || "RXD").toUpperCase()} - ${a.scene?.sensor || a.sceneId || "Hyperspectral"} Detection`,
    status: uiStatus,
    demo: false as any,
    submittedAt: a.createdAt || new Date().toISOString(),
    startedAt: a.startedAt,
    completedAt: a.completedAt,
    failedAt: a.status === "FAILED" ? a.completedAt : null,
    cancelledAt: a.status === "CANCELLED" ? a.completedAt : null,
    elapsedSeconds: a.completedAt && a.startedAt ? (Date.parse(a.completedAt) - Date.parse(a.startedAt)) / 1000 : 15,
    progress,
    currentStage: a.status === "COMPLETED" ? "completed" : a.status === "FAILED" ? "failed" : a.status === "PREPROCESSING" ? "preprocessing" : "running",
    failureStage: null,
    stoppedAtStage: null,
    failureMessage: a.errorMessage || null,
    retryOf: null,
    logs: [
      { timestamp: a.createdAt, message: `Analysis record initialized in database with status ${a.status}.` },
      ...(a.startedAt ? [{ timestamp: a.startedAt, message: "Worker dequeued job and initialized Python processing pipeline." }] : []),
      ...(a.completedAt ? [{ timestamp: a.completedAt, message: `Execution finalized with status ${a.status}.` }] : []),
    ],
    configuration: {
      aoiId: a.areaId,
      sceneId: a.sceneId,
      algorithm: a.algorithm || "rxd",
      targetSignatureId: a.targetSignatureId,
      algorithmSettings: { algorithm: "rxd", parameters: DEFAULT_RXD_SETTINGS },
      normalization: "z-score",
      pca: { enabled: false, components: 10 },
      thresholdPercentile: 98,
    },
    aoiName: a.area?.name || "Target AOI",
    sceneName: a.scene?.externalSceneId || a.sceneId || "Hyperspectral Scene",
    targetSignatureName: a.targetSignatureId || null,
  };
}

export const JobsPage: React.FC = () => {
  const toast = useToast();
  const [jobs, setJobs] = useState<AnalysisJobRecord[]>([]);
  const [filter, setFilter] = useState<JobFilter>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ type: "cancel" | "retry"; job: AnalysisJobRecord } | null>(null);

  const fetchLiveJobs = async () => {
    try {
      const res = await analysisApi.listAnalyses();
      const rawList = res?.analyses || [];
      const mapped = rawList.map(mapBackendJob);
      setJobs(mapped);
    } catch (err: any) {
      console.error("Failed to fetch live analyses from API:", err);
    }
  };

  useEffect(() => {
    fetchLiveJobs();
    const interval = setInterval(fetchLiveJobs, 4000);
    return () => clearInterval(interval);
  }, []);

  const counts = useMemo(() => ({
    all: jobs.length,
    queued: jobs.filter((job) => job.status === "queued").length,
    processing: jobs.filter((job) => job.status === "processing").length,
    completed: jobs.filter((job) => job.status === "completed").length,
    failed: jobs.filter((job) => job.status === "failed").length,
    cancelled: jobs.filter((job) => job.status === "cancelled").length,
  }), [jobs]);

  const visibleJobs = useMemo(() => jobs
    .filter((job) => filter === "all" || job.status === filter)
    .sort((a, b) => (Date.parse(b.submittedAt) - Date.parse(a.submittedAt)) * (newestFirst ? 1 : -1)), [filter, jobs, newestFirst]);

  const confirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === "cancel") {
        await analysisApi.cancelAnalysis(confirmAction.job.id);
        toast.success("Job Cancelled", `${confirmAction.job.id} was marked as cancelled.`);
      }
      setConfirmAction(null);
      fetchLiveJobs();
    } catch (error) {
      toast.error("Job action failed", error instanceof Error ? error.message : "The job could not be updated.");
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="PIPELINE ORCHESTRATION"
        title="Processing Jobs"
        subtitle="Monitor live hyperspectral analysis jobs running across the BullMQ Redis queue and Python execution engine."
        actions={<Badge variant="success" size="md" dot>LIVE QUEUE</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded border px-3 py-2 text-left transition-colors ${
              filter === status
                ? "border-accent-primary/50 bg-accent-primary/10"
                : "border-border-subtle bg-surface-panel hover:border-border-strong"
            }`}
          >
            <span className="block text-2xs font-mono uppercase tracking-wide text-content-muted">{status} jobs</span>
            <span className="mt-1 block font-mono text-lg font-semibold text-content-primary">{counts[status]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border-subtle py-2">
        <span className="font-mono text-xs text-content-muted">{visibleJobs.length} {visibleJobs.length === 1 ? "job" : "jobs"} matched</span>
        <Button variant="ghost" size="sm" leftIcon={<ArrowUpDown className="h-3.5 w-3.5" />} onClick={() => setNewestFirst((current) => !current)}>
          {newestFirst ? "Newest first" : "Oldest first"}
        </Button>
      </div>

      {visibleJobs.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <Clock3 className="h-8 w-8 text-content-muted" />
            <h3 className="text-sm font-semibold text-content-primary">No jobs found</h3>
            <p className="max-w-md text-xs text-content-muted">
              {filter === "all" ? "No analyses have been launched yet. Create an analysis from the studio to start processing." : `No jobs with status "${filter}".`}
            </p>
            <Link to="/analysis/new">
              <Button size="sm">Launch New Analysis</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleJobs.map((job) => (
            <Card key={job.id} variant="elevated" className="overflow-hidden transition-colors hover:border-border-strong">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-accent-primary">{job.id}</span>
                      <Badge variant={statusVariant(job.status)} size="sm">{job.status.toUpperCase()}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-content-primary truncate">{job.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-content-muted">
                      <span>AOI: <strong className="text-content-secondary">{job.aoiName}</strong></span>
                      <span>Scene: <strong className="text-content-secondary">{job.sceneName}</strong></span>
                      <span>Submitted: <strong className="text-content-secondary">{formatDate(job.submittedAt)}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {job.status === "completed" && (
                      <Link to={`/results/${encodeURIComponent(job.id)}`}>
                        <Button size="sm" variant="primary">View Results</Button>
                      </Link>
                    )}
                    {(job.status === "queued" || job.status === "processing") && (
                      <Button
                        size="sm"
                        variant="destructive"
                        leftIcon={<XCircle className="h-3.5 w-3.5" />}
                        onClick={() => setConfirmAction({ type: "cancel", job })}
                      >
                        Cancel Job
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress bar for active jobs */}
                {job.status === "processing" && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-2xs font-mono text-content-muted">
                      <span>Pipeline execution in progress</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
                      <div className="h-full bg-accent-primary transition-all duration-500" style={{ width: `${job.progress}%` }} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          isOpen={Boolean(confirmAction)}
          title="Cancel Analysis Job"
          message={`Are you sure you want to cancel analysis ${confirmAction.job.id}? The worker will gracefully terminate the pipeline.`}
          confirmLabel="Cancel Job"
          isDestructive={true}
          onConfirm={confirm}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
};
