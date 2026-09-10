import { buildGridProfile, GRID_CAPACITY_DEFAULT_KW } from "./simulation";
import type { GridHour, ScenarioKey } from "./types";

/**
 * External energy/grid API abstraction layer.
 *
 * Every page reads grid data through a `GridDataProvider`. Today only the
 * simulation provider is wired up; a real ISO / utility / carbon-intensity API
 * can be added as another implementation without touching UI or engine code.
 */

export type GridDataMode = "simulation" | "live";

export interface GridDataProvider {
  id: string;
  name: string;
  mode: GridDataMode;
  getProfile(scenarioKey: ScenarioKey, capacityKw?: number): Promise<GridHour[]>;
}

export const simulationProvider: GridDataProvider = {
  id: "gridpulse-sim-v1",
  name: "GridPulse Simulation Engine",
  mode: "simulation",
  async getProfile(scenarioKey, capacityKw = GRID_CAPACITY_DEFAULT_KW) {
    return buildGridProfile(scenarioKey, capacityKw);
  },
};

/**
 * Template for a live provider. Wire a real endpoint here (carbon intensity,
 * day-ahead price, feeder load) and return the same normalized `GridHour[]`.
 */
export function createHttpGridProvider(config: {
  id: string;
  name: string;
  endpoint: string;
  fetchImpl?: typeof fetch;
}): GridDataProvider {
  return {
    id: config.id,
    name: config.name,
    mode: "live",
    async getProfile(scenarioKey, capacityKw = GRID_CAPACITY_DEFAULT_KW) {
      const doFetch = config.fetchImpl ?? fetch;
      const response = await doFetch(`${config.endpoint}?scenario=${scenarioKey}`);
      if (!response.ok) throw new Error(`Grid provider ${config.id} failed: ${response.status}`);
      const payload = (await response.json()) as { hours: GridHour[] };
      return payload.hours.map((hour) => ({ ...hour, gridCapacityKw: capacityKw }));
    },
  };
}

let activeProvider: GridDataProvider = simulationProvider;

export function getGridProvider(): GridDataProvider {
  return activeProvider;
}

export function setGridProvider(provider: GridDataProvider) {
  activeProvider = provider;
}
