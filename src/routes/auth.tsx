import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GridPulseLogo } from "@/components/gridpulse/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser, signInLocal, signUpLocal, subscribeAuth } from "@/lib/gridpulse/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Operator access — GridPulse" },
      { name: "description", content: "Simple operator access for the GridPulse fleet charging demo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getCurrentUser()) void navigate({ to: "/overview", replace: true });
  }, [navigate]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      signInLocal(email, password);
      toast.success("Welcome back", { description: "Your GridPulse workspace is ready." });
      await navigate({ to: "/overview", replace: true });
    } catch (error) {
      toast.error("Sign in failed", { description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      signUpLocal({ email, password, full_name: fullName, org_name: orgName });
      toast.success("Account created", { description: "Your demo fleet is ready." });
      await navigate({ to: "/overview", replace: true });
    } catch (error) {
      toast.error("Sign up failed", { description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <Link to="/" className="mb-6 inline-block">
          <GridPulseLogo />
        </Link>
        <div className="panel auth-panel p-5 sm:p-6">
          <p className="label-caps text-primary">Operator workspace</p>
          <h1 className="mt-2 font-display text-2xl font-semibold">Fleet operator access</h1>
          <p className="mt-1 text-sm text-muted-foreground">Simple demo access. No email verification required.</p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4 pt-4" onSubmit={(event) => void signIn(event)}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="operator@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" placeholder="Any 4+ characters" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4 pt-4" onSubmit={(event) => void signUp(event)}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" autoComplete="name" placeholder="Your name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org">Fleet / organisation</Label>
                  <Input id="org" placeholder="PCU Fleet Operations" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" type="email" autoComplete="email" placeholder="operator@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-up">Password</Label>
                  <Input id="password-up" type="password" autoComplete="new-password" minLength={4} placeholder="Any 4+ characters" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  <p className="text-xs text-muted-foreground">For this demo, any password with 4 or more characters is accepted.</p>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating workspace…" : "Create operator account"}</Button>
                <p className="text-xs text-muted-foreground">A demo fleet of 25 electric vehicles, 10 chargers and charging history is created automatically in this browser.</p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
