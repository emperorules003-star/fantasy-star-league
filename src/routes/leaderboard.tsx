import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Fantasy Star League" },
      { name: "description", content: "See the top fantasy cricket players ranked by total winnings and contests won." },
      { property: "og:title", content: "Leaderboard — Fantasy Star League" },
      { property: "og:description", content: "Top fantasy cricket players ranked by winnings." },
    ],
  }),
  component: LeaderboardPage,
});

type Row = {
  user_id: string;
  display_name: string | null;
  total_winnings: number;
  contests_won: number;
  contests_played: number;
};

function LeaderboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const top = data?.slice(0, 3) ?? [];
  const rest = data?.slice(3) ?? [];
  const myRank = data?.findIndex((r) => r.user_id === user?.id);

  return (
    <AppShell>
      <header className="mb-4 text-center">
        <Trophy className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-1 font-display text-2xl font-bold gold-text">Leaderboard</h1>
        <p className="text-xs text-muted-foreground">Ranked by total winnings</p>
      </header>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      )}

      {top.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[top[1], top[0], top[2]].map((r, idx) =>
            r ? (
              <div
                key={r.user_id}
                className={cn(
                  "surface-card flex flex-col items-center p-3 text-center",
                  idx === 1 && "-mt-2 border-[var(--gold)] shadow-[var(--shadow-gold)]",
                  idx === 0 && "border-[var(--silver)]/60",
                  idx === 2 && "border-[var(--bronze)]/60",
                )}
              >
                {idx === 1 ? (
                  <Crown className="h-5 w-5 text-[var(--gold)]" />
                ) : (
                  <Medal
                    className={cn("h-5 w-5", idx === 0 ? "text-[var(--silver)]" : "text-[var(--bronze)]")}
                  />
                )}
                <p className="mt-1 w-full truncate text-xs font-semibold">{r.display_name ?? "Player"}</p>
                <p className={cn("stat-number text-sm", idx === 1 ? "text-[var(--gold)]" : idx === 0 ? "text-[var(--silver)]" : "text-[var(--bronze)]")}>{inr(r.total_winnings, { compact: true })}</p>
                <p className="text-[10px] text-muted-foreground">{r.contests_won} wins</p>
              </div>
            ) : (
              <div key={idx} />
            ),
          )}
        </div>
      )}

      <div className="space-y-2">
        {rest.map((r, i) => (
          <div
            key={r.user_id}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3",
              r.user_id === user?.id ? "border-primary bg-primary/10" : "border-border bg-card",
            )}
          >
            <span className="w-6 text-center font-display text-sm font-bold text-muted-foreground">{i + 4}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.display_name ?? "Player"}</p>
              <p className="text-[11px] text-muted-foreground">
                {r.contests_played} played · {r.contests_won} won
              </p>
            </div>
            <span className="font-display text-sm font-bold text-primary">
              {inr(r.total_winnings, { compact: true })}
            </span>
          </div>
        ))}
      </div>

      {typeof myRank === "number" && myRank >= 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your rank: <span className="font-bold text-primary">#{myRank + 1}</span>
        </p>
      )}

      {data?.length === 0 && !isLoading && (
        <p className="py-10 text-center text-sm text-muted-foreground">No rankings yet — be the first to win.</p>
      )}
    </AppShell>
  );
}
