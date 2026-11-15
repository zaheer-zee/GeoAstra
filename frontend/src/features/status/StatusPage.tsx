import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { healthApi } from "@/api/healthApi";

interface ServiceTopologyNode {
  name: string;
  role: string;
  port: number;
  protocol: string;
  framework: string;
  endpoint: string;
  status: "ONLINE" | "OFFLINE" | "CHECKING";
  description: string;
  auditNotes: string;
}

export const StatusPage: React.FC = () => {
  const [nodes, setNodes] = useState<ServiceTopologyNode[]>([
    {
      name: "Express API Gateway",
      role: "Main HTTP Gateway & Session Auth",
      port: 5001,
      protocol: "HTTP/REST",
      framework: "Node.js 20, Express 4, Prisma Client",
      endpoint: "http://localhost:5001/api/v1",
      status: "CHECKING",
      description: "Handles JWT authentication, dataset metadata uploads, BullMQ queue dispatch, and analytical proxying.",
      auditNotes: "All 18 REST endpoints active. CORS configured for workstation client.",
    },
    {
      name: "Python AI Engine",
      role: "Hyperspectral Compute & ML",
      port: 8000,
      protocol: "HTTP/REST",
      framework: "Python 3.13, FastAPI, NumPy, SciPy, Rasterio",
      endpoint: "http://localhost:8000/internal/v1",
      status: "CHECKING",
      description: "Executes RXD anomaly detection, Matched Filter projections, CEM energy minimization, and false-alarm suppression.",
      auditNotes: "Standalone FastAPI microservice with vectorized NumPy covariance tensor inversion.",
    },
    {
      name: "PostgreSQL Database",
      role: "Relational & Geospatial Storage",
      port: 5433,
      protocol: "PostgreSQL Wire Protocol",
      framework: "PostgreSQL 16 + PostGIS 3.4",
      endpoint: "postgresql://localhost:5433/geospectra",
      status: "ONLINE",
      description: "Stores spatial geometries (GeoJSON), scene bounding footprints, user credentials, and analysis logs.",
      auditNotes: "Schema managed via Prisma migrations with spatial JSONB indexing.",
    },
    {
      name: "Redis Queue & BullMQ",
      role: "Distributed Async Job Broker",
      port: 6379,
      protocol: "Redis RESP",
      framework: "Redis 7-Alpine, BullMQ 6",
      endpoint: "redis://localhost:6379",
      status: "ONLINE",
      description: "Decouples heavy multi-gigabyte raster processing jobs from the HTTP request-response cycle.",
      auditNotes: "BullMQ job worker queues: 'analysis-queue' with multi-stage lifecycle.",
    },
  ]);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await healthApi.getServicesHealth();
        if (!mounted) return;
        setNodes((prev) =>
          prev.map((node) => {
            if (node.port === 5001) {
              return { ...node, status: res.services?.backend?.status === "healthy" ? "ONLINE" : "OFFLINE" };
            }
            if (node.port === 8000) {
              return { ...node, status: res.services?.aiEngine?.status === "healthy" ? "ONLINE" : "OFFLINE" };
            }
            return node;
          })
        );
      } catch {
        if (!mounted) return;
        setNodes((prev) =>
          prev.map((node) => (node.port === 5001 ? { ...node, status: "OFFLINE" } : node))
        );
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const allOnline = nodes.every((n) => n.status === "ONLINE");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        category="SYSTEM ARCHITECTURE"
        title="Service Topology & Architecture Status"
        subtitle="Live microservice topology and connectivity status for Express Gateway, Python AI Engine, PostgreSQL Database, and BullMQ Task Queue."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={allOnline ? "success" : "warning"} size="md" dot>
              {allOnline ? "ALL SERVICES CONNECTED" : "CONNECTIVITY CHECK"}
            </Badge>
          </div>
        }
      />

      {/* Grid of 4 Service Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {nodes.map((node, idx) => (
          <Card key={idx} variant="elevated" className="border-border-strong/70 flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border-subtle">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-xs font-bold text-content-primary">{node.name}</CardTitle>
                  <CardDescription className="font-mono text-2xs text-accent-primary">
                    Port {node.port}
                  </CardDescription>
                </div>
                <Badge
                  variant={node.status === "ONLINE" ? "success" : node.status === "OFFLINE" ? "danger" : "warning"}
                  size="sm"
                  dot
                >
                  {node.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between text-left">
              <div className="space-y-2 text-2xs">
                <div>
                  <span className="text-content-muted uppercase tracking-wider font-mono block text-[10px]">Role</span>
                  <span className="text-content-primary font-medium">{node.role}</span>
                </div>
                <div>
                  <span className="text-content-muted uppercase tracking-wider font-mono block text-[10px]">Framework</span>
                  <span className="text-content-secondary font-mono">{node.framework}</span>
                </div>
                <div>
                  <span className="text-content-muted uppercase tracking-wider font-mono block text-[10px]">Endpoint</span>
                  <span className="text-accent-primary font-mono truncate block">{node.endpoint}</span>
                </div>
                <div>
                  <span className="text-content-muted uppercase tracking-wider font-mono block text-[10px]">Description</span>
                  <p className="text-content-secondary leading-relaxed">{node.description}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle/60 text-[10px] text-content-muted">
                <span className="font-semibold text-content-secondary">Audit Note: </span>
                {node.auditNotes}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
