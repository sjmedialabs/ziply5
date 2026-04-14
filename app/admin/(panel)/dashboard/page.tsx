"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/dashboard-fetch";

type AdminSummary = {
  scope: string;
  totalOrders: number;
  totalUsers: number;
  totalSellers: number;
  totalRevenue: string | number;
  pendingOrders: number;
  recentOrders: Array<{ id: string; status: string; total: string | number; createdAt: string }>;
  lowStockVariants: Array<{
    id: string;
    stock: number;
    name: string;
    product: { name: string; slug: string };
  }>;
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    authedFetch<AdminSummary>("/api/v1/dashboard/summary")
      .then((data) => {
        if (cancelled) return;
        if (data.scope !== "admin") {
          setError("This dashboard is for admin or super-admin accounts.");
          return;
        }
        setSummary(data);
        setError("");
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl">
      <h1 className="font-melon text-2xl font-bold tracking-wide text-[#4A1D1F] md:text-3xl">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-[#646464]">Live metrics from your database (safe fallbacks if some tables are empty).</p>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Could not load dashboard</p>
          <p className="mt-1 font-mono text-xs opacity-90">{error}</p>
        </div>
      )}

      {summary && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#646464]">Total orders</p>
            <p className="mt-2 text-2xl font-bold text-[#4A1D1F]">{summary.totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#646464]">Pending</p>
            <p className="mt-2 text-2xl font-bold text-[#C03621]">{summary.pendingOrders}</p>
          </div>
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#646464]">Users</p>
            <p className="mt-2 text-2xl font-bold text-[#4A1D1F]">{summary.totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#646464]">Sellers (roles)</p>
            <p className="mt-2 text-2xl font-bold text-[#4A1D1F]">{summary.totalSellers}</p>
          </div>
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#646464]">Revenue (all time)</p>
            <p className="mt-2 text-2xl font-bold text-[#4A1D1F]">Rs.{Number(summary.totalRevenue).toFixed(2)}</p>
          </div>
        </div>
      )}

      {summary && (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-melon text-lg font-semibold text-[#4A1D1F]">Recent orders</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#646464]">
              {summary.recentOrders.length === 0 && <li className="rounded-lg bg-[#FFFBF3] px-3 py-2">No orders yet.</li>}
              {summary.recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[#FFFBF3] px-3 py-2">
                  <span className="font-mono text-xs">{o.id.slice(0, 10)}…</span>
                  <span className="font-medium capitalize text-[#4A1D1F]">{o.status}</span>
                  <span>Rs.{Number(o.total).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-melon text-lg font-semibold text-[#4A1D1F]">Low stock variants</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#646464]">
              {summary.lowStockVariants.length === 0 && (
                <li className="rounded-lg bg-[#FFFBF3] px-3 py-2">No variants or none low on stock.</li>
              )}
              {summary.lowStockVariants.map((v) => (
                <li key={v.id} className="rounded-lg bg-[#FFFBF3] px-3 py-2">
                  {v.product.name} — {v.name}: <span className="font-semibold text-[#C03621]">{v.stock}</span> left
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <p className="mt-10 text-xs text-[#646464]">
        Tip: Use the sidebar to manage orders, products, CMS pages, and store settings — each screen loads the same APIs your
        production admin UI will bind to.
      </p>
    </section>
  );
}
