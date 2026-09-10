import type {
  GridHour,
  OptimizationResult,
  OptimizationWeights,
  PlanMetrics,
  ScheduleBlock,
  SchedulePlan,
  Vehicle,
  VehiclePlan,
} from "./types";

/**
 * Optimization engine.
 *
 * Deterministic constrained heuristic: vehicles are scheduled in order of
 * tightest slack, each one greedily filling the cheapest feasible slots
 * according to a weighted objective built from price, carbon intensity,
 * renewable share and remaining grid headroom.
 *
 * OBJECTIVE = cost·price + carbon·gCO2 + peak·loadRatio - renewable·share
 *             + readiness·missedDeadlines
 */

export const HORIZON_START_HOUR = 18;
export const HORIZON_SLOTS = 24;

export const DEFAULT_WEIGHTS: OptimizationWeights = {
  cost: 1,
  carbon: 1,
  peak: 1,
  renewable: 0.8,
  readiness: 3,
};

export const horizonHours = Array.from(
  { length: HORIZON_SLOTS },
  (_, slot) => (HORIZON_START_HOUR + slot) % 24,
);

export function slotToHour(slot: number): number {
  return (HORIZON_START_HOUR + slot) % 24;
}

export function formatSlotLabel(slot: number): string {
  return `${String(slotToHour(slot)).padStart(2, "0")}:00`;
}

function parseHour(time: string): number {
  const [h] = time.split(":");
  const parsed = Number.parseInt(h ?? "7", 10);
  return Number.isFinite(parsed) ? ((parsed % 24) + 24) % 24 : 7;
}

/** Deadline expressed as a horizon slot index (exclusive upper bound). */
export function deadlineSlot(vehicle: Vehicle): number {
  const hour = parseHour(vehicle.departure_time);
  const slot = (hour - HORIZON_START_HOUR + 24) % 24;
  return slot === 0 ? HORIZON_SLOTS : slot;
}

/** Deterministic arrival spread so uncontrolled charging looks realistic. */
export function arrivalSlot(vehicle: Vehicle): number {
  const digits = vehicle.vehicle_id.replace(/\D/g, "");
  const n = Number.parseInt(digits || "1", 10);
  return n % 3;
}

export function requiredEnergy(vehicle: Vehicle): number {
  const delta = Math.max(0, vehicle.target_soc - vehicle.current_soc);
  return (vehicle.battery_capacity_kwh * delta) / 100;
}

export function chargerLimit(vehicle: Vehicle, chargerPowerById: Map<string, number>): number {
  const chargerPower = vehicle.charger_id
    ? chargerPowerById.get(vehicle.charger_id)
    : undefined;
  return Math.min(vehicle.max_charging_power_kw, chargerPower ?? vehicle.max_charging_power_kw);
}

interface EngineInput {
  vehicles: Vehicle[];
  grid: GridHour[];
  weights: OptimizationWeights;
  chargerPowerById?: Map<string, number>;
  /** Optional capacity override (kW) from the optimization control panel. */
  capacityKw?: number;
  /** Manual slot overrides: vehicleId -> forced set of horizon slots. */
  overrides?: Record<string, number[]>;
}

function normalize(values: number[]): (value: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return (value: number) => (value - min) / span;
}

function computeMetrics(
  blocks: ScheduleBlock[],
  plans: VehiclePlan[],
  grid: GridHour[],
  capacityKw: number,
  weights: OptimizationWeights,
  label: string,
): SchedulePlan {
  const evLoadBySlot = new Array<number>(HORIZON_SLOTS).fill(0);
  let costTotal = 0;
  let co2Kg = 0;
  let energyKwh = 0;
  let renewableEnergy = 0;

  for (const block of blocks) {
    const hour = grid[block.hour]!;
    evLoadBySlot[block.slot] = (evLoadBySlot[block.slot] ?? 0) + block.powerKw;
    costTotal += block.energyKwh * hour.electricityPrice;
    co2Kg += (block.energyKwh * hour.carbonIntensity) / 1000;
    energyKwh += block.energyKwh;
    renewableEnergy += (block.energyKwh * hour.renewablePercentage) / 100;
  }

  const totalLoadBySlot = evLoadBySlot.map(
    (ev, slot) => ev + grid[slotToHour(slot)]!.gridLoadKw,
  );
  const peakKw = Math.max(...totalLoadBySlot);
  const capacityBreaches = totalLoadBySlot.filter((load) => load > capacityKw).length;
  const vehiclesReady = plans.filter((plan) => plan.ready).length;
  const missed = plans.length - vehiclesReady;

  const metrics: PlanMetrics = {
    peakKw: Math.round(peakKw),
    costTotal: Math.round(costTotal),
    co2Kg: Math.round(co2Kg),
    energyKwh: Math.round(energyKwh),
    renewableUtilization:
      energyKwh > 0 ? Math.round((renewableEnergy / energyKwh) * 100) : 0,
    vehiclesReady,
    vehiclesTotal: plans.length,
    readinessPct: plans.length ? Math.round((vehiclesReady / plans.length) * 100) : 100,
    capacityBreaches,
    objectiveScore: Math.round(
      weights.cost * (costTotal / 1000) +
        weights.carbon * (co2Kg / 100) +
        weights.peak * (peakKw / 100) -
        weights.renewable * (renewableEnergy / 100) +
        weights.readiness * missed,
    ),
  };

  return { label, blocks, plans, evLoadBySlot, totalLoadBySlot, metrics };
}

