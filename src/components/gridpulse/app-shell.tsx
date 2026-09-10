import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  CalendarClock,
  Cpu,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Truck,
  Zap,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { ScenarioPicker } from "./scenario-picker";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOutLocal } from "@/lib/gridpulse/auth";
import { useGridPulse } from "@/lib/gridpulse/context";
import { stressLevel } from "@/lib/gridpulse/simulation";

const NAV = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/fleet", label: "Fleet", icon: Truck },
  { to: "/schedule", label: "Charging Schedule", icon: CalendarClock },
  { to: "/grid", label: "Grid Intelligence", icon: Activity },
  { to: "/optimization", label: "Optimization", icon: Cpu },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function GridPulseLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
        <Zap className="size-5 text-primary" aria-hidden />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-base font-semibold tracking-tight">
            GridPulse
          </span>
          <span className="block text-[11px] text-muted-foreground">
            Charge Smarter. Stress Less.
          </span>
        </span>
      )}
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          activeProps={{
            className:
              "bg-sidebar-accent text-sidebar-foreground border-l-2 border-primary pl-[10px] font-medium",
          }}
        >
          <item.icon className="size-4 shrink-0" aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const now = useClock();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { grid, dataMode } = useGridPulse();
  const current = grid[now.getHours()] ?? grid[0]!;
  const stress = stressLevel(current.stressIndex);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    signOutLocal();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <Link to="/overview" className="mb-7 block">
          <GridPulseLogo />
        </Link>
        <NavList />
        <div className="mt-auto rounded-md border border-sidebar-border bg-background/40 p-3">
          <p className="label-caps">Grid stress now</p>
          <p className="numeric mt-1 text-2xl font-semibold text-foreground">
            {current.stressIndex}
            <span className="text-sm text-muted-foreground">/100</span>
          </p>
          <p className="text-xs text-muted-foreground">{stress.label} stress</p>
        </div>
      </aside>

      <div className="ml-0 flex h-screen min-w-0 flex-1 flex-col overflow-y-auto lg:ml-60">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-4">
                <div className="mb-6">
                  <GridPulseLogo />
                </div>
                <NavList />
              </SheetContent>
            </Sheet>

            <div className="lg:hidden">
              <GridPulseLogo compact />
            </div>

            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1">
              <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
              <span className="text-[11px] font-medium tracking-wide text-primary uppercase">
                {dataMode === "simulation" ? "Simulation Mode" : "Live Data"}
              </span>
            </div>

            <span className="hidden text-xs text-muted-foreground md:inline">
              Optimizer online · engine v1
            </span>

            <div className="ml-auto flex items-center gap-3">
              <ScenarioPicker />
              <span
                className="numeric hidden text-sm text-muted-foreground sm:inline"
                aria-label="Current time"
              >
                {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                <LogOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
