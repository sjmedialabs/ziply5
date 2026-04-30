import { pgQuery, pgTx } from "@/src/server/db/pg"
import { enqueueEmail } from "@/src/server/modules/notifications/email.service"
import { smsService } from "@/src/server/integrations/sms/sms.service"
import crypto from "crypto"
import { safeString } from "@/src/lib/db/supabaseIntegrity"
import { renderPlaceholders } from "@/src/server/modules/abandoned-carts/templateRender"

type CartEventType =
  // Legacy event names (already used in the app)
  | "add_to_cart"
  | "remove_item"
  | "quantity_update"
  | "checkout_started"
  | "address_entered"
  | "payment_initiated"
  | "payment_failed"
  | "payment_success"
  | "order_placed"
  | "manual_clear"
  | "page_view"
  // Spec event names (supported for forward-compat)
  | "cart_item_added"
  | "cart_updated"
  | "payment_page_opened"
  | "payment_attempted"
  | "payment_cancelled"
  | "payment_timeout"
  | "tab_closed"
  | "session_expired"
  | "order_completed"

type RecoveryChannel = "email" | "sms" | "whatsapp"
type RecoveryStatus = "pending" | "sent" | "failed" | "cancelled" | "skipped"

type LifecycleState =
  | "CART_ONLY"
  | "CHECKOUT_STARTED"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "CONTACT_CAPTURED"
  | "ORDER_COMPLETED"
  | "ABANDONED"

const DEFAULT_SETTINGS = {
  enabled: true,
  // Backwards compatible: previous single-threshold fallback.
  abandonThresholdMinutes: 30,
  // Production thresholds by stage (minutes).
  cartOnlyThresholdMinutes: 30,
  checkoutStartedThresholdMinutes: 20,
  paymentPendingThresholdMinutes: 10,
  maxRemindersPerCart: 4,
  stopAfterPurchase: true,
  respectOptOut: true,
  emailEnabled: true,
  smsEnabled: true,
  whatsappEnabled: true,
  attributionModel: "last_click",
  tokenExpiryMinutes: 1440,
  schedule: [
    { stepNo: 1, delayMinutes: 30, channels: ["email", "whatsapp"], template: "abandon_r1", includeCoupon: false, active: true },
    { stepNo: 2, delayMinutes: 360, channels: ["sms", "email"], template: "abandon_r2", includeCoupon: false, active: true },
    { stepNo: 3, delayMinutes: 1440, channels: ["whatsapp"], template: "abandon_r3_coupon", includeCoupon: true, active: true },
    { stepNo: 4, delayMinutes: 4320, channels: ["email"], template: "abandon_r4_final", includeCoupon: false, active: true },
  ],
} as const

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex")

const mergeMeta = (existing: unknown, patch: Record<string, unknown>) => {
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? (existing as Record<string, unknown>) : {}
  return { ...base, ...patch }
}

const eventToLifecycleState = (eventType: CartEventType): LifecycleState => {
  if (eventType === "checkout_started") return "CHECKOUT_STARTED"
  if (eventType === "address_entered") return "CONTACT_CAPTURED"
  if (eventType === "payment_initiated" || eventType === "payment_page_opened" || eventType === "payment_attempted") return "PAYMENT_PENDING"
  if (eventType === "payment_failed") return "PAYMENT_FAILED"
  if (eventType === "payment_cancelled" || eventType === "payment_timeout") return "PAYMENT_PENDING"
  if (eventType === "payment_success" || eventType === "order_placed" || eventType === "order_completed") return "ORDER_COMPLETED"
  return "CART_ONLY"
}

const normalizeEventType = (eventType: CartEventType): CartEventType => {
  if (eventType === "add_to_cart") return "cart_item_added"
  if (eventType === "remove_item" || eventType === "quantity_update") return "cart_updated"
  if (eventType === "payment_initiated") return "payment_attempted"
  if (eventType === "payment_success") return "order_completed"
  if (eventType === "order_placed") return "order_completed"
  return eventType
}

