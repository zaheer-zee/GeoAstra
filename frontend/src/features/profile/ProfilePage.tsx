import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/features/auth/useAuthStore";
import {
  Shield,
  Key,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";

export const ProfilePage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuthStore();

  const handleCopyToken = () => {
    toast.success("Token Copied", "Demo API token copied to clipboard.");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        category="USER PROFILE"
        title="Analyst Profile & Security Credentials"
        subtitle="Operational credentials, clearance level, access control roles, and personal access tokens."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="success" size="md" dot>
              ACTIVE SESSION
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Identity Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card variant="elevated">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <Avatar
                size="lg"
                name={user?.name || "Alex Mercer"}
                status="online"
                className="border-2 border-accent-primary"
              />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-content-primary">
                  {user?.name || "Alex Mercer"}
                </h3>
                <p className="text-2xs font-mono text-accent-primary">
                  {user?.email || "alex.mercer@geoastra.io"}
                </p>
                <Badge variant="primary" size="sm" className="mt-1">
                  {user?.role || "Senior Analyst"}
                </Badge>
              </div>

              <div className="w-full pt-4 border-t border-border-subtle space-y-2.5 text-2xs font-mono text-left">
                <div className="flex justify-between">
                  <span className="text-content-muted">ROLE:</span>
                  <span className="text-content-primary font-semibold uppercase">{user?.role || "analyst"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-muted">CLEARANCE:</span>
                  <span className="text-status-warning font-semibold">TS / HYPERSPECTRAL SCI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-muted">ORGANIZATION:</span>
                  <span className="text-content-primary">GeoAstra Intelligence</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-muted">USER ID:</span>
                  <span className="text-content-secondary truncate max-w-[140px]">{user?.id || "e305e55e-..."}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Security & Personal API Tokens (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Identity & Workspace details */}
          <Card variant="elevated">
            <CardHeader className="pb-3 border-b border-border-subtle">
              <CardTitle className="text-xs flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-accent-primary" />
                Workstation Clearance &amp; Access Controls
              </CardTitle>
              <CardDescription className="text-2xs">
                Role-based privileges across analytical and dataset pipelines
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs font-mono">
                <div className="p-3 rounded bg-surface-secondary/50 border border-border-subtle space-y-1">
                  <span className="text-content-muted block">DATASET INGESTION:</span>
                  <span className="text-status-success font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Full Upload &amp; Index (L1B/L2D)
                  </span>
                </div>
                <div className="p-3 rounded bg-surface-secondary/50 border border-border-subtle space-y-1">
                  <span className="text-content-muted block">ALGORITHM DISPATCH:</span>
                  <span className="text-status-success font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> High-Priority GPU Queues
                  </span>
                </div>
                <div className="p-3 rounded bg-surface-secondary/50 border border-border-subtle space-y-1">
                  <span className="text-content-muted block">SPECTRAL LIBRARY:</span>
                  <span className="text-status-success font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Read / Write Custom Signatures
                  </span>
                </div>
                <div className="p-3 rounded bg-surface-secondary/50 border border-border-subtle space-y-1">
                  <span className="text-content-muted block">DOSSIER EXPORT:</span>
                  <span className="text-status-success font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PDF &amp; GeoJSON Intelligence
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Access Tokens Card */}
          <Card variant="elevated">
            <CardHeader className="pb-3 border-b border-border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-accent-primary" />
                    Personal Access Tokens (Demo Placeholders)
                  </CardTitle>
                  <CardDescription className="text-2xs">
                    Bearer tokens for script automation and Python SDK integration
                  </CardDescription>
                </div>
                <Badge variant="outline" size="sm">
                  BEARER JWT
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 rounded bg-surface-secondary/60 border border-border-subtle flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-content-primary">
                      Workstation-SDK-CLI-Token
                    </span>
                    <Badge variant="success" size="sm">
                      ACTIVE
                    </Badge>
                  </div>
                  <p className="font-mono text-2xs text-content-muted truncate">
                    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo_token_analyst_geoastra_key...
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  onClick={handleCopyToken}
                >
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
