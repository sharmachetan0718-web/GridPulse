import { horizonHours } from "@/lib/gridpulse/optimizer";
import type { SchedulePlan } from "@/lib/gridpulse/types";
import { cn } from "@/lib/utils";
import { Moon, Sun, Sunset, Sunrise } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  charging: "bg-primary/80",
  recommended: "bg-accent/75",
  delayed: "bg-destructive/80",
  completed: "bg-success/70",
};

const TIME_GROUPS = [
  {
    label: "Morning",
    range: "00:00 – 06:00",
    start: 0,
    end: 6,
    icon: Sunrise,
    className: "bg-info/10 text-info",
  },
  {
    label: "Afternoon",
    range: "06:00 – 12:00",
    start: 6,
    end: 12,
    icon: Sun,
    className: "bg-warning/10 text-warning-foreground",
  },
  {
    label: "Evening",
    range: "12:00 – 18:00",
    start: 12,
    end: 18,
    icon: Sunset,
    className: "bg-accent/10 text-accent-foreground",
  },
  {
    label: "Night",
    range: "18:00 – 24:00",
    start: 18,
    end: 24,
    icon: Moon,
    className: "bg-primary/10 text-primary",
  },
] as const;

export function TimelineLegend() {
  const items = [
    { label: "Manual override", className: "bg-primary/80" },
    { label: "Recommended by GridPulse", className: "bg-accent/75" },
    { label: "Delayed / over capacity", className: "bg-destructive/80" },
    { label: "Completed", className: "bg-success/70" },
    { label: "Waiting", className: "bg-muted" },
    { label: "After departure", className: "bg-background border border-border" },
  ];

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded-sm", item.className)} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function ScheduleTimeline({
  plan,
  onToggleSlot,
  overrides,
  maxRows,
}: {
  plan: SchedulePlan;
  onToggleSlot?: (vehicleId: string, slot: number) => void;
  overrides?: Record<string, number[]>;
  maxRows?: number;
}) {
  const byVehicle = new Map<string, Map<number, { powerKw: number; status: string }>>();

  for (const block of plan.blocks) {
    const row = byVehicle.get(block.vehicleId) ?? new Map();
    row.set(block.slot, {
      powerKw: block.powerKw,
      status: block.status,
    });
    byVehicle.set(block.vehicleId, row);
  }

  // The optimizer internally uses an 18:00 → 17:00 horizon.
  // For people viewing the dashboard, show the day in normal clock order:
  // 00:00 → 23:00. The original slot index is preserved for all actions.
  const displaySlots = horizonHours
    .map((hour, slot) => ({ hour, slot }))
    .sort((a, b) => a.hour - b.hour);

  const rows = [...plan.plans]
    .sort((a, b) => a.vehicleId.localeCompare(b.vehicleId))
    .slice(0, maxRows ?? plan.plans.length);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1120px]">
        <div className="mb-2 grid grid-cols-[112px_repeat(24,minmax(0,1fr))] gap-[3px]">
          <span />

          {TIME_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div
                key={group.label}
                className={cn(
                  "col-span-6 flex items-center justify-center gap-2 rounded-md px-2 py-2",
                  group.className,
                )}
              >
                <Icon className="size-4" aria-hidden />
                <div className="text-center">
                  <div className="text-xs font-semibold">{group.label}</div>
                  <div className="text-[10px] opacity-80">{group.range}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-1 grid grid-cols-[112px_repeat(24,minmax(0,1fr))] gap-[3px]">
          <span className="label-caps">Vehicle</span>

          {displaySlots.map(({ hour, slot }) => (
            <span
              key={slot}
              className="numeric text-center text-[10px] text-muted-foreground"
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        <div className="space-y-[3px]">
          {rows.map((row) => {
            const cells = byVehicle.get(row.vehicleId);

            return (
              <div
                key={row.vehicleId}
                className="grid grid-cols-[112px_repeat(24,minmax(0,1fr))] items-center gap-[3px]"
              >
                <span className="numeric truncate text-xs text-foreground">
                  {row.vehicleId}
                  {!row.ready && (
                    <span
                      className="ml-1 text-destructive"
                      title="Not ready by departure"
                    >
                      !
                    </span>
                  )}
                </span>

                {displaySlots.map(({ hour, slot }) => {
                  const cell = cells?.get(slot);
                  const beyondDeadline = slot >= row.deadlineSlot;
                  const isOverride = overrides?.[row.vehicleId]?.includes(slot);

                  const title = isOverride
                    ? `${row.vehicleId} · ${String(hour).padStart(
                        2,
                        "0",
                      )}:00 · Manual charging override — GridPulse will re-plan the remaining fleet`
                    : `${row.vehicleId} · ${String(hour).padStart(2, "0")}:00 · ${
                        cell
                          ? `${cell.powerKw.toFixed(0)} kW ${cell.status}`
                          : beyondDeadline
                            ? "after departure"
                            : "idle"
                      }`;

                  const className = cn(
                    "h-7 rounded-md border transition-colors",
                    cell
                      ? (STATUS_STYLE[cell.status] ?? "bg-primary/70")
                      : beyondDeadline
                        ? "bg-background border-border/70"
                        : "bg-muted/70 border-transparent",
                    isOverride && "ring-2 ring-warning ring-offset-0",
                    onToggleSlot && "cursor-pointer hover:brightness-105",
                  );

                  return onToggleSlot ? (
                    <button
                      key={slot}
                      type="button"
                      title={title}
                      aria-label={title}
                      className={cn(
                        className,
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      )}
                      onClick={() => onToggleSlot(row.vehicleId, slot)}
                    />
                  ) : (
                    <div key={slot} title={title} className={className} />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