const ensureRecoveryTables = async () => {
  await pgQuery(`
    ALTER TABLE "AbandonedCart"
      ADD COLUMN IF NOT EXISTS user_id text NULL,
      ADD COLUMN IF NOT EXISTS guest_id text NULL,
      ADD COLUMN IF NOT EXISTS mobile text NULL,
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'CART_ONLY',
      ADD COLUMN IF NOT EXISTS checkout_stage text NULL,
      ADD COLUMN IF NOT EXISTS payment_status text NULL,
      ADD COLUMN IF NOT EXISTS coupon_code text NULL,
      ADD COLUMN IF NOT EXISTS last_visited_page text NULL,
      ADD COLUMN IF NOT EXISTS customer_name text NULL,
      ADD COLUMN IF NOT EXISTS address_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS last_active_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS abandoned_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS converted_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS converted_order_id text NULL,
      ADD COLUMN IF NOT EXISTS recovered_channel text NULL,
      ADD COLUMN IF NOT EXISTS recovery_disabled boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS ignored boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_message_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS messages_sent int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb
  `)
  await pgQuery(`
    CREATE TABLE IF NOT EXISTS abandoned_cart_events_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id text NOT NULL,
      event_type text NOT NULL,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pgQuery(`
    CREATE TABLE IF NOT EXISTS abandoned_cart_recovery_queue_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id text NOT NULL,
      step_no int NOT NULL,
      channel text NOT NULL,
      scheduled_at timestamptz NOT NULL,
      sent_at timestamptz NULL,
      status text NOT NULL DEFAULT 'pending',
      error_message text NULL,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      UNIQUE(cart_id, step_no, channel)
    )
  `)
  await pgQuery(`
    CREATE TABLE IF NOT EXISTS abandoned_cart_messages_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id text NOT NULL,
      queue_id uuid NULL,
      channel text NOT NULL,
      template_used text NULL,
      provider_response text NULL,
      sent_to text NULL,
      status text NOT NULL DEFAULT 'sent',
      sent_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pgQuery(`
    CREATE TABLE IF NOT EXISTS abandoned_cart_settings_v2 (
      id text PRIMARY KEY,
      value_json jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pgQuery(`
    CREATE TABLE IF NOT EXISTS abandoned_cart_templates_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_key text NOT NULL,
      channel text NOT NULL,
      subject text NULL,
      body text NOT NULL,
      active boolean NOT NULL DEFAULT true,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(template_key, channel)
    )
  `)
  await pgQuery(`
    CREATE TABLE IF NOT EXISTS abandoned_cart_resume_tokens_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz NULL,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb
    )
  `)
  await pgQuery(`
    CREATE TABLE IF NOT EXISTS abandoned_cart_analytics_daily_v2 (
      date_key date PRIMARY KEY,
      total_abandoned int NOT NULL DEFAULT 0,
      recovered_count int NOT NULL DEFAULT 0,
      recovered_revenue numeric(12,2) NOT NULL DEFAULT 0,
      by_channel jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

const getSettings = async () => {
  await ensureRecoveryTables()
  const rows = await pgQuery<Array<{ value_json: any }>>(
    `SELECT value_json FROM abandoned_cart_settings_v2 WHERE id = 'default' LIMIT 1`,
  )
  return (rows[0]?.value_json as Record<string, unknown> | undefined) ?? { ...DEFAULT_SETTINGS }
}

export const saveRecoverySettings = async (input: Record<string, unknown>) => {
  await ensureRecoveryTables()
  const current = await getSettings()
  const merged = { ...current, ...input }
  await pgQuery(
    `INSERT INTO abandoned_cart_settings_v2 (id, value_json, updated_at)
     VALUES ('default', $1::jsonb, now())
     ON CONFLICT (id)
     DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = now()`,
    [JSON.stringify(merged)],
  )
  return merged
}

export const getRecoverySettings = getSettings

const getTemplate = async (templateKey: string, channel: RecoveryChannel) => {
  await ensureRecoveryTables()
  const rows = await pgQuery<Array<{ subject: string | null; body: string }>>(
    `SELECT subject, body
     FROM abandoned_cart_templates_v2
     WHERE template_key = $1 AND channel = $2 AND active = true
     LIMIT 1`,
    [templateKey, channel],
  )
  return rows[0] ?? null
}

export const listRecoveryTemplates = async () => {
  await ensureRecoveryTables()
  const rows = await pgQuery<
    Array<{ template_key: string; channel: string; subject: string | null; body: string; active: boolean; updated_at: Date }>
  >(
    `SELECT template_key, channel, subject, body, active, updated_at
     FROM abandoned_cart_templates_v2
     ORDER BY template_key ASC, channel ASC`,
  )
  return rows
}

export const saveRecoveryTemplate = async (input: {
  templateKey: string
  channel: RecoveryChannel
  subject?: string | null
  body: string
  active?: boolean
}) => {
  await ensureRecoveryTables()
  await pgQuery(
    `INSERT INTO abandoned_cart_templates_v2 (template_key, channel, subject, body, active, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (template_key, channel)
     DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body, active = EXCLUDED.active, updated_at = now()`,
    [input.templateKey, input.channel, input.subject ?? null, input.body, input.active ?? true],
  )
  return { saved: true }
}

const buildResumeToken = async (cartId: string, ttlMinutes: number, meta: Record<string, unknown>) => {
  await ensureRecoveryTables()
  const token = crypto.randomBytes(24).toString("base64url")
  const tokenHash = sha256(token)
  await pgQuery(
    `INSERT INTO abandoned_cart_resume_tokens_v2 (cart_id, token_hash, expires_at, meta)
     VALUES ($1, $2, now() + ($3 * interval '1 minute'), $4::jsonb)`,
    [cartId, tokenHash, Math.max(1, ttlMinutes), JSON.stringify(meta ?? {})],
  )
  return token
}

export const trackCartEvent = async (input: {
  sessionKey: string
  userId?: string | null
  guestId?: string | null
  email?: string | null
  mobile?: string | null
  itemsJson?: unknown
  total?: number | null
  eventType: CartEventType
  meta?: Record<string, unknown>
}) => {
  await ensureRecoveryTables()
  const eventType = normalizeEventType(input.eventType)
  const lifecycleState = eventToLifecycleState(eventType)
  const row = (await pgQuery<
    Array<{
      id: string
      sessionKey: string
      email: string | null
      itemsJson: unknown
      total: number | null
      updatedAt: Date
      createdAt: Date
    }>
  >(
    `
      INSERT INTO "AbandonedCart" (id, "sessionKey", email, "itemsJson", total, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3::jsonb, $4, now(), now())
      ON CONFLICT ("sessionKey") DO UPDATE
      SET email = COALESCE(EXCLUDED.email, "AbandonedCart".email),
          "itemsJson" = COALESCE(EXCLUDED."itemsJson", "AbandonedCart"."itemsJson"),
          total = COALESCE(EXCLUDED.total, "AbandonedCart".total),
          "updatedAt" = now()
      RETURNING id, "sessionKey", email, "itemsJson", total, "updatedAt", "createdAt"
    `,
    [
      input.sessionKey,
      input.email ?? null,
      JSON.stringify(input.itemsJson ?? []),
      input.total ?? null,
    ],
  ))[0]
  const meta = input.meta ?? {}
  const checkoutStage = typeof meta.checkoutStage === "string" ? meta.checkoutStage : undefined
  const paymentStatus = typeof meta.paymentStatus === "string" ? meta.paymentStatus : undefined
  const lastVisitedPage = typeof meta.lastVisitedPage === "string" ? meta.lastVisitedPage : undefined
  const couponCode = typeof meta.couponCode === "string" ? meta.couponCode : undefined
  const customerName = typeof meta.name === "string" ? meta.name : undefined
  const addressJson = meta.address && typeof meta.address === "object" && !Array.isArray(meta.address) ? meta.address : undefined

  await pgQuery(
    `
      UPDATE "AbandonedCart"
      SET
        user_id = COALESCE($1, user_id),
        guest_id = COALESCE($2, guest_id),
        mobile = COALESCE($3, mobile),
        last_active_at = now(),
        lifecycle_state = $4,
        checkout_stage = COALESCE($5, checkout_stage),
        payment_status = COALESCE($6, payment_status),
        coupon_code = COALESCE($7, coupon_code),
        last_visited_page = COALESCE($8, last_visited_page),
        customer_name = COALESCE($9, customer_name),
        address_json = CASE WHEN $10::jsonb IS NOT NULL THEN $10::jsonb ELSE address_json END,
        metadata = metadata || $11::jsonb,
        status = CASE
          WHEN $12 IN ('order_completed', 'manual_clear') THEN 'converted'
          WHEN $12 IN ('payment_failed') THEN 'abandoned'
          ELSE status
        END,
        abandoned_at = CASE
          WHEN $12 IN ('order_completed', 'manual_clear') THEN NULL
          WHEN $12 IN ('payment_failed') THEN COALESCE(abandoned_at, now())
          ELSE abandoned_at
        END
      WHERE id = $13
    `,
    [
      input.userId ?? null,
      input.guestId ?? null,
      input.mobile ?? null,
      lifecycleState,
      checkoutStage ?? null,
      paymentStatus ?? null,
      couponCode ?? null,
      lastVisitedPage ?? null,
      customerName ?? null,
      addressJson ? JSON.stringify(addressJson) : null,
      JSON.stringify(meta ?? {}),
      eventType,
      row.id,
    ],
  )
  await pgQuery(
    `INSERT INTO abandoned_cart_events_v2 (cart_id, event_type, meta) VALUES ($1, $2, $3::jsonb)`,
    [row.id, eventType, JSON.stringify(input.meta ?? {})],
  )

  // Payment failure should be immediately eligible for follow-up: enqueue schedule now (idempotent via unique constraint).
  if (eventType === "payment_failed") {
    const settings = await getSettings()
    const schedule = (Array.isArray((settings as any).schedule) ? (settings as any).schedule : DEFAULT_SETTINGS.schedule) as Array<{
      stepNo: number
      delayMinutes: number
      channels: RecoveryChannel[]
      template?: string
      includeCoupon?: boolean
      active?: boolean
    }>
    for (const step of schedule.filter((entry) => entry.active !== false)) {
      for (const channel of step.channels) {
        await pgQuery(
          `
            INSERT INTO abandoned_cart_recovery_queue_v2 (cart_id, step_no, channel, scheduled_at, payload, status)
            VALUES ($1, $2, $3, now() + ($4 * interval '1 minute'), $5::jsonb, 'pending')
            ON CONFLICT (cart_id, step_no, channel)
            DO NOTHING
          `,
          [
            row.id,
            step.stepNo,
            channel,
            Math.max(0, Number(step.delayMinutes ?? 0)),
            JSON.stringify({
              template: step.template ?? `abandoned_step_${step.stepNo}`,
              includeCoupon: Boolean(step.includeCoupon),
            }),
          ],
        )
      }
    }
  }

  return row
}

export const detectAbandonedCarts = async () => {
  await ensureRecoveryTables()
  const settings = await getSettings()
  if (!settings.enabled) return { scanned: 0, marked: 0, queued: 0 }
  const thresholds = {
    cartOnlyMinutes: Math.max(1, Number((settings as any).cartOnlyThresholdMinutes ?? 30)),
    checkoutStartedMinutes: Math.max(1, Number((settings as any).checkoutStartedThresholdMinutes ?? 20)),
    paymentPendingMinutes: Math.max(1, Number((settings as any).paymentPendingThresholdMinutes ?? 10)),
  }
  const schedule = (Array.isArray(settings.schedule) ? settings.schedule : DEFAULT_SETTINGS.schedule) as Array<{
    stepNo: number
    delayMinutes: number
    channels: RecoveryChannel[]
    template?: string
    includeCoupon?: boolean
    active?: boolean
  }>
  const candidates = await pgQuery<
    Array<{
      id: string
      status: string
      updated_at: Date
      last_active_at: Date | null
      lifecycle_state: string
      total: number | null
      items_json: unknown
      recovery_disabled: boolean
      ignored: boolean
    }>
  >(
    `SELECT id, status, "updatedAt" as updated_at, last_active_at, lifecycle_state, total, "itemsJson" as items_json, recovery_disabled, ignored
     FROM "AbandonedCart"
     WHERE status IN ('active', 'abandoned')
       AND recovery_disabled = false
       AND ignored = false`,
  )
  let marked = 0
  let queued = 0
  for (const cart of candidates) {
    const items = Array.isArray(cart.items_json) ? cart.items_json : []
    if (!items.length) continue
    const lastActivity = cart.last_active_at ?? cart.updated_at
    const minutesInactive = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 60000)
    const stage = String(cart.lifecycle_state || "CART_ONLY")
    const thresholdMinutes =
      stage === "PAYMENT_FAILED"
        ? 0
        : stage === "PAYMENT_PENDING"
          ? thresholds.paymentPendingMinutes
          : stage === "CHECKOUT_STARTED" || stage === "CONTACT_CAPTURED"
            ? thresholds.checkoutStartedMinutes
            : thresholds.cartOnlyMinutes
    if (minutesInactive < thresholdMinutes) continue
    await pgQuery(
      `UPDATE "AbandonedCart" SET status = 'abandoned', abandoned_at = COALESCE(abandoned_at, now()) WHERE id = $1`,
      [cart.id],
    )
    marked += 1
    for (const step of schedule.filter((entry) => entry.active !== false)) {
      for (const channel of step.channels) {
        await pgQuery(
          `
            INSERT INTO abandoned_cart_recovery_queue_v2 (cart_id, step_no, channel, scheduled_at, payload, status)
            VALUES ($1, $2, $3, now() + ($4 * interval '1 minute'), $5::jsonb, 'pending')
            ON CONFLICT (cart_id, step_no, channel)
            DO NOTHING
          `,
          [
            cart.id,
            step.stepNo,
            channel,
            Number(step.delayMinutes ?? 0),
            JSON.stringify({
              template: step.template ?? `abandoned_step_${step.stepNo}`,
              includeCoupon: Boolean(step.includeCoupon),
            }),
          ],
        )
        queued += 1
      }
    }
  }
  return { scanned: candidates.length, marked, queued }
}

