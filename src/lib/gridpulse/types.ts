/** Core domain types shared by the simulation, optimization and analytics engines. */

export type ScenarioKey =
  | "normal"
  | "high_stress"
  | "high_renewable"
  | "high_carbon"
  | "fleet_surge";

export interface Scenario {
  key: ScenarioKey;
  name: string;
  description: string;
  load_multiplier: number;
  renewable_multiplier: number;
  carbon_multiplier: number;
  price_multiplier: number;
  fleet_multiplier: number;
}

/** One hour of grid conditions. `hour` is the hour of day (0-23). */
export interface GridHour {
  hour: number;
  gridLoadKw: number;
  gridCapacityKw: number;
  renewablePercentage: number;
  carbonIntensity: number;
  electricityPrice: number;
  stressIndex: number;
  solarKw: number;
  windKw: number;
}

export interface Vehicle {
  id: string;
  vehicle_id: string;
  vehicle_type: string;
  battery_capacity_kwh: number;
  current_soc: number;
  target_soc: number;
  max_charging_power_kw: number;
  departure_time: string;
  priority: number;
  status: string;
  charger_id: string | null;
}

export interface Charger {
  id: string;
  charger_id: string;
  max_power_kw: number;
  location: string;
  status: string;
}

export interface OptimizationWeights {
  cost: number;
  carbon: number;
  peak: number;
  renewable: number;
  readiness: number;
}

/** A single allocated charging block inside the planning horizon. */
export interface ScheduleBlock {
  vehicleId: string;
  /** Index into the planning horizon (0 = first slot of the window). */
  slot: number;
  /** Hour of day this slot maps to. */
  hour: number;
  powerKw: number;
  energyKwh: number;
  status: "charging" | "recommended" | "delayed" | "completed";
}

export interface VehiclePlan {
  vehicleId: string;
  vehicleType: string;
  requiredEnergyKwh: number;
  deliveredEnergyKwh: number;
  deadlineSlot: number;
  ready: boolean;
  shortfallKwh: number;
  finalSoc: number;
  conflict?: string;
}

export interface SchedulePlan {
  label: string;
  blocks: ScheduleBlock[];
  plans: VehiclePlan[];
  /** EV charging load per horizon slot, kW. */
  evLoadBySlot: number[];
  /** Baseline grid load + EV load per horizon slot, kW. */
  totalLoadBySlot: number[];
  metrics: PlanMetrics;
}

export interface PlanMetrics {
  peakKw: number;
  costTotal: number;
  co2Kg: number;
  energyKwh: number;
  renewableUtilization: number;
  vehiclesReady: number;
  vehiclesTotal: number;
  readinessPct: number;
  capacityBreaches: number;
  objectiveScore: number;
}

export interface OptimizationResult {
  baseline: SchedulePlan;
  optimized: SchedulePlan;
  weights: OptimizationWeights;
  horizonHours: number[];
  conflicts: string[];
}
