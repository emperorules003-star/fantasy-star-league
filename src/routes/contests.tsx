import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ContestCard, type ContestRow } from "@/components/ContestCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { inr, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contests")({
  head: () => ({
    meta: [
      { title: "Cricket Contests — Fantasy Star League" },
      {
        name: "description",
        content: "Browse mega, special and mini cricket fantasy contests with live prize pools and entry fees.",
      },
      { property: "og:title", content: "Cricket Contests — Fantasy Star League" },
      { property: "og:description", content: "Browse mega, special and mini cricket fantasy contests." },
    ],
  }),
  component: ContestsPage,
});

const CATEGORIES = ["All", "Mega", "Special", "Mini"];

function ContestsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: matches } = useQuery({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("id, team1, team2, match_time, tournament");
      if (error) throw error;
      return data as { id: string; team1: string; team2: string; match_time: string; tournament: string }[];
    },
  });

  const { data: contests, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("status", "active")
        .order("prize_pool", { ascending: false });
      if (error) throw error;
      return data as unknown as ContestRow[];
    },
  });

  const { data: myEntries, isLoading: loadingMine } = useQuery({
    queryKey: ["my-entries", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contest_entries")
        .select("id, entry_fee, created_at, contests(contest_name, prize_pool, winners_count, matches(team1, team2, match_time))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as {
        id: string;
        entry_fee: number;
        created_at: string;
        contests: {
          contest_name: string;
          prize_pool: number;
          winners_count: number;
          matches: { team1: string; team2: string; match_time: string };
        };
      }[];
    },
  });

  const matchLabel = (id: string) => {
    const m = matches?.find((x) => x.id === id);
    return m ? `${m.team1} vs ${m.team2}` : "";
  };

  const filtered = contests?.filter((c) => {
    const catOk = category === "All" || c.category === category;
    const q = search.trim().toLowerCase();
    const searchOk = !q || c.contest_name.toLowerCase().includes(q) || matchLabel(c.match_id).toLowerCase().includes(q);
    return catOk && searchOk;
  });

  const grouped = new Map<string, ContestRow[]>();
  filtered?.forEach((c) => {
    const arr = grouped.get(c.match_id) ?? [];
    arr.push(c);
    grouped.set(c.match_id, arr);
  });

  return (
    <AppShell>
      <h1 className="mb-3 font-display text-xl font-bold">Contests</h1>

      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger value="all">All Contests</TabsTrigger>
          <TabsTrigger value="mine">My Contests</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          <Input
            placeholder="Search contest or match…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
                  category === c
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}

          {[...grouped.entries()].map(([matchId, list]) => (
            <section key={matchId} className="space-y-3">
              <h2 className="pt-2 font-display text-sm font-bold text-muted-foreground">{matchLabel(matchId)}</h2>
              {list.map((c) => (
                <ContestCard key={c.id} contest={c} />
              ))}
            </section>
          ))}

          {filtered?.length === 0 && !isLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">No contests match your filters.</p>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4 space-y-3">
          {!user && <p className="py-10 text-center text-sm text-muted-foreground">Sign in to see your contests.</p>}
          {loadingMine && <Skeleton className="h-24 rounded-xl" />}
          {myEntries?.map((e) => (
            <div key={e.id} className="surface-card p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{e.contests?.contest_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.contests?.matches?.team1} vs {e.contests?.matches?.team2}
                  </p>
                </div>
                <div className="text-right">
                  <p className="stat-number text-lg">{inr(e.contests?.prize_pool)}</p>
                  <p className="text-[11px] text-muted-foreground">Paid {inr(e.entry_fee)}</p>
                </div>
              </div>
              <p className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                Joined {shortDate(e.created_at)}
              </p>
            </div>
          ))}
          {user && myEntries?.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">You haven't joined any contest yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