const renderMessage = async (input: {
  name: string
  cartValue: number
  itemsCount: number
  checkoutLink: string
  coupon?: string
  templateKey: string
  channel: RecoveryChannel
}) => {
  const vars = buildDefaultVars({
    name: input.name || "there",
    cart_value: input.cartValue.toFixed(2),
    items: String(input.itemsCount),
    resume_link: input.checkoutLink,
    coupon: input.coupon ?? "",
  })
  const stored = await getTemplate(input.templateKey, input.channel)
  const defaultSubject = "You left something in your cart"
  const defaultBody =
    input.channel === "email"
      ? `<p>Hi {{name}}, you left items worth Rs.{{amount}} in your cart. <a href="{{resume_link}}">Resume checkout</a>.</p>`
      : "Hi {{name}}, you left items worth Rs.{{amount}} in your cart. Complete order: {{resume_link}}"

  const subject = renderPlaceholders(stored?.subject ?? defaultSubject, vars)
  const body = renderPlaceholders(stored?.body ?? defaultBody, vars)
  return { subject, body }
}

const sendWhatsapp = async (to: string, body: string) => {
  // Reuse SMS adapter as a safe fallback if dedicated provider is absent.
  await smsService.send({ to, body: `[WA] ${body}` })
}

function normalizeVars(vars: Record<string, string | number | null | undefined>) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(vars)) out[k] = v == null ? "" : String(v)
  return out
}

