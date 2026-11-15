import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function LaunchConfirmationModal({
  isOpen,
  onClose,
  aoiName,
  sceneName,
  algorithmName,
  targetSignatureName,
  preprocessing,
  thresholdPercentile,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  aoiName: string;
  sceneName: string;
  algorithmName: string;
  targetSignatureName: string | null;
  preprocessing: string[];
  thresholdPercentile: number;
  onConfirm: () => Promise<{ id: string } | null> | { id: string } | null;
}) {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCreatedId(null);
      setError("");
      setLoading(false);
    }
  }, [isOpen]);

  const confirm = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await onConfirm();
      if (res && res.id) {
        setCreatedId(res.id);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to dispatch analysis job.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={createdId ? "Analysis Job Queued" : "Confirm Hyperspectral Analysis"}
      description={createdId ? "Job dispatched to BullMQ worker pipeline." : "Review configuration parameters before submitting to the processing queue."}
      size="md"
      closeOnOverlayClick={!createdId && !loading}
      footer={createdId ? (
        <>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Link to="/jobs"><Button>View in Jobs Queue</Button></Link>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={confirm} isLoading={loading}>
            {loading ? "Submitting Job..." : "Confirm & Dispatch Job"}
          </Button>
        </>
      )}
    >
      {createdId ? (
        <div role="status" className="space-y-3">
          <div className="flex items-start gap-2 rounded border border-status-success/30 bg-status-success/5 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" />
            <div>
              <p className="text-sm font-semibold text-content-primary">Enqueued · Processing Pipeline Active</p>
              <p className="mt-1 break-all font-mono text-xs text-accent-primary">{createdId}</p>
            </div>
          </div>
          <p className="text-xs text-content-secondary leading-relaxed">
            Your analysis job has been submitted to the BullMQ processing queue. The scientific Python engine will validate the scene datacube, remove bad bands, run the requested algorithm, and generate GeoTIFF, GeoJSON, and PNG artifacts with multi-provider AI explanations.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded border border-border-subtle bg-surface-secondary/40 p-3 text-xs">
            <SummaryItem label="AOI" value={aoiName} />
            <SummaryItem label="Scene" value={sceneName} />
            <SummaryItem label="Algorithm" value={algorithmName} />
            {targetSignatureName && <SummaryItem label="Target" value={targetSignatureName} />}
            <SummaryItem label="Preprocessing" value={preprocessing.join(" · ")} />
            <SummaryItem label="Threshold" value={`${thresholdPercentile}%ile`} />
          </div>
          <div className="flex items-start gap-2 rounded border border-accent-primary/30 bg-accent-primary/5 p-3 text-xs">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
            <p className="text-content-secondary">
              <strong className="text-accent-primary">Processing pipeline:</strong> Numerical detection is computed on the scientific engine. NVIDIA NIM, Hugging Face, and NaraRouter generate comparative explanations.
            </p>
          </div>
          {error && <p role="alert" className="rounded border border-status-danger/30 bg-status-danger/5 p-2 text-xs text-status-danger">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-content-muted">{label}</span>
      <span className="break-words font-medium text-content-primary">{value}</span>
    </>
  );
}
