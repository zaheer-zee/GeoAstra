import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SpectralSignature } from "@/features/signatures/types";
import { SpectralChart } from "@/features/signatures/components/SpectralChart";
import { DemoResultFixture } from "../types";

const chartAxis = { fill: "#94a3b8", fontSize: 10 };
const chartGrid = "#334155";

export function EvaluationMetrics({ fixture }: { fixture: DemoResultFixture }) {
  const metrics = [
    { name: "Precision", value: fixture.metrics.precision, description: "Illustrative share of example detections labeled relevant." },
    { name: "Recall", value: fixture.metrics.recall, description: "Illustrative share of example reference cases represented." },
    { name: "F1 score", value: fixture.metrics.f1, description: "Illustrative harmonic mean of precision and recall." },
    { name: "AUC", value: fixture.metrics.auc, description: "Area under the illustrative ROC curve; not a measured evaluation." },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.name} variant="default">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-2xs font-mono uppercase tracking-wide text-content-muted">{metric.name}</p>
              <Badge variant="warning">ILLUSTRATIVE</Badge>
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold text-content-primary">{metric.value.toFixed(3)}</p>
            <p className="mt-1 text-2xs leading-relaxed text-content-muted">{metric.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RocChart({ fixture }: { fixture: DemoResultFixture }) {
  const data = fixture.roc.map((point) => ({ ...point, noSkill: point.fpr }));
  return (
    <Card variant="default">
      <div className="flex items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div><h3 className="text-sm font-semibold text-content-primary">ROC curve</h3><p className="mt-1 text-2xs text-content-muted">Receiver Operating Characteristic · AUC {fixture.metrics.auc.toFixed(3)}</p></div>
        <Badge variant="success">EVALUATION METRIC</Badge>
      </div>
      <CardContent className="p-3">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, bottom: 25, left: 10 }}>
              <CartesianGrid stroke={chartGrid} strokeDasharray="3 4" />
              <XAxis dataKey="fpr" type="number" domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]} tick={chartAxis} tickFormatter={(value: number) => value.toFixed(1)} label={{ value: "False Positive Rate", position: "insideBottom", offset: -16, fill: "#cbd5e1", fontSize: 10 }} />
              <YAxis type="number" domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]} tick={chartAxis} tickFormatter={(value: number) => value.toFixed(1)} label={{ value: "True Positive Rate", angle: -90, position: "insideLeft", fill: "#cbd5e1", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 11 }} formatter={(value, name) => [Number(value).toFixed(3), String(name) === "noSkill" ? "No-skill reference" : "Illustrative ROC"]} />
              <Legend formatter={(value) => value === "noSkill" ? "No-skill reference" : "Illustrative ROC"} wrapperStyle={{ color: "#cbd5e1", fontSize: 10 }} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#64748b" strokeDasharray="5 5" />
              <Line dataKey="noSkill" name="noSkill" type="linear" stroke="#64748b" strokeDasharray="5 5" dot={false} isAnimationActive={false} />
              <Line dataKey="tpr" name="Illustrative ROC" type="monotone" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3, fill: "#22d3ee" }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ScoreDistributionChart({ fixture }: { fixture: DemoResultFixture }) {
  return (
    <Card variant="default">
      <div className="flex items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div><h3 className="text-sm font-semibold text-content-primary">Detection score distribution</h3><p className="mt-1 text-2xs text-content-muted">Illustrative relative bins · not actual detection counts</p></div>
        <Badge variant="warning">ILLUSTRATIVE</Badge>
      </div>
      <CardContent className="p-3">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fixture.scoreDistribution} margin={{ top: 12, right: 12, bottom: 22, left: 0 }}>
              <CartesianGrid stroke={chartGrid} strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="range" tick={chartAxis} label={{ value: "Illustrative score range", position: "insideBottom", offset: -13, fill: "#cbd5e1", fontSize: 10 }} />
              <YAxis tick={chartAxis} allowDecimals={false} label={{ value: "Relative count (demo)", angle: -90, position: "insideLeft", fill: "#cbd5e1", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 11 }} formatter={(value) => [Number(value), "Illustrative relative count"]} />
              <Bar dataKey="count" name="Illustrative relative count" fill="#22d3ee" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function createIllustrativeObservedSignature(target: SpectralSignature): SpectralSignature {
  return {
    ...target,
    id: `${target.id}-demo-observed`,
    name: "Illustrative observed spectrum",
    description: "A simulated comparison curve derived for interface demonstration; not a satellite measurement.",
    designation: "custom",
    illustrative: true,
    reflectance: target.reflectance.map((value, index) =>
      Math.max(0, Math.min(1, value * (1 + 0.07 * Math.sin(index * 1.7))))
    ),
    dataSource: "GeoAstra generated illustrative demo curve",
  };
}

export function SpectralComparison({ target }: { target: SpectralSignature | null }) {
  return (
    <Card variant="default">
      <div className="flex items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div><h3 className="text-sm font-semibold text-content-primary">Spectral comparison</h3><p className="mt-1 text-2xs text-content-muted">Illustrative comparison only · no scene spectrum was measured</p></div>
        <Badge variant="warning">DEMO CURVE</Badge>
      </div>
      <CardContent className="p-3">
        {target ? (
          <>
            <p className="mb-2 text-2xs text-content-secondary">Target: <strong>{target.name}</strong> · {target.wavelengthUnit} source convention · {target.reflectanceUnit}</p>
            <SpectralChart signatures={[target, createIllustrativeObservedSignature(target)]} height={300} />
          </>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded border border-border-subtle bg-surface-panel px-5 text-center">
            <p className="text-sm font-medium text-content-primary">No target spectrum for this algorithm</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-content-muted">
              RXD is configured as an unsupervised anomaly detector and has no target signature. This panel intentionally does not invent a target curve.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