function buildDefaultVars(
  input: Partial<{
    name: string
    first_name: string
    cart_value: number | string
    items: number | string
    item_names: string
    coupon: string
    discount: string
    resume_link: string
    payment_link: string
    support_number: string
    store_name: string
    expiry_time: string
  }>,
) {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? process.env.NEXT_PUBLIC_APP_NAME ?? "Store"
  const supportNumber = process.env.NEXT_PUBLIC_SUPPORT_NUMBER ?? ""
  return normalizeVars({
    name: input.name ?? "there",
    first_name: input.first_name ?? (input.name ? String(input.name).split(" ")[0] : "there"),
    cart_value: input.cart_value ?? "",
    items: input.items ?? "",
    item_names: input.item_names ?? "",
    coupon: input.coupon ?? "",
    discount: input.discount ?? "",
    resume_link: input.resume_link ?? "",
    payment_link: input.payment_link ?? "",
    support_number: input.support_number ?? supportNumber,
    store_name: input.store_name ?? storeName,
    expiry_time: input.expiry_time ?? "",
    // Backwards compatible keys used by older templates
    amount: input.cart_value ?? "",
  })
}

export const processRecoveryQueue = async () => {
  await ensureRecoveryTables()
  const rows = await pgQuery<
    Array<{
      id: string
      cart_id: string
      step_no: number
      channel: RecoveryChannel
      payload: any
      status: RecoveryStatus
      email: string | null
      mobile: string | null
      total: number | null
      items_json: any
      coupon_code: string | null
      messages_sent: number
      converted_at: Date | null
      recovery_disabled: boolean
      ignored: boolean
      session_key: string
    }>
  >(
    `
      SELECT
        q.id,
        q.cart_id,
        q.step_no,
        q.channel,
        q.payload,
        q.status,
        c.email,
        c.mobile,
        c.total,
        c."itemsJson" as items_json,
        c.coupon_code,
        c.messages_sent,
        c.converted_at,
        c.recovery_disabled,
        c.ignored,
        c."sessionKey" as session_key
      FROM abandoned_cart_recovery_queue_v2 q
      JOIN "AbandonedCart" c ON c.id = q.cart_id
      WHERE q.status = 'pending'
        AND q.scheduled_at <= now()
      ORDER BY q.scheduled_at ASC
      LIMIT 100
    `,
  )
  const settings = await getSettings()
  const maxReminders = Math.max(1, Number(settings.maxRemindersPerCart ?? DEFAULT_SETTINGS.maxRemindersPerCart))
  const checkoutBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  let sent = 0
  let failed = 0
  let skipped = 0
  for (const row of rows) {
    try {
      if (row.converted_at || row.recovery_disabled || row.ignored || row.messages_sent >= maxReminders) {
        await pgQuery(`UPDATE abandoned_cart_recovery_queue_v2 SET status='skipped' WHERE id = $1::uuid`, [row.id])
        skipped += 1
        continue
      }
      const to = row.channel === "email" ? row.email : row.mobile
      if (!to) {
        await pgQuery(
          `UPDATE abandoned_cart_recovery_queue_v2 SET status='failed', error_message='Missing recipient' WHERE id = $1::uuid`,
          [row.id],
        )
        failed += 1
        continue
      }
      const tokenTtl = Math.max(5, Number((settings as any).tokenExpiryMinutes ?? DEFAULT_SETTINGS.tokenExpiryMinutes))
      const resumeToken = await buildResumeToken(row.cart_id, tokenTtl, { source: "followup", channel: row.channel, stepNo: row.step_no })
      const checkoutLink = `${checkoutBase}/cart/recover/${encodeURIComponent(resumeToken)}`
      const templateKey = String((row.payload as any)?.template ?? `abandoned_step_${row.step_no}`)
      const msg = await renderMessage({
        name: "there",
        cartValue: Number(row.total ?? 0),
        itemsCount: Array.isArray(row.items_json) ? row.items_json.length : 0,
        checkoutLink,
        coupon: typeof row.coupon_code === "string" ? row.coupon_code : undefined,
        templateKey,
        channel: row.channel,
      })
      if (row.channel === "email") {
        await enqueueEmail({ to, subject: msg.subject, html: msg.body })
      } else if (row.channel === "sms") {
        await smsService.send({ to, body: msg.body })
      } else {
        await sendWhatsapp(to, msg.body)
      }
      await pgTx(async (client) => {
        await client.query(
          `UPDATE abandoned_cart_recovery_queue_v2 SET status='sent', sent_at=now() WHERE id = $1::uuid`,
          [row.id],
        )
        await client.query(
          `INSERT INTO abandoned_cart_messages_v2 (cart_id, queue_id, channel, template_used, sent_to, status)
           VALUES ($1, $2::uuid, $3, $4, $5, 'sent')`,
          [row.cart_id, row.id, row.channel, templateKey, to],
        )
        await client.query(
          `UPDATE "AbandonedCart" SET messages_sent = messages_sent + 1, last_message_at = now() WHERE id = $1`,
          [row.cart_id],
        )
      })
      sent += 1
    } catch (error) {
      await pgQuery(
        `UPDATE abandoned_cart_recovery_queue_v2 SET status='failed', error_message=$1 WHERE id = $2::uuid`,
        [error instanceof Error ? error.message.slice(0, 200) : "Unknown error", row.id],
      )
      failed += 1
    }
  }
  return { due: rows.length, sent, failed, skipped }
}

