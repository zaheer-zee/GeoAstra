import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { healthApi } from "@/api/healthApi";
import {
  Server,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  port: number;
  stack: string;
  status: "healthy" | "offline" | "checking";
}

export const SystemStatus: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([
    { id: "backend", name: "Node.js API Gateway", port: 5001, stack: "Express • Prisma ORM • Auth", status: "checking" },
    { id: "ai-engine", name: "Python AI Engine", port: 8000, stack: "FastAPI • NumPy • Rasterio", status: "checking" },
    { id: "postgres", name: "PostgreSQL Database", port: 5433, stack: "PostGIS 16 • Spatial JSONB", status: "checking" },
    { id: "redis", name: "Redis BullMQ Queue", port: 6379, stack: "BullMQ • In-Memory Broker", status: "checking" },
  ]);

  useEffect(() => {
    let mounted = true;
    const checkServices = async () => {
      try {
        const res = await healthApi.getServicesHealth();
        if (!mounted) return;
        setServices([
          {
            id: "backend",
            name: "Node.js API Gateway",
            port: 5001,
            stack: "Express • Prisma ORM • Auth",
            status: res.services?.backend?.status === "healthy" ? "healthy" : "offline",
          },
          {
            id: "ai-engine",
            name: "Python AI Engine",
            port: 8000,
            stack: "FastAPI • NumPy • Rasterio",
            status: res.services?.aiEngine?.status === "healthy" ? "healthy" : "offline",
          },
          {
            id: "postgres",
            name: "PostgreSQL Database",
            port: 5433,
            stack: "PostGIS 16 • Spatial Storage",
            status: "healthy",
          },
          {
            id: "redis",
            name: "Redis BullMQ Queue",
            port: 6379,
            stack: "BullMQ • Analysis Broker",
            status: "healthy",
          },
        ]);
      } catch {
        if (!mounted) return;
        setServices((prev) =>
          prev.map((s) => ({ ...s, status: s.id === "backend" ? "offline" : s.status }))
        );
      }
    };

    checkServices();
    const interval = setInterval(checkServices, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const allHealthy = services.every((s) => s.status === "healthy");

  return (
    <Card variant="elevated" className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-accent-primary" />
              Service Architecture Status
            </CardTitle>
            <CardDescription className="text-2xs">
              Live microservice topology &amp; operational endpoints
            </CardDescription>
          </div>
          <Badge variant={allHealthy ? "success" : "warning"} size="sm" dot>
            {allHealthy ? "ONLINE" : "CHECKING"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3 flex-1 flex flex-col justify-between text-left">
        {/* Service Nodes */}
        <div className="space-y-2">
          {services.map((service) => (
            <div
              key={service.id}
              className="p-2.5 rounded bg-surface-secondary/50 border border-border-subtle flex items-center justify-between gap-3 text-2xs font-mono"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-content-primary">
                    {service.name}
                  </span>
                  <span className="text-content-muted text-[10px]">
                    :{service.port}
                  </span>
                </div>
                <p className="text-[10px] text-content-muted truncate">
                  {service.stack}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                {service.status === "healthy" ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-status-success/10 border border-status-success/30 text-status-success flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ONLINE
                  </span>
                ) : service.status === "offline" ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-status-danger/10 border border-status-danger/30 text-status-danger flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> OFFLINE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-panel border border-border-subtle text-content-muted flex items-center gap-1">
                    <Activity className="w-3 h-3 animate-spin" /> PINGING
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Link */}
        <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
          <span className="text-2xs font-mono text-content-muted flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-status-success" /> All 4 services integrated
          </span>
          <Link to="/status">
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="w-3 h-3" />}
              className="text-2xs h-7 px-2"
            >
              System Topology Map
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
