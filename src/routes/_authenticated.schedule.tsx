import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/gridpulse/app-shell";
import { GridLoadChart } from "@/components/gridpulse/charts";
import { Panel } from "@/components/gridpulse/primitives";
import { ScheduleTimeline, TimelineLegend } from "@/components/gridpulse/schedule-timeline";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadSeries } from "@/lib/gridpulse/analytics";
import { useGridPulse } from "@/lib/gridpulse/context";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Charging Schedule — GridPulse" },
      {
        name: "description",
        content:
          "Compare uncontrolled and GridPulse-optimized 24-hour charging schedules and override individual charging slots.",
      },
      { property: "og:title", content: "Charging Schedule — GridPulse" },
      {
        property: "og:description",
        content: "24-hour per-vehicle charging timeline with manual slot overrides.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { result, grid, capacityKw, overrides, toggleOverride, clearOverrides } = useGridPulse();
  const series = loadSeries(
    result,
    grid.map((g) => g.gridLoadKw),
    capacityKw,
  );
  const overrideCount = Object.values(overrides).reduce((sum, slots) => sum + slots.length, 0);

  return (
    <AppShell
      title="Charging schedule"
      subtitle="See when each EV is planned to charge across the day. GridPulse shifts charging toward cleaner, cheaper, lower-stress hours while keeping vehicles ready for departure."
      actions={
        <Button variant="outline" onClick={clearOverrides} disabled={overrideCount === 0}>
          Clear {overrideCount} override{overrideCount === 1 ? "" : "s"}
        </Button>
      }
    >
      <Tabs defaultValue="optimized">
        <TabsList>
          <TabsTrigger value="optimized">Optimized</TabsTrigger>
          <TabsTrigger value="current">Uncontrolled</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="optimized" className="mt-4">
          <Panel
            title="GridPulse optimized plan"
            description="Click a time slot to manually schedule charging. GridPulse will re-optimize the remaining fleet around your decision."
            actions={<TimelineLegend />}
          >
            <ScheduleTimeline
              plan={result.optimized}
              overrides={overrides}
              onToggleSlot={toggleOverride}
            />
          </Panel>
        </TabsContent>

        <TabsContent value="current" className="mt-4">
          <Panel
            title="Uncontrolled charging"
            description="Every vehicle charges at full power as soon as it plugs in."
            actions={<TimelineLegend />}
          >
            <ScheduleTimeline plan={result.baseline} />
          </Panel>
        </TabsContent>

        <TabsContent value="compare" className="mt-4 space-y-4">
          <Panel title="Load profile comparison">
            <GridLoadChart data={series} capacity={capacityKw} />
          </Panel>
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Uncontrolled" actions={<TimelineLegend />}>
              <ScheduleTimeline plan={result.baseline} maxRows={10} />
            </Panel>
            <Panel title="Optimized">
              <ScheduleTimeline plan={result.optimized} maxRows={10} />
            </Panel>
          </div>
        </TabsContent>
      </Tabs>

      {result.conflicts.length > 0 && (
        <Panel className="mt-4" title="Constraint conflicts">
          <ul className="space-y-1 text-sm text-warning">
            {result.conflicts.map((conflict) => (
              <li key={conflict}>· {conflict}</li>
            ))}
          </ul>
        </Panel>
      )}
    </AppShell>
  );
}
