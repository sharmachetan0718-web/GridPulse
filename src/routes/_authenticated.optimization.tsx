import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/gridpulse/app-shell";
import { GridLoadChart } from "@/components/gridpulse/charts";
import { DeltaStat, KpiCard, Panel } from "@/components/gridpulse/primitives";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { buildDeltas, loadSeries, recommendationText } from "@/lib/gridpulse/analytics";
import { useGridPulse } from "@/lib/gridpulse/context";
import { DEFAULT_WEIGHTS } from "@/lib/gridpulse/optimizer";
import type { OptimizationWeights } from "@/lib/gridpulse/types";

export const Route = createFileRoute("/_authenticated/optimization")({
  head: () => ({
    meta: [
      { title: "Optimization Engine — GridPulse" },
      {
        name: "description",
        content:
          "Tune cost, carbon, peak, renewable and readiness weights, then run the deterministic GridPulse charging optimizer.",
      },
      { property: "og:title", content: "Optimization Engine — GridPulse" },
      {
        property: "og:description",
        content: "Weighted multi-objective EV charging optimization with hard feasibility constraints.",
      },
    ],
  }),
  component: OptimizationPage,
});

const WEIGHT_FIELDS: { key: keyof OptimizationWeights; label: string; hint: string }[] = [
  { key: "cost", label: "Cost minimization", hint: "Favour low-price hours" },
  { key: "carbon", label: "Carbon minimization", hint: "Favour low carbon intensity" },
  { key: "peak", label: "Peak demand minimization", hint: "Protect grid headroom" },
  { key: "renewable", label: "Renewable utilization", hint: "Favour solar/wind-rich hours" },
  { key: "readiness", label: "Vehicle readiness", hint: "Penalty for missed departures" },
];

function OptimizationPage() {
  const {
    weights,
    setWeights,
    capacityKw,
    setCapacityKw,
    loadFactor,
    setLoadFactor,
    result,
    grid,
    vehicles,
    chargers,
    runOptimization,
    isSaving,
    lastRunAt,
  } = useGridPulse();

  const deltas = buildDeltas(result);
  const series = loadSeries(
    result,
    grid.map((g) => g.gridLoadKw),
    capacityKw,
  );
  const hour = new Date().getHours();
  const current = grid[hour] ?? grid[0]!;
  const avgSoc = vehicles.length
    ? Math.round(vehicles.reduce((sum, v) => sum + v.current_soc, 0) / vehicles.length)
    : 0;

  return (
    <AppShell
      title="Optimization engine"
      subtitle="Deterministic slack-ordered scheduling under charger, battery, deadline and grid-capacity constraints."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
            Reset weights
          </Button>
          <Button onClick={runOptimization} disabled={isSaving}>
            {isSaving ? "Optimizing…" : "Optimize charging"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel title="Objective weights" description="Higher weight = stronger influence on slot scoring.">
            <div className="space-y-5">
              {WEIGHT_FIELDS.map((field) => (
                <div key={field.key}>
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor={`w-${field.key}`}>{field.label}</Label>
                    <span className="numeric text-sm text-primary">
                      {weights[field.key].toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id={`w-${field.key}`}
                    className="mt-2"
                    min={0}
                    max={2}
                    step={0.05}
                    value={[weights[field.key]]}
                    onValueChange={([value]) =>
                      setWeights({ ...weights, [field.key]: value ?? 0 })
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Grid inputs">
            <div className="space-y-5">
              <div>
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="capacity">Grid capacity</Label>
                  <span className="numeric text-sm text-foreground">
                    {capacityKw.toLocaleString("en-IN")} kW
                  </span>
                </div>
                <Slider
                  id="capacity"
                  className="mt-2"
                  min={1200}
                  max={4000}
                  step={50}
                  value={[capacityKw]}
                  onValueChange={([value]) => setCapacityKw(value ?? capacityKw)}
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="load">Baseline load factor</Label>
                  <span className="numeric text-sm text-foreground">
                    {Math.round(loadFactor * 100)}%
                  </span>
                </div>
                <Slider
                  id="load"
                  className="mt-2"
                  min={0.6}
                  max={1.6}
                  step={0.05}
                  value={[loadFactor]}
                  onValueChange={([value]) => setLoadFactor(value ?? loadFactor)}
                />
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Fleet size" value={vehicles.length} unit="EVs" />
            <KpiCard label="Chargers" value={chargers.length} />
            <KpiCard label="Average SOC" value={avgSoc} unit="%" />
            <KpiCard
              label="Objective score"
              value={result.optimized.metrics.objectiveScore.toFixed(1)}
              tone="primary"
              hint={`Baseline ${result.baseline.metrics.objectiveScore.toFixed(1)}`}
            />
            <KpiCard label="Price now" value={`₹${current.electricityPrice.toFixed(2)}`} unit="/kWh" />
            <KpiCard label="Carbon now" value={current.carbonIntensity} unit="gCO₂/kWh" />
            <KpiCard label="Renewables now" value={current.renewablePercentage} unit="%" />
            <KpiCard
              label="Capacity breaches"
              value={result.optimized.metrics.capacityBreaches}
              tone={result.optimized.metrics.capacityBreaches > 0 ? "warning" : "success"}
              hint={`Baseline ${result.baseline.metrics.capacityBreaches}`}
            />
          </div>

          <Panel title="Optimization result" description={recommendationText(result)}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {deltas.map((delta) => (
                <DeltaStat
                  key={delta.key}
                  label={delta.label}
                  before={Math.round(delta.before).toLocaleString("en-IN")}
                  after={Math.round(delta.after).toLocaleString("en-IN")}
                  unit={delta.unit === "INR" ? "" : ` ${delta.unit}`}
                  changeLabel={
                    delta.direction === "down-is-good"
                      ? `${delta.improvementPct}% lower`
                      : `+${delta.improvementPct} points`
                  }
                  improved={delta.improvementPct >= 0}
                />
              ))}
            </div>
            {lastRunAt && (
              <p className="mt-4 text-xs text-muted-foreground">
                Last run saved at {lastRunAt.toLocaleTimeString()}.
              </p>
            )}
          </Panel>

          <Panel title="Load profile" description="Optimized profile against capacity and uncontrolled charging.">
            <GridLoadChart data={series} capacity={capacityKw} />
          </Panel>

          {result.conflicts.length > 0 && (
            <Panel title="Constraint conflicts" description="Readiness is prioritised when capacity-safe charging is impossible.">
              <ul className="space-y-1 text-sm text-warning">
                {result.conflicts.map((conflict) => (
                  <li key={conflict}>· {conflict}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </AppShell>
  );
}