/** Uncontrolled charging: every vehicle charges at full power the moment it plugs in. */
function buildBaseline(input: EngineInput, capacityKw: number): SchedulePlan {
  const chargerPowerById = input.chargerPowerById ?? new Map<string, number>();
  const blocks: ScheduleBlock[] = [];
  const plans: VehiclePlan[] = [];

  for (const vehicle of input.vehicles) {
    const need = requiredEnergy(vehicle);
    const power = chargerLimit(vehicle, chargerPowerById);
    const deadline = deadlineSlot(vehicle);
    let remaining = need;
    let delivered = 0;

    for (
      let slot = arrivalSlot(vehicle);
      slot < deadline && remaining > 0.01;
      slot++
    ) {
      const powerKw = Math.min(power, remaining);
      blocks.push({
        vehicleId: vehicle.vehicle_id,
        slot,
        hour: slotToHour(slot),
        powerKw,
        energyKwh: powerKw,
        status: "charging",
      });
      remaining -= powerKw;
      delivered += powerKw;
    }

    plans.push({
      vehicleId: vehicle.vehicle_id,
      vehicleType: vehicle.vehicle_type,
      requiredEnergyKwh: Math.round(need * 10) / 10,
      deliveredEnergyKwh: Math.round(delivered * 10) / 10,
      deadlineSlot: deadline,
      ready: remaining <= 0.5,
      shortfallKwh: Math.round(Math.max(0, remaining) * 10) / 10,
      finalSoc: Math.min(
        100,
        Math.round(
          vehicle.current_soc +
            (delivered / vehicle.battery_capacity_kwh) * 100,
        ),
      ),
    });
  }

  return computeMetrics(
    blocks,
    plans,
    input.grid,
    capacityKw,
    input.weights,
    "Uncontrolled",
  );
}

