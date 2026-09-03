import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Ban, Check, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { inr, shortDate } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Fantasy Star League" },
      { name: "description", content: "Manage users, KYC approvals, withdrawals and platform analytics." },
      { property: "og:title", content: "Admin Dashboard — Fantasy Star League" },
      { property: "og:description", content: "Manage users, KYC, withdrawals and analytics." },
    ],
  }),
  component: AdminPage,
});

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  balance: number;
  is_active: boolean;
  is_kyc_verified: boolean;
  total_deposits: number;
  created_at: string;
};

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  account_holder: string;
  bank_account: string;
  ifsc_code: string;
  created_at: string;
};

type Analytics = {
  total_users?: number;
  active_users?: number;
  total_deposits?: number;
  total_withdrawals?: number;
  pending_withdrawals?: number;
  total_contests?: number;
  platform_revenue?: number;
};

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  const { data: stats } = useQuery({
    queryKey: ["admin-analytics"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_analytics");
      if (error) throw error;
      return (data ?? {}) as Analytics;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users");
      if (error) throw error;
      return (data ?? []) as unknown as AdminUser[];
    },
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["admin-withdrawals"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Withdrawal[];
    },
  });

  const { data: kycDocs } = useQuery({
    queryKey: ["admin-kyc"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_documents")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as {
        id: string;
        user_id: string;
        document_type: string;
        document_number: string;
        created_at: string;
      }[];
    },
  });

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await fn();
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success(ok);
  }

  const cards = [
    { label: "Users", value: String(stats?.total_users ?? 0) },
    { label: "Active", value: String(stats?.active_users ?? 0) },
    { label: "Deposits", value: inr(stats?.total_deposits ?? 0, { compact: true }) },
    { label: "Payouts", value: inr(stats?.total_withdrawals ?? 0, { compact: true }) },
    { label: "Pending", value: String(stats?.pending_withdrawals ?? 0) },
    { label: "Revenue", value: inr(stats?.platform_revenue ?? 0, { compact: true }) },
  ];

  return (
    <AppShell>
      <h1 className="mb-4 font-display text-xl font-bold gold-text">Admin Dashboard</h1>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-3 text-center">
            <p className="stat-number text-lg">{c.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="withdrawals">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="withdrawals">Payouts</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="mt-4 space-y-2">
          {withdrawals?.map((w) => (
            <div key={w.id} className="surface-card p-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-primary">{inr(w.amount)}</span>
                <span className="text-[11px] capitalize text-muted-foreground">{w.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {w.account_holder} · {w.bank_account} · {w.ifsc_code}
              </p>
              <p className="text-[10px] text-muted-foreground">{shortDate(w.created_at)}</p>
              {w.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      run(
                        () => supabase.rpc("process_withdrawal", { _id: w.id, _approve: true, _note: "Approved" }),
                        "Withdrawal approved",
                      )
                    }
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      run(
                        () => supabase.rpc("process_withdrawal", { _id: w.id, _approve: false, _note: "Rejected" }),
                        "Withdrawal rejected & refunded",
                      )
                    }
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
          {withdrawals?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No withdrawal requests.</p>
          )}
        </TabsContent>

        <TabsContent value="kyc" className="mt-4 space-y-2">
          {kycDocs?.map((d) => (
            <div key={d.id} className="surface-card p-3">
              <p className="text-sm font-semibold">
                {d.document_type} · {d.document_number}
              </p>
              <p className="text-[10px] text-muted-foreground">{shortDate(d.created_at)}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    run(
                      () => supabase.rpc("admin_set_kyc", { _user_id: d.user_id, _approved: true }),
                      "KYC approved",
                    )
                  }
                >
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    run(
                      () => supabase.rpc("admin_set_kyc", { _user_id: d.user_id, _approved: false }),
                      "KYC rejected",
                    )
                  }
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            </div>
          ))}
          {kycDocs?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No pending KYC documents.</p>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-2">
          {users?.map((u) => (
            <div key={u.id} className="surface-card p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{u.name ?? "Player"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {u.email} {u.phone ? `· ${u.phone}` : ""}
                  </p>
                </div>
                <span className="font-display text-sm font-bold text-primary">{inr(u.balance)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    u.is_kyc_verified ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {u.is_kyc_verified ? "KYC" : "No KYC"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() =>
                    run(
                      () => supabase.rpc("admin_set_active", { _user_id: u.id, _active: !u.is_active }),
                      u.is_active ? "User suspended" : "User reactivated",
                    )
                  }
                >
                  <Ban className="mr-1 h-3.5 w-3.5" />
                  {u.is_active ? "Suspend" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
