import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { getCurrentUser, subscribeAuth } from "@/lib/gridpulse/auth";
import { GridPulseProvider } from "@/lib/gridpulse/context";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(() => Boolean(getCurrentUser()));

  useEffect(() => {
    const sync = () => setSignedIn(Boolean(getCurrentUser()));
    const unsubscribe = subscribeAuth(sync);
    sync();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!signedIn) void navigate({ to: "/auth", replace: true });
  }, [signedIn, navigate]);

  if (!signedIn) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-sm text-muted-foreground">Opening operator workspace…</p></div>;
  }

  return <GridPulseProvider><Outlet /></GridPulseProvider>;
}
