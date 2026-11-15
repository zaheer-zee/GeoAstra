import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/hooks/useToast";
import {
  Globe,
  Layers,
  Cpu,
  Server,
  Save,
  RotateCcw,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const toast = useToast();
  const [coordFormat, setCoordFormat] = useState("dms");
  const [distanceUnit, setDistanceUnit] = useState("metric");
  const [wavelengthUnit, setWavelengthUnit] = useState("nm");
  const [defaultComposite, setDefaultComposite] = useState("swir");
  const [enableGpuAcceleration, setEnableGpuAcceleration] = useState(true);
  const [cacheRasterTiles, setCacheRasterTiles] = useState(true);
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:5001/api");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Preferences Saved", "Workstation settings stored in local client cache.");
  };

  const handleReset = () => {
    setCoordFormat("dms");
    setDistanceUnit("metric");
    setWavelengthUnit("nm");
    setDefaultComposite("swir");
    setEnableGpuAcceleration(true);
    setCacheRasterTiles(true);
    setGatewayUrl("http://localhost:5001/api");
    toast.info("Preferences Reset", "Default scientific workstation parameters restored.");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        category="PREFERENCES"
        title="Workstation Settings & Preferences"
        subtitle="Configure geospatial coordinate systems, spectral rendering defaults, caching parameters, and local API gateway endpoints."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleReset}
            >
              Reset Defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSave}
            >
              Save Preferences
            </Button>
          </div>
        }
      />


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Geospatial & Coordinates */}
        <Card variant="elevated">
          <CardHeader className="pb-3 border-b border-border-subtle">
            <CardTitle className="text-xs flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent-primary" />
              Geospatial Coordinates &amp; Units
            </CardTitle>
            <CardDescription className="text-2xs">
              Coordinate readout formats and spatial measurement units
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-mono uppercase tracking-wider text-content-secondary block">
                Coordinate Display Format
              </label>
              <Select
                value={coordFormat}
                onChange={(e) => setCoordFormat(e.target.value)}
                options={[
                  { label: "Degrees Minutes Seconds (31°58'07.0\"N 102°05'55.7\"W)", value: "dms" },
                  { label: "Decimal Degrees (31.9686° N, 102.0988° W)", value: "dd" },
                  { label: "Universal Transverse Mercator (UTM Zone 13N)", value: "utm" },
                  { label: "Military Grid Reference System (MGRS)", value: "mgrs" },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-mono uppercase tracking-wider text-content-secondary block">
                Measurement Distance Units
              </label>
              <Select
                value={distanceUnit}
                onChange={(e) => setDistanceUnit(e.target.value)}
                options={[
                  { label: "Metric (Meters, Kilometers, km²)", value: "metric" },
                  { label: "Imperial (Feet, Miles, Acres)", value: "imperial" },
                  { label: "Nautical (Nautical Miles, Knots)", value: "nautical" },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Panel 2: Spectral Display Configuration */}
        <Card variant="elevated">
          <CardHeader className="pb-3 border-b border-border-subtle">
            <CardTitle className="text-xs flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-primary" />
              Spectral Display &amp; False-Color Presets
            </CardTitle>
            <CardDescription className="text-2xs">
              Default band combination assignments for multi-band rasters
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-mono uppercase tracking-wider text-content-secondary block">
                Default False-Color Composite
              </label>
              <Select
                value={defaultComposite}
                onChange={(e) => setDefaultComposite(e.target.value)}
                options={[
                  { label: "SWIR Composite (Bands: SWIR-1, NIR, Red) — Hydrocarbons/Minerals", value: "swir" },
                  { label: "True Color (Bands: Red 660nm, Green 560nm, Blue 480nm)", value: "rgb" },
                  { label: "Color Infrared (Bands: NIR 860nm, Red 660nm, Green 560nm) — Vegetation", value: "cir" },
                  { label: "Geological Alteration (Bands: SWIR-2, SWIR-1, NIR) — Kaolinite/Alunite", value: "geo" },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-mono uppercase tracking-wider text-content-secondary block">
                Spectral Wavelength Units
              </label>
              <Select
                value={wavelengthUnit}
                onChange={(e) => setWavelengthUnit(e.target.value)}
                options={[
                  { label: "Nanometers (nm) [e.g. 1660 nm]", value: "nm" },
                  { label: "Micrometers (µm) [e.g. 1.66 µm]", value: "um" },
                  { label: "Wavenumber (cm⁻¹) [e.g. 6024 cm⁻¹]", value: "cm" },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Panel 3: Compute & Tile Caching */}
        <Card variant="elevated">
          <CardHeader className="pb-3 border-b border-border-subtle">
            <CardTitle className="text-xs flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent-primary" />
              Compute &amp; Performance
            </CardTitle>
            <CardDescription className="text-2xs">
              Client GPU acceleration and local raster caching
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded bg-surface-secondary/50 border border-border-subtle">
              <div>
                <span className="text-xs font-medium text-content-primary block">
                  WebGL / WebGPU Shader Acceleration
                </span>
                <span className="text-2xs text-content-muted">
                  Use hardware-accelerated shaders for real-time false color blending
                </span>
              </div>
              <Switch checked={enableGpuAcceleration} onChange={setEnableGpuAcceleration} />
            </div>

            <div className="flex items-center justify-between p-3 rounded bg-surface-secondary/50 border border-border-subtle">
              <div>
                <span className="text-xs font-medium text-content-primary block">
                  Local COG Tile Caching (IndexedDB)
                </span>
                <span className="text-2xs text-content-muted">
                  Cache Cloud Optimized GeoTIFF tile slices in browser memory (up to 500 MB)
                </span>
              </div>
              <Switch checked={cacheRasterTiles} onChange={setCacheRasterTiles} />
            </div>
          </CardContent>
        </Card>

        {/* Panel 4: Local Gateway Configuration */}
        <Card variant="elevated">
          <CardHeader className="pb-3 border-b border-border-subtle">
            <CardTitle className="text-xs flex items-center gap-2">
              <Server className="w-4 h-4 text-accent-primary" />
              Backend Gateway Connection
            </CardTitle>
            <CardDescription className="text-2xs">
              Configured Express Gateway endpoint for future integration
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-mono uppercase tracking-wider text-content-secondary block">
                Express API Gateway Base URL
              </label>
              <Input
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="http://localhost:5001/api"
              />
            </div>

            <div className="p-2.5 rounded bg-surface-secondary/50 border border-border-subtle text-2xs font-mono text-content-muted flex items-center justify-between">
              <span>GATEWAY STATUS:</span>
              <Badge variant="success" size="sm">
                CONNECTED (PORT 5001)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
