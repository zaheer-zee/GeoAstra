import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Combine,
  Layers3,
  MapPin,
  ScanSearch,
  Satellite,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import { useGeospatialStore } from "@/features/geospatial/store/geospatialStore";
import { AOIFeature } from "@/features/geospatial/types/geospatial.types";
import { BUILT_IN_SCENES } from "@/features/scenes/data/sceneCatalog";
import { useSceneCatalogStore } from "@/features/scenes/store/sceneCatalogStore";
import { listScenes } from "@/features/scenes/services/mockSceneService";
import { SceneCatalogItem } from "@/features/scenes/types";
import { listSignatures } from "@/features/signatures/services/signatureService";
import { useSignatureStore } from "@/features/signatures/store/signatureStore";
import { SpectralSignature } from "@/features/signatures/types";
import { analysisApi } from "@/api/analysisApi";
import { AnalysisConfigurationSummary } from "./components/AnalysisConfigurationSummary";
import { LaunchConfirmationModal } from "./components/LaunchConfirmationModal";
import { validateAnalysisConfiguration } from "./services/mockAnalysisService";
import {
  ALGORITHM_OPTIONS,
  AlgorithmSettings,
  AnalysisAlgorithmId,
  AnalysisConfiguration,
  BackgroundEstimationMethod,
  DEFAULT_CEM_SETTINGS,
  DEFAULT_FUSION_SETTINGS,
  DEFAULT_MF_SETTINGS,
  DEFAULT_RXD_SETTINGS,
  CEMSettings,
  FusionSettings,
  MatchedFilterSettings,
  NormalizationMethod,
  RXDSettings,
} from "./types";

const ALGORITHM_ICONS = {
  rxd: ScanSearch,
  mf: Target,
  cem: Activity,
  fusion: Combine,
};

const NORMALIZATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "min-max", label: "Min-Max normalization" },
  { value: "z-score", label: "Z-score normalization" },
  { value: "l2", label: "L2 normalization" },
];

