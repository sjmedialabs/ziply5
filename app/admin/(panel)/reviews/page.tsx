"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, authedPatch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type ReviewRow = {
  id: string;
  rating: number;
  status: string;
  title: string | null;
  body: string | null;
  createdAt: string;
  product: { name: string; slug: string };
  user: { email: string | null; name: string | null } | null;
};

const STATUSES = ["pending", "approved", "rejected"] as const;

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<ReviewRow[]>("/api/v1/reviews")
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

  const save = async (id: string) => {
    const status = draft[id];
    if (!status) return;
    setUpdating(id);
    setError("");
    try {
      await authedPatch(`/api/v1/reviews/${id}`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Reviews</h1>
        <p className="text-sm text-[#646464]">Moderate product reviews before they appear on the storefront.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && (
        <ConsoleTable headers={["Product", "Rating", "Author", "Status", ""]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd className="py-8 text-center text-[#646464]" colSpan={5}>
                No reviews yet.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd>
                  <div className="font-medium">{r.product.name}</div>
                  <div className="text-[11px] text-[#646464]">{r.title ?? "—"}</div>
                </ConsoleTd>
                <ConsoleTd>{r.rating}★</ConsoleTd>
                <ConsoleTd className="text-xs">
                  {r.user?.email ?? "Guest"}
                  <div className="text-[11px] text-[#646464]">{r.body?.slice(0, 80)}</div>
                </ConsoleTd>
                <ConsoleTd>
                  <select
                    value={draft[r.id] ?? r.status}
                    onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                    className="rounded-lg border border-[#D9D9D1] bg-white px-2 py-1 text-xs capitalize"
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
                </ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
