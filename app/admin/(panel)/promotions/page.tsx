"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, authedPost } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type Promo = {
  id: string;
  kind: string;
  name: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  productId: string | null;
};

const KINDS = ["flash_sale", "featured", "clearance", "custom"] as const;

export default function AdminPromotionsPage() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("featured");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<Promo[]>("/api/v1/promotions")
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await authedPost("/api/v1/promotions", {
        kind,
        name: name.trim(),
        active,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        productId: productId.trim() || null,
      });
      setName("");
      setStartsAt("");
      setEndsAt("");
      setProductId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Promotions</h1>
        <p className="text-sm text-[#646464]">Campaigns and featured placements (metadata for custom rules).</p>
      </div>

      <form
        onSubmit={create}
        className="grid gap-3 rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm md:grid-cols-2"
      >
        <label className="text-xs font-semibold uppercase text-[#646464]">
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}
            className="mt-1 block w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase text-[#646464]">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase text-[#646464]">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
        <label className="text-xs font-semibold uppercase text-[#646464]">
          Product ID (optional)
          <input
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="text-xs font-semibold uppercase text-[#646464]">
          Starts (local)
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold uppercase text-[#646464]">
          Ends (local)
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#7B3010] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create promotion"}
          </button>
        </div>
      </form>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && (
        <ConsoleTable headers={["Name", "Kind", "Active", "Window", "Product"]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd className="py-8 text-center text-[#646464]" colSpan={5}>
                No promotions yet.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd className="font-medium">{r.name}</ConsoleTd>
                <ConsoleTd className="text-xs capitalize">{r.kind.replace("_", " ")}</ConsoleTd>
                <ConsoleTd>{r.active ? "Yes" : "No"}</ConsoleTd>
                <ConsoleTd className="text-[11px] text-[#646464]">
                  {r.startsAt ? new Date(r.startsAt).toLocaleString() : "—"} →{" "}
                  {r.endsAt ? new Date(r.endsAt).toLocaleString() : "—"}
                </ConsoleTd>
                <ConsoleTd className="font-mono text-[10px]">{r.productId?.slice(0, 12) ?? "—"}</ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
