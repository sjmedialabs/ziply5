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

type Channel = TemplateRow["channel"]
type TemplateCatalogItem = {
  key: string
  label: string
  scenario:
    | "CART_ONLY"
    | "CHECKOUT_STARTED"
    | "PAYMENT_PENDING"
    | "PAYMENT_FAILED"
    | "CONTACT_CAPTURED"
    | "GENERAL"
  priority: number
  language: string
  channels: Channel[]
  defaults: Partial<Record<Channel, { subject?: string; body: string }>>
}

const TEMPLATE_CATALOG: TemplateCatalogItem[] = [
  {
    key: "ACART_CART_30M_WA",
    label: "Cart Reminder - 30 Minutes",
    scenario: "CART_ONLY",
    priority: 10,
    language: "EN",
    channels: ["whatsapp"],
    defaults: {
      whatsapp: {
        body: "Hi {{name}}, you left items worth ₹{{cart_value}} in your cart.\nComplete your order here:\n{{resume_link}}",
      },
    },
  },
  {
    key: "ACART_CHECKOUT_2H_SMS",
    label: "Checkout Reminder - 2 Hours",
    scenario: "CHECKOUT_STARTED",
    priority: 20,
    language: "EN",
    channels: ["sms"],
    defaults: {
      sms: {
        body: "Complete your order now. Cart ₹{{cart_value}}\n{{resume_link}}",
      },
    },
  },
  {
    key: "ACART_PAYMENT_FAIL_10M_EMAIL",
    label: "Payment Failed Recovery",
    scenario: "PAYMENT_FAILED",
    priority: 5,
    language: "EN",
    channels: ["email"],
    defaults: {
      email: {
        subject: "Payment failed at {{store_name}} — complete your order",
        body:
          "<p>Hi {{name}},</p><p>Your payment didn’t go through for items worth ₹{{cart_value}}.</p><p>Resume checkout: <a href=\"{{resume_link}}\">{{resume_link}}</a></p>",
      },
    },
  },
  {
    key: "ACART_COUPON_24H_WA",
    label: "Coupon Recovery Offer",
    scenario: "GENERAL",
    priority: 30,
    language: "EN",
    channels: ["whatsapp"],
    defaults: {
      whatsapp: {
        body: "Hi {{name}}, your cart is waiting. Use coupon {{coupon}} to save {{discount}}.\nResume: {{resume_link}}\nOffer expires in {{expiry_time}}.",
      },
    },
  },
  {
    key: "ACART_FINAL_48H_EMAIL",
    label: "Final Recovery Reminder",
    scenario: "GENERAL",
    priority: 40,
    language: "EN",
    channels: ["email"],
    defaults: {
      email: {
        subject: "Last reminder: your cart at {{store_name}}",
        body:
          "<p>Hi {{name}},</p><p>This is the final reminder for your cart worth ₹{{cart_value}}.</p><p>Resume: <a href=\"{{resume_link}}\">{{resume_link}}</a></p><p>Need help? Call {{support_number}}</p>",
      },
    },
  },
]

const LEGACY_DEFAULTS: Array<{ templateKey: string; channel: Channel }> = [
  { templateKey: "abandon_r1", channel: "whatsapp" },
  { templateKey: "abandon_r1", channel: "email" },
  { templateKey: "abandon_r2", channel: "sms" },
  { templateKey: "abandon_r2", channel: "email" },
  { templateKey: "abandon_r3_coupon", channel: "whatsapp" },
  { templateKey: "abandon_r4_final", channel: "email" },
]

