import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { fetchChargers, fetchVehicles, saveOptimizationRun } from "./db";
import { getGridProvider } from "./grid-api";
import { DEFAULT_WEIGHTS, optimize } from "./optimizer";
import { buildGridProfile, GRID_CAPACITY_DEFAULT_KW, SCENARIOS } from "./simulation";
import type {
  Charger,
  GridHour,
  OptimizationResult,
  OptimizationWeights,
  ScenarioKey,
  Vehicle,
} from "./types";

interface GridPulseState {
  scenario: ScenarioKey;
  setScenario: (key: ScenarioKey) => void;
  weights: OptimizationWeights;
  setWeights: (weights: OptimizationWeights) => void;
  capacityKw: number;
  setCapacityKw: (value: number) => void;
  loadFactor: number;
  setLoadFactor: (value: number) => void;
  overrides: Record<string, number[]>;
  toggleOverride: (vehicleId: string, slot: number) => void;
  clearOverrides: () => void;
  vehicles: Vehicle[];
  chargers: Charger[];
  grid: GridHour[];
  result: OptimizationResult;
  isLoading: boolean;
  dataMode: "simulation" | "live";
  runOptimization: () => void;
  isSaving: boolean;
  lastRunAt: Date | null;
}

const GridPulseContext = createContext<GridPulseState | null>(null);

export function GridPulseProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [scenario, setScenario] = useState<ScenarioKey>("normal");
  const [weights, setWeights] = useState<OptimizationWeights>(DEFAULT_WEIGHTS);
  const [capacityKw, setCapacityKw] = useState(GRID_CAPACITY_DEFAULT_KW);
  const [loadFactor, setLoadFactor] = useState(1);
  const [overrides, setOverrides] = useState<Record<string, number[]>>({});
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  const vehiclesQuery = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
  const chargersQuery = useQuery({ queryKey: ["chargers"], queryFn: fetchChargers });
  const provider = getGridProvider();
  const gridQuery = useQuery({
    queryKey: ["grid", provider.id, scenario, capacityKw],
    queryFn: () => provider.getProfile(scenario, capacityKw),
  });

  const vehicles = vehiclesQuery.data ?? [];
  const chargers = chargersQuery.data ?? [];

  const grid = useMemo(() => {
    const profile = gridQuery.data ?? buildGridProfile(scenario, capacityKw);
    if (loadFactor === 1) return profile;
    return profile.map((hour) => ({
      ...hour,
      gridLoadKw: Math.round(hour.gridLoadKw * loadFactor),
    }));
  }, [gridQuery.data, scenario, capacityKw, loadFactor]);

  const result = useMemo(() => {
    const chargerPowerById = new Map(chargers.map((c) => [c.charger_id, c.max_power_kw]));
    const fleetMultiplier = SCENARIOS[scenario].fleet_multiplier;
    // The EV Fleet Surge scenario raises fleet energy demand and tightens SOC.
    const adjusted =
      fleetMultiplier === 1
        ? vehicles
        : vehicles.map((vehicle) => ({
            ...vehicle,
            current_soc: Math.max(
              5,
              Math.round(vehicle.current_soc - (fleetMultiplier - 1) * 45),
            ),
          }));

    return optimize({
      vehicles: adjusted,
      grid,
      weights,
      chargerPowerById,
      capacityKw,
      overrides,
    });
  }, [vehicles, chargers, grid, weights, capacityKw, overrides, scenario]);

  const saveMutation = useMutation({
    mutationFn: () => saveOptimizationRun(result, scenario, capacityKw),
    onSuccess: () => {
      setLastRunAt(new Date());
      void queryClient.invalidateQueries({ queryKey: ["optimization-runs"] });
      const saving = result.baseline.metrics.costTotal - result.optimized.metrics.costTotal;
      toast.success("Optimized schedule generated", {
        description: `Peak ${result.optimized.metrics.peakKw} kW · cost saving ₹${saving.toLocaleString(
          "en-IN",
        )} · ${result.optimized.metrics.readinessPct}% of vehicles ready on time.`,
      });
    },
    onError: (error: Error) => toast.error("Could not save run", { description: error.message }),
  });

  const toggleOverride = useCallback((vehicleId: string, slot: number) => {
    setOverrides((current) => {
      const existing = current[vehicleId] ?? [];
      const next = existing.includes(slot)
        ? existing.filter((value) => value !== slot)
        : [...existing, slot].sort((a, b) => a - b);
      if (next.length === 0) {
        const { [vehicleId]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [vehicleId]: next };
    });
  }, []);

  const value: GridPulseState = {
    scenario,
    setScenario,
    weights,
    setWeights,
    capacityKw,
    setCapacityKw,
    loadFactor,
    setLoadFactor,
    overrides,
    toggleOverride,
    clearOverrides: () => setOverrides({}),
    vehicles,
    chargers,
    grid,
    result,
    isLoading: vehiclesQuery.isLoading || chargersQuery.isLoading,
    dataMode: provider.mode,
    runOptimization: () => saveMutation.mutate(),
    isSaving: saveMutation.isPending,
    lastRunAt,
  };

  return <GridPulseContext.Provider value={value}>{children}</GridPulseContext.Provider>;
}

export function useGridPulse(): GridPulseState {
  const context = useContext(GridPulseContext);
  if (!context) throw new Error("useGridPulse must be used inside GridPulseProvider");
  return context;
}
