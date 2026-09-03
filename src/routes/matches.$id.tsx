import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ContestCard, type ContestRow } from "@/components/ContestCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { MatchRow } from "@/components/MatchCard";
import { countdown, shortDate } from "@/lib/format";

export const Route = createFileRoute("/matches/$id")({
  head: () => ({
    meta: [
      { title: "Match Contests — Fantasy Star League" },
      { name: "description", content: "Live match details, squads and all fantasy contests for this cricket fixture." },
      { property: "og:title", content: "Match Contests — Fantasy Star League" },
      { property: "og:description", content: "Live match details and all fantasy contests for this fixture." },
    ],
  }),
  component: MatchPage,
});

function MatchPage() {
  const { id } = Route.useParams();

  const { data: match, isLoading } = useQuery({
    queryKey: ["match", id],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as (MatchRow & { commentary: string[]; result: string | null }) | null;
    },
  });

  const { data: contests } = useQuery({
    queryKey: ["contests", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("match_id", id)
        .eq("status", "active")
        .order("prize_pool", { ascending: false });
      if (error) throw error;
      return data as unknown as ContestRow[];
    },
  });

  return (
    <AppShell>
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      {isLoading && <Skeleton className="h-32 rounded-xl" />}

      {match && (
        <section className="surface-card mb-5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{match.tournament}</p>
          <h1 className="mt-1 font-display text-xl font-bold">
            {match.team1} <span className="text-primary">vs</span> {match.team2}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">{shortDate(match.match_time)}</p>

          {match.status === "live" ? (
            <div className="mt-3 rounded-lg border border-live/40 bg-live/10 p-3">
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-live">
                <Radio className="h-3 w-3 animate-pulse" /> Live Score
              </p>
              <p className="mt-1 font-display text-lg">
                {match.team1_short ?? match.team1}: {match.score_team1 ?? "—"}
              </p>
              <p className="font-display text-lg">
                {match.team2_short ?? match.team2}: {match.score_team2 ?? "—"}
              </p>
              {!!match.commentary?.length && (
                <ul className="mt-2 space-y-1 border-t border-live/25 pt-2 text-xs text-muted-foreground">
                  {match.commentary.slice(0, 5).map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-muted/60 p-3 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Starts in</p>
              <p className="stat-number text-2xl">{countdown(match.match_time)}</p>
            </div>
          )}

          {match.result && <p className="mt-3 text-sm font-semibold text-success">{match.result}</p>}

          <Link to="/create-team/$matchId" params={{ matchId: id }} search={{ contest: "" }}>
            <Button className="mt-4 w-full">Create Team</Button>
          </Link>
        </section>
      )}

      <h2 className="mb-3 font-display text-lg font-bold">Contests</h2>
      <div className="space-y-3">
        {contests?.map((c) => <ContestCard key={c.id} contest={c} />)}
        {contests?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No contests for this match yet.</p>
        )}
      </div>
    </AppShell>
  );
}
