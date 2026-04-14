"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type Cat = {
  id: string;
  name: string;
  slug: string;
  parent: { name: string; slug: string } | null;
};
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  categories?: Array<{ category: { id: string } }>;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Cat[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/v1/categories").then((r) => r.json()),
      fetch("/api/v1/products?page=1&limit=500").then((r) => r.json()),
    ])
      .then(([catRes, prodRes]: Array<{ success?: boolean; data?: unknown; message?: string }>) => {
        const categories = catRes.data as Cat[] | undefined;
        if (!catRes.success || !categories) throw new Error(catRes.message ?? "Failed");
        setRows(categories);
        setProducts(((prodRes.data as { items?: ProductRow[] } | undefined)?.items ?? []));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim();
    const finalSlug = slugify(slug || finalName);
    if (!finalName || !finalSlug) return;
    setCreating(true);
    setError("");
    try {
      const token = window.localStorage.getItem("ziply5_access_token");
      const role = window.localStorage.getItem("ziply5_user_role");
      if (!token || (role !== "admin" && role !== "super_admin")) {
        setError("Please login with an admin account to create categories.");
        router.push("/admin/login");
        return;
      }
      const res = await fetch("/api/v1/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: finalName,
          slug: finalSlug,
          parentId: parentId || null,
        }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (res.status === 401 || res.status === 403) {
        setError("Admin session expired or insufficient permission. Please login again.");
        router.push("/admin/login");
        return;
      }
      if (!res.ok || json.success === false) {
        throw new Error(json.message ?? "Could not create category");
      }
      setName("");
      setSlug("");
      setParentId("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create category");
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Categories</h1>
          <p className="text-sm text-[#646464]">Categories are menu headers. Items under each category are assigned products.</p>
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

      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          placeholder="Category name"
          value={name}
          onChange={(e) => {
            const next = e.target.value;
            setName(next);
            if (!slug.trim()) setSlug(slugify(next));
          }}
          className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
        />
        <input
          placeholder="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
        />
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
        >
          <option value="">No parent</option>
          {rows.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={creating}
          className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Category"}
        </button>
      </form>

      {!loading && (
        <ConsoleTable headers={["Name", "Slug", "Parent", "Items (Products)"]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={4} className="py-8 text-center text-[#646464]">
                No categories yet.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((c) => {
              const productItems = products.filter((p) =>
                p.categories?.some((x) => x.category?.id === c.id),
              );
              return (
                <tr key={c.id} className="hover:bg-[#FFFBF3]/80">
                  <ConsoleTd className="font-medium">{c.name}</ConsoleTd>
                  <ConsoleTd>
                    <code className="text-[11px]">{c.slug}</code>
                  </ConsoleTd>
                  <ConsoleTd className="text-[#646464]">{c.parent?.name ?? "—"}</ConsoleTd>
                  <ConsoleTd className="text-[#646464]">
                    {productItems.length === 0
                      ? "No products"
                      : productItems.slice(0, 6).map((p) => p.name).join(", ") +
                        (productItems.length > 6 ? ` +${productItems.length - 6} more` : "")}
                  </ConsoleTd>
                </tr>
              );
            })
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
