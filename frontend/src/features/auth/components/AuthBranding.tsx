import React from "react";
import { Orbit, Activity, Shield, Sparkles, Layers } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const AuthBranding: React.FC = () => {
  return (
    <div className="relative h-full w-full flex flex-col justify-between p-8 lg:p-12 text-content-primary overflow-hidden">
      {/* Background Ambience: Deep Radial Glow & Tech Grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1220] via-[#0F1A2E] to-[#070B14] pointer-events-none" />
      <div className="absolute inset-0 bg-tech-grid opacity-35 pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-secondary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Section */}
      <div className="relative z-10 space-y-4">
        {/* Orbital Logo Badge */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-surface-elevated/90 border border-accent-primary/40 flex items-center justify-center text-accent-primary shadow-glow">
            <Orbit className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold tracking-tight text-content-primary">
                GeoAstra
              </span>
              <Badge variant="outline" size="sm">
                v2.0
              </Badge>
            </div>
            <p className="text-2xs font-mono uppercase tracking-wider text-accent-primary font-medium">
              Hyperspectral Intelligence Platform
            </p>
          </div>
        </div>

        {/* Hero Tagline */}
        <div className="pt-8 space-y-3 max-w-md">
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-content-primary leading-tight">
            High-Dimensional Spectral Target Detection &amp; Spatial Intelligence
          </h1>
          <p className="text-xs text-content-secondary leading-relaxed">
            Analytical workstation for multi-band sensor ingestion, real-time tensor covariance inversion, and diagnostic material identification across airborne and spaceborne platforms.
          </p>
        </div>
      </div>

      {/* Middle Feature Highlights */}
      <div className="relative z-10 py-6 space-y-2.5 max-w-sm">
        <div className="p-3 rounded-lg bg-surface-secondary/40 border border-border-subtle/80 flex items-center gap-3 backdrop-blur-sm">
          <div className="w-8 h-8 rounded bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-content-primary">Calibrated Datacube Core</h4>
            <p className="text-[11px] text-content-muted">AVIRIS-NG, PRISMA, EnMAP &amp; EMIT L2D support</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface-secondary/40 border border-border-subtle/80 flex items-center gap-3 backdrop-blur-sm">
          <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-content-primary">4-Algorithm AI Suite</h4>
            <p className="text-[11px] text-content-muted">RXD, Matched Filter, CEM &amp; Spatial-Spectral Fusion</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface-secondary/40 border border-border-subtle/80 flex items-center gap-3 backdrop-blur-sm">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-content-primary">USGS Spectral Library</h4>
            <p className="text-[11px] text-content-muted">400–2500 nm reference reflectance spectra</p>
          </div>
        </div>
      </div>

      {/* Bottom Footer / Diagnostic Security Status */}
      <div className="relative z-10 pt-4 border-t border-border-subtle/60 flex items-center justify-between text-2xs font-mono text-content-muted">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-accent-primary" />
          <span>SESSION AUTH PROTOCOL: HS256 JWT</span>
        </div>
        <span>RESTRICTED ACCESS</span>
      </div>
    </div>
  );
};

