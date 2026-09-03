import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, Users } from "lucide-react";
import { countdown, shortDate } from "@/lib/format";

export type MatchRow = {
  id: string;
  team1: string;
  team2: string;
  team1_short: string | null;
  team2_short: string | null;
  tournament: string | null;
  match_time: string;
  status: string;
  lineups_out: boolean;
  score_team1: string | null;
  score_team2: string | null;
};

function StatusBadge({ match }: { match: MatchRow }) {
  if (match.status === "live") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
        <Radio className="h-3 w-3 animate-pulse" /> Live
      </span>
    );
  }
  if (match.status === "completed") {
    return (
      <span className="rounded-full bg-muted-foreground/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
        Completed
      </span>
    );
  }
  if (match.lineups_out) {
    return (
      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
        Lineups Out
      </span>
    );
  }
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
      Upcoming
    </span>
  );
}

function initials(match: MatchRow, which: 1 | 2) {
  const short = which === 1 ? match.team1_short : match.team2_short;
  const full = which === 1 ? match.team1 : match.team2;
  return short ?? full.slice(0, 3).toUpperCase();
}

export function MatchCard({ match }: { match: MatchRow }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link to="/matches/$id" params={{ id: match.id }} className="block">
      <article className="surface-card p-4 hover:border-primary/60 hover:shadow-[var(--shadow-gold)] active:scale-[0.99]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            {match.tournament}
          </span>
          <StatusBadge match={match} />
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/25 font-display text-xs font-bold text-foreground">
              {initials(match, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{match.team1}</p>
              {match.score_team1 && <p className="truncate text-xs text-primary">{match.score_team1}</p>}
            </div>
          </div>

          <div className="shrink-0 px-1 text-center">
            <p className="font-display text-sm font-bold text-primary">
              {match.status === "live" ? "LIVE" : countdown(match.match_time)}
            </p>
            <p className="text-[10px] text-muted-foreground">{shortDate(match.match_time)}</p>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 text-right">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{match.team2}</p>
              {match.score_team2 && <p className="truncate text-xs text-primary">{match.score_team2}</p>}
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-display text-xs font-bold text-primary">
              {initials(match, 2)}
            </span>
          </div>
        </div>


        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Contests open
          </span>
          <span className="btn-gold px-4 py-1.5 text-xs">
            Create Team
          </span>
        </div>
      </article>
    </Link>
  );
}
