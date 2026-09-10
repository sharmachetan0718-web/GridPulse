import { getCurrentUser, updateLocalProfile } from "./auth";
import type { Charger, OptimizationResult, ScenarioKey, Vehicle } from "./types";

/** Lightweight browser data store for the hackathon demo. No external backend is required. */
const VEHICLES_KEY = "gridpulse.local.vehicles.v1";
const CHARGERS_KEY = "gridpulse.local.chargers.v1";
const SESSIONS_KEY = "gridpulse.local.sessions.v1";
const RUNS_KEY = "gridpulse.local.runs.v1";

function makeId(prefix: string) {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

const vehicleTypes = ["Delivery Van", "Delivery Van", "Cargo Truck", "Electric Bus", "Campus Shuttle", "Delivery Van", "Cargo Truck"];
const capacities = [75, 75, 180, 320, 110, 60, 180];
const powers = [50, 50, 120, 150, 60, 22, 120];

function seedVehicles(): Vehicle[] {
  return Array.from({ length: 25 }, (_, index) => {
    const i = index + 1;
    const typeIndex = i % vehicleTypes.length;
    return {
      id: makeId("vehicle"),
      vehicle_id: `EV-${String(i).padStart(3, "0")}`,
      vehicle_type: vehicleTypes[typeIndex]!,
      battery_capacity_kwh: capacities[typeIndex]!,
      current_soc: 14 + ((i * 37) % 56),
      target_soc: i % 5 === 0 ? 100 : 90,
      max_charging_power_kw: powers[typeIndex]!,
      departure_time: `${String(5 + ((i * 3) % 6)).padStart(2, "0")}:${i % 2 === 0 ? "30" : "00"}`,
      priority: 1 + (i % 3),
      status: i % 6 === 0 ? "charging" : i % 4 === 0 ? "scheduled" : "waiting",
      charger_id: i <= 10 ? `CHG-${String(i).padStart(2, "0")}` : null,
    };
  });
}

function seedChargers(): Charger[] {
  return Array.from({ length: 10 }, (_, index) => {
    const i = index + 1;
    return {
      id: makeId("charger"),
      charger_id: `CHG-${String(i).padStart(2, "0")}`,
      max_power_kw: i <= 4 ? 150 : i <= 7 ? 60 : 22,
      location: i <= 5 ? "Depot A — North Yard" : i <= 8 ? "Depot B — Loading Bay" : "Campus Hub",
      status: i <= 7 ? "available" : "available",
    };
  });
}

function ensureSeeded() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(VEHICLES_KEY)) write(VEHICLES_KEY, seedVehicles());
  if (!localStorage.getItem(CHARGERS_KEY)) write(CHARGERS_KEY, seedChargers());
  if (!localStorage.getItem(SESSIONS_KEY)) {
    const sessions = Array.from({ length: 12 }, (_, index) => {
      const vehicle = `EV-${String((index % 12) + 1).padStart(3, "0")}`;
      const startHour = 18 + (index % 5);
      const energy = 18 + (index % 6) * 5;
      const price = 7.4 + (index % 4) * 0.35;
      return {
        id: makeId("session"),
        vehicle_id: vehicle,
        charger_id: `CHG-${String((index % 10) + 1).padStart(2, "0")}`,
        start_time: new Date(2026, 8, 8, startHour, 0).toISOString(),
        end_time: new Date(2026, 8, 8, startHour + 1, 0).toISOString(),
        energy_kwh: energy,
        cost: Math.round(energy * price),
        co2_kg: Math.round((energy * (320 + index * 8)) / 1000 * 10) / 10,
      };
    });
    write(SESSIONS_KEY, sessions);
  }
  if (!localStorage.getItem(RUNS_KEY)) write(RUNS_KEY, []);
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  ensureSeeded();
  return read<Vehicle[]>(VEHICLES_KEY, []).sort((a, b) => a.vehicle_id.localeCompare(b.vehicle_id));
}

export async function fetchChargers(): Promise<Charger[]> {
  ensureSeeded();
  return read<Charger[]>(CHARGERS_KEY, []).sort((a, b) => a.charger_id.localeCompare(b.charger_id));
}

export type VehicleInput = Omit<Vehicle, "id">;

export async function createVehicle(input: VehicleInput) {
  ensureSeeded();
  const vehicles = read<Vehicle[]>(VEHICLES_KEY, []);
  vehicles.push({ id: makeId("vehicle"), ...input });
  write(VEHICLES_KEY, vehicles);
}

