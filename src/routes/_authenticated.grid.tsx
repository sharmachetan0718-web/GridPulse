import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/gridpulse/app-shell";
import { CarbonChart, RenewableChart } from "@/components/gridpulse/charts";
import { KpiCard, Panel } from "@/components/gridpulse/primitives";
import { StressGauge } from "@/components/gridpulse/stress-gauge";
import { useGridPulse } from "@/lib/gridpulse/context";
import { stressLevel } from "@/lib/gridpulse/simulation";

export const Route = createFileRoute("/_authenticated/grid")({
  head: () => ({
    meta: [
      { title: "Grid Intelligence — GridPulse" },
      {
        name: "description",
        content:
          "Grid load, capacity, utilization, renewable generation, carbon intensity, price and the 0–100 Grid Stress Index.",
      },
      { property: "og:title", content: "Grid Intelligence — GridPulse" },
      {
        property: "og:description",
        content: "Grid stress index, renewable generation and hourly carbon intensity.",
      },
    ],
  }),
  component: GridPage,
});

function GridPage() {
  const { grid, capacityKw, dataMode } = useGridPulse();
  const hour = new Date().getHours();
  const current = grid[hour] ?? grid[0]!;
  const peak = grid.reduce((max, g) => Math.max(max, g.gridLoadKw), 0);
  const utilization = Math.round((current.gridLoadKw / capacityKw) * 100);
  const level = stressLevel(current.stressIndex);

  return (
    <AppShell
      title="Grid intelligence"
      subtitle={
        dataMode === "simulation"
          ? "Simulated grid conditions — not a real-time utility feed."
          : "Live grid feed."
      }
    >
      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Panel title="Grid Stress Index">
          <StressGauge index={current.stressIndex} />
        </Panel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard label="Current grid load" value={current.gridLoadKw.toLocaleString("en-IN")} unit="kW" />
          <KpiCard label="Grid capacity" value={capacityKw.toLocaleString("en-IN")} unit="kW" />
          <KpiCard
            label="Grid utilization"
            value={utilization}
            unit="%"
            tone={utilization > 90 ? "destructive" : utilization > 75 ? "warning" : "primary"}
          />
          <KpiCard label="Renewable share" value={current.renewablePercentage} unit="%" tone="success" />
          <KpiCard label="Carbon intensity" value={current.carbonIntensity} unit="gCO₂/kWh" />
          <KpiCard
            label="Electricity price"
            value={`₹${current.electricityPrice.toFixed(2)}`}
            unit="/kWh"
            tone="accent"
          />
          <KpiCard label="Peak demand today" value={peak.toLocaleString("en-IN")} unit="kW" />
          <KpiCard label="Solar now" value={current.solarKw.toLocaleString("en-IN")} unit="kW" />
          <KpiCard label="Wind now" value={current.windKw.toLocaleString("en-IN")} unit="kW" />
        </div>
      </div>

      <Panel className="mt-4" title="What the grid score means" description="A simple operating signal for the selected scenario.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="pastel-olive rounded-lg border border-border/50 p-4">
            <p className="label-caps">Low stress</p>
            <p className="mt-1 text-sm font-medium">More headroom</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Good time to add flexible charging when price and carbon are also favourable.</p>
          </div>
          <div className="pastel-blush rounded-lg border border-border/50 p-4">
            <p className="label-caps">High stress</p>
            <p className="mt-1 text-sm font-medium">Protect capacity</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Move non-urgent charging away from the peak to avoid unnecessary feeder pressure.</p>
          </div>
          <div className="pastel-lavender rounded-lg border border-border/50 p-4">
            <p className="label-caps">Best window</p>
            <p className="mt-1 text-sm font-medium">Balance all four signals</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">GridPulse combines stress, price, carbon and renewable supply before choosing a slot.</p>
          </div>
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Carbon intensity & price" description="Hourly profile for the selected scenario.">
          <CarbonChart data={grid} />
        </Panel>
        <Panel title="Renewable generation" description="Solar and wind output by hour.">
          <RenewableChart data={grid} />
        </Panel>
      </div>

      <Panel className="mt-4" title="Stress bands">
        <p className="text-sm text-muted-foreground">
          Current level: <span className="font-medium text-foreground">{level.label}</span> at{" "}
          {current.stressIndex}/100. Bands: 0–30 Low, 31–60 Moderate, 61–80 High, 81–100 Critical.
        </p>
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-24 gap-1">
            {grid.map((g) => {
              const tone = stressLevel(g.stressIndex).tone;
              const color =
                tone === "destructive"
                  ? "bg-destructive"
                  : tone === "warning"
                    ? "bg-warning"
                    : tone === "accent"
                      ? "bg-accent"
                      : "bg-success";
              return (
                <div key={g.hour} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm ${color}`}
                    style={{ height: `${Math.max(6, g.stressIndex)}px` }}
                    title={`${String(g.hour).padStart(2, "0")}:00 · stress ${g.stressIndex}`}
                  />
                  <span className="numeric text-[10px] text-muted-foreground">
                    {g.hour % 2 === 0 ? String(g.hour).padStart(2, "0") : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