/** Carbon-, cost- and peak-aware scheduling under readiness and capacity constraints. */
function buildOptimized(input: EngineInput, capacityKw: number): SchedulePlan {
  const { grid, weights } = input;
  const chargerPowerById = input.chargerPowerById ?? new Map<string, number>();

  const priceOf = normalize(grid.map((h) => h.electricityPrice));
  const carbonOf = normalize(grid.map((h) => h.carbonIntensity));
  const renewableOf = normalize(grid.map((h) => h.renewablePercentage));

  const committed = new Array<number>(HORIZON_SLOTS).fill(0);
  const blocks: ScheduleBlock[] = [];
  const plans: VehiclePlan[] = [];

  // Tightest slack first: least schedulable freedom gets first pick.
  const ordered = [...input.vehicles].sort((a, b) => {
    const slackA =
      deadlineSlot(a) -
      arrivalSlot(a) -
      requiredEnergy(a) / Math.max(1, chargerLimit(a, chargerPowerById));
    const slackB =
      deadlineSlot(b) -
      arrivalSlot(b) -
      requiredEnergy(b) / Math.max(1, chargerLimit(b, chargerPowerById));
    if (slackA !== slackB) return slackA - slackB;
    return a.priority - b.priority;
  });

  for (const vehicle of ordered) {
    const need = requiredEnergy(vehicle);
    const power = chargerLimit(vehicle, chargerPowerById);
    const deadline = deadlineSlot(vehicle);
    const start = arrivalSlot(vehicle);
    const forced = input.overrides?.[vehicle.vehicle_id];

    let remaining = need;
    let delivered = 0;
    const used = new Set<number>();

    // Manual overrides are treated as operator requests, but they must still
    // respect the vehicle's arrival/departure window. This prevents a user
    // from scheduling an EV after it has already departed or before it arrives.
    for (const slot of forced ?? []) {
      if (
        slot < start ||
        slot >= deadline ||
        slot < 0 ||
        slot >= HORIZON_SLOTS ||
        remaining <= 0.01
      ) {
        continue;
      }

      const powerKw = Math.min(power, remaining);
      committed[slot] = (committed[slot] ?? 0) + powerKw;

      blocks.push({
        vehicleId: vehicle.vehicle_id,
        slot,
        hour: slotToHour(slot),
        powerKw,
        energyKwh: powerKw,
        // Manual override is intentionally represented as charging because
        // this slot is explicitly requested by the operator.
        status: "charging",
      });

      used.add(slot);
      remaining -= powerKw;
      delivered += powerKw;
    }

    let guard = 0;
    while (remaining > 0.01 && guard++ < HORIZON_SLOTS) {
      let bestSlot = -1;
      let bestScore = Number.POSITIVE_INFINITY;
      let bestPower = 0;

      for (let slot = start; slot < deadline; slot++) {
        if (used.has(slot)) continue;

        const hour = grid[slotToHour(slot)]!;
        const baseLoad = hour.gridLoadKw + (committed[slot] ?? 0);
        const headroom = capacityKw - baseLoad;
        if (headroom <= 0.5) continue;

        const powerKw = Math.min(power, remaining, headroom);
        if (powerKw <= 0.5) continue;

        const loadRatio = (baseLoad + powerKw) / capacityKw;
        const score =
          weights.cost * priceOf(hour.electricityPrice) +
          weights.carbon * carbonOf(hour.carbonIntensity) +
          weights.peak * loadRatio ** 3 * 2 -
          weights.renewable * renewableOf(hour.renewablePercentage);

        if (score < bestScore) {
          bestScore = score;
          bestSlot = slot;
          bestPower = powerKw;
        }
      }

      // Readiness dominates: if no headroom-safe slot exists, take the least
      // stressed feasible slot anyway rather than miss a departure.
      if (bestSlot < 0) {
        for (let slot = start; slot < deadline; slot++) {
          if (used.has(slot)) continue;

          const hour = grid[slotToHour(slot)]!;
          const load = hour.gridLoadKw + (committed[slot] ?? 0);
          const score =
            load / capacityKw + weights.carbon * carbonOf(hour.carbonIntensity);

          if (score < bestScore) {
            bestScore = score;
            bestSlot = slot;
            bestPower = Math.min(power, remaining);
          }
        }
      }

      if (bestSlot < 0) break;

      committed[bestSlot] = (committed[bestSlot] ?? 0) + bestPower;
      blocks.push({
        vehicleId: vehicle.vehicle_id,
        slot: bestSlot,
        hour: slotToHour(bestSlot),
        powerKw: bestPower,
        energyKwh: bestPower,
        status: "recommended",
      });

      used.add(bestSlot);
      remaining -= bestPower;
      delivered += bestPower;
    }

    const ready = remaining <= 0.5;
    const hoursAvailable = deadline - start;

    plans.push({
      vehicleId: vehicle.vehicle_id,
      vehicleType: vehicle.vehicle_type,
      requiredEnergyKwh: Math.round(need * 10) / 10,
      deliveredEnergyKwh: Math.round(delivered * 10) / 10,
      deadlineSlot: deadline,
      ready,
      shortfallKwh: Math.round(Math.max(0, remaining) * 10) / 10,
      finalSoc: Math.min(
        100,
        Math.round(
          vehicle.current_soc +
            (delivered / vehicle.battery_capacity_kwh) * 100,
        ),
      ),
      ...(ready
        ? {}
        : {
            conflict: `${vehicle.vehicle_id} needs ${need.toFixed(
              0,
            )} kWh before ${vehicle.departure_time} but only ${hoursAvailable} h × ${power} kW (${(
              hoursAvailable * power
            ).toFixed(0)} kWh) are physically available.`,
          }),
    });
  }

  const plan = computeMetrics(
    blocks,
    plans,
    grid,
    capacityKw,
    weights,
    "GridPulse optimized",
  );

  // Mark blocks that still sit in a high-stress hour so the UI can show them.
  for (const block of plan.blocks) {
    if (plan.totalLoadBySlot[block.slot]! > capacityKw) {
      block.status = "delayed";
    }
  }

  return plan;
}

export function optimize(input: EngineInput): OptimizationResult {
  const capacityKw =
    input.capacityKw ?? input.grid[0]?.gridCapacityKw ?? 2200;
  const grid = input.grid.map((hour) => ({
    ...hour,
    gridCapacityKw: capacityKw,
  }));
  const engineInput: EngineInput = { ...input, grid };

  const baseline = buildBaseline(engineInput, capacityKw);
  const optimized = buildOptimized(engineInput, capacityKw);

  return {
    baseline,
    optimized,
    weights: input.weights,
    horizonHours,
    conflicts: optimized.plans
      .map((plan) => plan.conflict)
      .filter((conflict): conflict is string => Boolean(conflict)),
  };
}
