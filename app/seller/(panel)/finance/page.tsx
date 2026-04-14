"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, authedPost } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type FinancePayload = {
  myProducts: number;
  ordersTouchingMyProducts: number;
  revenueFromMyLines: string | number;
  withdrawals: Array<{
    id: string;
    amount: string | number;
    status: string;
    note: string | null;
    createdAt: string;
  }>;
};

export default function SellerFinancePage() {
  const [data, setData] = useState<FinancePayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<FinancePayload>("/api/v1/finance/my")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const requestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    setError("");
    try {
      await authedPost("/api/v1/finance/withdrawals", { amount: n, note: note.trim() || undefined });
      setAmount("");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Finance</h1>
        <p className="text-sm text-[#646464]">Revenue from your catalog lines and withdrawal requests.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "My products", v: String(data.myProducts) },
              { label: "Orders w/ my lines", v: String(data.ordersTouchingMyProducts) },
              {
                label: "Revenue (my lines)",
                v: `Rs.${Number(data.revenueFromMyLines).toFixed(2)}`,
              },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-[#646464]">{c.label}</p>
                <p className="mt-1 font-melon text-xl font-bold text-[#4A1D1F]">{c.v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="font-melon text-lg font-semibold text-[#4A1D1F]">Request withdrawal</h2>
            <form onSubmit={requestWithdrawal} className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold uppercase text-[#646464]">
                Amount
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 block w-36 rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464]">
                Note
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 block rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#7B3010] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
              >
                {saving ? "Submitting…" : "Submit"}
              </button>
            </form>
          </div>

          <div>
            <h2 className="mb-2 font-melon text-lg font-semibold text-[#4A1D1F]">Your withdrawals</h2>
            <ConsoleTable headers={["Amount", "Status", "Note", "Requested"]}>
              {data.withdrawals.length === 0 ? (
                <tr>
                  <ConsoleTd className="py-6 text-center text-[#646464]" colSpan={4}>
                    No withdrawals yet.
                  </ConsoleTd>
                </tr>
              ) : (
                data.withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-[#FFFBF3]/80">
                    <ConsoleTd className="font-semibold">Rs.{Number(w.amount).toFixed(2)}</ConsoleTd>
                    <ConsoleTd className="capitalize">{w.status}</ConsoleTd>
                    <ConsoleTd className="text-xs">{w.note ?? "—"}</ConsoleTd>
                    <ConsoleTd className="text-xs">{new Date(w.createdAt).toLocaleString()}</ConsoleTd>
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