export const AnalysisStudioPage: React.FC = () => {
  const toast = useToast();
  const aois = useGeospatialStore((state) => state.aois);
  const sharedAoiId = useGeospatialStore((state) => state.selectedAoiId);
  const selectAOI = useGeospatialStore((state) => state.selectAOI);
  const uploadedScenes = useSceneCatalogStore((state) => state.uploadedScenes);
  const sharedSceneIds = useSceneCatalogStore((state) => state.selectedSceneIds);
  const customSignatures = useSignatureStore((state) => state.customSignatures);
  const activeSignatureId = useSignatureStore((state) => state.activeSignatureId);
  const setActiveSignature = useSignatureStore((state) => state.setActiveSignature);

  const scenes = useMemo(() => listScenes(BUILT_IN_SCENES, uploadedScenes), [uploadedScenes]);
  const signatures = useMemo(() => listSignatures(customSignatures), [customSignatures]);

  const [aoiId, setAoiId] = useState(() => {
    const currentExists = aois.some((aoi) => aoi.properties.id === sharedAoiId);
    return currentExists ? sharedAoiId ?? "" : aois[0]?.properties.id ?? "";
  });
  const initialAoi = aois.find((aoi) => aoi.properties.id === aoiId);
  const initialScene = scenes.find((scene) => scene.name === initialAoi?.properties.activeSceneName) ??
    scenes.find((scene) => sharedSceneIds.includes(scene.id)) ??
    scenes[0];
  const [sceneId, setSceneId] = useState(initialScene?.id ?? "");
  const [sceneSearch, setSceneSearch] = useState("");
  const [algorithm, setAlgorithm] = useState<AnalysisAlgorithmId>("rxd");
  const [algorithmSettings, setAlgorithmSettings] = useState<AlgorithmSettings>({
    algorithm: "rxd",
    parameters: DEFAULT_RXD_SETTINGS,
  });
  const [targetSignatureId, setTargetSignatureId] = useState(activeSignatureId ?? "");
  const [normalization, setNormalization] = useState<NormalizationMethod>("z-score");
  const [pcaEnabled, setPcaEnabled] = useState(false);
  const [pcaComponents, setPcaComponents] = useState(() => Math.min(10, initialScene?.spectralBands ?? 100));
  const [thresholdPercentile, setThresholdPercentile] = useState(98);
  const [showValidation, setShowValidation] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const selectedAoi = aois.find((aoi) => aoi.properties.id === aoiId) ?? null;
  const selectedScene = scenes.find((scene) => scene.id === sceneId) ?? null;
  const selectedSignature = signatures.find((signature) => signature.id === targetSignatureId) ?? null;
  const targetRequired = algorithm === "mf" || algorithm === "cem" ||
    (algorithm === "fusion" && algorithmSettings.algorithm === "fusion" &&
      algorithmSettings.parameters.strategy === "target-weighted");
  const availableScenes = useMemo(() => {
    const query = sceneSearch.trim().toLocaleLowerCase();
    const matches = !query ? scenes : scenes.filter((scene) =>
      [scene.name, scene.datasetId, scene.sensor, scene.location]
        .some((value) => value.toLocaleLowerCase().includes(query))
    );
    if (selectedScene && !matches.some((scene) => scene.id === selectedScene.id)) {
      return [selectedScene, ...matches];
    }
    return matches;
  }, [sceneSearch, scenes, selectedScene]);
  const maximumPcaComponents = selectedScene?.spectralBands ?? 100;
  const configuration: AnalysisConfiguration = {
    aoiId: aoiId || null,
    sceneId: sceneId || null,
    algorithm,
    targetSignatureId: targetRequired ? targetSignatureId || null : null,
    algorithmSettings,
    normalization,
    pca: { enabled: pcaEnabled, components: pcaComponents },
    thresholdPercentile,
  };
  const validationErrors = validateAnalysisConfiguration(configuration, {
    aoiIds: aois.map((aoi) => aoi.properties.id),
    sceneIds: scenes.map((scene) => scene.id),
    signatureIds: signatures.map((signature) => signature.id),
    sceneBandCount: selectedScene?.spectralBands ?? null,
  });
  const visibleErrors = showValidation ? validationErrors : {};
  const preprocessingSummary = [
    `Normalization: ${normalizationLabel(normalization)}`,
    pcaEnabled ? `PCA: ${pcaComponents} components` : "PCA: off",
    selectedScene ? badBandSummary(selectedScene) : "Bad-band information unavailable",
  ];

  useEffect(() => {
    setTargetSignatureId(activeSignatureId ?? "");
  }, [activeSignatureId]);

  useEffect(() => {
    setPcaComponents((current) => Math.min(current, selectedScene?.spectralBands ?? 100));
  }, [selectedScene?.id, selectedScene?.spectralBands]);

  const handleAlgorithmChange = (next: AnalysisAlgorithmId) => {
    setAlgorithm(next);
    if (next === "rxd") setAlgorithmSettings({ algorithm: next, parameters: { ...DEFAULT_RXD_SETTINGS } });
    if (next === "mf") setAlgorithmSettings({ algorithm: next, parameters: { ...DEFAULT_MF_SETTINGS } });
    if (next === "cem") setAlgorithmSettings({ algorithm: next, parameters: { ...DEFAULT_CEM_SETTINGS } });
    if (next === "fusion") setAlgorithmSettings({ algorithm: next, parameters: { ...DEFAULT_FUSION_SETTINGS } });
    setShowValidation(false);
  };

  const handleAoiChange = (nextId: string) => {
    setAoiId(nextId);
    selectAOI(nextId || null);
    const nextAoi = aois.find((aoi) => aoi.properties.id === nextId);
    const matchingScene = scenes.find((scene) => scene.name === nextAoi?.properties.activeSceneName);
    if (matchingScene) setSceneId(matchingScene.id);
  };

  const handleSceneChange = (nextId: string) => {
    setSceneId(nextId);
    const nextScene = scenes.find((scene) => scene.id === nextId);
    if (nextScene?.spectralBands !== null && nextScene?.spectralBands !== undefined) {
      setPcaComponents((current) => Math.min(current, nextScene.spectralBands ?? current));
    }
  };

  const updateRxdSettings = (update: Partial<RXDSettings>) => setAlgorithmSettings((current) =>
    current.algorithm === "rxd" ? { ...current, parameters: { ...current.parameters, ...update } } : current
  );
  const updateMfSettings = (update: Partial<MatchedFilterSettings>) => setAlgorithmSettings((current) =>
    current.algorithm === "mf" ? { ...current, parameters: { ...current.parameters, ...update } } : current
  );
  const updateCemSettings = (update: Partial<CEMSettings>) => setAlgorithmSettings((current) =>
    current.algorithm === "cem" ? { ...current, parameters: { ...current.parameters, ...update } } : current
  );
  const updateFusionSettings = (update: Partial<FusionSettings>) => setAlgorithmSettings((current) =>
    current.algorithm === "fusion" ? { ...current, parameters: { ...current.parameters, ...update } } : current
  );

  const openConfirmation = () => {
    setShowValidation(true);
    if (Object.keys(validationErrors).length) return;
    setConfirmationOpen(true);
  };

  const confirmLaunch = async () => {
    const errors = validateAnalysisConfiguration(configuration, {
      aoiIds: aois.map((aoi) => aoi.properties.id),
      sceneIds: scenes.map((scene) => scene.id),
      signatureIds: signatures.map((signature) => signature.id),
      sceneBandCount: selectedScene?.spectralBands ?? null,
    });
    if (Object.keys(errors).length) {
      setShowValidation(true);
      throw new Error("Configuration changed and is no longer valid. Review the highlighted fields before launching.");
    }
    if (!selectedAoi || !selectedScene) {
      throw new Error("The selected AOI or scene is no longer available.");
    }

    try {
      const algoKey = configuration.algorithm === "mf" ? "matched_filter" : configuration.algorithm;
      const normMapped =
        configuration.normalization === "min-max" ? "minmax" :
        configuration.normalization === "z-score" ? "standard" :
        configuration.normalization === "l2" ? "l2" : undefined;

      const res = await analysisApi.createAnalysis({
        areaId: configuration.aoiId ?? "",
        sceneId: configuration.sceneId ?? "",
        algorithm: algoKey as any,
        targetSignatureId: targetRequired ? (configuration.targetSignatureId ?? undefined) : undefined,
        algorithmConfiguration: {
          normalization: normMapped,
          pca: configuration.pca,
          thresholdPercentile: configuration.thresholdPercentile,
          settings: configuration.algorithmSettings.parameters as any,
        },
      });
      toast.success("Analysis Dispatched", `Job ${res.analysisId} enqueued to processing pipeline.`);
      return { id: res.analysisId };
    } catch (err: any) {
      toast.error("Dispatch Failed", err.message || "Failed to submit analysis job.");
      throw err;
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="ANALYSIS STUDIO"
        title="Analysis Studio"
        subtitle="Configure and dispatch hyperspectral target detection and anomaly detection pipelines to the scientific execution engine."
        actions={<Badge variant="primary" size="md" dot>PIPELINE READY</Badge>}
      />

      <div className="flex flex-wrap items-center gap-2 rounded border border-border-subtle bg-surface-secondary/40 px-3 py-2 text-2xs font-mono">
        {["Inputs", "Algorithm", "Preprocessing", "Review"].map((step, index) => (
          <React.Fragment key={step}>
            {index > 0 && <span className="text-border-strong">/</span>}
            <span className={`flex items-center gap-1.5 ${index === 0 ? "text-accent-primary" : "text-content-muted"}`}>
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px]">{index + 1}</span>{step}
            </span>
          </React.Fragment>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-status-success">
          <Activity className="h-3.5 w-3.5 text-accent-primary animate-pulse" />
          Ready for execution
        </span>
      </div>

      <section aria-labelledby="input-data-heading" className="space-y-3">
        <SectionHeading id="input-data-heading" number="01" title="Input data" description="Reference existing AOI and scene records; no spatial or imagery data is duplicated." />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card variant="elevated">
            <CardHeader className="flex-row items-start justify-between gap-3 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 text-accent-primary" />
                <div><CardTitle className="text-sm">Area of Interest</CardTitle><p className="mt-1 text-2xs text-content-muted">Saved Geospatial Studio AOIs</p></div>
              </div>
              <Link to="/workspace" className="text-2xs font-medium text-accent-primary hover:underline">Open Geospatial Studio →</Link>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">
              {aois.length ? (
                <>
                  <Select aria-label="Select AOI" value={aoiId} onChange={(event) => handleAoiChange(event.target.value)} options={[{ value: "", label: "Select a saved AOI" }, ...aois.map((aoi) => ({ value: aoi.properties.id, label: aoi.properties.name }))]} />
                  {selectedAoi ? <AoiMetadata aoi={selectedAoi} /> : <InlineError message={visibleErrors.aoi} />}
                  {selectedAoi && visibleErrors.aoi && <InlineError message={visibleErrors.aoi} />}
                </>
              ) : (
                <EmptyInputState title="No saved AOIs" description="Create an area of interest in Geospatial Studio to configure a run." href="/workspace" action="Create an AOI" />
              )}
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader className="flex-row items-start justify-between gap-3 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <Satellite className="mt-0.5 h-4 w-4 text-accent-primary" />
                <div><CardTitle className="text-sm">Satellite scene</CardTitle><p className="mt-1 text-2xs text-content-muted">Scene Explorer catalogue and local demo uploads</p></div>
              </div>
              <Link to="/scenes" className="text-2xs font-medium text-accent-primary hover:underline">Open Scene Explorer →</Link>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">
              {scenes.length ? (
                <>
                  <Input type="search" aria-label="Search scenes" placeholder="Search scene, ID, sensor, or location" value={sceneSearch} onChange={(event) => setSceneSearch(event.target.value)} clearable onClear={() => setSceneSearch("")} />
                  <Select aria-label="Select satellite scene" value={sceneId} onChange={(event) => handleSceneChange(event.target.value)} options={[{ value: "", label: "Select a catalogue scene" }, ...availableScenes.map((scene) => ({ value: scene.id, label: `${scene.name} · ${scene.sensor}` }))]} />
                  {selectedScene ? <SceneMetadata scene={selectedScene} /> : <InlineError message={visibleErrors.scene} />}
                  {selectedScene && visibleErrors.scene && <InlineError message={visibleErrors.scene} />}
                  {selectedScene && <BadBandInformation scene={selectedScene} />}
                </>
              ) : (
                <EmptyInputState title="No scenes available" description="Add or select a catalogue scene in Scene Explorer." href="/scenes" action="Open Scene Explorer" />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
        <div className="space-y-5">
          <section aria-labelledby="algorithm-heading" className="space-y-3">
            <SectionHeading id="algorithm-heading" number="02" title="Algorithm" description="Choose one workflow; only its applicable parameters are shown." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ALGORITHM_OPTIONS.map((option) => {
                const Icon = ALGORITHM_ICONS[option.id];
                const selected = algorithm === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleAlgorithmChange(option.id)}
                    className={`rounded border p-3 text-left transition-colors ${selected ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/30" : "border-border-subtle bg-surface-panel hover:border-border-strong"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${selected ? "text-accent-primary" : "text-content-muted"}`} />
                        <span className="font-mono text-xs font-semibold text-content-primary">{option.acronym}</span>
                      </span>
                      {selected && <Badge variant="primary">SELECTED</Badge>}
                    </span>
                    <span className="mt-2 block text-xs font-medium text-content-primary">{option.name}</span>
                    <span className="mt-1 block text-2xs leading-relaxed text-content-muted">{option.purpose}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="parameters-heading" className="space-y-3">
            <SectionHeading id="parameters-heading" number="03" title="Algorithm parameters" description="Controls below configure a simulated workflow only." />
            <Card variant="elevated">
              <CardHeader className="flex-row items-center justify-between gap-3 px-4 py-3">
                <div><CardTitle className="text-sm">{ALGORITHM_OPTIONS.find((option) => option.id === algorithm)?.name}</CardTitle><p className="mt-1 text-2xs text-content-muted">Algorithm-specific configuration</p></div>
                <Badge variant="outline">{algorithm.toUpperCase()}</Badge>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {algorithm === "rxd" && algorithmSettings.algorithm === "rxd" && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select label="Detection mode" aria-label="RXD detection mode" value={algorithmSettings.parameters.detectionMode} onChange={(event) => updateRxdSettings({ detectionMode: event.target.value as "global" | "local" })} options={[{ value: "global", label: "Global background" }, { value: "local", label: "Local neighborhood" }]} />
                    <NumberField label="Covariance regularization" ariaLabel="RXD covariance regularization" value={algorithmSettings.parameters.regularization} min={0} max={1} step={0.0001} helper="Stabilizes the covariance estimate in the configuration. Range 0–1." onChange={(value) => updateRxdSettings({ regularization: value })} />
                    {algorithmSettings.parameters.detectionMode === "local" && (
                      <NumberField label="Local window size (pixels)" ariaLabel="RXD local window size" value={algorithmSettings.parameters.localWindowSize} min={3} max={101} step={2} helper="Odd side length for the local background neighborhood (3–101)." onChange={(value) => updateRxdSettings({ localWindowSize: value })} />
                    )}
                  </div>
                )}
                {algorithm === "mf" && algorithmSettings.algorithm === "mf" && (
                  <>
                    <TargetSignatureField signatures={signatures} value={targetSignatureId} error={visibleErrors.targetSignature} onChange={(id) => { setTargetSignatureId(id); setActiveSignature(id || null); }} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <BackgroundMethodField value={algorithmSettings.parameters.backgroundMethod} onChange={(value) => updateMfSettings({ backgroundMethod: value })} />
                      <NumberField label="Background covariance regularization" ariaLabel="MF covariance regularization" value={algorithmSettings.parameters.regularization} min={0} max={1} step={0.0001} helper="Regularization factor for the configured covariance estimate (0–1)." onChange={(value) => updateMfSettings({ regularization: value })} />
                      <OutputModeField value={algorithmSettings.parameters.outputMode} onChange={(value) => updateMfSettings({ outputMode: value })} />
                    </div>
                  </>
                )}
                {algorithm === "cem" && algorithmSettings.algorithm === "cem" && (
                  <>
                    <TargetSignatureField signatures={signatures} value={targetSignatureId} error={visibleErrors.targetSignature} onChange={(id) => { setTargetSignatureId(id); setActiveSignature(id || null); }} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <BackgroundMethodField value={algorithmSettings.parameters.backgroundMethod} onChange={(value) => updateCemSettings({ backgroundMethod: value })} />
                      <NumberField label="Regularization factor" ariaLabel="CEM regularization factor" value={algorithmSettings.parameters.regularization} min={0} max={1} step={0.0001} helper="Configuration factor for the background correlation estimate (0–1)." onChange={(value) => updateCemSettings({ regularization: value })} />
                      <OutputModeField value={algorithmSettings.parameters.outputMode} onChange={(value) => updateCemSettings({ outputMode: value })} />
                    </div>
                  </>
                )}
                {algorithm === "fusion" && algorithmSettings.algorithm === "fusion" && (
                  <div className="space-y-4">
                    <Select label="Fusion strategy" aria-label="Fusion strategy" value={algorithmSettings.parameters.strategy} onChange={(event) => updateFusionSettings({ strategy: event.target.value as "spatial-spectral" | "target-weighted" })} options={[{ value: "spatial-spectral", label: "Spatial-Spectral (untargeted)" }, { value: "target-weighted", label: "Target-guided Weighted Ensemble" }]} />
                    <p className="text-2xs text-content-muted">
                      Spatial-Spectral combines generic configured spatial and spectral score components. Target-guided Weighted Ensemble uses the selected library signature for its spectral component. These are configuration descriptions, not executed workflows.
                    </p>
                    {algorithmSettings.parameters.strategy === "target-weighted" && (
                      <TargetSignatureField signatures={signatures} value={targetSignatureId} error={visibleErrors.targetSignature} onChange={(id) => { setTargetSignatureId(id); setActiveSignature(id || null); }} />
                    )}
                    <FusionWeights
                      spatialWeight={algorithmSettings.parameters.spatialWeight}
                      spectralWeight={algorithmSettings.parameters.spectralWeight}
                      onChange={(spatialWeight) => updateFusionSettings({ spatialWeight, spectralWeight: 100 - spatialWeight })}
                    />
                  </div>
                )}
                {visibleErrors.parameters && <InlineError message={visibleErrors.parameters} />}
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="preprocessing-heading" className="space-y-3">
            <SectionHeading id="preprocessing-heading" number="04" title="Preprocessing & threshold" description="Selections are recorded in the job configuration; no preprocessing is performed." />
            <Card variant="elevated">
              <CardHeader className="flex-row items-start gap-2 px-4 py-3">
                <Layers3 className="mt-0.5 h-4 w-4 text-accent-primary" />
                <div><CardTitle className="text-sm">Preprocessing configuration</CardTitle><p className="mt-1 text-2xs text-content-muted">Affects only the simulated configuration record</p></div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 p-4 pt-2 sm:grid-cols-2">
                <div>
                  <Select label="Normalization" aria-label="Normalization method" value={normalization} onChange={(event) => setNormalization(event.target.value as NormalizationMethod)} options={NORMALIZATION_OPTIONS} />
                  <p className="mt-1.5 text-2xs leading-relaxed text-content-muted">{normalizationHelp(normalization)}</p>
                </div>
                <div className="rounded border border-border-subtle bg-surface-secondary/30 p-3">
                  <label className="flex items-start gap-2 text-xs font-medium text-content-primary">
                    <input type="checkbox" aria-label="Enable PCA" checked={pcaEnabled} onChange={(event) => setPcaEnabled(event.target.checked)} className="mt-0.5 accent-accent-primary" />
                    <span>Principal Component Analysis (PCA)<span className="mt-1 block text-2xs font-normal text-content-muted">Optional dimension-reduction configuration; no PCA is run.</span></span>
                  </label>
                  {pcaEnabled && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-2xs text-content-secondary"><label htmlFor="pca-components">Components</label><span className="font-mono text-accent-primary">{pcaComponents}</span></div>
                      <input id="pca-components" aria-label="PCA components" type="range" min={1} max={Math.max(1, maximumPcaComponents)} step={1} value={Math.min(pcaComponents, maximumPcaComponents)} onChange={(event) => setPcaComponents(Number(event.target.value))} className="w-full accent-accent-primary" />
                      <p className="text-2xs text-content-muted">{selectedScene?.spectralBands !== null && selectedScene?.spectralBands !== undefined ? `Maximum limited to ${selectedScene.spectralBands} bands in the selected scene metadata.` : "Scene band count is unavailable; demo control is limited to 100 components."}</p>
                      {visibleErrors.pca && <InlineError message={visibleErrors.pca} />}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2 text-xs"><label htmlFor="threshold-percentile" className="font-medium text-content-primary">Threshold percentile</label><span className="font-mono font-semibold text-accent-primary">{thresholdPercentile.toFixed(1)}%</span></div>
                  <input id="threshold-percentile" aria-label="Threshold percentile" type="range" min={90} max={99.9} step={0.1} value={thresholdPercentile} onChange={(event) => setThresholdPercentile(Number(event.target.value))} className="w-full accent-accent-primary" />
                  <p className="text-2xs text-content-muted">Configuration threshold for retaining high-scoring detections in a hypothetical run. No detections are generated.</p>
                  {visibleErrors.threshold && <InlineError message={visibleErrors.threshold} />}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        <aside aria-label="Analysis configuration summary">
          <AnalysisConfigurationSummary
            configuration={configuration}
            aoi={selectedAoi}
            scene={selectedScene}
            signature={targetRequired ? selectedSignature : null}
            errors={visibleErrors}
            onLaunch={openConfirmation}
          />
        </aside>
      </div>

      <LaunchConfirmationModal
        isOpen={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        aoiName={selectedAoi?.properties.name ?? "Not selected"}
        sceneName={selectedScene?.name ?? "Not selected"}
        algorithmName={`${algorithm.toUpperCase()} · ${ALGORITHM_OPTIONS.find((option) => option.id === algorithm)?.name ?? "Unknown"}`}
        targetSignatureName={targetRequired ? selectedSignature?.name ?? null : null}
        preprocessing={preprocessingSummary}
        thresholdPercentile={thresholdPercentile}
        onConfirm={confirmLaunch}
      />
    </div>
  );
};

function SectionHeading({ id, number, title, description }: { id: string; number: string; title: string; description: string }) {
  return (
    <div>
      <h2 id={id} className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-content-primary">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary/15 text-[10px] text-accent-primary">{number}</span>
        {title}
      </h2>
      <p className="mt-1 pl-7 text-2xs text-content-muted">{description}</p>
    </div>
  );
}

function AoiMetadata({ aoi }: { aoi: AOIFeature }) {
  const geometryType = aoi.geometry.type;
  const [longitude, latitude] = aoi.properties.centroid;
  return (
    <div className="grid grid-cols-2 gap-2 rounded border border-border-subtle bg-surface-secondary/35 p-3 text-2xs sm:grid-cols-4">
      <MetadataValue label="Area" value={Number.isFinite(aoi.properties.areaKm2) ? `${aoi.properties.areaKm2.toFixed(2)} km²` : "Unavailable"} />
      <MetadataValue label="Geometry" value={geometryType} />
      <MetadataValue label="Centroid (lon, lat)" value={Number.isFinite(longitude) && Number.isFinite(latitude) ? `${longitude.toFixed(5)}, ${latitude.toFixed(5)}` : "Unavailable"} />
      <MetadataValue label="AOI ID" value={aoi.properties.id} />
    </div>
  );
}

function SceneMetadata({ scene }: { scene: SceneCatalogItem }) {
  const wavelengthRange = scene.wavelengthRangeNm
    ? `${scene.wavelengthRangeNm[0]}–${scene.wavelengthRangeNm[1]} nm`
    : "Unavailable";
  return (
    <div className="grid grid-cols-2 gap-2 rounded border border-border-subtle bg-surface-secondary/35 p-3 text-2xs sm:grid-cols-3">
      <MetadataValue label="Scene ID" value={scene.id} />
      <MetadataValue label="Platform / sensor" value={`${scene.sensorType} · ${scene.sensor}`} />
      <MetadataValue label="Acquisition date" value={scene.acquisitionDate ?? "Unavailable"} />
      <MetadataValue label="Spatial resolution" value={scene.spatialResolutionM === null ? "Unavailable" : `${scene.spatialResolutionM} m`} />
      <MetadataValue label="Spectral bands" value={scene.spectralBands === null ? "Unavailable" : String(scene.spectralBands)} />
      <MetadataValue label="Wavelength range" value={wavelengthRange} />
    </div>
  );
}

function BadBandInformation({ scene }: { scene: SceneCatalogItem }) {
  const ranges = scene.badBandRanges ?? [];
  const indices = scene.badBandIndices ?? [];
  const hasMetadata = ranges.length > 0 || indices.length > 0;
  const detail = [
    ...ranges.map(([start, end]) => `${start}–${end}`),
    ...(indices.length ? [`bands ${indices.join(", ")}`] : []),
  ].join("; ");
  return (
    <div className="flex items-start gap-2 rounded border border-border-subtle bg-surface-secondary/20 px-3 py-2 text-2xs">
      <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-muted" />
      <p className="text-content-muted">
        <span className="font-medium text-content-secondary">Bad-band metadata: </span>
        {hasMetadata ? `${detail}. Marked bands are configured to be excluded during hypothetical preprocessing; removal has not been executed.` : "Bad-band information unavailable for this scene."}
      </p>
    </div>
  );
}

function TargetSignatureField({
  signatures,
  value,
  error,
  onChange,
}: {
  signatures: SpectralSignature[];
  value: string;
  error?: string;
  onChange: (id: string) => void;
}) {
  const signature = signatures.find((item) => item.id === value);
  if (!signatures.length) {
    return (
      <div className="rounded border border-status-warning/30 bg-status-warning/5 p-3 text-xs">
        <p className="text-content-secondary">No signatures are available for this target-based algorithm.</p>
        <Link to="/signatures" className="mt-1 inline-block text-accent-primary hover:underline">Open Spectral Library →</Link>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded border border-accent-primary/25 bg-accent-primary/5 p-3">
      <Select label="Target signature" aria-label="Target signature" value={value} onChange={(event) => onChange(event.target.value)} error={error} options={[{ value: "", label: "Select a target signature" }, ...signatures.map((item) => ({ value: item.id, label: `${item.name} · ${item.category} · ${item.designation}` }))]} />
      {signature ? (
        <p className="text-2xs text-content-muted">
          {signature.id} · compatible sensors: {signature.compatibleSensors.join(", ")} · {signature.illustrative ? "illustrative reference values" : "user-provided values"}
        </p>
      ) : (
        <Link to="/signatures" className="text-2xs text-accent-primary hover:underline">Browse or create signatures in the Spectral Library →</Link>
      )}
    </div>
  );
}

function BackgroundMethodField({ value, onChange }: { value: BackgroundEstimationMethod; onChange: (value: BackgroundEstimationMethod) => void }) {
  return (
    <div>
      <Select label="Background estimation" aria-label="Background estimation method" value={value} onChange={(event) => onChange(event.target.value as BackgroundEstimationMethod)} options={[{ value: "global", label: "Global AOI statistics" }, { value: "local", label: "Local neighborhood" }]} />
      <p className="mt-1.5 text-2xs text-content-muted">{value === "global" ? "Configuration uses the selected AOI as the background extent." : "Configuration requests a local neighborhood estimate; window geometry is not executed in this demo."}</p>
    </div>
  );
}

function OutputModeField({ value, onChange }: { value: "continuous" | "binary"; onChange: (value: "continuous" | "binary") => void }) {
  return (
    <div>
      <Select label="Output mode" aria-label="Analysis output mode" value={value} onChange={(event) => onChange(event.target.value as "continuous" | "binary")} options={[{ value: "continuous", label: "Continuous score surface" }, { value: "binary", label: "Thresholded binary mask" }]} />
      <p className="mt-1.5 text-2xs text-content-muted">Describes the requested output representation only; no output is generated.</p>
    </div>
  );
}

function FusionWeights({ spatialWeight, spectralWeight, onChange }: { spatialWeight: number; spectralWeight: number; onChange: (spatial: number) => void }) {
  return (
    <div className="space-y-2 rounded border border-border-subtle bg-surface-secondary/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="fusion-spatial-weight" className="text-xs font-medium text-content-primary">Spatial contribution</label>
        <span className="font-mono text-xs text-accent-primary">{spatialWeight}% spatial / {spectralWeight}% spectral</span>
      </div>
      <input id="fusion-spatial-weight" aria-label="Spatial fusion weight" type="range" min={0} max={100} step={1} value={spatialWeight} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-accent-primary" />
      <p className="text-2xs text-content-muted">The spectral contribution is automatically set to 100% minus the spatial weight. Combined total: {spatialWeight + spectralWeight}%.</p>
    </div>
  );
}

function NumberField({ label, ariaLabel, value, min, max, step, helper, onChange }: {
  label: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  helper: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Input label={label} aria-label={ariaLabel} type="number" value={Number.isFinite(value) ? value : ""} min={min} max={max} step={step} onChange={(event) => onChange(event.currentTarget.value === "" ? Number.NaN : Number(event.currentTarget.value))} />
      <p className="mt-1.5 text-2xs text-content-muted">{helper}</p>
    </div>
  );
}

function MetadataValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono uppercase text-content-muted">{label}</p>
      <p className="mt-0.5 break-words text-content-primary">{value}</p>
    </div>
  );
}

function InlineError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="text-2xs text-status-danger">{message}</p>;
}

function EmptyInputState({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return (
    <div className="rounded border border-dashed border-border-strong p-4 text-center">
      <p className="text-xs font-medium text-content-primary">{title}</p>
      <p className="mt-1 text-2xs text-content-muted">{description}</p>
      <Link to={href}><Button variant="outline" size="sm" className="mt-3">{action}</Button></Link>
    </div>
  );
}

function normalizationLabel(method: NormalizationMethod): string {
  return NORMALIZATION_OPTIONS.find((option) => option.value === method)?.label ?? method;
}

function normalizationHelp(method: NormalizationMethod): string {
  const descriptions: Record<NormalizationMethod, string> = {
    none: "Leave source values unchanged in a future processing workflow.",
    "min-max": "Configure per-band scaling to a common 0–1 range.",
    "z-score": "Configure centering by mean and scaling by standard deviation.",
    l2: "Configure per-spectrum unit-length scaling.",
  };
  return descriptions[method];
}

function badBandSummary(scene: SceneCatalogItem): string {
  if (scene.badBandRanges?.length) return `Bad bands: ${scene.badBandRanges.map(([start, end]) => `${start}–${end}`).join(", ")}`;
  if (scene.badBandIndices?.length) return `Bad band indices: ${scene.badBandIndices.join(", ")}`;
  return "Bad-band information unavailable for this scene.";
}
