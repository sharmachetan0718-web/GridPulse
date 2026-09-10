import type { GridHour, Scenario, ScenarioKey } from "./types";

/**
 * Simulation engine.
 *
 * Produces a deterministic, realistic 24-hour grid profile for a scenario.
 * This is SIMULATED data — it is never presented as live grid telemetry.
 * A real feed can be swapped in behind `GridDataProvider` (see grid-api.ts).
 */

const BASE_LOAD_KW = [
  980, 920, 890, 880, 920, 1020, 1180, 1340, 1450, 1490, 1470, 1440, 1420, 1430, 1470, 1520, 1610,
  1760, 1900, 1940, 1850, 1650, 1380, 1130,
];

const BASE_RENEWABLE_PCT = [
  22, 24, 26, 27, 26, 28, 34, 43, 52, 60, 68, 73, 76, 74, 69, 61, 50, 38, 27, 22, 21, 22, 23, 23,
];

const BASE_CARBON = [
  480, 470, 462, 458, 465, 470, 452, 420, 390, 360, 332, 315, 305, 312, 330, 358, 396, 438, 478,
  496, 492, 480, 470, 484,
];

const BASE_PRICE = [
  4.2, 4.0, 3.9, 3.9, 4.1, 4.6, 5.4, 6.2, 6.8, 7.0, 6.8, 6.4, 6.1, 6.2, 6.5, 6.9, 7.6, 8.6, 9.4,
  9.8, 9.1, 7.8, 6.0, 4.8,
];

/** Solar share of the renewable mix by hour (rest is wind). */
const SOLAR_SHARE = [
  0, 0, 0, 0, 0, 0.05, 0.2, 0.4, 0.58, 0.7, 0.8, 0.86, 0.88, 0.85, 0.78, 0.66, 0.48, 0.24, 0.05, 0,
  0, 0, 0, 0,
];

export const GRID_CAPACITY_DEFAULT_KW = 2200;

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  normal: {
    key: "normal",
    name: "Normal Day",
    description: "Typical weekday grid load, moderate renewables and prices.",
    load_multiplier: 1,
    renewable_multiplier: 1,
    carbon_multiplier: 1,
    price_multiplier: 1,
    fleet_multiplier: 1,
  },
  high_stress: {
    key: "high_stress",
    name: "High Grid Stress",
    description: "Heat wave demand: baseline load sits close to feeder capacity all evening.",
    load_multiplier: 1.28,
    renewable_multiplier: 0.8,
    carbon_multiplier: 1.15,
    price_multiplier: 1.35,
    fleet_multiplier: 1,
  },
  high_renewable: {
    key: "high_renewable",
    name: "High Renewable Generation",
    description: "Sunny and windy: large midday solar surplus and low carbon intensity.",
    load_multiplier: 0.92,
    renewable_multiplier: 1.45,
    carbon_multiplier: 0.62,
    price_multiplier: 0.8,
    fleet_multiplier: 1,
  },
  high_carbon: {
    key: "high_carbon",
    name: "High Carbon Intensity",
    description: "Coal-heavy dispatch with weak renewables and a high emissions factor.",
    load_multiplier: 1.08,
    renewable_multiplier: 0.55,
    carbon_multiplier: 1.55,
    price_multiplier: 1.1,
    fleet_multiplier: 1,
  },
  fleet_surge: {
    key: "fleet_surge",
    name: "EV Fleet Surge",
    description: "Peak logistics season: fleet energy demand spikes with tight deadlines.",
    load_multiplier: 1.05,
    renewable_multiplier: 1,
    carbon_multiplier: 1,
    price_multiplier: 1.05,
    fleet_multiplier: 1.45,
  },
};

export const SCENARIO_LIST = Object.values(SCENARIOS);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

/**
 * Grid Stress Index (0-100): utilization dominates, with penalties for
 * carbon-heavy, low-renewable and expensive hours.
 */
export function computeStressIndex(input: {
  gridLoadKw: number;
  gridCapacityKw: number;
  renewablePercentage: number;
  carbonIntensity: number;
}): number {
  const utilization = input.gridLoadKw / Math.max(1, input.gridCapacityKw);
  const utilizationScore = clamp(utilization, 0, 1.2) * 78;
  const carbonScore = clamp((input.carbonIntensity - 280) / 320, 0, 1) * 14;
  const renewableScore = clamp((60 - input.renewablePercentage) / 60, 0, 1) * 8;
  return Math.round(clamp(utilizationScore + carbonScore + renewableScore, 0, 100));
}

export function stressLevel(index: number): {
  label: "Low" | "Moderate" | "High" | "Critical";
  tone: "success" | "accent" | "warning" | "destructive";
} {
  if (index <= 30) return { label: "Low", tone: "success" };
  if (index <= 60) return { label: "Moderate", tone: "accent" };
  if (index <= 80) return { label: "High", tone: "warning" };
  return { label: "Critical", tone: "destructive" };
}

/** Builds the 24-hour simulated grid profile for a scenario. */
export function buildGridProfile(
  scenarioKey: ScenarioKey,
  capacityKw = GRID_CAPACITY_DEFAULT_KW,
): GridHour[] {
  const scenario = SCENARIOS[scenarioKey] ?? SCENARIOS.normal;

  return BASE_LOAD_KW.map((baseLoad, hour) => {
    const gridLoadKw = round(baseLoad * scenario.load_multiplier, 0);
    const renewablePercentage = round(
      clamp(BASE_RENEWABLE_PCT[hour]! * scenario.renewable_multiplier, 2, 96),
      0,
    );
    const carbonIntensity = round(clamp(BASE_CARBON[hour]! * scenario.carbon_multiplier, 40, 900), 0);
    const electricityPrice = round(BASE_PRICE[hour]! * scenario.price_multiplier, 2);
    const renewableKw = (gridLoadKw * renewablePercentage) / 100;
    const solarKw = round(renewableKw * SOLAR_SHARE[hour]!, 0);

    return {
      hour,
      gridLoadKw,
      gridCapacityKw: capacityKw,
      renewablePercentage,
      carbonIntensity,
      electricityPrice,
      solarKw,
      windKw: round(renewableKw - solarKw, 0),
      stressIndex: computeStressIndex({
        gridLoadKw,
        gridCapacityKw: capacityKw,
        renewablePercentage,
        carbonIntensity,
      }),
    } satisfies GridHour;
  });
}
