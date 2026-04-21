"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, authedPost } from "@/lib/dashboard-fetch";
import {
  ConsoleTable,
  ConsoleTd,
} from "@/components/dashboard/ConsoleTable";

/* ---------------- TYPES ---------------- */

type Variant = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  variants?: Variant[];
  status?:string;
};

type Promo = {
  id: string;
  kind: string;
  name: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

type SelectedProduct = {
  productId: string;
  discountPercent?: number;
  variants?: {
    variantId: string;
    discountPercent: number;
  }[];
};

const KINDS = [
  "flash_sale",
  "featured",
  "clearance",
  "custom",
] as const;

/* ---------------- COMPONENT ---------------- */

export default function AdminPromotionsPage() {

  /* ---------- Promotion list ---------- */

  const [rows, setRows] =
    useState<Promo[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ---------- Form ---------- */

  const [kind, setKind] =
    useState<(typeof KINDS)[number]>(
      "featured"
    );

  const [name, setName] =
    useState("");

  const [active, setActive] =
    useState(true);

  const [startsAt, setStartsAt] =
    useState("");

  const [endsAt, setEndsAt] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  /* ---------- Products ---------- */

  const [products, setProducts] =
    useState<Product[]>([]);

  const [selectedProducts, setSelectedProducts] =
    useState<SelectedProduct[]>([]);

  const [productSearch, setProductSearch] =
    useState("");

  const [productDropdownOpen, setProductDropdownOpen] =
    useState(false);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  /* ---------------- LOAD PROMOTIONS ---------------- */

  const load = useCallback(() => {

    setLoading(true);

    setError("");

    authedFetch<Promo[]>(
      "/api/v1/promotions"
    )
      .then(setRows)
      .catch((e: Error) =>
        setError(e.message)
      )
      .finally(() =>
        setLoading(false)
      );

  }, []);

  /* ---------------- LOAD PRODUCTS ---------------- */

  const loadProducts = useCallback(() => {

  authedFetch<{ items: Product[] }>(
    "/api/v1/products"
  )
    .then((res) => {

      // ✅ extract items
      setProducts((res.items || []).filter(p=>p?.status=="published"));

    })
    .catch((e: Error) =>
      setError(e.message)
    );

}, []);

  console.log("Fetched products:::",products);

  useEffect(() => {

    load();

    loadProducts();

  }, [load, loadProducts]);

  /* ---------------- PRODUCT SELECT ---------------- */

  const toggleProduct = (productId: string) => {
    const isSelected = selectedProducts.some(sp => sp.productId === productId);

    if (isSelected) {
      setSelectedProducts(prev => prev.filter(sp => sp.productId !== productId));
    } else {
      const product = products.find(p => p.id === productId);
      setSelectedProducts(prev => [
        ...prev,
        {
          productId,
          discountPercent: 0,
          variants: product?.variants?.map(v => ({
            variantId: v.id,
            discountPercent: 0,
          })),
        }
      ]);
    }
  };

  /* ---------------- CREATE ---------------- */

  const create = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    if (!name.trim()) return;

    setSaving(true);

    setError("");

    try {

      await authedPost(
        "/api/v1/promotions",

        {
          kind:kind.toUpperCase(),

          name: name.trim(),

          active,

          startsAt:
            startsAt
              ? new Date(startsAt)
                  .toISOString()
              : null,

          endsAt:
            endsAt
              ? new Date(endsAt)
                  .toISOString()
              : null,

          products:
            selectedProducts,

        }
      );

      /* reset */

      setName("");

      setStartsAt("");

      setEndsAt("");

      setSelectedProducts([]);

      await load();

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : "Create failed"
      );

    } finally {

      setSaving(false);

    }
  };

  /* ---------------- UI ---------------- */

  return (

    <section className="mx-auto max-w-7xl space-y-4">

      {/* HEADER */}

      <div>

        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">

          Promotions

        </h1>

        <p className="text-sm text-[#646464]">

          Campaigns and featured placements.

        </p>

      </div>

      {/* FORM */}

      <form
        onSubmit={create}
        className="grid gap-3 rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm md:grid-cols-2"
      >

        {/* KIND */}

        <label className="text-xs font-semibold uppercase text-[#646464]">

          Kind

          <select
            value={kind}
            onChange={(e) =>
              setKind(
                e.target.value as
                (typeof KINDS)[number]
              )
            }
            className="mt-1 block w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          >

            {KINDS.map(k => (

              <option
                key={k}
                value={k}
              >

                {k}

              </option>

            ))}

          </select>

        </label>

        {/* NAME */}

        <label className="text-xs font-semibold uppercase text-[#646464]">

          Name

          <input
            value={name}
            placeholder="Enter sale name"
            onChange={(e) =>
              setName(e.target.value)
            }
            className="mt-1 block w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          />

        </label>

        {/* ACTIVE */}
{/* 
        <label className="flex items-center gap-2 text-xs font-semibold uppercase text-[#646464]">

          <input
            type="checkbox"
            checked={active}
            onChange={(e) =>
              setActive(e.target.checked)
            }
          />

          Active

        </label> */}

        {/* START */}

        <label className="text-xs font-semibold uppercase text-[#646464]">

          Starts

          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) =>
              setStartsAt(e.target.value)
            }
            className="mt-1 block w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          />

        </label>

        {/* END */}

        <label className="text-xs font-semibold uppercase text-[#646464]">

          Ends

          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) =>
              setEndsAt(e.target.value)
            }
            className="mt-1 block w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
          />

        </label>

        {/* PRODUCT MULTISELECT */}

        <div className="md:col-span-2 text-xs font-semibold uppercase text-[#646464]">

          Select Products

          <div className="relative mt-1">
            {/* Display / Toggle button */}
            <div
              className="flex min-h-[38px] w-full cursor-pointer flex-wrap items-center gap-1 rounded-lg border border-[#D9D9D1] bg-white px-3 py-1.5 text-sm normal-case"
              onClick={() => setProductDropdownOpen(!productDropdownOpen)}
            >
              {selectedProducts.length === 0 ? (
                <span className="text-[#646464]">Select products...</span>
              ) : (
                selectedProducts.map((sp) => {
                  const p = products.find((p) => p.id === sp.productId);
                  return (
                    <span
                      key={sp.productId}
                      className="flex items-center gap-1 rounded border border-[#E8DCC8] bg-[#FFFBF3] px-2 py-0.5 text-xs text-[#4A1D1F]"
                    >
                      {p?.name}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProduct(sp.productId);
                        }}
                        className="text-[#7B3010] hover:text-red-700"
                      >
                        &times;
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Dropdown Menu */}
            {productDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white shadow-lg">
                <div className="border-b border-[#D9D9D1] p-2">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded-md border border-[#D9D9D1] px-3 py-1.5 text-xs normal-case focus:border-[#7B3010] focus:outline-none"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-b-lg bg-gray-50 p-2">
                  {filteredProducts.length === 0 ? (
                    <span className="normal-case text-[#646464]">
                      {products.length === 0 ? "No products available." : "No matching products."}
                    </span>
                  ) : (
                    filteredProducts.map((p) => (
                      <label
                        key={p.id}
                        className="mb-1 flex cursor-pointer items-center gap-2 rounded p-1 text-sm font-normal normal-case hover:bg-gray-100"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProducts.some((sp) => sp.productId === p.id)}
                          onChange={() => toggleProduct(p.id)}
                        />
                        {p.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* VARIANT UI */}

        <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

          {selectedProducts.map(
            (sp, i) => {

              const product =
                products.find(
                  p =>
                    p.id ===
                    sp.productId
                );

              return (

                <div
                  key={sp.productId}
                  className="border rounded-lg p-3"
                >

                  <p className="font-semibold">

                    {product?.name}

                  </p>

                  {product?.variants
                    ?.length ? (

                    product.variants.map(
                      (v, vi) => (

                        <div
                          key={v.id}
                          className="flex gap-2 items-center mt-2"
                        >

                          <span>

                            {v.name}

                          </span>

                          <input
                            type="number"
                            placeholder="Discount %"
                            className="border px-2 py-1 rounded"

                            onChange={(e) => {

                              const updated =
                                [
                                  ...selectedProducts,
                                ];

                              updated[i]
                                .variants![vi]
                                .discountPercent =
                                Number(
                                  e.target.value
                                );

                              setSelectedProducts(
                                updated
                              );

                            }}

                          />

                        </div>

                      )
                    )

                  ) : (

                    <input
                      type="number"
                      placeholder="Discount %"
                      className="border px-2 py-1 rounded mt-2"

                      onChange={(e) => {

                        const updated =
                          [
                            ...selectedProducts,
                          ];

                        updated[i]
                          .discountPercent =
                          Number(
                            e.target.value
                          );

                        setSelectedProducts(
                          updated
                        );

                      }}
                    />

                  )}

                </div>

              );

            }
          )}

        </div>

        {/* SUBMIT */}

        <div className="md:col-span-2">

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#7B3010] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >

            {saving
              ? "Saving…"
              : "Create promotion"}

          </button>

        </div>

      </form>

      {/* ERRORS */}

      {error && (

        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">

          {error}

        </p>

      )}

      {/* TABLE */}

      {!loading && (

        <ConsoleTable
          headers={[
            "Name",
            "Kind",
            "Active",
            "Window",
          ]}
        >

          {rows.map(r => (

            <tr
              key={r.id}
              className="hover:bg-[#FFFBF3]/80"
            >

              <ConsoleTd className="font-medium">

                {r.name}

              </ConsoleTd>

              <ConsoleTd className="text-xs capitalize">

                {r.kind.replace("_", " ")}

              </ConsoleTd>

              <ConsoleTd>

                {r.active
                  ? "Yes"
                  : "No"}

              </ConsoleTd>

              <ConsoleTd className="text-[11px] text-[#646464]">

                {r.startsAt
                  ? new Date(
                      r.startsAt
                    ).toLocaleString()
                  : "—"}

                →

                {r.endsAt
                  ? new Date(
                      r.endsAt
                    ).toLocaleString()
                  : "—"}

              </ConsoleTd>

            </tr>

          ))}

        </ConsoleTable>

      )}

    </section>

  );

}