import { HORIZON_START_HOUR, slotToHour } from "./optimizer";
import type { OptimizationResult, SchedulePlan } from "./types";

/** Analytics layer: before/after comparison and recommendation copy. */

export interface Delta {
  key: string;
  label: string;
  unit: string;
  before: number;
  after: number;
  /** Positive = improvement, regardless of direction. */
  improvementPct: number;
  direction: "down-is-good" | "up-is-good";
}

const pctChange = (before: number, after: number) =>
  before === 0 ? 0 : Math.round(((before - after) / before) * 1000) / 10;

export function buildDeltas(result: OptimizationResult): Delta[] {
  const b = result.baseline.metrics;
  const a = result.optimized.metrics;

  return [
    {
      key: "peak",
      label: "Peak demand",
      unit: "kW",
      before: b.peakKw,
      after: a.peakKw,
      improvementPct: pctChange(b.peakKw, a.peakKw),
      direction: "down-is-good",
    },
    {
      key: "cost",
      label: "Charging cost",
      unit: "INR",
      before: b.costTotal,
      after: a.costTotal,
      improvementPct: pctChange(b.costTotal, a.costTotal),
      direction: "down-is-good",
    },
    {
      key: "co2",
      label: "CO₂ emissions",
      unit: "kg",
      before: b.co2Kg,
      after: a.co2Kg,
      improvementPct: pctChange(b.co2Kg, a.co2Kg),
      direction: "down-is-good",
    },
    {
      key: "renewable",
      label: "Renewable utilization",
      unit: "%",
      before: b.renewableUtilization,
      after: a.renewableUtilization,
      improvementPct: a.renewableUtilization - b.renewableUtilization,
      direction: "up-is-good",
    },
    {
      key: "readiness",
      label: "Vehicles ready on time",
      unit: "%",
      before: b.readinessPct,
      after: a.readinessPct,
      improvementPct: a.readinessPct - b.readinessPct,
      direction: "up-is-good",
    },
  ];
}

const PEAK_HOURS = [18, 19, 20];

/** How much load the optimizer moved out of the evening peak window. */
export function peakShift(result: OptimizationResult) {
  const inPeak = (plan: SchedulePlan) =>
    plan.blocks.filter((block) => PEAK_HOURS.includes(block.hour));

  const baselinePeakBlocks = inPeak(result.baseline);
  const optimizedPeakBlocks = inPeak(result.optimized);
  const baselineVehicles = new Set(baselinePeakBlocks.map((block) => block.vehicleId));
  const optimizedVehicles = new Set(optimizedPeakBlocks.map((block) => block.vehicleId));
  const shifted = [...baselineVehicles].filter((id) => !optimizedVehicles.has(id));

  const targetHours = new Set(
    result.optimized.blocks
      .filter((block) => shifted.includes(block.vehicleId))
      .map((block) => block.hour),
  );
  const sortedTargets = [...targetHours].sort(
    (x, y) => ((x - HORIZON_START_HOUR + 24) % 24) - ((y - HORIZON_START_HOUR + 24) % 24),
  );

  const energyMoved =
    baselinePeakBlocks.reduce((sum, block) => sum + block.energyKwh, 0) -
    optimizedPeakBlocks.reduce((sum, block) => sum + block.energyKwh, 0);

  return {
    vehiclesShifted: shifted.length,
    energyMovedKwh: Math.round(energyMoved),
    fromWindow: "18:00–21:00",
    toWindow:
      sortedTargets.length > 0
        ? `${String(sortedTargets[0]).padStart(2, "0")}:00–${String(
            (sortedTargets[sortedTargets.length - 1]! + 1) % 24,
          ).padStart(2, "0")}:00`
        : "—",
  };
}

export function recommendationText(result: OptimizationResult): string {
  const shift = peakShift(result);
  if (shift.vehiclesShifted === 0) {
    return "Current conditions are already favourable — GridPulse keeps the fleet on its existing windows and trims power in the highest-stress hours.";
  }
  return `GridPulse recommends shifting ${shift.vehiclesShifted} vehicles from ${shift.fromWindow} to ${shift.toWindow}, moving ${shift.energyMovedKwh} kWh out of the evening peak.`;
}

/** Hourly series for load-vs-capacity charts, ordered by the planning horizon. */
export function loadSeries(result: OptimizationResult, gridLoadByHour: number[], capacity: number) {
  return result.horizonHours.map((hour, slot) => ({
    label: `${String(hour).padStart(2, "0")}:00`,
    hour,
    baseLoad: gridLoadByHour[hour] ?? 0,
    uncontrolled: Math.round(result.baseline.totalLoadBySlot[slot] ?? 0),
    optimized: Math.round(result.optimized.totalLoadBySlot[slot] ?? 0),
    evUncontrolled: Math.round(result.baseline.evLoadBySlot[slot] ?? 0),
    evOptimized: Math.round(result.optimized.evLoadBySlot[slot] ?? 0),
    capacity,
    slot,
    slotHour: slotToHour(slot),
  }));
}
