import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { GridHour } from "@/lib/gridpulse/types";

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border-strong)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "var(--color-muted-foreground)" },
} as const;

const grid = <CartesianGrid stroke="var(--color-grid-line)" strokeDasharray="3 3" vertical={false} />;

export interface LoadPoint {
  label: string;
  baseLoad: number;
  uncontrolled: number;
  optimized: number;
  capacity: number;
}

export function GridLoadChart({ data, capacity }: { data: LoadPoint[]; capacity: number }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="fillOptimized" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="fillBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {grid}
        <XAxis dataKey="label" {...axis} interval={2} />
        <YAxis {...axis} unit=" kW" width={62} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine
          y={capacity}
          stroke="var(--color-destructive)"
          strokeDasharray="6 4"
          label={{ value: "Grid capacity", fill: "var(--color-destructive)", fontSize: 11 }}
        />
        <Area
          type="monotone"
          dataKey="baseLoad"
          name="Baseline grid demand"
          stroke="var(--color-chart-2)"
          fill="url(#fillBase)"
          strokeWidth={1.5}
        />
        <Line
          type="monotone"
          dataKey="uncontrolled"
          name="Uncontrolled EV charging"
          stroke="var(--color-chart-4)"
          strokeWidth={2}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="optimized"
          name="GridPulse optimized"
          stroke="var(--color-chart-1)"
          fill="url(#fillOptimized)"
          strokeWidth={2.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CarbonChart({ data }: { data: GridHour[] }) {
  const points = data.map((hour) => ({
    label: `${String(hour.hour).padStart(2, "0")}:00`,
    carbon: hour.carbonIntensity,
    price: hour.electricityPrice,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        {grid}
        <XAxis dataKey="label" {...axis} interval={2} />
        <YAxis {...axis} width={58} unit=" g" />
        <Tooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey="carbon"
          name="Carbon intensity (gCO₂/kWh)"
          stroke="var(--color-chart-3)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RenewableChart({ data }: { data: GridHour[] }) {
  const points = data.map((hour) => ({
    label: `${String(hour.hour).padStart(2, "0")}:00`,
    solar: hour.solarKw,
    wind: hour.windKw,
    share: hour.renewablePercentage,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        {grid}
        <XAxis dataKey="label" {...axis} interval={2} />
        <YAxis {...axis} width={58} unit=" kW" />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="solar" name="Solar" stackId="r" fill="var(--color-chart-3)" />
        <Bar dataKey="wind" name="Wind" stackId="r" fill="var(--color-chart-2)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ComparisonBarChart({
  data,
}: {
  data: { label: string; before: number; after: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        {grid}
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={54} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="before" name="Without GridPulse" fill="var(--color-chart-4)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="after" name="With GridPulse" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
