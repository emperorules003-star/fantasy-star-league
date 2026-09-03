import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { inr, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Fantasy Star League" },
      { name: "description", content: "Add funds, track your ledger and withdraw winnings after KYC verification." },
      { property: "og:title", content: "Wallet — Fantasy Star League" },
      { property: "og:description", content: "Add funds, track transactions and withdraw winnings." },
    ],
  }),
  component: WalletPage,
});

const QUICK = [200, 300, 500, 1000, 10000];
const METHODS = ["UPI", "Card", "Netbanking"] as const;

type Txn = {
  id: string;
  amount: number;
  type: string;
  method: string | null;
  status: string;
  description: string | null;
  created_at: string;
};

function WalletPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("500");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("UPI");
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [wAmount, setWAmount] = useState("");
  const [bank, setBank] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [holder, setHolder] = useState("");

  const [docType, setDocType] = useState("PAN");
  const [docNumber, setDocNumber] = useState("");
  const [txnFilter, setTxnFilter] = useState<"all" | "razorpay" | "upi">("all");

  const [upiQr, setUpiQr] = useState<string | null>(null);
  const [upiDepositId, setUpiDepositId] = useState<string | null>(null);
  const [upiStatus, setUpiStatus] = useState<"idle" | "creating" | "pending" | "completed">("idle");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true" && user) {
      queryClient.invalidateQueries();
      toast.success("Deposit successful — wallet refreshed");
      navigate({ to: "/wallet", search: {} });
    }
  }, [user, queryClient, navigate]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: txns } = useQuery({
    queryKey: ["transactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 6);
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Txn[];
    },
  });

  const { data: kyc } = useQuery({
    queryKey: ["kyc", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as { id: string; document_type: string; status: string; created_at: string }[];
    },
  });

  async function completePayment() {
    const value = Number(amount);
    if (!value || value < 50) {
      toast.error("Minimum deposit is ₹50");
      return;
    }
    setBusy(true);
    // Payment-gateway stub: in production this reference comes from the
    // verified Razorpay/Cashfree webhook at /api/public/payments/webhook.
    const reference = `PG_${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.rpc("confirm_deposit", {
      _amount: value,
      _method: method,
      _gateway_ref: reference,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPayOpen(false);
    await queryClient.invalidateQueries();
    toast.success(`${inr(value)} added to your wallet`);
  }

  async function payWithUPI() {
    const value = Number(amount);
    if (!value || value < 50) {
      toast.error("Minimum deposit is ₹50");
      return;
    }
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    setUpiStatus("creating");
    try {
      const res = await fetch("https://p2p-payment-service.onrender.com/api/p2p/deposit/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amount: value }),
      });
      if (!res.ok) throw new Error(`Payment service error (${res.status})`);
      const data = (await res.json()) as Record<string, unknown>;
      const depositId = (data["depositId"] ?? data["deposit_id"] ?? data["id"]) as string | undefined;
      const qr = (data["qrCode"] ?? data["qr_code"] ?? data["qr"] ?? data["upiString"] ?? data["upi_string"] ?? data["paymentUrl"]) as
        | string
        | undefined;
      if (!depositId) throw new Error("Payment service did not return a deposit id");
      setUpiDepositId(depositId);
      setUpiQr(qr ?? null);
      setUpiStatus("pending");
    } catch (e) {
      setUpiStatus("idle");
      toast.error(e instanceof Error ? e.message : "Could not start UPI payment");
    }
  }

  function resetUpi() {
    setUpiDepositId(null);
    setUpiQr(null);
    setUpiStatus("idle");
  }

  const upiQrSrc = upiQr
    ? upiQr.startsWith("data:") || upiQr.startsWith("http")
      ? upiQr
      : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiQr)}`
    : null;

  useEffect(() => {
    if (!upiDepositId || upiStatus !== "pending") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`https://p2p-payment-service.onrender.com/api/p2p/deposit/status/${upiDepositId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string };
        if (cancelled) return;
        if (data.status === "completed") {
          setUpiStatus("completed");
          await queryClient.invalidateQueries();
          toast.success(`${inr(Number(amount) || 0)} deposit confirmed — wallet refreshed`);
          setTimeout(() => {
            if (!cancelled) {
              setPayOpen(false);
              resetUpi();
            }
          }, 1800);
        } else if (data.status === "failed" || data.status === "expired" || data.status === "cancelled") {
          toast.error(`Deposit ${data.status}`);
          resetUpi();
        }
      } catch {
        // keep polling on transient errors
      }
    };
    void tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upiDepositId, upiStatus]);

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("request_withdrawal", {
      _amount: Number(wAmount),
      _bank_account: bank,
      _ifsc: ifsc,
      _holder: holder,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*ERROR:\s*/, ""));
      return;
    }
    setWAmount("");
    await queryClient.invalidateQueries();
    toast.success("Withdrawal requested — pending admin approval");
  }

  async function submitKyc(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("kyc_documents").insert({
      user_id: user.id,
      document_type: docType,
      document_number: docNumber,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDocNumber("");
    await queryClient.invalidateQueries();
    toast.success("Document submitted for review");
  }

  return (
    <AppShell>
      <section className="surface-card mb-4 p-5 text-center">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Balance</p>
        <p className="stat-number my-1 text-5xl text-primary drop-shadow-[0_0_18px_rgba(245,166,35,0.35)]">{inr(profile?.balance ?? 0)}</p>
        <div className="mt-2 flex justify-center gap-6 text-[11px] text-muted-foreground">
          <span>Deposited {inr(profile?.total_deposits ?? 0, { compact: true })}</span>
          <span>Won {inr(profile?.total_winnings ?? 0, { compact: true })}</span>
        </div>
        <Button className="mt-4 w-full" onClick={() => setPayOpen(true)}>
          Add Funds
        </Button>
      </section>

      <Tabs defaultValue="history">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {(["all", "razorpay", "upi"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTxnFilter(f)}
                className={cn(
                  "rounded-lg border py-2 text-xs font-semibold transition-colors",
                  txnFilter === f ? "border-primary bg-primary/15 text-primary" : "border-border hover:border-primary/30",
                )}
              >
                {f === "all" ? "All" : f === "razorpay" ? "Razorpay" : "UPI"}
              </button>
            ))}
          </div>

          {txns
            ?.filter((t) => {
              if (txnFilter === "all") return true;
              if (txnFilter === "upi")
                return t.method === "UPI" || (t.description ?? "").toLowerCase().includes("upi");
              return t.type === "deposit" && t.method !== "UPI" && !(t.description ?? "").toLowerCase().includes("upi");
            })
            ?.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  Number(t.amount) >= 0 ? "bg-success/15 text-success" : "bg-live/15 text-live",
                )}
              >
                {Number(t.amount) >= 0 ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold capitalize">
                  {t.description ?? t.type.replace("_", " ")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {shortDate(t.created_at)} · {t.status}
                </p>
              </div>
              <span
                className={cn(
                  "font-display text-sm font-bold",
                  Number(t.amount) >= 0 ? "text-success" : "text-live",
                )}
              >
                {Number(t.amount) >= 0 ? "+" : ""}
                {inr(t.amount)}
              </span>
            </div>
          ))}
          {txns?.filter((t) => {
            if (txnFilter === "all" ) return true;
            if (txnFilter === "upi")
              return t.method === "UPI" || (t.description ?? "").toLowerCase().includes("upi");
            return t.type === "deposit" && t.method !== "UPI" && !(t.description ?? "").toLowerCase().includes("upi");
          }).length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {txnFilter === "all" ? "No transactions in the last 6 months." : `No ${txnFilter === "upi" ? "UPI" : "Razorpay"} deposits found.`}
            </p>
          )}
        </TabsContent>

        <TabsContent value="withdraw" className="mt-4">
          {!profile?.is_kyc_verified ? (
            <div className="surface-card p-5 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 font-semibold">Verify to Withdraw</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Complete KYC verification in the KYC tab before requesting a payout.
              </p>
            </div>
          ) : (
            <form onSubmit={submitWithdrawal} className="surface-card space-y-3 p-4">
              <div>
                <Label htmlFor="w-amt">Amount (min ₹200)</Label>
                <Input id="w-amt" inputMode="numeric" required value={wAmount} onChange={(e) => setWAmount(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="w-holder">Account holder</Label>
                <Input id="w-holder" required value={holder} onChange={(e) => setHolder(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="w-acc">Account number</Label>
                <Input id="w-acc" required value={bank} onChange={(e) => setBank(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="w-ifsc">IFSC code</Label>
                <Input id="w-ifsc" required value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Request Withdrawal
              </Button>
            </form>
          )}
        </TabsContent>

        <TabsContent value="kyc" className="mt-4 space-y-3">
          <div
            className={cn(
              "rounded-xl border p-3 text-sm",
              profile?.is_kyc_verified
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {profile?.is_kyc_verified ? "KYC verified — withdrawals enabled." : "KYC not verified yet."}
          </div>

          <form onSubmit={submitKyc} className="surface-card space-y-3 p-4">
            <div>
              <Label htmlFor="doc-type">Document type</Label>
              <select
                id="doc-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
              >
                <option value="PAN">PAN Card</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="Bank">Bank Passbook</option>
              </select>
            </div>
            <div>
              <Label htmlFor="doc-num">Document number</Label>
              <Input id="doc-num" required value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              Submit for verification
            </Button>
          </form>

          {kyc?.map((d) => (
            <div key={d.id} className="flex justify-between rounded-xl border border-border bg-card p-3 text-sm">
              <span>{d.document_type}</span>
              <span className="capitalize text-muted-foreground">{d.status}</span>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog
        open={payOpen}
        onOpenChange={(open) => {
          setPayOpen(open);
          if (!open) resetUpi();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
            <DialogDescription>
              Choose Razorpay checkout or pay via UPI through the P2P payment service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    Number(amount) === q ? "border-primary bg-primary/15 text-primary" : "border-border",
                  )}
                >
                  ₹{q}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-lg border py-2 text-xs font-semibold",
                    method === m ? "border-primary bg-primary/15 text-primary" : "border-border",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <Button className="w-full" disabled={busy} onClick={completePayment}>
              {busy ? "Processing…" : `Pay with Razorpay ${inr(Number(amount) || 0)}`}
            </Button>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative flex justify-center text-xs uppercase text-muted-foreground">
                <span className="bg-card px-2">or</span>
              </span>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10"
              onClick={payWithUPI}
              disabled={upiStatus === "creating" || upiStatus === "pending"}
            >
              <Smartphone className="h-4 w-4" />
              {upiStatus === "creating" ? "Starting payment…" : "Pay with UPI"}
            </Button>

            {upiStatus !== "idle" && upiStatus !== "creating" && (
              <div className="surface-card space-y-3 p-4 text-center">
                {upiQrSrc && upiStatus === "pending" && (
                  <img
                    src={upiQrSrc}
                    alt="UPI payment QR code"
                    className="mx-auto h-48 w-48 rounded-lg border border-border"
                  />
                )}
                {upiStatus === "pending" ? (
                  <>
                    <p className="text-sm font-semibold">Scan & pay {inr(Number(amount) || 0)} with any UPI app</p>
                    <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Waiting for payment confirmation…
                    </p>
                    {upiDepositId && (
                      <p className="text-[10px] text-muted-foreground">Ref: {upiDepositId}</p>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs" onClick={resetUpi}>
                      Cancel payment
                    </Button>
                  </>
                ) : (
                  <p className="flex items-center justify-center gap-2 text-sm font-semibold text-success">
                    <ShieldCheck className="h-4 w-4" />
                    Payment confirmed
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
