"use client";

import { useMemo, useState,useEffect } from "react";
import { authedFetch } from "@/lib/dashboard-fetch";

type ReportData = {
  from: string;
  to: string;
  orderCount: number;
  revenueTotal: string | number;
  subtotalTotal: string | number;
  byStatus: Array<{ status: string; count: number; revenue: string | number }>;
};

export default function AdminReportsPage() {
  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, []);

  const [from, setFrom] = useState(defaultRange.from);
  const [prepType, setPrepType] = useState("");
  const [to, setTo] = useState(defaultRange.to);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

 const run = () => {
  setLoading(true);
  setError("");

  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  const params = new URLSearchParams({
    from: fromIso,
    to: toIso,
  });

  if (prepType) {
    params.append("preparationType", prepType);
  }

  authedFetch<ReportData>(
    `/api/v1/reports/sales?${params.toString()}`
  )
    .then(setData)
    .catch((e: Error) => {
      setData(null);
      setError(e.message);
    })
    .finally(() => setLoading(false));
};

   useEffect(() => {
    run();
  }, []); // runs only once on mount

  if(loading){
    return(
      <div className="text-center py-20">
        <p className="text-lg font-medium text-gray-600">Loading report...</p>
      </div>
    )
  }


  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Sales report</h1>
        <p className="text-sm text-[#646464]">Aggregated orders in a date range (admin only).</p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
        <label className="text-xs font-semibold uppercase text-[#646464]">
          From
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold uppercase text-[#646464]">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from}
            className="mt-1 block rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          />
        </label>
        <select
          value={prepType}
          onChange={(e) => setPrepType(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Preparation Types</option>
          <option value="ready_to_eat">Ready To Eat</option>
          <option value="ready_to_cook">Ready To Cook</option>
        </select>
        <button
          type="button"
          onClick={() => run()}
          disabled={loading}
          className="rounded-full bg-[#7B3010] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {loading ? "Loading…" : "Run report"}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-[#646464]">Orders</p>
            <p className="mt-2 text-2xl font-bold text-[#4A1D1F]">{data.orderCount}</p>
          </div>
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-[#646464]">Revenue total</p>
            <p className="mt-2 text-2xl font-bold text-[#4A1D1F]">Rs.{Number(data.revenueTotal).toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-[#646464]">Subtotal total</p>
            <p className="mt-2 text-2xl font-bold text-[#4A1D1F]">Rs.{Number(data.subtotalTotal).toFixed(2)}</p>
          </div>
        </div>
      )}

      {data && data.byStatus.length > 0 && (
        <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm">
          <h2 className="font-melon text-lg font-semibold text-[#4A1D1F]">By status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.byStatus.map((row) => (
              <li key={row.status} className="flex justify-between border-b border-[#F0E8DC] py-2 last:border-0">
                <span className="capitalize text-[#646464]">{row.status}</span>
                <span className="font-medium text-[#4A1D1F]">
                  {row.count} orders · Rs.{Number(row.revenue).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
