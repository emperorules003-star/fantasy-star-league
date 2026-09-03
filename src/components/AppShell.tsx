import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Trophy, Wallet, User, Shield, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/contests", label: "Contests", icon: Trophy },
  { to: "/leaderboard", label: "Ranks", icon: Shield },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/my-teams", label: "Teams", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const { profile, user } = useAuth();

  const { data: unread } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-gold)] font-display text-sm font-bold text-primary-foreground">
              FSL
            </span>
            <span className="font-display text-lg font-bold tracking-wide">
              {title ?? <span className="gold-text">Fantasy Star League</span>}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {profile && (
              <Link
                to="/wallet"
                className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              >
                {inr(profile.balance)}
              </Link>
            )}
            <Link to="/notifications" className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {!!unread && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-live px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-6">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-all duration-300",
                  active ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" />}
                <Icon className={cn("h-5 w-5", active && "text-primary drop-shadow-[0_0_8px_var(--color-primary)]")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
