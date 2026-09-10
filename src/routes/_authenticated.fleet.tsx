import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/gridpulse/app-shell";
import { KpiCard, Panel, StatusDot } from "@/components/gridpulse/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGridPulse } from "@/lib/gridpulse/context";
import { createVehicle, deleteVehicle, updateVehicle, type VehicleInput } from "@/lib/gridpulse/db";
import type { Vehicle } from "@/lib/gridpulse/types";

export const Route = createFileRoute("/_authenticated/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet Management — GridPulse" },
      {
        name: "description",
        content:
          "Manage electric vehicles: battery capacity, state of charge, target SOC, charging power, departure time, priority and charger assignment.",
      },
      { property: "og:title", content: "Fleet Management — GridPulse" },
      {
        property: "og:description",
        content: "Add, edit and remove EVs and set their charging requirements.",
      },
    ],
  }),
  component: FleetPage,
});

const EMPTY: VehicleInput = {
  vehicle_id: "",
  vehicle_type: "Delivery van",
  battery_capacity_kwh: 75,
  current_soc: 40,
  target_soc: 90,
  max_charging_power_kw: 50,
  departure_time: "07:00",
  priority: 3,
  status: "waiting",
  charger_id: null,
};

/** Rough usable range estimate: 5.2 km per kWh for light EV fleets. */
function estimatedRangeKm(vehicle: Vehicle) {
  return Math.round((vehicle.battery_capacity_kwh * vehicle.current_soc * 0.052) / 1);
}

function FleetPage() {
  const { vehicles, chargers, result } = useGridPulse();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleInput>(EMPTY);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["vehicles"] });

  const saveMutation = useMutation({
    mutationFn: async () =>
      editing ? updateVehicle(editing.id, form) : createVehicle(form),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      toast.success(editing ? "Vehicle updated" : "Vehicle added");
    },
    onError: (error: Error) => toast.error("Could not save vehicle", { description: error.message }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Vehicle removed");
    },
    onError: (error: Error) => toast.error("Could not remove", { description: error.message }),
  });

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY, vehicle_id: `EV-${String(vehicles.length + 1).padStart(3, "0")}` });
    setOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    const { id: _id, ...rest } = vehicle;
    setForm(rest);
    setOpen(true);
  }

  const planByVehicle = new Map(result.optimized.plans.map((plan) => [plan.vehicleId, plan]));
  const readyCount = result.optimized.plans.filter((plan) => plan.ready).length;
  const avgSoc = vehicles.length
    ? Math.round(vehicles.reduce((sum, v) => sum + v.current_soc, 0) / vehicles.length)
    : 0;
  const energyNeeded = Math.round(
    result.optimized.plans.reduce((sum, plan) => sum + plan.requiredEnergyKwh, 0),
  );

  return (
    <AppShell
      title="Fleet management"
      subtitle="Vehicle inventory and charging requirements used by the optimizer."
      actions={
        <Button onClick={openAdd}>
          <Plus className="size-4" aria-hidden /> Add vehicle
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Fleet size" value={vehicles.length} unit="EVs" />
        <KpiCard label="Average SOC" value={avgSoc} unit="%" />
        <KpiCard label="Energy required tonight" value={energyNeeded.toLocaleString("en-IN")} unit="kWh" />
        <KpiCard
          label="Ready by departure"
          value={`${readyCount}/${result.optimized.plans.length}`}
          tone={readyCount === result.optimized.plans.length ? "success" : "warning"}
        />
      </div>

      <Panel className="mt-4" title="Vehicles" description={`${chargers.length} chargers available.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2">Vehicle</th>
                <th className="py-2">Type</th>
                <th className="py-2">Battery</th>
                <th className="py-2">SOC → target</th>
                <th className="py-2">Power</th>
                <th className="py-2">Range</th>
                <th className="py-2">Departs</th>
                <th className="py-2">Priority</th>
                <th className="py-2">Status</th>
                <th className="py-2">Charger</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
                const plan = planByVehicle.get(vehicle.vehicle_id);
                return (
                  <tr key={vehicle.id} className="border-t border-border/70">
                    <td className="numeric py-2">{vehicle.vehicle_id}</td>
                    <td className="py-2">{vehicle.vehicle_type}</td>
                    <td className="numeric py-2">{vehicle.battery_capacity_kwh} kWh</td>
                    <td className="numeric py-2">
                      {vehicle.current_soc}% → {vehicle.target_soc}%
                    </td>
                    <td className="numeric py-2">{vehicle.max_charging_power_kw} kW</td>
                    <td className="numeric py-2">{estimatedRangeKm(vehicle)} km</td>
                    <td className="numeric py-2">{vehicle.departure_time.slice(0, 5)}</td>
                    <td className="numeric py-2">P{vehicle.priority}</td>
                    <td className="py-2">
                      <StatusDot status={plan && !plan.ready ? "delayed" : vehicle.status} />
                    </td>
                    <td className="numeric py-2">{vehicle.charger_id ?? "—"}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Edit ${vehicle.vehicle_id}`}
                          onClick={() => openEdit(vehicle)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Delete ${vehicle.vehicle_id}`}
                          onClick={() => removeMutation.mutate(vehicle.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
            <DialogDescription>
              Charging requirements feed straight into the optimization engine.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
          >
            <Field label="Vehicle ID">
              <Input
                required
                value={form.vehicle_id}
                onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
              />
            </Field>
            <Field label="Vehicle type">
              <Input
                required
                value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
              />
            </Field>
            <Field label="Battery capacity (kWh)">
              <Input
                type="number"
                min={10}
                max={600}
                required
                value={form.battery_capacity_kwh}
                onChange={(e) =>
                  setForm({ ...form, battery_capacity_kwh: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Max charging power (kW)">
              <Input
                type="number"
                min={3}
                max={350}
                required
                value={form.max_charging_power_kw}
                onChange={(e) =>
                  setForm({ ...form, max_charging_power_kw: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Current SOC (%)">
              <Input
                type="number"
                min={0}
                max={100}
                required
                value={form.current_soc}
                onChange={(e) => setForm({ ...form, current_soc: Number(e.target.value) })}
              />
            </Field>
            <Field label="Target SOC (%)">
              <Input
                type="number"
                min={0}
                max={100}
                required
                value={form.target_soc}
                onChange={(e) => setForm({ ...form, target_soc: Number(e.target.value) })}
              />
            </Field>
            <Field label="Departure time">
              <Input
                type="time"
                required
                value={form.departure_time.slice(0, 5)}
                onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
              />
            </Field>
            <Field label="Priority (1 = highest)">
              <Input
                type="number"
                min={1}
                max={5}
                required
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </Field>
            <Field label="Status">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {["waiting", "charging", "completed", "idle"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Charger">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.charger_id ?? ""}
                onChange={(e) => setForm({ ...form, charger_id: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {chargers.map((charger) => (
                  <option key={charger.id} value={charger.charger_id}>
                    {charger.charger_id} · {charger.max_power_kw} kW
                  </option>
                ))}
              </select>
            </Field>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Add vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
