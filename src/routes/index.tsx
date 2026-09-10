import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  CircleDollarSign,
  Leaf,
  LineChart,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";

import { GridPulseLogo } from "@/components/gridpulse/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GridPulse — Smart EV Charging" },
      {
        name: "description",
        content:
          "GridPulse helps EV fleet operators find cheaper, cleaner and smarter times to charge.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Activity,
    title: "See the grid",
    body: "Know when electricity is busy, expensive or cleaner before you start charging.",
  },
  {
    icon: BatteryCharging,
    title: "Charge at the right time",
    body: "GridPulse finds better charging times for every vehicle in your fleet.",
  },
  {
    icon: Leaf,
    title: "Use cleaner energy",
    body: "The system prefers hours when more renewable energy is available.",
  },
  {
    icon: LineChart,
    title: "See your results",
    body: "Clearly see how much money, energy and CO₂ your fleet can save.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/80 bg-background/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <GridPulseLogo />

          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        {/* Hero */}
        <section className="grid gap-10 py-14 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-20">
          <div>
            <p className="label-caps text-primary">
              Smart EV fleet charging
            </p>

            <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Charge at the right time.
              <span className="block text-muted-foreground">
                Save more. Emit less.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              GridPulse helps you decide when your electric vehicles should
              charge. It looks at electricity price, grid conditions and
              renewable energy, then finds a better time to charge.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Open the dashboard
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg">
                <Link to="/auth">Try the demo</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-primary" />
                Simple operator access
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Zap className="size-3.5 text-primary" />
                Automatic charging plan
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Activity className="size-3.5 text-primary" />
                Live simulation
              </span>
            </div>
          </div>

          {/* Fleet snapshot */}
          <section className="panel p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="label-caps">Your fleet right now</p>

                <h2 className="mt-1 font-display text-lg font-semibold">
                  Everything looks stable
                </h2>
              </div>

              <span className="status-good">Good</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Snapshot
                label="Grid is"
                value="34 / 100"
                helper="Not very busy"
                tone="blush"
              />

              <Snapshot
                label="Clean energy"
                value="68%"
                helper="Available now"
                tone="olive"
              />

              <Snapshot
                label="Electricity"
                value="₹6.42"
                helper="per kWh"
                tone="lavender"
              />

              <Snapshot
                label="Fleet ready"
                value="96%"
                helper="Ready for work"
                tone="rose"
              />
            </div>

            <div className="mt-5 rounded-lg border border-border/70 bg-secondary/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Best time to charge
                  </p>

                  <p className="mt-1 font-display text-xl font-semibold">
                    8 PM – 10 PM
                  </p>
                </div>

                <BatteryCharging className="size-6 text-primary" />
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                <div className="h-full w-[72%] rounded-full bg-primary" />
              </div>

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Lower price, cleaner energy and less pressure on the grid.
              </p>
            </div>
          </section>
        </section>

        {/* Simple explanation */}
        <section className="border-y border-border/70 py-12">
          <div className="max-w-3xl">
            <p className="label-caps text-primary">How it works</p>

            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              GridPulse does three simple things
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              You don't need to understand electricity markets or charging
              technology. GridPulse turns all of that information into one
              simple charging plan.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <HowStep
              number="01"
              icon={Truck}
              title="Check your vehicles"
              text="GridPulse looks at which vehicles need charging, how much battery they have and when they need to leave."
            />

            <HowStep
              number="02"
              icon={Activity}
              title="Check the electricity"
              text="It looks for times when electricity is cheaper, cleaner and the grid is less busy."
            />

            <HowStep
              number="03"
              icon={Zap}
              title="Choose the best time"
              text="GridPulse creates a charging plan so your vehicles are ready when you need them."
            />
          </div>
        </section>

        {/* Feature explanation */}
        <section className="py-12">
          <div className="mb-7 max-w-2xl">
            <p className="label-caps text-primary">What you get</p>

            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              One simple view of your fleet
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Everything important is shown clearly so you can understand what
              is happening and what GridPulse recommends.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <section
                key={feature.title}
                className="panel p-5 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <feature.icon
                  className="size-5 text-primary"
                  aria-hidden
                />

                <h2 className="mt-4 font-display text-base font-semibold">
                  {feature.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.body}
                </p>
              </section>
            ))}
          </div>
        </section>

        {/* Impact */}
        <section className="panel p-5 sm:p-6">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="label-caps text-primary">Example result</p>

              <h2 className="mt-2 font-display text-2xl font-semibold">
                What happens when GridPulse plans the charging?
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Instead of charging every vehicle whenever electricity is
                available, GridPulse moves flexible charging to better hours.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Impact
                label="Peak load"
                value="−18%"
                tone="blush"
              />

              <Impact
                label="Cost"
                value="−14%"
                tone="lavender"
              />

              <Impact
                label="CO₂"
                value="−23%"
                tone="rose"
              />

              <Impact
                label="Clean energy"
                value="71%"
                tone="olive"
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-10 rounded-xl border border-border bg-secondary/30 p-7 text-center sm:p-10">
          <CircleDollarSign className="mx-auto size-7 text-primary" />

          <h2 className="mt-4 font-display text-2xl font-semibold">
            Ready to see your fleet's best charging plan?
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Open the GridPulse dashboard and see how smarter charging can
            reduce cost, emissions and grid pressure.
          </p>

          <Button asChild size="lg" className="mt-5">
            <Link to="/auth">
              Open GridPulse
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Grid conditions are shown in Simulation Mode for this demo.
        </p>
      </main>
    </div>
  );
}

function Snapshot({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "blush" | "olive" | "lavender" | "rose";
}) {
  return (
    <div
      className={`pastel-${tone} rounded-lg border border-border/50 p-3`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="numeric mt-1 text-lg font-semibold text-foreground">
        {value}
      </p>

      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {helper}
      </p>
    </div>
  );
}

function HowStep({
  number,
  icon: Icon,
  title,
  text,
}: {
  number: string;
  icon: typeof Truck;
  title: string;
  text: string;
}) {
  return (
    <article className="panel p-5">
      <div className="flex items-center justify-between">
        <span className="numeric text-xs text-muted-foreground">
          {number}
        </span>

        <Icon className="size-4 text-primary" />
      </div>

      <h3 className="mt-7 font-display text-base font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {text}
      </p>
    </article>
  );
}

function Impact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blush" | "olive" | "lavender" | "rose";
}) {
  return (
    <div
      className={`pastel-${tone} min-w-20 rounded-md border border-border/50 p-3`}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="numeric mt-1 text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}