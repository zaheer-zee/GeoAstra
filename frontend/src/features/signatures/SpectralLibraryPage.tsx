import React, { useMemo, useState } from "react";
import {
  Check,
  Database,
  Filter,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import { SignatureCsvImportModal } from "./components/SignatureCsvImportModal";
import { SignatureDetailModal } from "./components/SignatureDetailModal";
import { SignatureFormModal } from "./components/SignatureFormModal";
import { SpectralChart } from "./components/SpectralChart";
import { PUBLIC_SIGNATURES, SIGNATURE_COLORS } from "./data/mockSignatures";
import { searchAndFilterSignatures, SignatureFilters } from "./services/signatureService";
import { getActiveSignature, useSignatureStore } from "./store/signatureStore";
import { SIGNATURE_CATEGORIES, SpectralSignature } from "./types";

type CatalogueTab = "public" | "custom";
type CatalogueView = "all" | CatalogueTab;

function SignatureCard({
  signature,
  active,
  onDetails,
  onSetActive,
  onDelete,
  onCompare,
  comparing,
}: {
  signature: SpectralSignature;
  active: boolean;
  onDetails: () => void;
  onSetActive: () => void;
  onDelete: () => void;
  onCompare: () => void;
  comparing: boolean;
}) {
  return (
    <Card
      variant="elevated"
      className={`flex h-full flex-col transition-colors ${active ? "border-accent-primary ring-1 ring-accent-primary/30" : "hover:border-border-strong"}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="break-words text-sm">{signature.name}</CardTitle>
            <p className="mt-1 break-all font-mono text-2xs text-content-muted">{signature.id}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant={signature.designation === "public" ? "primary" : "secondary"} size="sm">
              {signature.designation === "public" ? "PUBLIC" : "CUSTOM"}
            </Badge>
            {active && <Badge variant="success" size="sm">ACTIVE TARGET</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" size="sm">{signature.category}</Badge>
          <Badge variant="default" size="sm">{signature.sensor}</Badge>
          <Badge variant="default" size="sm">{signature.wavelengthNm.length} bands</Badge>
        </div>
        <p className="line-clamp-3 min-h-[3.6em] text-xs leading-relaxed text-content-secondary">{signature.description}</p>
        <p className="mt-auto border-t border-border-subtle pt-2 text-2xs text-content-muted">
          {signature.dataSource}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={active ? "secondary" : "primary"} size="sm" leftIcon={active ? <Check className="h-3.5 w-3.5" /> : undefined} onClick={onSetActive}>
            {active ? "Active Target" : "Set Active"}
          </Button>
          <Button variant={comparing ? "secondary" : "outline"} size="sm" aria-pressed={comparing} onClick={onCompare}>
            {comparing ? "Comparing" : "Compare"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDetails}>Details</Button>
          {signature.designation === "custom" && (
            <Button variant="ghost" size="icon" aria-label={`Delete ${signature.name}`} title="Delete custom signature" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-status-danger" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const SpectralLibraryPage: React.FC = () => {
  const toast = useToast();
  const customSignatures = useSignatureStore((state) => state.customSignatures);
  const activeSignatureId = useSignatureStore((state) => state.activeSignatureId);
  const addCustomSignature = useSignatureStore((state) => state.addCustomSignature);
  const deleteCustomSignature = useSignatureStore((state) => state.deleteCustomSignature);
  const setActiveSignature = useSignatureStore((state) => state.setActiveSignature);
  const [tab, setTab] = useState<CatalogueView>("public");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SignatureFilters>({
    category: "all",
    sensor: "all",
    designation: "all",
    sortBy: "name",
    sortDirection: "asc",
  });
  const [detailSignature, setDetailSignature] = useState<SpectralSignature | null>(null);
  const [deleteSignatureId, setDeleteSignatureId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);

  const allSignatures = useMemo(() => [...customSignatures, ...PUBLIC_SIGNATURES], [customSignatures]);
  const activeSignature = getActiveSignature(allSignatures, activeSignatureId);
  const selectedTabSignatures = allSignatures.filter((signature) => tab === "public"
    ? signature.designation === "public"
    : tab === "custom" ? signature.designation === "custom" : true);
  const effectiveFilters = {
    ...filters,
    designation: tab === "all" ? filters.designation : tab,
  };
  const visibleSignatures = searchAndFilterSignatures(selectedTabSignatures, query, effectiveFilters);
  const categoryOptions = [...SIGNATURE_CATEGORIES];
  const sensors = [...new Set(allSignatures.flatMap((signature) => [signature.sensor, ...signature.compatibleSensors]))].sort();
  const compareSignatures = comparisonIds
    .map((id) => allSignatures.find((signature) => signature.id === id))
    .filter((signature): signature is SpectralSignature => !!signature)
    .slice(0, 3);
  const chartSignatures = activeSignature
    ? [activeSignature, ...compareSignatures.filter((signature) => signature.id !== activeSignature.id)].slice(0, 4)
    : compareSignatures;
  const deleteSignature = deleteSignatureId
    ? customSignatures.find((signature) => signature.id === deleteSignatureId) ?? null
    : null;

  const handleCreate = (signature: SpectralSignature) => {
    addCustomSignature(signature);
    setActiveSignature(signature.id);
    setCreateOpen(false);
    setTab("custom");
    setFilters((current) => ({ ...current, category: "all", sensor: "all", designation: "all" }));
    setQuery("");
    toast.success("Signature created", `${signature.name} is now in My Signatures and is the active target.`);
  };

  const handleImport = (signature: SpectralSignature) => {
    addCustomSignature(signature);
    setActiveSignature(signature.id);
    setTab("custom");
    setFilters((current) => ({ ...current, category: "all", sensor: "all", designation: "all" }));
    setQuery("");
    toast.success("CSV imported locally", `${signature.name} was added to My Signatures. No file was uploaded.`);
  };

  const confirmDelete = () => {
    if (!deleteSignature || deleteSignature.designation !== "custom") return;
    deleteCustomSignature(deleteSignature.id);
    setComparisonIds((ids) => ids.filter((id) => id !== deleteSignature.id));
    if (detailSignature?.id === deleteSignature.id) setDetailSignature(null);
    toast.success("Signature deleted", `${deleteSignature.name} was removed from My Signatures.`);
    setDeleteSignatureId(null);
  };

  const toggleComparison = (signature: SpectralSignature) => {
    setComparisonIds((current) => {
      if (current.includes(signature.id)) return current.filter((id) => id !== signature.id);
      if (current.length >= 3) {
        toast.warning("Comparison limit", "Compare up to three additional curves with the active target.");
        return current;
      }
      return [...current, signature.id];
    });
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="SPECTRAL SIGNATURES"
        title="Spectral Library"
        subtitle="Browse verified reference curves from USGS Spectral Library v7, manage user-provided spectra, and configure active detection targets."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary" size="md">{allSignatures.length} SIGNATURES</Badge>
            <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>Import CSV</Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Create Signature</Button>
          </div>
        }
      />

      {activeSignature ? (
        <Card variant="elevated" className="border-accent-primary/40">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-2xs font-mono uppercase tracking-wider text-accent-primary">ACTIVE TARGET SIGNATURE</p>
                <CardTitle className="mt-1 text-base">{activeSignature.name}</CardTitle>
                <p className="mt-1 font-mono text-2xs text-content-muted">{activeSignature.id} · {activeSignature.category} · {activeSignature.sensor}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDetailSignature(activeSignature)}>View details</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-content-muted">
              <span>Wavelength – Reflectance · X axis in nanometres (nm) · Y axis in {activeSignature.reflectanceUnit}</span>
              <span>{activeSignature.wavelengthNm.length} spectral samples · {activeSignature.illustrative ? "Illustrative" : "User-provided"}</span>
            </div>
            <SpectralChart signatures={chartSignatures} height={350} />
            {chartSignatures.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {chartSignatures.map((signature, index) => (
                  <Badge key={signature.id} variant={index === 0 ? "primary" : "outline"} size="sm">
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SIGNATURE_COLORS[index % SIGNATURE_COLORS.length] }} />
                    {index === 0 ? "Active: " : "Compare: "}{signature.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-5 text-sm text-content-muted">Choose an active signature from the catalogue.</CardContent></Card>
      )}

      <Card variant="elevated">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3" role="tablist" aria-label="Signature catalogues">
            <button type="button" role="tab" aria-selected={tab === "public"} onClick={() => setTab("public")} className={`rounded px-3 py-2 text-xs font-medium ${tab === "public" ? "bg-accent-primary/15 text-accent-primary" : "text-content-secondary hover:bg-surface-secondary"}`}>
              Public Signatures <span className="ml-1 font-mono">{allSignatures.filter((signature) => signature.designation === "public").length}</span>
            </button>
            <button type="button" role="tab" aria-selected={tab === "custom"} onClick={() => setTab("custom")} className={`rounded px-3 py-2 text-xs font-medium ${tab === "custom" ? "bg-accent-primary/15 text-accent-primary" : "text-content-secondary hover:bg-surface-secondary"}`}>
              My Signatures <span className="ml-1 font-mono">{customSignatures.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")} className={`rounded px-3 py-2 text-xs font-medium ${tab === "all" ? "bg-accent-primary/15 text-accent-primary" : "text-content-secondary hover:bg-surface-secondary"}`}>
              All Signatures
            </button>
          </div>

          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_repeat(4,minmax(130px,1fr))]">
            <Input type="search" aria-label="Search signatures" placeholder="Search signature name, ID, category..." value={query} onChange={(event) => setQuery(event.target.value)} leftIcon={<Search className="h-4 w-4" />} clearable onClear={() => setQuery("")} />
            <Select aria-label="Filter by category" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} options={[{ value: "all", label: "All categories" }, ...categoryOptions.map((category) => ({ value: category, label: category }))]} />
            <Select aria-label="Filter by sensor" value={filters.sensor} onChange={(event) => setFilters((current) => ({ ...current, sensor: event.target.value }))} options={[{ value: "all", label: "All sensors" }, ...sensors.map((sensor) => ({ value: sensor, label: sensor }))]} />
            <Select aria-label="Filter by designation" value={tab === "all" ? filters.designation : tab} onChange={(event) => {
              const designation = event.target.value as SignatureFilters["designation"];
              setTab("all");
              setFilters((current) => ({ ...current, designation }));
            }} options={[{ value: "all", label: "All designations" }, { value: "public", label: "Public" }, { value: "custom", label: "Custom" }]} />
            <div className="flex gap-2">
              <Select aria-label="Sort signatures by" value={filters.sortBy} onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value as SignatureFilters["sortBy"] }))} options={[{ value: "name", label: "Sort: Name" }, { value: "category", label: "Sort: Category" }]} />
              <Button variant="outline" size="icon" aria-label={`Sort ${filters.sortDirection === "asc" ? "descending" : "ascending"}`} onClick={() => setFilters((current) => ({ ...current, sortDirection: current.sortDirection === "asc" ? "desc" : "asc" }))}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-content-muted">
            <span>Showing <strong className="text-content-primary">{visibleSignatures.length}</strong> of {selectedTabSignatures.length} {tab === "public" ? "public" : "custom"} signatures</span>
            {(query || filters.category !== "all" || filters.sensor !== "all" || filters.designation !== "all") && (
              <Button variant="ghost" size="xs" onClick={() => { setQuery(""); setFilters((current) => ({ ...current, category: "all", sensor: "all", designation: "all" })); }}>Clear filters</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {tab === "custom" && customSignatures.length === 0 && !query && filters.category === "all" && filters.sensor === "all" ? (
        <div className="rounded border border-border-subtle bg-surface-panel px-6 py-12 text-center">
          <Database className="mx-auto h-8 w-8 text-content-muted" />
          <h2 className="mt-3 text-base font-semibold text-content-primary">No custom signatures yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-content-muted">Create a signature from wavelength and reflectance values, or import a CSV file. Entries are stored in this browser.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>Import CSV</Button>
            <Button onClick={() => setCreateOpen(true)}>Create Signature</Button>
          </div>
        </div>
      ) : visibleSignatures.length === 0 ? (
        <div className="rounded border border-border-subtle bg-surface-panel px-6 py-12 text-center">
          <Search className="mx-auto h-8 w-8 text-content-muted" />
          <h2 className="mt-3 text-base font-semibold text-content-primary">No signatures found</h2>
          <p className="mt-1 text-sm text-content-muted">Change the search or filters to see matching signatures.</p>
          <Button className="mt-3" variant="outline" onClick={() => { setQuery(""); setFilters((current) => ({ ...current, category: "all", sensor: "all", designation: "all" })); }}>Clear filters</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleSignatures.map((signature) => (
            <SignatureCard
              key={signature.id}
              signature={signature}
              active={signature.id === activeSignatureId}
              onDetails={() => setDetailSignature(signature)}
              onSetActive={() => {
                setActiveSignature(signature.id);
                toast.success("Active target updated", `${signature.name} is now available in Analysis Studio.`);
              }}
              onDelete={() => setDeleteSignatureId(signature.id)}
              comparing={comparisonIds.includes(signature.id)}
              onCompare={() => toggleComparison(signature)}
            />
          ))}
        </div>
      )}

      <SignatureFormModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <SignatureCsvImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <SignatureDetailModal
        signature={detailSignature}
        active={detailSignature?.id === activeSignatureId}
        compare={!!detailSignature && comparisonIds.includes(detailSignature.id)}
        onClose={() => setDetailSignature(null)}
        onSetActive={() => {
          if (!detailSignature) return;
          setActiveSignature(detailSignature.id);
          toast.success("Active target updated", `${detailSignature.name} is now available in Analysis Studio.`);
        }}
        onToggleCompare={() => detailSignature && toggleComparison(detailSignature)}
        onDelete={() => {
          if (!detailSignature || detailSignature.designation !== "custom") return;
          setDeleteSignatureId(detailSignature.id);
          setDetailSignature(null);
        }}
      />
      <Modal
        isOpen={!!deleteSignature}
        onClose={() => setDeleteSignatureId(null)}
        title="Delete Custom Signature?"
        description="This removes the custom signature from this browser’s local library."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteSignatureId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete Signature</Button>
          </>
        }
      >
        <p className="text-sm text-content-secondary">Confirm deletion of <strong className="text-content-primary">{deleteSignature?.name}</strong>?</p>
        <p className="mt-2 text-xs text-content-muted">Public reference signatures cannot be deleted.</p>
      </Modal>
    </div>
  );
};
