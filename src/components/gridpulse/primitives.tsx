import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("panel p-4 md:p-5", className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "accent" | "warning" | "destructive" | "success";
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    accent: "text-accent",
    warning: "text-warning",
    destructive: "text-destructive",
    success: "text-success",
  }[tone];

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="label-caps">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
      </div>
      <p className={cn("numeric mt-2 text-2xl font-semibold", toneClass)}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DeltaStat({
  label,
  before,
  after,
  unit,
  changeLabel,
  improved,
}: {
  label: string;
  before: string;
  after: string;
  unit?: string;
  changeLabel: string;
  improved: boolean;
}) {
  const Icon = improved ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="panel p-4">
      <p className="label-caps">{label}</p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">Before</dt>
          <dd className="numeric text-muted-foreground line-through decoration-border">
            {before}
            {unit}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">After</dt>
          <dd className="numeric text-lg font-semibold text-foreground">
            {after}
            {unit}
          </dd>
        </div>
      </dl>
      <p
        className={cn(
          "numeric mt-3 flex items-center gap-1 text-sm font-medium",
          improved ? "text-primary" : "text-warning",
        )}
      >
        <Icon className="size-4" aria-hidden />
        {changeLabel}
      </p>
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    charging: "bg-primary",
    recommended: "bg-accent",
    waiting: "bg-muted-foreground",
    completed: "bg-success",
    delayed: "bg-destructive",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs capitalize">
      <span className={cn("size-2 rounded-full", map[status] ?? "bg-muted-foreground")} aria-hidden />
      {status}
    </span>
  );
}
