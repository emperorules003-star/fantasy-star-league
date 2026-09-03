import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Users, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/my-teams")({
  head: () => ({
    meta: [
      { title: "My Teams — Fantasy Star League" },
      {
        name: "description",
        content: "View every fantasy XI you have created, their captains, credits used and points scored.",
      },
      { property: "og:title", content: "My Teams — Fantasy Star League" },
      { property: "og:description", content: "All your fantasy cricket teams in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyTeamsPage,
});

type TeamRow = {
  id: string;
  team_name: string;
  points: number;
  total_credits_used: number;
  created_at: string;
  match_id: string;
  players: unknown;
  matches: { team1: string; team2: string; tournament: string | null; match_time: string; status: string } | null;
};

function MyTeamsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-teams", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fantasy_teams")
        .select("id,team_name,points,total_credits_used,created_at,match_id,players,matches(team1,team2,tournament,match_time,status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as TeamRow[];
    },
  });

  return (
    <AppShell title="My Teams">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-bold gold-text">My Teams</h1>
        <p className="text-xs text-muted-foreground">Every fantasy XI you have built</p>
      </header>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="surface-card p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">You haven&apos;t created any teams yet.</p>
          <Link to="/" className="btn-gold mt-4 inline-block px-5 py-2 text-xs text-white">
            Browse matches
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {data?.map((team) => {
          const count = Array.isArray(team.players) ? team.players.length : 0;
          return (
            <Link key={team.id} to="/matches/$id" params={{ id: team.match_id }} className="block">
              <article className="surface-card p-4 hover:border-primary/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {team.matches?.tournament ?? "Match"}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground">{shortDate(team.created_at)}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-white">
                  {team.matches ? `${team.matches.team1} vs ${team.matches.team2}` : "Match"}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <span>{team.team_name}</span>
                  <span>{count} players · {team.total_credits_used} cr</span>
                  <span className="flex items-center gap-1 font-display font-bold text-primary">
                    <Trophy className="h-3.5 w-3.5" /> {team.points} pts
                  </span>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