export async function updateVehicle(id: string, input: Partial<VehicleInput>) {
  const vehicles = read<Vehicle[]>(VEHICLES_KEY, []);
  const index = vehicles.findIndex((vehicle) => vehicle.id === id);
  if (index < 0) throw new Error("Vehicle not found.");

  const currentVehicle = vehicles[index]!;
  const nextChargerId =
    input.charger_id !== undefined ? input.charger_id : currentVehicle.charger_id;

  // A physical charger can only be assigned to one EV at a time.
  // If this EV takes a charger already assigned to another EV, release it
  // from the previous EV automatically.
  if (nextChargerId) {
    for (let i = 0; i < vehicles.length; i++) {
      if (i === index) continue;

      if (vehicles[i]!.charger_id === nextChargerId) {
        vehicles[i]!.charger_id = null;
        if (vehicles[i]!.status === "charging" || vehicles[i]!.status === "scheduled") {
          vehicles[i]!.status = "waiting";
        }
      }
    }
  }

  vehicles[index] = {
    ...currentVehicle,
    ...input,
    charger_id: nextChargerId,
  };

  write(VEHICLES_KEY, vehicles);
}

export async function deleteVehicle(id: string) {
  write(VEHICLES_KEY, read<Vehicle[]>(VEHICLES_KEY, []).filter((vehicle) => vehicle.id !== id));
}

export async function fetchProfile() {
  return getCurrentUser();
}

export async function updateProfile(input: { full_name?: string; org_name?: string }) {
  return updateLocalProfile(input);
}

export async function fetchSessions() {
  ensureSeeded();
  return read<unknown[]>(SESSIONS_KEY, []);
}

export async function fetchOptimizationRuns() {
  ensureSeeded();
  return read<unknown[]>(RUNS_KEY, []);
}

export async function saveOptimizationRun(
  result: OptimizationResult,
  scenarioKey: ScenarioKey,
  capacityKw: number,
) {
  if (!getCurrentUser()) throw new Error("Not signed in");
  ensureSeeded();

  const before = result.baseline.metrics;
  const after = result.optimized.metrics;
  const runId = makeId("run");
  const runs = read<Record<string, unknown>[]>(RUNS_KEY, []);

  runs.unshift({
    id: runId,
    created_at: new Date().toISOString(),
    scenario_key: scenarioKey,
    peak_before_kw: before.peakKw,
    peak_after_kw: after.peakKw,
    cost_before: before.costTotal,
    cost_after: after.costTotal,
    co2_before: before.co2Kg,
    co2_after: after.co2Kg,
    renewable_before: before.renewableUtilization,
    renewable_after: after.renewableUtilization,
    vehicles_ready: after.readinessPct,
    vehicles_total: after.vehiclesTotal,
    algorithm_parameters: {
      weights: result.weights,
      capacity_kw: capacityKw,
      horizon_hours: result.horizonHours,
      engine: "deterministic-slack-greedy-v1",
    },
  });

  write(RUNS_KEY, runs.slice(0, 20));

  /*
   * result.optimized.blocks are hourly charging intervals, not individual
   * charging sessions. Keep those intervals intact for the optimizer, but
   * merge consecutive intervals for the Recent Charging Sessions history.
   */
  const sessions = read<Record<string, unknown>[]>(SESSIONS_KEY, []);

  const blocks = result.optimized.blocks
    .slice()
    .sort((a, b) => {
      if (a.vehicleId !== b.vehicleId) {
        return a.vehicleId.localeCompare(b.vehicleId);
      }
      return a.hour - b.hour;
    });

  type GroupedSession = {
    vehicleId: string;
    startHour: number;
    endHour: number;
    energyKwh: number;
  };

  const groupedSessions = new Map<string, GroupedSession>();

  for (const block of blocks) {
    const previous = groupedSessions.get(block.vehicleId);

    if (previous && previous.endHour === block.hour) {
      previous.endHour = block.hour + 1;
      previous.energyKwh += block.energyKwh;
    } else {
      // If there is a gap, this begins a new charging event.
      const uniqueKey = `${block.vehicleId}-${block.hour}`;
      groupedSessions.set(uniqueKey, {
        vehicleId: block.vehicleId,
        startHour: block.hour,
        endHour: block.hour + 1,
        energyKwh: block.energyKwh,
      });
    }
  }

  const newSessions = Array.from(groupedSessions.values()).map((session) => {
    const energy = Math.round(session.energyKwh * 10) / 10;
    const cost = Math.round(energy * 6.5);
    const co2 = Math.round((energy * 340) / 1000 * 10) / 10;

    return {
      id: makeId("session"),
      vehicle_id: session.vehicleId,
      charger_id: null,
      start_time: new Date(
        2026,
        8,
        9,
        session.startHour,
        0,
      ).toISOString(),
      end_time: new Date(
        2026,
        8,
        9,
        session.endHour,
        0,
      ).toISOString(),
      energy_kwh: energy,
      cost,
      co2_kg: co2,
    };
  });

  write(SESSIONS_KEY, [...newSessions, ...sessions].slice(0, 30));

  return runId;
}
