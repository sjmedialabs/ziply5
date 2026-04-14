"use client";

import { useCallback, useEffect, useState } from "react";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type Cat = {
  id: string;
  name: string;
  slug: string;
  parent: { name: string; slug: string } | null;
};

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<Cat[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((p: { success?: boolean; data?: Cat[]; message?: string }) => {
        if (!p.success || !p.data) throw new Error(p.message ?? "Failed");
        setRows(p.data);
      })
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
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Categories</h1>
          <p className="text-sm text-[#646464]">Browse the category tree (public read). Create new rows via POST /api/v1/categories.</p>
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
        <ConsoleTable headers={["Name", "Slug", "Parent"]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={3} className="py-8 text-center text-[#646464]">
                No categories yet.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((c) => (
              <tr key={c.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd className="font-medium">{c.name}</ConsoleTd>
                <ConsoleTd>
                  <code className="text-[11px]">{c.slug}</code>
                </ConsoleTd>
                <ConsoleTd className="text-[#646464]">{c.parent?.name ?? "—"}</ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
