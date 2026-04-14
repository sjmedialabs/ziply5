"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, authedPatch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type TicketRow = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  createdBy: { email: string; name: string };
};

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

export default function AdminTicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<TicketRow[]>("/api/v1/tickets")
      .then((list) => {
        setRows(list);
        const d: Record<string, string> = {};
        list.forEach((t) => {
          d[t.id] = t.status;
        });
        setDraft(d);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async (id: string) => {
    const status = draft[id];
    if (!status) return;
    setUpdating(id);
    try {
      await authedPatch(`/api/v1/tickets/${id}`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Support tickets</h1>
          <p className="text-sm text-[#646464]">All customer & seller tickets.</p>
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
        <ConsoleTable headers={["Subject", "From", "Opened", "Status", ""]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={5} className="py-8 text-center text-[#646464]">
                No tickets yet.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((t) => (
              <tr key={t.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd className="max-w-[220px] font-medium">{t.subject}</ConsoleTd>
                <ConsoleTd className="text-[12px]">
                  {t.createdBy.name}
                  <br />
                  <span className="text-[#646464]">{t.createdBy.email}</span>
                </ConsoleTd>
                <ConsoleTd className="text-[12px] text-[#646464]">{new Date(t.createdAt).toLocaleString()}</ConsoleTd>
                <ConsoleTd>
                  <select
                    value={draft[t.id] ?? t.status}
                    onChange={(e) => setDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                    className="w-full max-w-[140px] rounded-lg border border-[#D9D9D1] bg-white px-2 py-1 text-xs capitalize"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </ConsoleTd>
                <ConsoleTd>
                  <button
                    type="button"
                    disabled={updating === t.id || (draft[t.id] ?? t.status) === t.status}
                    onClick={() => apply(t.id)}
                    className="rounded-lg bg-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white disabled:opacity-40"
                  >
                    {updating === t.id ? "…" : "Apply"}
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
