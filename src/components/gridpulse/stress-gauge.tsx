import { stressLevel } from "@/lib/gridpulse/simulation";
import { cn } from "@/lib/utils";

const TONE_STROKE: Record<string, string> = {
  success: "var(--color-success)",
  accent: "var(--color-accent)",
  warning: "var(--color-warning)",
  destructive: "var(--color-destructive)",
};

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  accent: "text-accent",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function StressGauge({ index, size = 220 }: { index: number; size?: number }) {
  const level = stressLevel(index);
  const radius = size / 2 - 14;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference * (1 - Math.min(100, Math.max(0, index)) / 100);

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size / 2 + 22}
        viewBox={`0 0 ${size} ${size / 2 + 22}`}
        role="img"
        aria-label={`Grid stress index ${index} out of 100, ${level.label}`}
      >
        <path
          d={`M 14 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 14} ${size / 2}`}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d={`M 14 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 14} ${size / 2}`}
          fill="none"
          stroke={TONE_STROKE[level.tone]}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
        <text
          x={size / 2}
          y={size / 2 - 12}
          textAnchor="middle"
          className="numeric fill-foreground"
          style={{ fontSize: 40, fontWeight: 600 }}
        >
          {index}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          fill="var(--color-muted-foreground)"
          style={{ fontSize: 12 }}
        >
          Grid Stress Index
        </text>
      </svg>
      <p className={cn("mt-1 font-display text-lg font-semibold", TONE_TEXT[level.tone])}>
        {level.label}
      </p>
      <p className="text-xs text-muted-foreground">0–30 Low · 31–60 Moderate · 61–80 High · 81+ Critical</p>
    </div>
  );
}
