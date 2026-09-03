import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { MatchCard, type MatchRow } from "@/components/MatchCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fantasy Star League — Cricket Fantasy Contests & Prize Pools" },
      {
        name: "description",
        content:
          "Pick upcoming cricket matches, build your fantasy XI, join contests and win from real prize pools on Fantasy Star League.",
      },
      { property: "og:title", content: "Fantasy Star League — Cricket Fantasy Contests & Prize Pools" },
      {
        property: "og:description",
        content: "Pick upcoming cricket matches, build your fantasy XI and join contests on Fantasy Star League.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { profile, user } = useAuth();

  const { data: matches, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .neq("status", "completed")
        .order("match_time", { ascending: true });
      if (error) throw error;
      return data as unknown as MatchRow[];
    },
  });

  return (
    <AppShell>
      <section className="surface-card mb-5 overflow-hidden p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              {user ? `Welcome back, ${profile?.name ?? "Player"}` : "Welcome to"}
            </p>
            <h1 className="font-display text-2xl font-bold gold-text">Fantasy Star League</h1>
          </div>
          {user ? (
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Balance</p>
              <p className="stat-number text-xl">{inr(profile?.balance ?? 0)}</p>
            </div>
          ) : (
            <Link to="/auth">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Upcoming Matches</h2>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        {matches?.map((m) => <MatchCard key={m.id} match={m} />)}
        {matches?.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No matches scheduled right now.</p>
        )}
      </div>
    </AppShell>
  );
}