export const markCartConverted = async (input: { sessionKey?: string | null; email?: string | null; mobile?: string | null; orderId?: string | null; revenue?: number | null; channel?: string | null }) => {
  await ensureRecoveryTables()
  await getSettings()
  const rows = await pgQuery<Array<{ id: string }>>(
    `
      SELECT id
      FROM "AbandonedCart"
      WHERE ($1::text IS NOT NULL AND "sessionKey" = $1)
         OR ($2::text IS NOT NULL AND email = $2)
         OR ($3::text IS NOT NULL AND mobile = $3)
      ORDER BY "updatedAt" DESC
      LIMIT 1
    `,
    [input.sessionKey ?? null, input.email ?? null, input.mobile ?? null],
  )
  const cart = rows[0]
  if (!cart) return { updated: false }

  // Best-effort attribution: if no explicit channel provided, infer from last used resume token.
  let channel = input.channel ?? null
  if (!channel) {
    const tokenRows = await pgQuery<Array<{ meta: any }>>(
      `SELECT meta FROM abandoned_cart_resume_tokens_v2 WHERE cart_id = $1 AND last_used_at IS NOT NULL ORDER BY last_used_at DESC LIMIT 1`,
      [cart.id],
    )
    const meta = tokenRows[0]?.meta
    const inferred =
      meta && typeof meta === "object" && !Array.isArray(meta) ? safeString((meta as any).channel) || safeString((meta as any).source) : ""
    if (inferred) channel = inferred
  }

  await pgTx(async (client) => {
    await client.query(
      `UPDATE "AbandonedCart" SET status='converted', converted_at=now(), converted_order_id=$1, recovered_channel=$2 WHERE id = $3`,
      [input.orderId ?? null, channel, cart.id],
    )
    await client.query(
      `UPDATE abandoned_cart_recovery_queue_v2 SET status='cancelled' WHERE cart_id = $1 AND status='pending'`,
      [cart.id],
    )
  })
  if ((input.revenue ?? 0) > 0) {
    await pgQuery(
      `
        INSERT INTO abandoned_cart_analytics_daily_v2 (date_key, total_abandoned, recovered_count, recovered_revenue, by_channel, updated_at)
        VALUES (CURRENT_DATE, 0, 1, $1::numeric, $2::jsonb, now())
        ON CONFLICT (date_key)
        DO UPDATE SET
          recovered_count = abandoned_cart_analytics_daily_v2.recovered_count + 1,
          recovered_revenue = abandoned_cart_analytics_daily_v2.recovered_revenue + EXCLUDED.recovered_revenue,
          updated_at = now()
      `,
      [input.revenue ?? 0, JSON.stringify({ [input.channel ?? "unknown"]: 1 })],
    )
  }
  return { updated: true, cartId: cart.id }
}

