import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Fantasy Star League" },
      { name: "description", content: "Contest results, wallet updates and match alerts from Fantasy Star League." },
      { property: "og:title", content: "Notifications — Fantasy Star League" },
      { property: "og:description", content: "Contest results, wallet updates and match alerts." },
    ],
  }),
  component: NotificationsPage,
});

type Note = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as Note[];
    },
  });

  async function markAll() {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    await queryClient.invalidateQueries();
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Notifications</h1>
        <Button variant="ghost" size="sm" onClick={markAll}>
          <CheckCheck className="mr-1 h-4 w-4" /> Mark all read
        </Button>
      </div>

      <div className="space-y-2">
        {data?.map((n) => (
          <div
            key={n.id}
            className={cn(
              "rounded-xl border p-3",
              n.is_read ? "border-border bg-card" : "border-primary/40 bg-primary/10",
            )}
          >
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{shortDate(n.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
        {data?.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">You're all caught up.</p>
        )}
      </div>
    </AppShell>
  );
}
