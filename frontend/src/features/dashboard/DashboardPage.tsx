import React, { useEffect, useState } from "react";
import { WelcomeSection } from "./components/WelcomeSection";
import { MetricCard } from "./components/MetricCard";
import { RecentAnalyses } from "./components/RecentAnalyses";
import { RecentAOIs } from "./components/RecentAOIs";
import { RecentScenes } from "./components/RecentScenes";
import { SystemStatus } from "./components/SystemStatus";
import { AlgorithmActivityChart } from "./components/AlgorithmActivityChart";
import { DetectionActivityChart } from "./components/DetectionActivityChart";
import { QuickActions } from "./components/QuickActions";
import { sceneApi } from "@/api/sceneApi";
import { areaApi } from "@/api/areaApi";
import { analysisApi } from "@/api/analysisApi";
import { getDashboardData } from "./data/dashboardMockData";
import {
  Layers,
  MapPin,
  Activity,
  Flame,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const fallbackData = getDashboardData();
  const [metrics, setMetrics] = useState({
    totalScenes: 36,
    newScenesThisWeek: 3,
    totalAOIs: 4,
    newAOIsThisMonth: 1,
    totalAnalyses: 12,
    activeAnalyses: 0,
    completedAnalyses: 10,
    totalDetections: 142,
    recentDetections: 8,
  });

  useEffect(() => {
    let mounted = true;
    const fetchLiveMetrics = async () => {
      try {
        const [scenesRes, aoisRes, analysesRes] = await Promise.allSettled([
          sceneApi.listScenes(),
          areaApi.listAreas(),
          analysisApi.listAnalyses(),
        ]);

        if (!mounted) return;

        let totalScenes = 36;
        if (scenesRes.status === "fulfilled" && scenesRes.value) {
          totalScenes = scenesRes.value.total || scenesRes.value.scenes?.length || 36;
        }

        let totalAOIs = 4;
        if (aoisRes.status === "fulfilled" && aoisRes.value) {
          totalAOIs = (aoisRes.value as any)?.areas?.length ?? totalAOIs;
        }

        let totalAnalyses = 12;
        let activeAnalyses = 0;
        let completedAnalyses = 10;
        if (analysesRes.status === "fulfilled" && analysesRes.value) {
          const list = (analysesRes.value as any)?.analyses || [];
          totalAnalyses = list.length || totalAnalyses;
          activeAnalyses = list.filter((a: any) =>
            ["QUEUED", "ACQUIRING_DATA", "PREPROCESSING", "RUNNING_ALGORITHMS", "GENERATING_OUTPUTS"].includes(a.status)
          ).length;
          completedAnalyses = list.filter((a: any) => a.status === "COMPLETED").length;
        }

        setMetrics((prev) => ({
          ...prev,
          totalScenes,
          totalAOIs,
          totalAnalyses,
          activeAnalyses,
          completedAnalyses,
        }));
      } catch {
        // Keeps graceful fallback if backend is momentarily restarting
      }
    };

    fetchLiveMetrics();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Row 1: Welcome & Mission Overview */}
      <WelcomeSection />

      {/* Row 2: Four Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Satellite Scenes */}
        <MetricCard
          title="Satellite Scenes"
          value={metrics.totalScenes}
          subtitle="AVIRIS, ROSIS, NASA EMIT, EnMAP"
          badgeText="Live Catalog"
          badgeVariant="success"
          icon={Layers}
          iconColorClass="text-accent-primary"
          iconBgClass="bg-accent-primary/10 border-accent-primary/20"
          to="/scenes"
        />

        {/* Card 2: Areas of Interest */}
        <MetricCard
          title="Areas of Interest"
          value={metrics.totalAOIs}
          subtitle="Surveillance & exploration zones"
          badgeText="Active Zones"
          badgeVariant="primary"
          icon={MapPin}
          iconColorClass="text-indigo-400"
          iconBgClass="bg-indigo-500/10 border-indigo-500/20"
          to="/workspace"
        />

        {/* Card 3: Hyperspectral Analyses */}
        <MetricCard
          title="Analyses Run"
          value={metrics.totalAnalyses}
          subtitle={`${metrics.completedAnalyses} completed • ${metrics.activeAnalyses} active`}
          badgeText={metrics.activeAnalyses > 0 ? `${metrics.activeAnalyses} In Progress` : "Queue Ready"}
          badgeVariant={metrics.activeAnalyses > 0 ? "warning" : "success"}
          icon={Activity}
          iconColorClass="text-sky-400"
          iconBgClass="bg-sky-500/10 border-sky-500/20"
          to="/jobs"
        />

        {/* Card 4: Detections */}
        <MetricCard
          title="Target Detections"
          value={metrics.totalDetections}
          subtitle="Confidence score threshold > 0.85"
          badgeText="High Confidence"
          badgeVariant="success"
          icon={Flame}
          iconColorClass="text-amber-400"
          iconBgClass="bg-amber-500/10 border-amber-500/20"
          to="/results"
        />
      </div>

      {/* Row 3: Recent Analyses & Live System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <RecentAnalyses analyses={fallbackData.recentAnalyses} />
        </div>
        <div className="lg:col-span-4">
          <SystemStatus />
        </div>
      </div>

      {/* Row 4: Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <AlgorithmActivityChart data={fallbackData.algorithmActivity} />
        </div>
        <div className="lg:col-span-6">
          <DetectionActivityChart data={fallbackData.detectionActivity} />
        </div>
      </div>

      {/* Row 5: Recent AOIs, Recent Scenes, & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <RecentAOIs aois={fallbackData.recentAOIs} />
        </div>
        <div className="lg:col-span-4">
          <RecentScenes scenes={fallbackData.recentScenes} />
        </div>
        <div className="lg:col-span-4">
          <QuickActions />
        </div>
      </div>
    </div>
  );
};