export const listAbandonedCartsDashboard = async (input?: {
  converted?: "yes" | "no"
  userType?: "guest" | "registered"
  minValue?: number
  maxValue?: number
  q?: string
}) => {
  await ensureRecoveryTables()
  const params: any[] = []
  const where: string[] = []

  if (input?.converted === "yes") where.push(`converted_at IS NOT NULL`)
  if (input?.converted === "no") where.push(`converted_at IS NULL`)
  if (input?.userType === "registered") where.push(`user_id IS NOT NULL`)
  if (input?.userType === "guest") where.push(`user_id IS NULL`)

  if (typeof input?.minValue === "number") {
    params.push(input.minValue)
    where.push(`total >= $${params.length}`)
  }
  if (typeof input?.maxValue === "number") {
    params.push(input.maxValue)
    where.push(`total <= $${params.length}`)
  }
  if (input?.q?.trim()) {
    const q = `%${input.q.trim()}%`
    params.push(q, q, q)
    const a = params.length - 2
    where.push(`(COALESCE(email,'') ILIKE $${a} OR COALESCE(mobile,'') ILIKE $${a + 1} OR "sessionKey" ILIKE $${a + 2})`)
  }

  const sql = `
    SELECT
      id,
      "sessionKey" as session_key,
      email,
      mobile,
      user_id,
      total,
      "updatedAt" as updated_at,
      last_active_at,
      abandoned_at,
      status,
      messages_sent,
      last_message_at,
      converted_at,
      "itemsJson" as items_json
    FROM "AbandonedCart"
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY COALESCE(abandoned_at, "updatedAt") DESC
    LIMIT 200
  `
  return pgQuery(sql, params)
}

