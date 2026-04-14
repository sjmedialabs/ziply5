"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type CartRow = {
  id: string;
  sessionKey: string;
  email: string | null;
  total: string | number | null;
  updatedAt: string;
  itemsJson: unknown;
};

export default function AdminAbandonedCartsPage() {
  const [rows, setRows] = useState<CartRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<CartRow[]>("/api/v1/abandoned-carts")
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Abandoned carts</h1>
          <p className="text-sm text-[#646464]">Recovered checkout sessions (beacon from storefront optional).</p>
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
        <ConsoleTable headers={["Session", "Email", "Total", "Updated", "Items (preview)"]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd className="py-8 text-center text-[#646464]" colSpan={5}>
                No abandoned carts recorded.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd className="font-mono text-[11px]">{r.sessionKey.slice(0, 24)}…</ConsoleTd>
                <ConsoleTd className="text-xs">{r.email ?? "—"}</ConsoleTd>
                <ConsoleTd>{r.total != null ? `Rs.${Number(r.total).toFixed(2)}` : "—"}</ConsoleTd>
                <ConsoleTd className="text-xs">{new Date(r.updatedAt).toLocaleString()}</ConsoleTd>
                <ConsoleTd className="max-w-md truncate font-mono text-[10px] text-[#646464]">
                  {JSON.stringify(r.itemsJson).slice(0, 120)}…
                </ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
