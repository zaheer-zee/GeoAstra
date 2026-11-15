import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowDownToLine, ArrowLeft, FileText, FilterX, Search } from "lucide-react";
import { AnalysisJobRecord } from "@/features/analysis/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useDemoAnalysisJobStore } from "@/features/jobs/store/demoAnalysisJobStore";
import { useGeospatialStore } from "@/features/geospatial/store/geospatialStore";
import { BUILT_IN_SCENES } from "@/features/scenes/data/sceneCatalog";
import { listScenes } from "@/features/scenes/services/mockSceneService";
import { useSceneCatalogStore } from "@/features/scenes/store/sceneCatalogStore";
import { listSignatures } from "@/features/signatures/services/signatureService";
import { useSignatureStore } from "@/features/signatures/store/signatureStore";
import { createDemoResultFixture } from "@/features/results/data/demoResultFixtures";
import { ReportDocument } from "./ReportDocument";
import { deriveReports, DerivedReport } from "./reportService";

export const ReportsPage: React.FC = () => {
  const { reportId } = useParams();
  const location = useLocation();
  const jobs = useDemoAnalysisJobStore((state) => state.jobs);
  const reports = useMemo(() => deriveReports(jobs), [jobs]);
  if (!reportId) return <ReportCatalogue reports={reports} jobs={jobs} />;
  const report = reports.find((item) => item.id === reportId);
  const job = report ? jobs.find((item) => item.id === report.jobId) : undefined;
  if (!report || !job) return <ReportNotFound reportId={reportId} />;
  return <ReportDetail report={report} job={job} isPreview={location.pathname.endsWith("/preview")} />;
};

function ReportCatalogue({ reports, jobs }: { reports: DerivedReport[]; jobs: AnalysisJobRecord[] }) {
  const [query, setQuery] = useState("");
  const [algorithm, setAlgorithm] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const algorithms = [...new Set(reports.map((report) => report.algorithm))].sort();
  const filteredReports = reports
    .filter((report) => {
      const searchText = `${report.title} ${report.id} ${report.jobId} ${report.aoiName} ${report.sceneName}`.toLowerCase();
      return (!query.trim() || searchText.includes(query.trim().toLowerCase())) &&
        (algorithm === "all" || report.algorithm === algorithm) &&
        (status === "all" || report.status === status);
    })
    .sort((left, right) => {
      const difference = (Date.parse(left.createdAt ?? "") || 0) - (Date.parse(right.createdAt ?? "") || 0);
      return sortOrder === "newest" ? -difference : difference;
    });
  const clearFilters = () => {
    setQuery("");
    setAlgorithm("all");
    setStatus("all");
    setSortOrder("newest");
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="INTELLIGENCE REPORTING"
        title="Reports"
        subtitle="Browse report views derived from completed analysis jobs and algorithm outputs."
        actions={<Badge variant="primary" size="md">ANALYTICAL REPORTS</Badge>}
      />

      <div className="flex flex-col gap-3 border border-border-subtle bg-surface-panel p-3 lg:flex-row lg:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-2xs font-medium text-content-secondary">Search reports</span>
          <span className="flex h-9 items-center gap-2 border border-border-subtle bg-surface-main px-3 focus-within:border-accent-primary">
            <Search className="h-3.5 w-3.5 shrink-0 text-content-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs text-content-primary outline-none placeholder:text-content-muted"
              placeholder="Title, report ID, job ID, AOI, or scene…"
              aria-label="Search reports"
            />
          </span>
        </label>
        <label className="text-2xs text-content-secondary">
          <span className="mb-1.5 block">Algorithm</span>
          <select className="h-9 min-w-32 border border-border-subtle bg-surface-main px-2 text-xs text-content-primary" value={algorithm} onChange={(event) => setAlgorithm(event.target.value)} aria-label="Filter by algorithm">
            <option value="all">All algorithms</option>
            {algorithms.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
          </select>
        </label>
        <label className="text-2xs text-content-secondary">
          <span className="mb-1.5 block">Report status</span>
          <select className="h-9 min-w-32 border border-border-subtle bg-surface-main px-2 text-xs text-content-primary" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by report status">
            <option value="all">All statuses</option>
            <option value="ready">Ready</option>
          </select>
        </label>
        <label className="text-2xs text-content-secondary">
          <span className="mb-1.5 block">Sort by</span>
          <select className="h-9 min-w-32 border border-border-subtle bg-surface-main px-2 text-xs text-content-primary" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")} aria-label="Sort reports">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <Button size="sm" variant="outline" leftIcon={<FilterX className="h-3.5 w-3.5" />} onClick={clearFilters}>Clear filters</Button>
      </div>

      {reports.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 px-5 py-14 text-center">
          <FileText className="h-6 w-6 text-content-muted" />
          <h2 className="text-sm font-semibold text-content-primary">No completed analyses to report</h2>
          <p className="max-w-lg text-xs leading-relaxed text-content-muted">
            Reports become available when an analysis job reaches Completed. Queued, processing, failed, and cancelled jobs are not represented as reports.
            {jobs.some((job) => job.status === "queued" || job.status === "processing") ? " Active demo jobs are still in their simulated lifecycle." : ""}
          </p>
          <div className="flex flex-wrap gap-2"><Link to="/jobs"><Button size="sm" variant="outline">Processing Jobs</Button></Link><Link to="/analysis/new"><Button size="sm">Analysis Studio</Button></Link></div>
        </CardContent></Card>
      ) : (
        <section className="overflow-hidden border border-border-subtle bg-surface-panel" aria-label="Report catalogue">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div><h2 className="text-xs font-semibold text-content-primary">Completed-job reports</h2><p className="mt-1 text-2xs text-content-muted">{filteredReports.length} of {reports.length} reports · one report view per completed job</p></div>
            <Badge variant="outline">{filteredReports.length} READY</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-xs">
              <thead className="bg-surface-secondary/40 text-2xs uppercase tracking-wide text-content-muted">
                <tr>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Job / AOI / scene</th>
                  <th className="px-4 py-3">Algorithm</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredReports.map((report) => <ReportRow key={report.id} report={report} />)}
              </tbody>
            </table>
          </div>
          {filteredReports.length === 0 && <div className="px-4 py-10 text-center text-xs text-content-muted">No reports match these filters. Clear filters or change the search query.</div>}
        </section>
      )}
    </div>
  );
}

