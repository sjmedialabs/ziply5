"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, authedPatch, authedPost } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";

type Summary = {
  grossSales: string | number;
  netRevenue: string | number;
  orderCount: number;
  refundsTotal: string | number;
};

type Refund = {
  id: string;
  orderId: string;
  amount: string | number;
  status: string;
  reason: string | null;
  createdAt: string;
  order?: { id: string };
};

const RF_STATUSES = ["pending", "initiated", "completed", "manual_refunded", "rejected"] as const;

export default function AdminFinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rfDraft, setRfDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [refundFilter, setRefundFilter] = useState("all");
  const [orderId, setOrderId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      authedFetch<Summary>("/api/v1/finance/summary"),
      authedFetch<Refund[]>("/api/v1/finance/refunds?page=1&limit=50"),
    ])
      .then(([s, r]) => {
        setSummary(s);
        setRefunds(r);
        const rf: Record<string, string> = {};
        r.forEach((x) => {
          rf[x.id] = x.status;
        });
        setRfDraft(rf);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTables({
    tables: ["refunds", "orders"],
    onChange: () => {
      void load();
    },
  });

  const saveRf = async (id: string) => {
    const status = rfDraft[id];
    if (!status) return;
    setBusy(`rf-${id}`);
    setError("");
    try {
      await authedPatch(`/api/v1/finance/refunds/${id}`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const markManualRefund = async (id: string) => {
    setBusy(`rfm-${id}`);
    setError("");
    try {
      await authedPatch(`/api/v1/finance/refunds/${id}`, { status: "manual_refunded" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const triggerRefund = async (id: string) => {
    setBusy(`rft-${id}`);
    setError("");
    try {
      await authedFetch(`/api/v1/finance/refunds/${id}/trigger`, {
        method: "POST",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trigger failed");
    } finally {
      setBusy(null);
    }
  };

  const createRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(refundAmount);
    if (!orderId.trim() || !Number.isFinite(amt) || amt <= 0) return;
    setBusy("create-refund");
    setError("");
    try {
      await authedPost("/api/v1/finance/refunds", {
        orderId: orderId.trim(),
        amount: amt,
        reason: refundReason.trim() || undefined,
      });
      setOrderId("");
      setRefundAmount("");
      setRefundReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setBusy(null);
    }
  };

  const filteredRefunds = refunds.filter((refund) => {
    if (refundFilter === "pending") return ["pending", "processing", "initiated"].includes(refund.status);
    if (refundFilter === "failed") return ["failed", "rejected"].includes(refund.status);
    return true;
  });

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Finance</h1>
        <p className="text-sm text-[#646464]">Store totals, transactions, and order refunds.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Gross sales", v: `Rs.${Number(summary.grossSales).toFixed(2)}` },
            { label: "Net revenue", v: `Rs.${Number(summary.netRevenue).toFixed(2)}` },
            { label: "Orders", v: String(summary.orderCount) },
            { label: "Refunded Amount", v: `Rs.${Number(summary.refundsTotal).toFixed(2)}` },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-[#646464]">{c.label}</p>
              <p className="mt-1 font-melon text-xl font-bold text-[#4A1D1F]">{c.v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
        <h2 className="font-melon text-lg font-semibold text-[#4A1D1F]">Record refund</h2>
        <form onSubmit={createRefund} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold uppercase text-[#646464]">
            Order ID
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="mt-1 block rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464]">
            Amount
            <input
              type="number"
              step="0.01"
              min="0"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="mt-1 block w-32 rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464]">
            Reason
            <input
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="mt-1 block rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "create-refund"}
            className="rounded-full bg-[#7B3010] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {busy === "create-refund" ? "Saving…" : "Create refund"}
          </button>
        </form>
      </div>

      {!loading && (
        <>
          <div>
            <h2 className="mb-2 font-melon text-lg font-semibold text-[#4A1D1F]">Refunds</h2>
            <div className="mb-2">
              <select
                value={refundFilter}
                onChange={(event) => setRefundFilter(event.target.value)}
                className="rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-xs text-[#4A1D1F]"
              >
                <option value="all">All refunds</option>
                <option value="pending">Refund pending</option>
                <option value="failed">Failed refunds</option>
              </select>
            </div>
            <ConsoleTable headers={["Order", "Reference", "Amount", "Status", "Created", ""]}>
              {filteredRefunds.length === 0 ? (
                <tr>
                  <ConsoleTd className="py-6 text-center text-[#646464]" colSpan={6}>
                    No refunds.
                  </ConsoleTd>
                </tr>
              ) : (
                filteredRefunds.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FFFBF3]/80">
                    <ConsoleTd className="font-mono text-[11px]">{(r.order?.id ?? r.orderId).slice(0, 14)}…</ConsoleTd>
                    <ConsoleTd className="text-[11px]">{r.id.slice(0, 10)}...</ConsoleTd>
                    <ConsoleTd>Rs.{Number(r.amount).toFixed(2)}</ConsoleTd>
                    <ConsoleTd>
                      <select
                        value={rfDraft[r.id] ?? r.status}
                        onChange={(e) => setRfDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                        className="rounded-lg border border-[#D9D9D1] bg-white px-2 py-1 text-xs capitalize"
                      >
                        {RF_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </ConsoleTd>
                    <ConsoleTd className="text-xs">{new Date(r.createdAt).toLocaleString()}</ConsoleTd>
                    <ConsoleTd>
                      <button
                        type="button"
                        disabled={busy === `rf-${r.id}` || (rfDraft[r.id] ?? r.status) === r.status}
                        onClick={() => saveRf(r.id)}
                        className="rounded-full bg-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-40"
                      >
                        {busy === `rf-${r.id}` ? "…" : "Apply"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === `rfm-${r.id}`}
                        onClick={() => markManualRefund(r.id)}
                        className="ml-2 rounded-full border border-[#E8DCC8] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase text-[#4A1D1F] disabled:opacity-40"
                      >
                        {busy === `rfm-${r.id}` ? "…" : "Mark manual"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === `rft-${r.id}`}
                        onClick={() => triggerRefund(r.id)}
                        className="ml-2 rounded-full border border-[#E8DCC8] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase text-[#4A1D1F] disabled:opacity-40"
                      >
                        {busy === `rft-${r.id}` ? "…" : "Trigger refund"}
                      </button>
                    </ConsoleTd>
                  </tr>
                ))
              )}
            </ConsoleTable>
          </div>
        </>
      )}
    </section>
  );
}
