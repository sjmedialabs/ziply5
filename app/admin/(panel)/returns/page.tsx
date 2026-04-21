"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, authedPatch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";

type ReturnRow = {
  id: string;
  status: string;
  reason: string | null;
  createdAt: string;
  pickup?: { trackingRef: string | null; status: string } | null;
  order: { id: string; total: string | number; status: string };
};

const STATUSES = ["requested", "approved", "rejected", "received", "refunded", "cancelled"] as const;

export default function AdminReturnsPage() {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const filteredRows = rows.filter((row) => {
    if (filter === "pending" && !["requested", "approved", "picked_up"].includes(row.status)) return false;
    return true;
  });

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<ReturnRow[]>("/api/v1/returns")
      .then((r) => {
        setRows(r);
        const d: Record<string, string> = {};
        r.forEach((x) => {
          d[x.id] = x.status;
        });
        setDraft(d);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTables({
    tables: ["returns", "orders"],
    onChange: () => {
      void load();
    },
  });

  const save = async (id: string) => {
    const status = draft[id];
    if (!status) return;
    setUpdating(id);
    setError("");
    try {
      await authedPatch(`/api/v1/returns/${id}`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  const runAction = async (id: string, action: "approve" | "reject" | "mark_picked" | "mark_received") => {
    setUpdating(`${id}:${action}`);
    setError("");
    try {
      await authedFetch(`/api/v1/returns/${id}/actions`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Returns</h1>
        <p className="text-sm text-[#646464]">Return requests tied to orders.</p>
        <div className="mt-3">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-xs text-[#4A1D1F]"
          >
            <option value="all">All returns</option>
            <option value="pending">Pending returns</option>
          </select>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && (
        <ConsoleTable headers={["Order", "Placed", "Reason", "Status", ""]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd className="py-8 text-center text-[#646464]" colSpan={5}>
                No return requests.
              </ConsoleTd>
            </tr>
          ) : (
            filteredRows.map((r) => (
              <tr key={r.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd>
                  <span className="font-mono text-[11px]">{r.order.id.slice(0, 12)}…</span>
                  <div className="text-[11px] text-[#646464]">Rs.{Number(r.order.total).toFixed(2)}</div>
                </ConsoleTd>
                <ConsoleTd>{new Date(r.createdAt).toLocaleString()}</ConsoleTd>
                <ConsoleTd className="max-w-[200px] text-xs">{r.reason ?? "—"}</ConsoleTd>
                <ConsoleTd>
                  <select
                    value={draft[r.id] ?? r.status}
                    onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
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
                    disabled={updating === r.id || (draft[r.id] ?? r.status) === r.status}
                    onClick={() => save(r.id)}
                    className="rounded-full bg-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-40"
                  >
                    {updating === r.id ? "Saving…" : "Apply"}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={Boolean(updating)}
                      onClick={() => runAction(r.id, "approve")}
                      className="rounded-full border border-[#E8DCC8] bg-white px-2 py-1 text-[10px] uppercase text-[#4A1D1F] disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(updating)}
                      onClick={() => runAction(r.id, "reject")}
                      className="rounded-full border border-[#E8DCC8] bg-white px-2 py-1 text-[10px] uppercase text-[#4A1D1F] disabled:opacity-40"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(updating)}
                      onClick={() => runAction(r.id, "mark_picked")}
                      className="rounded-full border border-[#E8DCC8] bg-white px-2 py-1 text-[10px] uppercase text-[#4A1D1F] disabled:opacity-40"
                    >
                      Mark picked
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(updating)}
                      onClick={() => runAction(r.id, "mark_received")}
                      className="rounded-full border border-[#E8DCC8] bg-white px-2 py-1 text-[10px] uppercase text-[#4A1D1F] disabled:opacity-40"
                    >
                      Mark received
                    </button>
                  </div>
                </ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