export const getAbandonedCartTimeline = async (cartId: string) => {
  await ensureRecoveryTables()
  const [events, messages, queue] = await Promise.all([
    pgQuery<Array<{ id: string; event_type: string; meta: any; created_at: Date }>>(
      `SELECT id, event_type, meta, created_at
       FROM abandoned_cart_events_v2
       WHERE cart_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [cartId],
    ),
    pgQuery<Array<{ id: string; channel: string; template_used: string | null; sent_to: string | null; status: string; sent_at: Date }>>(
      `SELECT id, channel, template_used, sent_to, status, sent_at
       FROM abandoned_cart_messages_v2
       WHERE cart_id = $1
       ORDER BY sent_at DESC
       LIMIT 200`,
      [cartId],
    ),
    pgQuery<Array<{ id: string; step_no: number; channel: string; scheduled_at: Date; sent_at: Date | null; status: string; error_message: string | null }>>(
      `SELECT id, step_no, channel, scheduled_at, sent_at, status, error_message
       FROM abandoned_cart_recovery_queue_v2
       WHERE cart_id = $1
       ORDER BY scheduled_at DESC
       LIMIT 200`,
      [cartId],
    ),
  ])
  return { events, messages, queue }
}

export const getRecoverableCartBySession = async (sessionKey: string) => {
  await ensureRecoveryTables()
  const rows = await pgQuery<
    Array<{
      id: string
      session_key: string
      email: string | null
      items_json: any
      total: number | null
      status: string
      converted_at: Date | null
      updated_at: Date
    }>
  >(
    `SELECT id, "sessionKey" as session_key, email, "itemsJson" as items_json, total, status, converted_at, "updatedAt" as updated_at
     FROM "AbandonedCart"
     WHERE "sessionKey" = $1
     LIMIT 1`,
    [sessionKey],
  )
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    sessionKey: row.session_key,
    email: row.email,
    itemsJson: row.items_json,
    total: row.total,
    status: row.status,
    convertedAt: row.converted_at,
    updatedAt: row.updated_at,
  }
}

export const getRecoverableCartByTokenOrSession = async (tokenOrSessionKey: string) => {
  await ensureRecoveryTables()
  const tokenHash = sha256(tokenOrSessionKey)
  const tokenRows = await pgQuery<Array<{ cart_id: string }>>(
    `SELECT cart_id FROM abandoned_cart_resume_tokens_v2 WHERE token_hash = $1 AND expires_at > now() LIMIT 1`,
    [tokenHash],
  )
  const cartId = tokenRows[0]?.cart_id
  if (cartId) {
    await pgQuery(`UPDATE abandoned_cart_resume_tokens_v2 SET last_used_at = now() WHERE token_hash = $1`, [tokenHash])
    const rows = await pgQuery<
      Array<{
        id: string
        session_key: string
        email: string | null
        items_json: any
        total: number | null
        status: string
        converted_at: Date | null
        updated_at: Date
      }>
    >(
      `SELECT id, "sessionKey" as session_key, email, "itemsJson" as items_json, total, status, converted_at, "updatedAt" as updated_at
       FROM "AbandonedCart"
       WHERE id = $1
       LIMIT 1`,
      [cartId],
    )
    const row = rows[0]
    if (!row) return null
    return {
      id: row.id,
      sessionKey: row.session_key,
      email: row.email,
      itemsJson: row.items_json,
      total: row.total,
      status: row.status,
      convertedAt: row.converted_at,
      updatedAt: row.updated_at,
    }
  }

  // Backwards compatible: treat the token as the sessionKey.
  return getRecoverableCartBySession(tokenOrSessionKey)
}

export const createResumeLinkTokenForCart = async (cartId: string, meta: Record<string, unknown> = {}) => {
  const settings = await getSettings()
  const ttl = Math.max(5, Number((settings as any).tokenExpiryMinutes ?? DEFAULT_SETTINGS.tokenExpiryMinutes))
  const token = await buildResumeToken(cartId, ttl, { source: "admin", ...meta })
  return { token, ttlMinutes: ttl }
}

export const sendRecoveryNow = async (cartId: string, channels: RecoveryChannel[] = ["email"]) => {
  await ensureRecoveryTables()
  for (const channel of channels) {
    await pgQuery(
      `
        INSERT INTO abandoned_cart_recovery_queue_v2 (cart_id, step_no, channel, scheduled_at, status, payload)
        VALUES ($1, 0, $2, now(), 'pending', $3::jsonb)
        ON CONFLICT (cart_id, step_no, channel)
        DO UPDATE SET scheduled_at = now(), status='pending'
      `,
      [cartId, channel, JSON.stringify({ template: "manual_send_now" })],
    )
  }
  return { queued: channels.length }
}

export const setRecoveryFlags = async (cartId: string, input: { recoveryDisabled?: boolean; ignored?: boolean }) => {
  await ensureRecoveryTables()
  await pgQuery(
    `UPDATE "AbandonedCart"
     SET recovery_disabled = COALESCE($1, recovery_disabled),
         ignored = COALESCE($2, ignored)
     WHERE id = $3`,
    [input.recoveryDisabled ?? null, input.ignored ?? null, cartId],
  )
}

export const getAbandonedAnalytics = async () => {
  await ensureRecoveryTables()
  const [summaryRows, topProductsRows] = await Promise.all([
    pgQuery<Array<{ total: bigint; converted: bigint; recovered_revenue: number }>>(
      `
        SELECT
          COUNT(*)::bigint as total,
          COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::bigint as converted,
          COALESCE(SUM(CASE WHEN converted_at IS NOT NULL THEN total ELSE 0 END), 0)::numeric as recovered_revenue
        FROM "AbandonedCart"
        WHERE status IN ('abandoned', 'converted')
      `,
    ),
    pgQuery<Array<{ product_name: string; abandon_count: bigint }>>(
      `
        WITH flat AS (
          SELECT jsonb_array_elements("itemsJson"::jsonb) as item
          FROM "AbandonedCart"
          WHERE status IN ('abandoned', 'converted')
        )
        SELECT COALESCE(item->>'name', item->>'slug', 'Unknown') as product_name, COUNT(*)::bigint as abandon_count
        FROM flat
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10
      `,
    ),
  ])
  const summary = summaryRows[0] ?? { total: BigInt(0), converted: BigInt(0), recovered_revenue: 0 }
  const total = Number(summary.total)
  const converted = Number(summary.converted)
  const recoveryRate = total > 0 ? (converted / total) * 100 : 0
  return {
    totalAbandoned: total,
    recoveredCount: converted,
    recoveryRate,
    recoveredRevenue: Number(summary.recovered_revenue ?? 0),
    topAbandonedProducts: topProductsRows.map((row) => ({ name: row.product_name, count: Number(row.abandon_count) })),
  }
}

export const aggregateAbandonedAnalyticsDaily = async () => {
  await ensureRecoveryTables()
  await pgQuery(
    `
      INSERT INTO abandoned_cart_analytics_daily_v2 (date_key, total_abandoned, recovered_count, recovered_revenue, by_channel, updated_at)
      SELECT
        CURRENT_DATE,
        COUNT(*) FILTER (WHERE status IN ('abandoned', 'converted'))::int,
        COUNT(*) FILTER (WHERE converted_at::date = CURRENT_DATE)::int,
        COALESCE(SUM(CASE WHEN converted_at::date = CURRENT_DATE THEN total ELSE 0 END), 0)::numeric,
        COALESCE(
          (
            SELECT jsonb_object_agg(channel, cnt)
            FROM (
              SELECT channel, COUNT(*)::int as cnt
              FROM abandoned_cart_messages_v2
              WHERE sent_at::date = CURRENT_DATE
              GROUP BY channel
            ) t
          ),
          '{}'::jsonb
        ),
        now()
      FROM "AbandonedCart"
      ON CONFLICT (date_key)
      DO UPDATE SET
        total_abandoned = EXCLUDED.total_abandoned,
        recovered_count = EXCLUDED.recovered_count,
        recovered_revenue = EXCLUDED.recovered_revenue,
        by_channel = EXCLUDED.by_channel,
        updated_at = now()
    `,
  )
  return { date: new Date().toISOString().slice(0, 10), aggregated: true }
}

export const sendRecoveryTemplateTest = async (input: { templateKey: string; channel: RecoveryChannel; to: string }) => {
  await ensureRecoveryTables()
  const template = await getTemplate(input.templateKey, input.channel)
  const vars = buildDefaultVars({
    name: "Asha",
    cart_value: "1299",
    items: "3",
    item_names: "Vitamin C Serum, Sunscreen, Lip Balm",
    coupon: "WELCOME10",
    discount: "10%",
    resume_link: "https://example.test/cart/recover/demo",
    payment_link: "https://example.test/payment/demo",
    expiry_time: "24 hours",
  })

  const subject = renderPlaceholders(template?.subject ?? "Test recovery message", vars)
  const body = renderPlaceholders(
    template?.body ??
      (input.channel === "email"
        ? "<p>Hi {{name}}, this is a test message from {{store_name}}.</p>"
        : "Hi {{name}}, this is a test message from {{store_name}}."),
    vars,
  )

  if (input.channel === "email") {
    await enqueueEmail({ to: input.to, subject, html: body })
  } else if (input.channel === "sms") {
    await smsService.send({ to: input.to, body })
  } else {
    await sendWhatsapp(input.to, body)
  }
  return { sent: true }
}