export default function AbandonedCartTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [testSendingKey, setTestSendingKey] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState<string | null>(null)
  const [showLegacy, setShowLegacy] = useState(false)

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

  const applyDefaults = (templateKey: string, channel: Channel, defaults?: { subject?: string; body: string }) => {
    if (!defaults) return
    upsertLocal(templateKey, channel, { subject: defaults.subject ?? null, body: defaults.body })
  }

  const buildPreview = (row: TemplateRow) => {
    // Simple local preview: we intentionally do not render HTML (XSS) — email templates show raw HTML.
    const sample = {
      name: "Asha",
      first_name: "Asha",
      cart_value: "1299",
      items: "3",
      item_names: "Vitamin C Serum, Sunscreen, Lip Balm",
      coupon: "WELCOME10",
      discount: "10%",
      resume_link: "https://store.example/cart/recover/…",
      payment_link: "https://store.example/payment/…",
      support_number: "+91-90000-00000",
      store_name: "Ziply5",
      expiry_time: "24 hours",
    }
    const render = (text: string) =>
      text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => (sample as any)[String(key)] ?? "")
    return {
      subject: row.subject ? render(row.subject) : null,
      body: render(row.body),
    }
  }

  const testSend = async (templateKey: string, channel: Channel) => {
    const key = `${templateKey}:${channel}`
    const row = byKey.get(key)
    if (!row) return
    const to = window.prompt(
      channel === "email" ? "Send test email to:" : channel === "sms" ? "Send test SMS to (E.164 or local):" : "Send test WhatsApp to (E.164 or local):",
    )
    if (!to) return
    setTestSendingKey(key)
    setError("")
    try {
      await authedPost("/api/admin/abandoned-carts/templates/test-send", {
        templateKey,
        channel,
        to,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send test")
    } finally {
      setTestSendingKey(null)
    }
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Recovery Templates</h1>
          <p className="text-sm text-[#646464]">
            Create and manage WhatsApp/SMS/Email templates used by recovery automations. Variables:{" "}
            <code>{"{{name}}"}</code>, <code>{"{{first_name}}"}</code>, <code>{"{{cart_value}}"}</code>,{" "}
            <code>{"{{items}}"}</code>, <code>{"{{item_names}}"}</code>, <code>{"{{coupon}}"}</code>,{" "}
            <code>{"{{discount}}"}</code>, <code>{"{{resume_link}}"}</code>, <code>{"{{payment_link}}"}</code>,{" "}
            <code>{"{{support_number}}"}</code>, <code>{"{{store_name}}"}</code>, <code>{"{{expiry_time}}"}</code>.
          </p>
        </div>
        <Link href="/admin/abandoned-carts" className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]">
          Back
        </Link>
      </div>

      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {loading ? <p className="text-sm text-[#646464]">Loading…</p> : null}

      {!loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {(["whatsapp", "sms", "email"] as const).map((channel) => (
            <div key={channel} className="rounded-2xl border border-[#E8DCC8] bg-white p-4">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">
                  {channel === "whatsapp" ? "WhatsApp Templates" : channel === "sms" ? "SMS Templates" : "Email Templates"}
                </p>
                <p className="text-sm text-[#646464]">
                  {channel === "email"
                    ? "HTML supported. Subject is optional."
                    : "Keep it short and action-oriented. Links are allowed."}
                </p>
              </div>

              <div className="space-y-3">
                {TEMPLATE_CATALOG.filter((t) => t.channels.includes(channel)).map((t) => {
                  const k = `${t.key}:${channel}`
                  const existing = byKey.get(k)
                  const row: TemplateRow =
                    existing ??
                    ({
                      template_key: t.key,
                      channel,
                      subject: t.defaults[channel]?.subject ?? null,
                      body: t.defaults[channel]?.body ?? "",
                      active: true,
                      updated_at: new Date().toISOString(),
                    } as TemplateRow)
                  const preview = previewKey === k ? buildPreview(row) : null
                  return (
                    <div key={k} className="rounded-xl border border-[#E8DCC8] bg-[#FFFBF3]/40 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#4A1D1F]">{t.label}</p>
                            <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7A7A7A]">
                              {t.language}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-[#646464]">
                            Key: <span className="font-mono">{t.key}</span> · Trigger:{" "}
                            <span className="font-semibold">{t.scenario}</span> · Priority:{" "}
                            <span className="font-semibold">{t.priority}</span>
                          </p>
                        </div>

                        <label className="flex items-center gap-2 text-xs text-[#4A1D1F]">
                          <input
                            type="checkbox"
                            checked={row.active}
                            onChange={(e) => upsertLocal(t.key, channel, { active: e.target.checked })}
                          />
                          Active
                        </label>
                      </div>

                      {channel === "email" ? (
                        <label className="mt-3 block text-xs text-[#646464]">
                          Subject
                          <input
                            className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm"
                            value={row.subject ?? ""}
                            onChange={(e) => upsertLocal(t.key, channel, { subject: e.target.value })}
                            placeholder="You left something behind at {{store_name}}"
                          />
                        </label>
                      ) : null}

                      <label className="mt-3 block text-xs text-[#646464]">
                        Content
                        <textarea
                          className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm"
                          rows={channel === "email" ? 7 : 4}
                          value={row.body}
                          onChange={(e) => upsertLocal(t.key, channel, { body: e.target.value })}
                          placeholder={channel === "email" ? "<p>Hi {{name}} ...</p>" : "Hi {{name}} ..."}
                        />
                      </label>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded border bg-white px-3 py-1.5 text-[11px] font-semibold"
                            onClick={() => {
                              setPreviewKey((cur) => (cur === k ? null : k))
                            }}
                          >
                            {previewKey === k ? "Hide Preview" : "Preview"}
                          </button>
                          <button
                            type="button"
                            className="rounded border bg-white px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                            disabled={testSendingKey === k}
                            onClick={() => void testSend(t.key, channel)}
                          >
                            {testSendingKey === k ? "Sending…" : "Test Send"}
                          </button>
                          <button
                            type="button"
                            className="rounded border bg-white px-3 py-1.5 text-[11px] font-semibold"
                            onClick={() => applyDefaults(t.key, channel, t.defaults[channel])}
                          >
                            Reset to Default
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={savingKey === k || !row.body.trim()}
                          onClick={() => void save(t.key, channel)}
                          className="rounded-full bg-[#7B3010] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white disabled:opacity-50"
                        >
                          {savingKey === k ? "Saving…" : "Save"}
                        </button>
                      </div>

                      {preview ? (
                        <div className="mt-3 rounded-lg border bg-white p-3 text-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A7A7A]">Preview (sample data)</p>
                          {preview.subject != null ? (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-[#4A1D1F]">Subject</p>
                              <p className="mt-1 rounded bg-[#FFFBF3] px-2 py-1 text-xs">{preview.subject}</p>
                            </div>
                          ) : null}
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-[#4A1D1F]">Body</p>
                            <pre className="mt-1 whitespace-pre-wrap rounded bg-[#FFFBF3] px-2 py-2 text-xs">{preview.body}</pre>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading ? (
        <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-[#4A1D1F]">Legacy templates (backwards compatible)</p>
              <p className="text-sm text-[#646464]">
                These exist to preserve any currently-used keys like <code>abandon_r1</code>. You can keep them or migrate to the new catalog.
              </p>
            </div>
            <button type="button" className="rounded border bg-white px-3 py-2 text-xs font-semibold" onClick={() => setShowLegacy((v) => !v)}>
              {showLegacy ? "Hide Legacy" : "Show Legacy"}
            </button>
          </div>
          {showLegacy ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {LEGACY_DEFAULTS.map(({ templateKey, channel }) => {
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
                  <div key={k} className="rounded-xl border border-[#E8DCC8] bg-[#FFFBF3]/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#4A1D1F]">{templateKey}</p>
                        <p className="text-[11px] text-[#646464]">{channel.toUpperCase()}</p>
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
                          className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm"
                          value={row.subject ?? ""}
                          onChange={(e) => upsertLocal(templateKey, channel, { subject: e.target.value })}
                        />
                      </label>
                    ) : null}
                    <label className="mt-3 block text-xs text-[#646464]">
                      Body
                      <textarea
                        className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm"
                        rows={channel === "email" ? 6 : 4}
                        value={row.body}
                        onChange={(e) => upsertLocal(templateKey, channel, { body: e.target.value })}
                      />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={savingKey === k || !row.body.trim()}
                        onClick={() => void save(templateKey, channel)}
                        className="rounded-full bg-[#7B3010] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white disabled:opacity-50"
                      >
                        {savingKey === k ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

