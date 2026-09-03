import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Copy, Gift, LogOut, Shield, ShieldCheck, Trophy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Fantasy Star League" },
      { name: "description", content: "Manage your Fantasy Star League account, stats, referrals and verification status." },
      { property: "og:title", content: "My Profile — Fantasy Star League" },
      { property: "og:description", content: "Manage your account, stats and referrals." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, isAdmin, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const { data: referrals } = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("referrals").select("*");
      if (error) throw error;
      return data as unknown as { id: string; bonus_amount: number; status: string; created_at: string }[];
    },
  });

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ name: name }).eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
  }

  function copyCode() {
    if (!profile?.referral_code) return;
    void navigator.clipboard.writeText(profile.referral_code);
    toast.success("Referral code copied");
  }

  const bonusEarned = referrals?.reduce((s, r) => s + Number(r.bonus_amount), 0) ?? 0;

  return (
    <AppShell>
      <section className="surface-card mb-4 p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-display text-2xl font-bold text-background">
          {(profile?.name ?? "P").charAt(0).toUpperCase()}
        </div>
        <h1 className="mt-2 font-display text-xl font-bold">{profile?.name ?? "Player"}</h1>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        {profile?.phone && <p className="text-xs text-muted-foreground">{profile.phone}</p>}
        <span
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${
            profile?.is_kyc_verified ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          <ShieldCheck className="h-3 w-3" />
          {profile?.is_kyc_verified ? "KYC Verified" : "KYC Pending"}
        </span>
      </section>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: "Balance", value: inr(profile?.balance ?? 0, { compact: true }), icon: Wallet },
          { label: "Played", value: String(profile?.contests_played ?? 0), icon: Trophy },
          { label: "Won", value: String(profile?.contests_won ?? 0), icon: Trophy },
        ].map((s) => (
          <div key={s.label} className="surface-card p-3 text-center">
            <s.icon className="mx-auto h-4 w-4 text-primary" />
            <p className="stat-number mt-1 text-lg">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="surface-card mb-4 p-4">
        <p className="flex items-center gap-2 font-display font-bold">
          <Gift className="h-4 w-4 text-primary" /> Refer &amp; Earn
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Friends get a joining bonus, you earn ₹50 when they make their first deposit.
        </p>
        <button
          onClick={copyCode}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-dashed border-primary/60 bg-primary/10 px-4 py-3"
        >
          <span className="font-display text-lg font-bold tracking-widest text-primary">
            {profile?.referral_code ?? "—"}
          </span>
          <Copy className="h-4 w-4 text-primary" />
        </button>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{referrals?.length ?? 0} referrals</span>
          <span>{inr(bonusEarned)} earned</span>
        </div>
      </section>

      <section className="surface-card mb-4 space-y-3 p-4">
        <div>
          <Label htmlFor="p-name">Full name</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button className="w-full" onClick={save} disabled={busy}>
          Save changes
        </Button>
      </section>

      <div className="space-y-2">
        <Link to="/notifications" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
          <Bell className="h-4 w-4 text-primary" /> Notifications
        </Link>
        {isAdmin && (
          <Link to="/admin" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
            <Shield className="h-4 w-4 text-primary" /> Admin Dashboard
          </Link>
        )}
        <button
          onClick={() => {
            void signOut();
            navigate({ to: "/auth" });
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm text-live"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">
        Play responsibly. 18+ only. Fantasy sports involve financial risk and may be addictive. Not available in
        states where such contests are prohibited.
      </p>
    </AppShell>
  );
}
