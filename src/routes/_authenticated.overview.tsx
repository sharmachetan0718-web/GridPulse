import { createFileRoute } from "@tanstack/react-router";
import {
  BatteryCharging,
  CircleDollarSign,
  Cloud,
  Gauge,
  Leaf,
  Percent,
  TriangleAlert,
  Truck,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/gridpulse/app-shell";
import {
  CarbonChart,
  GridLoadChart,
  RenewableChart,
} from "@/components/gridpulse/charts";
import { KpiCard, Panel } from "@/components/gridpulse/primitives";
import {
  ScheduleTimeline,
  TimelineLegend,
} from "@/components/gridpulse/schedule-timeline";
import { Button } from "@/components/ui/button";
import {
  buildDeltas,
  loadSeries,
  recommendationText,
} from "@/lib/gridpulse/analytics";
import { useGridPulse } from "@/lib/gridpulse/context";
import { stressLevel } from "@/lib/gridpulse/simulation";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [
      { title: "GridPulse — Overview" },
      {
        name: "description",
        content:
          "A simple view of your EV fleet, electricity conditions and the best times to charge.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const {
    vehicles,
    grid,
    result,
    capacityKw,
    isSaving,
    runOptimization,
    overrides,
    toggleOverride,
  } = useGridPulse();

  const hour = new Date().getHours();
  const current = grid[hour] ?? grid[0]!;
  const stress = stressLevel(current.stressIndex);

  const deltas = buildDeltas(result);

  const series = loadSeries(
    result,
    grid.map((g) => g.gridLoadKw),
    capacityKw,
  );

  const charging = result.optimized.blocks.filter(
    (b) => b.slot === 0,
  ).length;

  const ready = result.optimized.plans.filter(
    (plan) => plan.ready,
  ).length;

  const delayed = result.optimized.plans.filter(
    (plan) => !plan.ready,
  ).length;

  const scheduled = Math.max(
    0,
    vehicles.length - charging - ready,
  );

  const avgSoc = vehicles.length
    ? Math.round(
        vehicles.reduce(
          (sum, vehicle) => sum + vehicle.current_soc,
          0,
        ) / vehicles.length,
      )
    : 0;

  const utilization = Math.round(
    ((current.gridLoadKw +
      (result.optimized.evLoadBySlot[0] ?? 0)) /
      capacityKw) *
      100,
  );

  const peakRisk = Math.round(
    (result.optimized.metrics.peakKw / capacityKw) * 100,
  );

  const inr = (value: number) =>
    `₹${Math.round(value).toLocaleString("en-IN")}`;

  return (
    <AppShell
      title="Overview"
      subtitle="See your fleet, understand the grid and find the best time to charge."
      actions={
        <Button onClick={runOptimization} disabled={isSaving}>
          <Zap className="mr-2 size-4" />
          {isSaving ? "Finding best plan…" : "Find best charging plan"}
        </Button>
      }
    >
      {/* Simple status message */}
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label-caps text-primary">
              Today's charging plan
            </p>

            <h2 className="mt-2 font-display text-2xl font-semibold">
              {stress.label === "High"
                ? "The grid is busy right now."
                : "Your fleet is running normally."}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              GridPulse checks your vehicles and the electricity grid,
              then finds better times to charge without making vehicles
              miss their departure times.
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-border bg-secondary/50 px-5 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              Grid stress
            </p>

            <p className="numeric mt-1 text-3xl font-semibold">
              {current.stressIndex}
              <span className="text-sm text-muted-foreground">
                /100
              </span>
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {stress.label}
            </p>
          </div>
        </div>
      </section>

      {/* Fleet overview */}
      <section className="mt-4">
        <div className="mb-3">
          <p className="label-caps">Your fleet</p>

          <h2 className="mt-1 font-display text-xl font-semibold">
            What is happening right now?
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Vehicles"
            value={vehicles.length}
            unit="EVs"
            icon={Truck}
            hint="Vehicles in your fleet"
          />

          <KpiCard
            label="Charging now"
            value={charging}
            unit="vehicles"
            tone="primary"
            icon={BatteryCharging}
            hint={`${scheduled} scheduled for later`}
          />

          <KpiCard
            label="Ready"
            value={ready}
            unit="vehicles"
            tone="success"
            icon={Truck}
            hint="Ready for their next trip"
          />

          <KpiCard
            label="Average battery"
            value={avgSoc}
            unit="%"
            icon={Percent}
            hint="Average battery level"
          />
        </div>
      </section>

      {/* Grid overview */}
      <section className="mt-6">
        <div className="mb-3">
          <p className="label-caps">Electricity</p>

          <h2 className="mt-1 font-display text-xl font-semibold">
            Is this a good time to charge?
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            GridPulse uses these conditions to choose better charging
            times.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Grid load"
            value={current.gridLoadKw.toLocaleString("en-IN")}
            unit="kW"
            icon={Gauge}
            hint={`${utilization}% of ${capacityKw.toLocaleString("en-IN")} kW capacity`}
          />

          <KpiCard
            label="Clean energy"
            value={current.renewablePercentage}
            unit="%"
            tone="success"
            icon={Leaf}
            hint="Renewable energy available"
          />

          <KpiCard
            label="Electricity price"
            value={`₹${current.electricityPrice.toFixed(2)}`}
            unit="/ kWh"
            tone="accent"
            icon={CircleDollarSign}
            hint="Current simulated price"
          />

          <KpiCard
            label="CO₂ intensity"
            value={current.carbonIntensity}
            unit="g/kWh"
            icon={Cloud}
            hint="Lower means cleaner electricity"
          />
        </div>
      </section>

      {/* Best charging times */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Panel
          title="Best times to charge"
          description="Simple recommendations based on price, clean energy and grid pressure."
        >
          <div className="space-y-3">
            <WindowRow
              time="6:00 PM – 7:00 PM"
              status="Avoid"
              reason="Grid is busy and electricity is expensive."
              tone="pastel-blush"
            />

            <WindowRow
              time="8:00 PM – 10:00 PM"
              status="Best time"
              reason="Lower price, cleaner energy and more grid capacity."
              tone="pastel-olive"
            />

            <WindowRow
              time="11:00 PM – 1:00 AM"
              status="Good time"
              reason="Low grid pressure and lower demand."
              tone="pastel-lavender"
            />

            <WindowRow
              time="6:00 AM – 8:00 AM"
              status="Good time"
              reason="Low demand with improving renewable supply."
              tone="pastel-warm"
            />
          </div>
        </Panel>

        <Panel
          title="Fleet readiness"
          description="Can your vehicles be ready when you need them?"
        >
          <div className="grid grid-cols-2 gap-3">
            <Readiness
              label="Ready"
              value={ready}
              tone="text-success"
            />

            <Readiness
              label="Charging"
              value={charging}
              tone="text-primary"
            />

            <Readiness
              label="Scheduled"
              value={scheduled}
              tone="text-accent"
            />

            <Readiness
              label="Delayed"
              value={delayed}
              tone="text-warning"
            />
          </div>

          <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Peak capacity used
              </span>

              <span className="numeric text-sm font-semibold">
                {peakRisk}%
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, peakRisk)}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              GridPulse keeps charging below the available grid
              capacity whenever possible.
            </p>
          </div>
        </Panel>
      </div>

      {/* Main grid chart */}
      <div className="mt-4">
        <Panel
          title="Electricity through the day"
          description="See how grid pressure changes from morning to night."
        >
          <GridLoadChart
            data={series}
            capacity={capacityKw}
          />
        </Panel>
      </div>

      {/* Other grid information */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel
          title="How clean is the electricity?"
          description="Lower carbon intensity means cleaner electricity."
        >
          <CarbonChart data={grid} />
        </Panel>

        <Panel
          title="Renewable energy"
          description="See when solar and wind energy are available."
        >
          <RenewableChart data={grid} />
        </Panel>
      </div>

      {/* Optimization result */}
      <div className="mt-4">
        <Panel
          title="What GridPulse changed"
          description="Compare normal charging with the plan created by GridPulse."
        >
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <p className="text-sm leading-6 text-foreground">
              {recommendationText(result)}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {deltas.slice(0, 3).map((delta) => (
              <div
                key={delta.key}
                className="rounded-lg border border-border bg-background/50 p-4"
              >
                <p className="text-xs text-muted-foreground">
                  {delta.label}
                </p>

                <p className="numeric mt-2 text-2xl font-semibold text-primary">
                  ↓ {Math.max(0, delta.improvementPct)}%
                </p>

                <p className="numeric mt-1 text-xs text-muted-foreground">
                  {Math.round(delta.before).toLocaleString("en-IN")}{" "}
                  →{" "}
                  {Math.round(delta.after).toLocaleString("en-IN")}{" "}
                  {delta.unit}
                </p>
              </div>
            ))}
          </div>

          {result.conflicts.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-2">
                <TriangleAlert className="size-4 text-warning" />

                <p className="text-sm font-medium">
                  A few vehicles need attention
                </p>
              </div>

              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {result.conflicts.slice(0, 4).map((conflict) => (
                  <li key={conflict}>• {conflict}</li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* Schedule */}
      <div className="mt-4">
        <Panel
          title="When will each vehicle charge?"
          description="This is the plan created for your fleet. Click a time slot if you want to manually change a vehicle's charging time."
          actions={<TimelineLegend />}
        >
          <ScheduleTimeline
            plan={result.optimized}
            overrides={overrides}
            onToggleSlot={toggleOverride}
            maxRows={12}
          />
        </Panel>
      </div>

      {/* Footer explanation */}
      <section className="mt-6 rounded-lg border border-border bg-secondary/30 p-5">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 size-5 shrink-0 text-primary" />

          <div>
            <h3 className="font-display font-semibold">
              In simple words
            </h3>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              GridPulse checks when your vehicles need to be ready and
              when electricity is cheap, clean and available. It then
              moves flexible charging to those better times while making
              sure your vehicles are ready for departure.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function WindowRow({
  time,
  status,
  reason,
  tone,
}: {
  time: string;
  status: string;
  reason: string;
  tone: string;
}) {
  return (
    <div
      className={`${tone} flex flex-col gap-1 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4`}
    >
      <div className="min-w-44">
        <p className="numeric text-sm font-semibold">
          {time}
        </p>
      </div>

      <div className="min-w-24 text-sm font-medium">
        {status}
      </div>

      <p className="flex-1 text-xs leading-5 text-muted-foreground">
        {reason}
      </p>
    </div>
  );
}

function Readiness({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p
        className={`numeric mt-1 text-2xl font-semibold ${tone}`}
      >
        {value}
      </p>
    </div>
  );
}