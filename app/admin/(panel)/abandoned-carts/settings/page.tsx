"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { authedFetch, authedPost } from "@/lib/dashboard-fetch"

type RecoverySettings = {
  enabled: boolean
  abandonThresholdMinutes: number
  maxRemindersPerCart: number
  stopAfterPurchase: boolean
  respectOptOut: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  whatsappEnabled: boolean
  attributionModel: "last_click" | "first_click"
  tokenExpiryMinutes: number
  schedule: Array<{
    stepNo: number
    delayMinutes: number
    channels: Array<"email" | "sms" | "whatsapp">
    template?: string
    includeCoupon?: boolean
    active?: boolean
  }>
}

export default function AbandonedCartSettingsPage() {
  const [settings, setSettings] = useState<RecoverySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void authedFetch<RecoverySettings>("/api/admin/abandoned-carts/settings")
      .then(setSettings)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    setError("")
    try {
      await authedPost("/api/admin/abandoned-carts/settings", settings)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <section className="mx-auto max-w-4xl py-6 text-sm text-[#646464]">Loading settings...</section>
  if (!settings) return <section className="mx-auto max-w-4xl py-6 text-sm text-red-700">{error || "Unable to load settings"}</section>

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Abandoned Cart Settings</h1>
          <p className="text-sm text-[#646464]">Configure detection threshold, channels, and reminder sequence.</p>
        </div>
        <Link
          href="/admin/abandoned-carts"
          className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
        >
          Back
        </Link>
      </div>
      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      <div className="grid gap-3 rounded-xl border border-[#E8DCC8] bg-white p-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings((p) => p ? { ...p, enabled: e.target.checked } : p)} /> Enable recovery engine</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.stopAfterPurchase} onChange={(e) => setSettings((p) => p ? { ...p, stopAfterPurchase: e.target.checked } : p)} /> Stop reminders after purchase</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.respectOptOut} onChange={(e) => setSettings((p) => p ? { ...p, respectOptOut: e.target.checked } : p)} /> Respect marketing opt-out</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.emailEnabled} onChange={(e) => setSettings((p) => p ? { ...p, emailEnabled: e.target.checked } : p)} /> Email enabled</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.smsEnabled} onChange={(e) => setSettings((p) => p ? { ...p, smsEnabled: e.target.checked } : p)} /> SMS enabled</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.whatsappEnabled} onChange={(e) => setSettings((p) => p ? { ...p, whatsappEnabled: e.target.checked } : p)} /> WhatsApp enabled</label>
        <label className="text-sm">Abandon threshold minutes
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" type="number" value={settings.abandonThresholdMinutes} onChange={(e) => setSettings((p) => p ? { ...p, abandonThresholdMinutes: Number(e.target.value) } : p)} />
        </label>
        <label className="text-sm">Max reminders per cart
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" type="number" value={settings.maxRemindersPerCart} onChange={(e) => setSettings((p) => p ? { ...p, maxRemindersPerCart: Number(e.target.value) } : p)} />
        </label>
        <label className="text-sm">Recovery link token expiry (minutes)
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" type="number" value={settings.tokenExpiryMinutes} onChange={(e) => setSettings((p) => p ? { ...p, tokenExpiryMinutes: Number(e.target.value) } : p)} />
        </label>
        <label className="text-sm">Attribution model
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm" value={settings.attributionModel} onChange={(e) => setSettings((p) => p ? { ...p, attributionModel: e.target.value as "last_click" | "first_click" } : p)}>
            <option value="last_click">Last click</option>
            <option value="first_click">First click</option>
          </select>
        </label>
      </div>
      <div className="rounded-xl border border-[#E8DCC8] bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase text-[#7A7A7A]">Recovery schedule</h2>
        <div className="space-y-2">
          {settings.schedule.map((step, idx) => (
            <div key={step.stepNo} className="grid gap-2 rounded border p-2 md:grid-cols-6">
              <input className="rounded border px-2 py-1 text-xs" type="number" value={step.stepNo} onChange={(e) => setSettings((p) => p ? { ...p, schedule: p.schedule.map((r, i) => i === idx ? { ...r, stepNo: Number(e.target.value) } : r) } : p)} />
              <input className="rounded border px-2 py-1 text-xs" type="number" value={step.delayMinutes} onChange={(e) => setSettings((p) => p ? { ...p, schedule: p.schedule.map((r, i) => i === idx ? { ...r, delayMinutes: Number(e.target.value) } : r) } : p)} />
              <input className="rounded border px-2 py-1 text-xs md:col-span-2" value={step.channels.join(",")} onChange={(e) => setSettings((p) => p ? { ...p, schedule: p.schedule.map((r, i) => i === idx ? { ...r, channels: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) as Array<"email" | "sms" | "whatsapp"> } : r) } : p)} />
              <input className="rounded border px-2 py-1 text-xs" value={step.template ?? ""} onChange={(e) => setSettings((p) => p ? { ...p, schedule: p.schedule.map((r, i) => i === idx ? { ...r, template: e.target.value } : r) } : p)} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={Boolean(step.includeCoupon)} onChange={(e) => setSettings((p) => p ? { ...p, schedule: p.schedule.map((r, i) => i === idx ? { ...r, includeCoupon: e.target.checked } : r) } : p)} />Coupon</label>
            </div>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => void save()} disabled={saving} className="rounded-full bg-[#7B3010] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50">
        {saving ? "Saving..." : "Save settings"}
      </button>
    </section>
  )
}

