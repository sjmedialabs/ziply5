"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: string;
  price: string | number;
};

export default function SellerProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<{ items: ProductRow[]; total: number }>("/api/v1/products?page=1&limit=100")
      .then((d) => {
        setRows(d.items);
        setTotal(d.total);
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
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">My products</h1>
          <p className="text-sm text-[#646464]">{total} SKUs assigned to you.</p>
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
        <ConsoleTable headers={["Name", "Slug", "SKU", "Status", "Price"]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={5} className="py-8 text-center text-[#646464]">
                No products yet. Create via POST /api/v1/products (seller scope).
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((p) => (
              <tr key={p.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd className="font-medium text-[#4A1D1F]">{p.name}</ConsoleTd>
                <ConsoleTd>
                  <code className="text-[11px]">{p.slug}</code>
                </ConsoleTd>
                <ConsoleTd>
                  <code className="text-[11px]">{p.sku}</code>
                </ConsoleTd>
                <ConsoleTd className="capitalize">{p.status}</ConsoleTd>
                <ConsoleTd className="font-semibold">Rs.{Number(p.price).toFixed(2)}</ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
