import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Compass,
  Activity,
  Layers,
  Calendar,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const WelcomeSection: React.FC = () => {
  const { user } = useAuth();

  // Dynamic greeting based on current local hour
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
      ? "Good afternoon"
      : "Good evening";

  // Formatted date string
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const displayName = user?.name || "Analyst";
  const userRole = user?.role || "Senior Analyst";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-secondary/70 p-5 sm:p-6 backdrop-blur-md relative overflow-hidden shadow-lg">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Greeting & Description */}
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-mono uppercase tracking-wider text-accent-primary font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              MISSION CONTROL WORKSPACE
            </span>
            <Badge variant="outline" size="sm" className="font-mono text-2xs">
              {userRole}
            </Badge>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-content-primary">
            {greeting}, <span className="text-accent-primary">{displayName}</span>
          </h1>

          <p className="text-xs text-content-secondary leading-relaxed">
            Welcome back to your GeoAstra intelligence workspace. Monitor calibrated datacubes, high-dimensional anomaly runs, and spatial detection telemetry.
          </p>

          <div className="flex items-center gap-2 pt-1 text-2xs font-mono text-content-muted">
            <Calendar className="w-3.5 h-3.5 text-content-muted" />
            <span>{formattedDate}</span>
            <span>•</span>
            <span className="text-status-success font-medium">PIPELINE INTEGRATED</span>
          </div>
        </div>

        {/* Right: Quick Launch Navigation Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link to="/workspace">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Compass className="w-3.5 h-3.5" />}
              rightIcon={<ArrowRight className="w-3 h-3" />}
            >
              Open Studio
            </Button>
          </Link>

          <Link to="/analysis/new">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Activity className="w-3.5 h-3.5 text-accent-primary" />}
            >
              New Analysis
            </Button>
          </Link>

          <Link to="/scenes">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Layers className="w-3.5 h-3.5 text-content-secondary" />}
            >
              Explore Scenes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

