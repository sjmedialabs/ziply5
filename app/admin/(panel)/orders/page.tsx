"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, authedPatch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type OrderRow = {
  id: string;
  status: string;
  total: string | number;
  createdAt: string;
  items: Array<{ quantity: number; product: { name: string; slug: string } }>;
};

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<{ items: OrderRow[] }>("/api/v1/orders?page=1&limit=50")
      .then((d) => {
        setRows(d.items);
        const next: Record<string, string> = {};
        d.items.forEach((o) => {
          next[o.id] = o.status;
        });
        setDraft(next);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveStatus = async (id: string) => {
    const status = draft[id];
    if (!status) return;
    setUpdating(id);
    setError("");
    try {
      await authedPatch(`/api/v1/orders/${id}`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Orders</h1>
          <p className="text-sm text-[#646464]">All store orders — update lifecycle status.</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
        >
          Refresh
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && (
        <ConsoleTable headers={["Order", "Placed", "Lines", "Total", "Status", ""]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd className="py-8 text-center text-[#646464]" colSpan={6}>
                No orders in the database yet. Place a test order from the storefront checkout.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((o) => (
              <tr key={o.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd>
                  <span className="font-mono text-[11px]">{o.id.slice(0, 12)}…</span>
                </ConsoleTd>
                <ConsoleTd>{new Date(o.createdAt).toLocaleString()}</ConsoleTd>
                <ConsoleTd>
                  <ul className="max-w-[200px] space-y-0.5 text-[11px]">
                    {o.items.map((l, i) => (
                      <li key={i}>
                        {l.product.name} ×{l.quantity}
                      </li>
                    ))}
                  </ul>
                </ConsoleTd>
                <ConsoleTd className="font-semibold">Rs.{Number(o.total).toFixed(2)}</ConsoleTd>
                <ConsoleTd>
                  <select
                    value={draft[o.id] ?? o.status}
                    onChange={(e) => setDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                    className="w-full max-w-[140px] rounded-lg border border-[#D9D9D1] bg-white px-2 py-1 text-xs capitalize"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </ConsoleTd>
                <ConsoleTd>
                  <button
                    type="button"
                    disabled={updating === o.id || (draft[o.id] ?? o.status) === o.status}
                    onClick={() => saveStatus(o.id)}
                    className="rounded-lg bg-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white disabled:opacity-40"
                  >
                    {updating === o.id ? "…" : "Apply"}
                  </button>
                </ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
