import { Link } from "@tanstack/react-router";
import { Trophy, Users } from "lucide-react";
import { inr } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

export type ContestRow = {
  id: string;
  match_id: string;
  contest_name: string;
  category: string;
  prize_pool: number;
  entry_fee: number;
  total_spots: number;
  spots_filled: number;
  winners_count: number;
  max_teams_per_user: number;
  status: string;
};

export function ContestCard({ contest }: { contest: ContestRow }) {
  const left = Math.max(contest.total_spots - contest.spots_filled, 0);
  const pct = (contest.spots_filled / contest.total_spots) * 100;

  return (
    <article className="surface-card p-4 hover:border-primary/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Prize Pool</p>
          <p className="stat-number text-3xl text-primary">{inr(contest.prize_pool)}</p>
        </div>
        <div className="text-right">
          <span className="rounded-full bg-secondary/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
            {contest.category}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">{contest.contest_name}</p>
        </div>
      </div>

      <div className="mt-3">
        <Progress value={pct} className="h-1.5" />
        <div className="mt-1.5 flex justify-between text-[11px]">
          <span className="text-live">{left} spots left</span>
          <span className="text-muted-foreground">{contest.total_spots} spots</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
        <div className="flex gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-primary" /> {contest.winners_count} winners
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-primary" /> Max {contest.max_teams_per_user}
          </span>
        </div>
        <Link
          to="/create-team/$matchId"
          params={{ matchId: contest.match_id }}
          search={{ contest: contest.id }}
          className="btn-gold px-4 py-2 text-xs text-white"
        >
          Join {inr(contest.entry_fee)}
        </Link>
      </div>
    </article>
  );
}
