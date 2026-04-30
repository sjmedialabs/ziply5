"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { authedFetch, authedPost } from "@/lib/dashboard-fetch"

type TemplateRow = {
  template_key: string
  channel: "email" | "sms" | "whatsapp"
  subject: string | null
  body: string
  active: boolean
  updated_at: string
}

const defaults = [
  { templateKey: "abandon_r1", channel: "whatsapp" as const },
  { templateKey: "abandon_r1", channel: "email" as const },
  { templateKey: "abandon_r2", channel: "sms" as const },
  { templateKey: "abandon_r2", channel: "email" as const },
  { templateKey: "abandon_r3_coupon", channel: "whatsapp" as const },
  { templateKey: "abandon_r4_final", channel: "email" as const },
]

export default function AbandonedCartTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    void authedFetch<TemplateRow[]>("/api/admin/abandoned-carts/templates")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  const byKey = useMemo(() => {
    const map = new Map<string, TemplateRow>()
    for (const r of rows) map.set(`${r.template_key}:${r.channel}`, r)
    return map
  }, [rows])

  const upsertLocal = (templateKey: string, channel: TemplateRow["channel"], patch: Partial<TemplateRow>) => {
    setRows((prev) => {
      const k = `${templateKey}:${channel}`
      const existing = byKey.get(k)
      const next: TemplateRow = {
        template_key: templateKey,
        channel,
        subject: existing?.subject ?? null,
        body: existing?.body ?? "",
        active: existing?.active ?? true,
        updated_at: existing?.updated_at ?? new Date().toISOString(),
        ...patch,
      }
      const out = prev.filter((r) => !(r.template_key === templateKey && r.channel === channel))
      out.push(next)
      return out
    })
  }

  const save = async (templateKey: string, channel: TemplateRow["channel"]) => {
    const key = `${templateKey}:${channel}`
    const row = byKey.get(key)
    if (!row) return
    setSavingKey(key)
    setError("")
    try {
      await authedPost("/api/admin/abandoned-carts/templates", {
        templateKey,
        channel,
        subject: row.subject,
        body: row.body,
        active: row.active,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template")
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Recovery Templates</h1>
          <p className="text-sm text-[#646464]">
            Edit WhatsApp/SMS/Email templates. Placeholders: <code>{"{{name}}"}</code>, <code>{"{{amount}}"}</code>,{" "}
            <code>{"{{items}}"}</code>, <code>{"{{resume_link}}"}</code>, <code>{"{{coupon}}"}</code>.
          </p>
        </div>
        <Link href="/admin/abandoned-carts" className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]">
          Back
        </Link>
      </div>

      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {loading ? <p className="text-sm text-[#646464]">Loading…</p> : null}

      {!loading ? (
        <div className="space-y-3">
          {defaults.map(({ templateKey, channel }) => {
            const k = `${templateKey}:${channel}`
            const row = byKey.get(k) ?? {
              template_key: templateKey,
              channel,
              subject: null,
              body: "",
              active: true,
              updated_at: new Date().toISOString(),
            }
            return (
              <div key={k} className="rounded-xl border border-[#E8DCC8] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-semibold text-[#4A1D1F]">{templateKey}</p>
                    <p className="text-xs text-[#646464]">{channel.toUpperCase()}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#4A1D1F]">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => upsertLocal(templateKey, channel, { active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>

                {channel === "email" ? (
                  <label className="mt-3 block text-xs text-[#646464]">
                    Subject
                    <input
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      value={row.subject ?? ""}
                      onChange={(e) => upsertLocal(templateKey, channel, { subject: e.target.value })}
                      placeholder="You left something in your cart"
                    />
                  </label>
                ) : null}

                <label className="mt-3 block text-xs text-[#646464]">
                  Body
                  <textarea
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    rows={channel === "email" ? 6 : 4}
                    value={row.body}
                    onChange={(e) => upsertLocal(templateKey, channel, { body: e.target.value })}
                    placeholder={channel === "email" ? "<p>Hi {{name}} ...</p>" : "Hi {{name}} ..."}
                  />
                </label>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={savingKey === k}
                    onClick={() => void save(templateKey, channel)}
                    className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
                  >
                    {savingKey === k ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

