import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/gridpulse/app-shell";
import { Panel } from "@/components/gridpulse/primitives";
import { ScenarioPicker } from "@/components/gridpulse/scenario-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGridPulse } from "@/lib/gridpulse/context";
import { fetchProfile, updateProfile } from "@/lib/gridpulse/db";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — GridPulse" },
      {
        name: "description",
        content:
          "Manage your operator profile, grid data source and simulation scenario defaults in GridPulse.",
      },
      { property: "og:title", content: "Settings — GridPulse" },
      { property: "og:description", content: "Operator profile and data source configuration." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { dataMode, capacityKw, vehicles, chargers } = useGridPulse();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (profileQuery.data) {
      setFullName(profileQuery.data.full_name ?? "");
      setOrgName(profileQuery.data.org_name ?? "");
    }
  }, [profileQuery.data]);

  const saveProfile = useMutation({
    mutationFn: () => updateProfile({ full_name: fullName, org_name: orgName }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (error: Error) => toast.error("Could not save", { description: error.message }),
  });

  return (
    <AppShell title="Settings" subtitle="Operator profile, data source and simulation defaults.">
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Operator profile">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveProfile.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profileQuery.data?.email ?? ""} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org">Fleet / organisation</Label>
              <Input id="org" value={orgName} onChange={(event) => setOrgName(event.target.value)} />
            </div>
            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </Panel>

        <div className="space-y-4">
          <Panel title="Grid data source">
            <p className="text-sm text-muted-foreground">
              Current source:{" "}
              <span className="font-medium text-foreground">
                {dataMode === "simulation" ? "Simulation Mode" : "Live grid feed"}
              </span>
              . Simulated data is generated deterministically for demonstration and is not a
              real-time utility feed. A live provider can be registered without changing any screen.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="label-caps">Grid capacity</dt>
                <dd className="numeric">{capacityKw.toLocaleString("en-IN")} kW</dd>
              </div>
              <div>
                <dt className="label-caps">Fleet size</dt>
                <dd className="numeric">{vehicles.length} EVs</dd>
              </div>
              <div>
                <dt className="label-caps">Chargers</dt>
                <dd className="numeric">{chargers.length}</dd>
              </div>
              <div>
                <dt className="label-caps">Engine</dt>
                <dd className="numeric">deterministic-slack-greedy-v1</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Simulation scenario" description="Applies across every screen instantly.">
            <ScenarioPicker />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
