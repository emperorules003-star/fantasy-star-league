import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const payloadSchema = z.object({
  event: z.string().min(1).max(80),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().min(3).max(120),
        amount: z.number().int().min(100).max(100_000_000),
        method: z.string().min(2).max(40).default("UPI"),
        notes: z.object({ user_id: z.string().uuid() }),
      }),
    }),
  }),
});

/**
 * Payment gateway webhook (Razorpay / Cashfree compatible shape).
 * Set PAYMENT_WEBHOOK_SECRET and point the gateway at
 * https://project--<id>.lovable.app/api/public/payments/webhook
 */
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYMENT_WEBHOOK_SECRET"];
        if (!secret) return new Response("Gateway not configured", { status: 503 });

        const raw = await request.text();
        const signature =
          request.headers.get("x-razorpay-signature") ?? request.headers.get("x-webhook-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const given = Buffer.from(signature);
        const want = Buffer.from(expected);
        if (given.length !== want.length || !timingSafeEqual(given, want)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const parsed = payloadSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const event = parsed.data.event;
        if (event !== "payment.captured" && event !== "payment.success") {
          return Response.json({ ignored: true });
        }

        const entity = parsed.data.payload.payment.entity;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: existing } = await supabaseAdmin
          .from("wallet_transactions")
          .select("id")
          .eq("transaction_id", entity.id)
          .maybeSingle();
        if (existing) return Response.json({ duplicate: true });

        const amount = entity.amount / 100;
        const { error } = await supabaseAdmin.from("wallet_transactions").insert({
          user_id: entity.notes.user_id,
          amount,
          type: "deposit",
          method: entity.method,
          status: "completed",
          transaction_id: entity.id,
          description: "Wallet deposit",
        });
        if (error) return new Response("Ledger error", { status: 500 });

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("balance, total_deposits")
          .eq("id", entity.notes.user_id)
          .maybeSingle();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({
              balance: Number(profile.balance) + amount,
              total_deposits: Number(profile.total_deposits) + amount,
            })
            .eq("id", entity.notes.user_id);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