function ReportRow({ report }: { report: DerivedReport }) {
  return <tr className="align-top transition-colors hover:bg-surface-secondary/20">
    <td className="max-w-xs px-4 py-3">
      <Link to={`/reports/${encodeURIComponent(report.id)}`} className="font-medium text-content-primary hover:text-accent-primary">{report.title}</Link>
      <p className="mt-1 break-all font-mono text-2xs text-content-muted">{report.id}</p>
      <p className="mt-1 line-clamp-2 text-2xs leading-relaxed text-content-muted">{report.summary}</p>
    </td>
    <td className="max-w-sm px-4 py-3">
      <p className="break-all font-mono text-2xs text-accent-primary">{report.jobId}</p>
      <p className="mt-1 text-content-secondary">{report.aoiName}</p>
      <p className="mt-1 text-2xs text-content-muted">{report.sceneName}</p>
    </td>
    <td className="whitespace-nowrap px-4 py-3 text-content-secondary">{report.algorithm.toUpperCase()}</td>
    <td className="whitespace-nowrap px-4 py-3 text-content-secondary">{formatDate(report.createdAt)}</td>
    <td className="px-4 py-3"><Badge variant="success">READY</Badge></td>
    <td className="whitespace-nowrap px-4 py-3"><Link to={`/reports/${encodeURIComponent(report.id)}`} className="text-xs text-accent-primary hover:underline">Open report →</Link></td>
  </tr>;
}

