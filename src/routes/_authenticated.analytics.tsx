import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/gridpulse/app-shell";
import { ComparisonBarChart } from "@/components/gridpulse/charts";
import { DeltaStat, Panel } from "@/components/gridpulse/primitives";
import { buildDeltas, peakShift } from "@/lib/gridpulse/analytics";
import { useGridPulse } from "@/lib/gridpulse/context";
import { fetchOptimizationRuns, fetchSessions } from "@/lib/gridpulse/db";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Optimization Analytics — GridPulse" },
      {
        name: "description",
        content:
          "Before-and-after analytics for peak demand, charging cost, CO₂, renewable utilization and fleet readiness.",
      },
      { property: "og:title", content: "Optimization Analytics — GridPulse" },
      {
        property: "og:description",
        content: "Quantified impact of GridPulse optimization on cost, carbon and peak demand.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { result } = useGridPulse();
  const deltas = buildDeltas(result);
  const shift = peakShift(result);
  const runsQuery = useQuery({ queryKey: ["optimization-runs"], queryFn: fetchOptimizationRuns });
  const sessionsQuery = useQuery({ queryKey: ["sessions"], queryFn: fetchSessions });

  const chartData = [
    { label: "Peak kW", before: result.baseline.metrics.peakKw, after: result.optimized.metrics.peakKw },
    {
      label: "Cost ₹",
      before: Math.round(result.baseline.metrics.costTotal),
      after: Math.round(result.optimized.metrics.costTotal),
    },
    {
      label: "CO₂ kg",
      before: Math.round(result.baseline.metrics.co2Kg),
      after: Math.round(result.optimized.metrics.co2Kg),
    },
    {
      label: "Renewable %",
      before: result.baseline.metrics.renewableUtilization,
      after: result.optimized.metrics.renewableUtilization,
    },
    {
      label: "Ready %",
      before: result.baseline.metrics.readinessPct,
      after: result.optimized.metrics.readinessPct,
    },
  ];

  return (
    <AppShell
      title="Analytics"
      subtitle={`Without vs with GridPulse — ${shift.vehiclesShifted} vehicles moved out of ${shift.fromWindow}, ${shift.energyMovedKwh} kWh reshaped.`}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {deltas.map((delta) => (
          <DeltaStat
            key={delta.key}
            label={delta.label}
            before={Math.round(delta.before).toLocaleString("en-IN")}
            after={Math.round(delta.after).toLocaleString("en-IN")}
            unit={delta.unit === "INR" ? "" : ` ${delta.unit}`}
            changeLabel={
              delta.direction === "down-is-good"
                ? `${delta.improvementPct}% reduction`
                : `+${delta.improvementPct} points`
            }
            improved={delta.improvementPct >= 0}
          />
        ))}
      </div>

      <Panel className="mt-4" title="Before vs after" description="Current scenario, current weights.">
        <ComparisonBarChart data={chartData} />
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Saved optimization runs" description="Persisted results from the Optimize action.">
          {runsQuery.data && runsQuery.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2">When</th>
                    <th className="py-2">Scenario</th>
                    <th className="py-2">Peak kW</th>
                    <th className="py-2">Cost ₹</th>
                    <th className="py-2">Ready %</th>
                  </tr>
                </thead>
                <tbody>
                  {runsQuery.data.map((run) => (
                    <tr key={run.id} className="border-t border-border/70">
                      <td className="numeric py-2">
                        {new Date(run.created_at as string).toLocaleString()}
                      </td>
                      <td className="py-2 capitalize">
                        {String(run.scenario_key).replace("_", " ")}
                      </td>
                      <td className="numeric py-2">
                        {Math.round(Number(run.peak_before_kw))} → {Math.round(Number(run.peak_after_kw))}
                      </td>
                      <td className="numeric py-2">
                        {Math.round(Number(run.cost_before))} → {Math.round(Number(run.cost_after))}
                      </td>
                      <td className="numeric py-2">{Math.round(Number(run.vehicles_ready))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No runs saved yet — press “Optimize charging” to store a run.
            </p>
          )}
        </Panel>

        <Panel title="Recent charging sessions" description="Historical energy, cost and emissions.">
          {sessionsQuery.data && sessionsQuery.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2">Vehicle</th>
                    <th className="py-2">Start</th>
                    <th className="py-2">kWh</th>
                    <th className="py-2">₹</th>
                    <th className="py-2">CO₂ kg</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionsQuery.data.map((session) => (
                    <tr key={session.id} className="border-t border-border/70">
                      <td className="numeric py-2">{session.vehicle_id}</td>
                      <td className="numeric py-2">
                        {new Date(session.start_time as string).toLocaleString()}
                      </td>
                      <td className="numeric py-2">{Math.round(Number(session.energy_kwh))}</td>
                      <td className="numeric py-2">{Math.round(Number(session.cost))}</td>
                      <td className="numeric py-2">{Number(session.co2_kg).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No charging history yet.</p>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
