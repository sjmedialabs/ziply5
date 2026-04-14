"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type SettingRow = {
  id: string;
  group: string;
  key: string;
  valueJson: unknown;
};

export default function AdminSettingsPage() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<SettingRow[]>("/api/v1/settings")
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const preview = (v: unknown) => {
    try {
      return JSON.stringify(v).slice(0, 120) + (JSON.stringify(v).length > 120 ? "…" : "");
    } catch {
      return "—";
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Settings</h1>
          <p className="text-sm text-[#646464]">Key–value store for shop config, feature flags, and integrations.</p>
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
        <ConsoleTable headers={["Group", "Key", "Value (JSON)"]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={3} className="py-8 text-center text-[#646464]">
                No settings rows. Upsert via POST /api/v1/settings with {"{"} group, key, valueJson {"}"}.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((s) => (
              <tr key={s.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd>
                  <code className="text-[12px]">{s.group}</code>
                </ConsoleTd>
                <ConsoleTd>
                  <code className="text-[12px]">{s.key}</code>
                </ConsoleTd>
                <ConsoleTd className="max-w-md break-all font-mono text-[11px] text-[#646464]">{preview(s.valueJson)}</ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