function ReportDetail({ report, job, isPreview }: { report: DerivedReport; job: AnalysisJobRecord; isPreview: boolean }) {
  const navigate = useNavigate();
  const aois = useGeospatialStore((state) => state.aois);
  const uploadedScenes = useSceneCatalogStore((state) => state.uploadedScenes);
  const customSignatures = useSignatureStore((state) => state.customSignatures);
  const scenes = useMemo(() => listScenes(BUILT_IN_SCENES, uploadedScenes), [uploadedScenes]);
  const signatures = useMemo(() => listSignatures(customSignatures), [customSignatures]);
  const aoi = aois.find((item) => item.properties.id === job.configuration.aoiId);
  const scene = scenes.find((item) => item.id === job.configuration.sceneId);
  const targetSignature = signatures.find((item) => item.id === job.configuration.targetSignatureId) ?? null;
  const fixture = useMemo(() => createDemoResultFixture(job, aoi, scene), [aoi, job, scene]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStarted, setExportStarted] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    if (!exportStarted || exportComplete) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(100, exportProgress + 20);
      setExportProgress(next);
      if (next === 100) {
        setExportStarted(false);
        setExportComplete(true);
      }
    }, 140);
    return () => window.clearTimeout(timer);
  }, [exportComplete, exportProgress, exportStarted]);

  const openExport = () => {
    setExportProgress(0);
    setExportStarted(false);
    setExportComplete(false);
    setExportOpen(true);
  };
  const closeExport = () => {
    setExportOpen(false);
    setExportStarted(false);
  };
  const document = (
    <ReportDocument
    key={report.id}
    reportId={report.id}
      title={report.title}
      createdAt={report.createdAt}
      job={job}
      fixture={fixture}
      aoi={aoi}
      scene={scene}
      targetSignature={targetSignature}
    />
  );

  if (isPreview) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <Button size="sm" variant="ghost" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => navigate(`/reports/${encodeURIComponent(report.id)}`)}>Back to report</Button>
          <Button size="sm" variant="outline" leftIcon={<ArrowDownToLine className="h-3.5 w-3.5" />} onClick={openExport}>Export PDF</Button>
        </div>
        <div className="border border-border-subtle bg-surface-panel p-4 sm:p-7 lg:p-10">{document}</div>
        <PdfExportDialog
          open={exportOpen}
          report={report}
          progress={exportProgress}
          complete={exportComplete}
          started={exportStarted}
          onClose={closeExport}
          onStart={() => setExportStarted(true)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="INTELLIGENCE REPORTING"
        title="Analysis report"
        subtitle="Scientific-document view linked to a completed job and its existing illustrative result fixture."
        actions={<Badge variant="success">READY FOR EXPORT</Badge>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border border-border-subtle bg-surface-panel p-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <Link to="/reports" className="inline-flex items-center gap-1.5 text-content-secondary hover:text-accent-primary"><ArrowLeft className="h-3.5 w-3.5" />Report catalogue</Link>
          <span className="break-all font-mono text-2xs text-content-muted">{report.id}</span>
          <Badge variant="success">READY</Badge>
          <Badge variant="outline">JOB COMPLETED</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" leftIcon={<FileText className="h-3.5 w-3.5" />} onClick={() => navigate(`/reports/${encodeURIComponent(report.id)}/preview`)}>Preview report</Button>
          <Button size="sm" leftIcon={<ArrowDownToLine className="h-3.5 w-3.5" />} onClick={openExport}>Export PDF</Button>
        </div>
      </div>
      <div className="border border-border-subtle bg-surface-panel p-4 sm:p-6">{document}</div>
      <PdfExportDialog
        open={exportOpen}
        report={report}
        progress={exportProgress}
        complete={exportComplete}
        started={exportStarted}
        onClose={closeExport}
        onStart={() => setExportStarted(true)}
      />
    </div>
  );
}

function PdfExportDialog({
  open,
  report,
  progress,
  complete,
  started,
  onClose,
  onStart,
}: {
  open: boolean;
  report: DerivedReport;
  progress: number;
  complete: boolean;
  started: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  return <Modal
    isOpen={open}
    onClose={onClose}
    title="PDF export · demo simulation"
    description="Frontend-only report export"
    size="md"
    footer={complete
      ? <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
      : <>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={onStart} disabled={started || progress > 0}>{started || progress > 0 ? "Simulating…" : "Start demo export"}</Button>
      </>}
  >
    <div className="space-y-4 text-xs leading-relaxed text-content-secondary">
      <p>The PDF-generation library is not available in this frontend. This interaction simulates export progress only; no PDF file is generated and no download link will be provided.</p>
      <div className="border border-border-subtle bg-surface-secondary/20 p-3">
        <p className="text-2xs uppercase tracking-wide text-content-muted">Report</p>
        <p className="mt-1 break-all font-mono text-content-primary">{report.id}</p>
        <p className="mt-1 text-content-secondary">{report.title}</p>
      </div>
      {progress > 0 && <div>
        <div className="mb-1 flex justify-between font-mono text-2xs"><span>{complete ? "Simulation complete" : "Simulating report export"}</span><span>{progress}%</span></div>
        <div className="h-2 overflow-hidden bg-surface-secondary"><div className="h-full bg-accent-primary transition-all" style={{ width: `${progress}%` }} /></div>
      </div>}
      {complete && <p role="status" className="border border-status-success/30 bg-status-success/5 p-3 text-status-success">Demo export simulation completed. No PDF was created or downloaded.</p>}
    </div>
  </Modal>;
}

function ReportNotFound({ reportId }: { reportId: string }) {
  return <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6 lg:p-8">
    <PageHeader category="INTELLIGENCE REPORTING" title="Report not found" subtitle="Reports are derived from completed jobs in the shared Processing Jobs store." />
    <Card><CardContent className="space-y-3 p-5">
      <p className="break-all font-mono text-xs text-content-muted">{reportId}</p>
      <p className="text-xs text-content-secondary">This report ID does not match a current completed job. Incomplete, failed, or cancelled jobs do not have reports.</p>
      <Link className="text-xs text-accent-primary hover:underline" to="/reports">Back to report catalogue</Link>
    </CardContent></Card>
  </div>;
}

function formatDate(value: string | null): string {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : "Not available";
}
