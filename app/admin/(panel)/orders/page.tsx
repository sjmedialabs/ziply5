"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, authedPatch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OrderRow = {
  id: string;
  status: string;
  total: string | number;
  createdAt: string;
  items: Array<{ quantity: number; product: { name: string; slug: string } }>;
  transactions?: Array<{ status: string }>;
  user?: { id: string; name: string; email: string };
};

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRows = rows.filter((o) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const paid = Boolean(o.transactions?.some((t) => /paid|captured|success/i.test(t.status)));
    return (
      o.id.toLowerCase().includes(term) ||
      o.user?.name?.toLowerCase().includes(term) ||
      o.user?.email?.toLowerCase().includes(term) ||
      o.user?.id?.toLowerCase().includes(term) ||
      o.items.some((item) => item.product.name.toLowerCase().includes(term)) ||
      o.total.toString().includes(term) ||
      o.status.toLowerCase().includes(term) ||
      (paid ? "paid" : "unpaid").includes(term)
    );
  });

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
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-md rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm placeholder-[#646464] focus:border-[#7B3010] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => load()}
            className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && (
        <ConsoleTable headers={["Paid", "Order", "Placed", "Lines", "Total", "Status", ""]}>
          {filteredRows.length === 0 ? (
            <tr>
              <ConsoleTd className="py-8 text-center text-[#646464]" colSpan={7}>
                {rows.length === 0 ? "No orders in the database yet. Place a test order from the storefront checkout." : "No orders match your search."}
              </ConsoleTd>
            </tr>
          ) : (
            filteredRows.map((o) => {
              const paid = Boolean(o.transactions?.some((t) => /paid|captured|success/i.test(t.status)));
              return (
                <tr key={o.id} className="hover:bg-[#FFFBF3]/80">
                  <ConsoleTd>
                    <span
                      title={paid ? "Payment completed" : "Payment pending"}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                        paid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {paid ? "✓" : "–"}
                    </span>
                  </ConsoleTd>
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
                    <Select value={draft[o.id] ?? o.status} onValueChange={(value) => setDraft((d) => ({ ...d, [o.id]: value }))}>
                      <SelectTrigger className="w-full max-w-[140px] rounded-lg border border-[#D9D9D1] bg-white px-2 py-1 text-xs capitalize" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <button
                      type="button"
                      onClick={() => window.location.assign(`/admin/orders/${o.id}`)}
                      className="ml-2 rounded-lg border border-[#E8DCC8] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
                    >
                      View
                    </button>
                  </ConsoleTd>
                </tr>
              )
            })
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
