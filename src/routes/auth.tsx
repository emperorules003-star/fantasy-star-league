import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Fantasy Star League" },
      { name: "description", content: "Create your Fantasy Star League account or sign in to join cricket contests." },
      { property: "og:title", content: "Sign in — Fantasy Star League" },
      { property: "og:description", content: "Create your Fantasy Star League account or sign in to join contests." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
    navigate({ to: "/", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name, phone, referred_by: referral.trim().toUpperCase() },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! You're in.");
    navigate({ to: "/", replace: true });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10">
      <Link to="/" className="mb-6 text-center">
        <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--gradient-gold)] font-display text-xl font-bold text-primary-foreground shadow-[var(--shadow-gold)]">
          FG
        </span>
        <h1 className="font-display text-3xl font-bold gold-text">Fantasy Star League</h1>
        <p className="mt-1 text-sm text-muted-foreground">Build your XI. Win the pool.</p>
      </Link>

      <div className="surface-card p-5">
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4">
            <form onSubmit={signIn} className="space-y-3">
              <div>
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="si-pass">Password</Label>
                <Input
                  id="si-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <form onSubmit={signUp} className="space-y-3">
              <div>
                <Label htmlFor="su-name">Full name</Label>
                <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="su-phone">Phone number</Label>
                <Input
                  id="su-phone"
                  inputMode="numeric"
                  placeholder="9876543210"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="su-pass">Password</Label>
                <Input
                  id="su-pass"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="su-ref">Referral code (optional)</Label>
                <Input
                  id="su-ref"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  placeholder="ABCD1234"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating…" : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>
      </div>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
        18+ only. Fantasy sports involve financial risk and may be addictive. Play responsibly and only where permitted
        by your state law.
      </p>
    </div>
  );
}
