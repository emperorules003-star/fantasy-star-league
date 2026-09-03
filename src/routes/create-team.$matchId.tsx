import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Player = {
  id: string;
  name: string;
  role: "WK" | "BAT" | "AR" | "BOWL";
  team: string;
  credits: number;
  runs: number;
  wickets: number;
  points: number;
};

const ROLES = ["WK", "BAT", "AR", "BOWL"] as const;
const LIMITS: Record<string, { min: number; max: number }> = {
  WK: { min: 1, max: 4 },
  BAT: { min: 3, max: 6 },
  AR: { min: 1, max: 4 },
  BOWL: { min: 3, max: 6 },
};
const BUDGET = 100;
const SQUAD_SIZE = 11;

export const Route = createFileRoute("/create-team/$matchId")({
  validateSearch: (search: Record<string, unknown>) => ({ contest: String(search["contest"] ?? "") }),
  head: () => ({
    meta: [
      { title: "Create Your Team — Fantasy Star League" },
      { name: "description", content: "Pick 11 players within 100 credits, set captain and vice-captain, join contests." },
      { property: "og:title", content: "Create Your Team — Fantasy Star League" },
      { property: "og:description", content: "Pick 11 players within 100 credits and join a contest." },
    ],
  }),
  component: CreateTeam,
});

function CreateTeam() {
  const { matchId } = Route.useParams();
  const { contest: contestId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const [selected, setSelected] = useState<string[]>([]);
  const [captain, setCaptain] = useState<string | null>(null);
  const [vice, setVice] = useState<string | null>(null);
  const [role, setRole] = useState<(typeof ROLES)[number]>("WK");
  const [search, setSearch] = useState("");
  const [teamName, setTeamName] = useState("My Team");
  const [busy, setBusy] = useState(false);

  const { data: players } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*").order("credits", { ascending: false });
      if (error) throw error;
      return data as unknown as Player[];
    },
  });

  const { data: contest } = useQuery({
    queryKey: ["contest", contestId],
    enabled: !!contestId,
    queryFn: async () => {
      const { data, error } = await supabase.from("contests").select("*").eq("id", contestId).maybeSingle();
      if (error) throw error;
      return data as unknown as { id: string; contest_name: string; entry_fee: number; prize_pool: number } | null;
    },
  });

  const byId = useMemo(() => new Map(players?.map((p) => [p.id, p])), [players]);
  const chosen = selected.map((id) => byId.get(id)!).filter(Boolean);
  const creditsUsed = chosen.reduce((s, p) => s + Number(p.credits), 0);
  const counts = Object.fromEntries(ROLES.map((r) => [r, chosen.filter((p) => p.role === r).length]));

  function toggle(p: Player) {
    if (selected.includes(p.id)) {
      setSelected(selected.filter((x) => x !== p.id));
      if (captain === p.id) setCaptain(null);
      if (vice === p.id) setVice(null);
      return;
    }
    if (selected.length >= SQUAD_SIZE) {
      toast.error("You already have 11 players");
      return;
    }
    if (creditsUsed + Number(p.credits) > BUDGET) {
      toast.error("Not enough credits left");
      return;
    }
    if ((counts[p.role] ?? 0) >= LIMITS[p.role]!.max) {
      toast.error(`Max ${LIMITS[p.role]!.max} ${p.role} players`);
      return;
    }
    setSelected([...selected, p.id]);
  }

  function validate() {
    if (selected.length !== SQUAD_SIZE) return "Pick exactly 11 players";
    for (const r of ROLES) {
      if ((counts[r] ?? 0) < LIMITS[r]!.min) return `Pick at least ${LIMITS[r]!.min} ${r}`;
    }
    if (!captain) return "Choose a captain";
    if (!vice) return "Choose a vice-captain";
    return null;
  }

  async function saveTeam(thenJoin: boolean) {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("fantasy_teams")
      .insert({
        user_id: user.id,
        match_id: matchId,
        team_name: teamName || "My Team",
        players: selected,
        captain_id: captain,
        vice_captain_id: vice,
        total_credits_used: creditsUsed,
      })
      .select("id")
      .single();

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    if (thenJoin && contestId) {
      const { error: joinError } = await supabase.rpc("join_contest", {
        _contest_id: contestId,
        _team_id: data.id,
      });
      setBusy(false);
      if (joinError) {
        toast.error(joinError.message.replace(/^.*ERROR:\s*/, ""));
        return;
      }
      await queryClient.invalidateQueries();
      toast.success("Contest joined!");
      navigate({ to: "/contests" });
      return;
    }

    setBusy(false);
    await queryClient.invalidateQueries();
    toast.success("Team saved");
    navigate({ to: "/matches/$id", params: { id: matchId } });
  }

  const list = players?.filter(
    (p) => p.role === role && p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <AppShell>
      <Link
        to="/matches/$id"
        params={{ id: matchId }}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to match
      </Link>

      <section className="surface-card mb-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Players</p>
            <p className="stat-number text-xl">
              {selected.length}
              <span className="text-sm text-muted-foreground">/11</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Credits left</p>
            <p className="stat-number text-xl">{(BUDGET - creditsUsed).toFixed(1)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Balance</p>
            <p className="stat-number text-xl">{inr(profile?.balance ?? 0, { compact: true })}</p>
          </div>
        </div>
        <Progress value={(creditsUsed / BUDGET) * 100} className="mt-3 h-1.5" />
        {contest && (
          <p className="mt-3 rounded-lg bg-secondary/20 px-3 py-2 text-xs">
            Joining <span className="font-semibold">{contest.contest_name}</span> · Entry {inr(contest.entry_fee)} ·
            Pool {inr(contest.prize_pool)}
          </p>
        )}
      </section>

      <div className="mb-3 flex gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              "flex-1 rounded-lg border px-2 py-2 text-xs font-bold transition-colors",
              role === r ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
            )}
          >
            {r}
            <span className="ml-1 text-[10px] opacity-70">({counts[r] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search players"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {list?.map((p) => {
          const isSel = selected.includes(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                isSel ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
            >
              <button onClick={() => toggle(p)} className="flex flex-1 items-center gap-3 text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/25 text-[10px] font-bold">
                  {p.role}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {p.runs} runs · {p.wickets} wkts · {p.points} pts
                  </span>
                </span>
              </button>

              {isSel && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setCaptain(captain === p.id ? null : p.id)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold",
                      captain === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    C
                  </button>
                  <button
                    onClick={() => setVice(vice === p.id ? null : p.id)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold",
                      vice === p.id ? "border-secondary bg-secondary text-secondary-foreground" : "border-border",
                    )}
                  >
                    VC
                  </button>
                </div>
              )}

              <span className="w-10 text-right font-display text-sm font-bold text-primary">{p.credits}</span>
              <button onClick={() => toggle(p)}>
                <Star className={cn("h-4 w-4", isSel ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-20 mt-5 space-y-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
        <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name" />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => saveTeam(false)}>
            Save Team
          </Button>
          <Button className="flex-1" disabled={busy || !contestId} onClick={() => saveTeam(true)}>
            {contestId ? "Save & Join" : "Pick a contest"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
