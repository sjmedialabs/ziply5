"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch, authedPost } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type CmsSummary = {
  id: string;
  slug: string;
  title: string;
  status: string;
  updatedAt: string;
  _count: { sections: number };
};

type CmsDetail = {
  slug: string;
  title: string;
  status: string;
  sections: Array<{ sectionType: string; position: number; contentJson: unknown }>;
};

const PRESETS: Array<{ slug: string; title: string }> = [
  { slug: "home", title: "Homepage" },
  { slug: "privacy-policy", title: "Privacy policy" },
  { slug: "terms", title: "Terms & conditions" },
  { slug: "shipping", title: "Shipping info" },
  { slug: "returns", title: "Returns" },
];

function storePath(slug: string) {
  if (slug === "home") return "/";
  return `/${slug}`;
}

export default function AdminCmsPage() {
  const [rows, setRows] = useState<CmsSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<CmsDetail | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<CmsSummary[]>("/api/v1/cms/pages?list=1")
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seedDefaults = async () => {
    setSeeding(true);
    setError("");
    try {
      for (const p of PRESETS) {
        await authedPost("/api/v1/cms/pages", {
          slug: p.slug,
          title: p.title,
          status: "published",
          sections: [
            {
              sectionType: "richtext",
              position: 0,
              contentJson: {
                html: `<p><strong>${p.title}</strong> — edit this content in the CMS. Managed copy for ZiPLY5.</p>`,
              },
            },
          ],
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const openEdit = async (slug: string) => {
    setModalSlug(slug);
    setError("");
    try {
      const res = await fetch(`/api/v1/cms/pages?slug=${encodeURIComponent(slug)}`);
      const json = (await res.json()) as { success?: boolean; data?: CmsDetail };
      if (!res.ok || !json.success || !json.data) throw new Error("Could not load page");
      setDetail(json.data);
      setEditTitle(json.data.title);
      setEditStatus(json.data.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setModalSlug(null);
    }
  };

  const saveEdit = async () => {
    if (!modalSlug || !detail) return;
    setSaving(true);
    setError("");
    try {
      const sections =
        detail.sections?.map((s) => ({
          sectionType: s.sectionType,
          position: s.position,
          contentJson: s.contentJson,
        })) ?? [];
      if (sections.length === 0) {
        sections.push({
          sectionType: "richtext",
          position: 0,
          contentJson: { html: "<p>Content</p>" },
        });
      }
      await authedPost("/api/v1/cms/pages", {
        slug: modalSlug,
        title: editTitle,
        status: editStatus,
        sections,
      });
      setModalSlug(null);
      setDetail(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">CMS</h1>
          <p className="text-sm text-[#646464]">
            Control storefront pages (home, legal, shipping). Publish here, then refine layout binding when you wire dynamic
            sections.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={seeding}
            onClick={() => seedDefaults()}
            className="rounded-full bg-[#FFC222] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "Ensure default pages"}
          </button>
          <button
            type="button"
            onClick={() => load()}
            className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && (
        <ConsoleTable headers={["Title", "Slug", "Status", "Sections", "Updated", ""]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={6} className="py-8 text-center text-[#646464]">
                No CMS pages yet. Click <strong>Ensure default pages</strong> to create home + legal stubs.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd className="font-medium">{r.title}</ConsoleTd>
                <ConsoleTd>
                  <code className="text-[11px]">{r.slug}</code>
                </ConsoleTd>
                <ConsoleTd className="capitalize">{r.status}</ConsoleTd>
                <ConsoleTd>{r._count.sections}</ConsoleTd>
                <ConsoleTd className="text-[12px] text-[#646464]">{new Date(r.updatedAt).toLocaleString()}</ConsoleTd>
                <ConsoleTd className="space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openEdit(r.slug)}
                    className="text-xs font-semibold text-[#7B3010] underline"
                  >
                    Edit
                  </button>
                  <Link href={storePath(r.slug)} className="text-xs font-semibold text-[#646464] underline" target="_blank">
                    View store
                  </Link>
                </ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}

      {modalSlug && detail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E8DCC8] bg-white p-6 shadow-xl">
            <h2 className="font-melon text-lg font-bold text-[#4A1D1F]">Edit page</h2>
            <p className="mt-1 font-mono text-xs text-[#646464]">{modalSlug}</p>
            <label className="mt-4 block text-xs font-semibold uppercase text-[#646464]">
              Title
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase text-[#646464]">
              Status
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm capitalize"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalSlug(null);
                  setDetail(null);
                }}
                className="rounded-full border border-[#E8DCC8] px-4 py-2 text-xs font-semibold uppercase text-[#646464]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveEdit()}
                className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
