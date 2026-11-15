import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AOIFeature } from "@/features/geospatial/types/geospatial.types";
import { SceneCatalogItem } from "@/features/scenes/types";
import { SpectralSignature } from "@/features/signatures/types";
import {
  ALGORITHM_OPTIONS,
  AnalysisConfiguration,
  AnalysisValidationErrors,
} from "../types";
import { requiresTargetSignature } from "../services/mockAnalysisService";

const NORMALIZATION_LABELS: Record<AnalysisConfiguration["normalization"], string> = {
  none: "None",
  "min-max": "Min-Max",
  "z-score": "Z-score",
  l2: "L2",
};

export function AnalysisConfigurationSummary({
  configuration,
  aoi,
  scene,
  signature,
  errors,
  onLaunch,
}: {
  configuration: AnalysisConfiguration;
  aoi: AOIFeature | null;
  scene: SceneCatalogItem | null;
  signature: SpectralSignature | null;
  errors: AnalysisValidationErrors;
  onLaunch: () => void;
}) {
  const algorithm = ALGORITHM_OPTIONS.find((option) => option.id === configuration.algorithm);
  const requiredTarget = requiresTargetSignature(configuration);
  const settings = configuration.algorithmSettings;
  const badBands = "Atmospheric water-vapor window filtering & variance threshold";

  return (
    <Card variant="elevated" className="lg:sticky lg:top-4">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div>
          <p className="text-2xs font-mono uppercase tracking-wider text-accent-primary">Live Configuration</p>
          <CardTitle className="mt-1 text-sm">Analysis summary</CardTitle>
        </div>
        <Badge variant="success" size="sm">READY</Badge>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <SummaryRow label="AOI" value={aoi?.properties.name ?? "Not selected"} missing={!aoi} error={errors.aoi} />
        <SummaryRow label="Scene" value={scene?.name ?? "Not selected"} missing={!scene} error={errors.scene} />
        <SummaryRow label="Algorithm" value={algorithm ? `${algorithm.acronym} · ${algorithm.name}` : "Not selected"} missing={!algorithm} error={errors.algorithm} />
        {requiredTarget && (
          <SummaryRow label="Target signature" value={signature ? `${signature.name} · ${signature.category}` : "Not selected"} missing={!signature} error={errors.targetSignature} />
        )}

        <div className="border-t border-border-subtle pt-3">
          <p className="mb-2 text-2xs font-mono uppercase tracking-wider text-content-muted">Algorithm parameters</p>
          <div className="space-y-1.5">
            {settings.algorithm === "rxd" && (
              <>
                <SummaryRow label="Detection mode" value={settings.parameters.detectionMode === "global" ? "Global background" : "Local background"} />
                <SummaryRow label="Covariance regularization" value={settings.parameters.regularization.toString()} />
                {settings.parameters.detectionMode === "local" && <SummaryRow label="Local window" value={`${settings.parameters.localWindowSize} × ${settings.parameters.localWindowSize}`} />}
              </>
            )}
            {(settings.algorithm === "mf" || settings.algorithm === "cem") && (
              <>
                <SummaryRow label="Background estimation" value={settings.parameters.backgroundMethod === "global" ? "Global AOI" : "Local window"} />
                <SummaryRow label="Regularization" value={settings.parameters.regularization.toString()} />
                <SummaryRow label="Output mode" value={settings.parameters.outputMode === "continuous" ? "Continuous score" : "Thresholded mask"} />
              </>
            )}
            {settings.algorithm === "fusion" && (
              <>
                <SummaryRow label="Fusion strategy" value={settings.parameters.strategy === "target-weighted" ? "Target-guided weighted ensemble" : "Spatial-spectral"} />
                <SummaryRow label="Spatial / spectral" value={`${settings.parameters.spatialWeight}% / ${settings.parameters.spectralWeight}%`} />
              </>
            )}
          </div>
        </div>

        <div className="border-t border-border-subtle pt-3">
          <p className="mb-2 text-2xs font-mono uppercase tracking-wider text-content-muted">Preprocessing</p>
          <div className="space-y-1.5">
            <SummaryRow label="Normalization" value={NORMALIZATION_LABELS[configuration.normalization]} />
            <SummaryRow label="PCA" value={configuration.pca.enabled ? `Enabled · ${configuration.pca.components} components` : "Disabled"} error={configuration.pca.enabled ? errors.pca : undefined} />
            <SummaryRow label="Bad bands" value={scene ? badBands : "Scene not selected"} />
            <SummaryRow label="Threshold percentile" value={`${configuration.thresholdPercentile}%`} error={errors.threshold} />
          </div>
        </div>

        {Object.keys(errors).length > 0 && (
          <div role="alert" className="rounded border border-status-danger/30 bg-status-danger/5 p-2.5 text-xs text-status-danger">
            <p className="flex items-center gap-1.5 font-semibold"><AlertCircle className="h-3.5 w-3.5" /> Configuration needs attention</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {Object.values(errors).map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
        {Object.keys(errors).length === 0 && (
          <p className="flex items-center gap-1.5 text-2xs text-status-success"><CheckCircle2 className="h-3.5 w-3.5" /> Required configuration is valid</p>
        )}

        <Button className="w-full" onClick={onLaunch}>Review &amp; Launch Analysis</Button>
        <p className="text-center text-2xs text-content-muted">Dispatches job to Redis / BullMQ worker queue</p>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, missing = false, error }: { label: string; value: string; missing?: boolean; error?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-content-muted">{label}</span>
      <span className={`min-w-0 break-words text-right ${error || missing ? "text-status-warning" : "text-content-primary"}`} title={value}>{value}</span>
    </div>
  );
}
