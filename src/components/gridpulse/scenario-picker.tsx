import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGridPulse } from "@/lib/gridpulse/context";
import { SCENARIO_LIST } from "@/lib/gridpulse/simulation";
import type { ScenarioKey } from "@/lib/gridpulse/types";

export function ScenarioPicker({ className }: { className?: string }) {
  const { scenario, setScenario } = useGridPulse();

  return (
    <Select value={scenario} onValueChange={(value) => setScenario(value as ScenarioKey)}>
      <SelectTrigger className={className ?? "w-[190px]"} aria-label="Simulation scenario">
        <SelectValue placeholder="Scenario" />
      </SelectTrigger>
      <SelectContent>
        {SCENARIO_LIST.map((item) => (
          <SelectItem key={item.key} value={item.key}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
