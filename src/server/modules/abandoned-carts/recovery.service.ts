import { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"
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
  await prisma.$executeRawUnsafe(`
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
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS abandoned_cart_events_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id text NOT NULL,
      event_type text NOT NULL,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await prisma.$executeRawUnsafe(`
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
  await prisma.$executeRawUnsafe(`
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
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS abandoned_cart_settings_v2 (
      id text PRIMARY KEY,
      value_json jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await prisma.$executeRawUnsafe(`
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
  await prisma.$executeRawUnsafe(`
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
  await prisma.$executeRawUnsafe(`
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
  const rows = await prisma.$queryRaw<Array<{ value_json: Prisma.JsonValue }>>(Prisma.sql`
    SELECT value_json
    FROM abandoned_cart_settings_v2
    WHERE id = 'default'
    LIMIT 1
  `)
  return (rows[0]?.value_json as Record<string, unknown> | undefined) ?? { ...DEFAULT_SETTINGS }
}

export const saveRecoverySettings = async (input: Record<string, unknown>) => {
  await ensureRecoveryTables()
  const current = await getSettings()
  const merged = { ...current, ...input }
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO abandoned_cart_settings_v2 (id, value_json, updated_at)
    VALUES ('default', ${merged as Prisma.JsonObject}, now())
    ON CONFLICT (id)
    DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = now()
  `)
  return merged
}

export const getRecoverySettings = getSettings

const getTemplate = async (templateKey: string, channel: RecoveryChannel) => {
  await ensureRecoveryTables()
  const rows = await prisma.$queryRaw<Array<{ subject: string | null; body: string }>>(Prisma.sql`
    SELECT subject, body
    FROM abandoned_cart_templates_v2
    WHERE template_key = ${templateKey} AND channel = ${channel} AND active = true
    LIMIT 1
  `)
  return rows[0] ?? null
}

export const listRecoveryTemplates = async () => {
  await ensureRecoveryTables()
  const rows = await prisma.$queryRaw<Array<{ template_key: string; channel: string; subject: string | null; body: string; active: boolean; updated_at: Date }>>(
    Prisma.sql`
      SELECT template_key, channel, subject, body, active, updated_at
      FROM abandoned_cart_templates_v2
      ORDER BY template_key ASC, channel ASC
    `,
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
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO abandoned_cart_templates_v2 (template_key, channel, subject, body, active, updated_at)
    VALUES (${input.templateKey}, ${input.channel}, ${input.subject ?? null}, ${input.body}, ${input.active ?? true}, now())
    ON CONFLICT (template_key, channel)
    DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body, active = EXCLUDED.active, updated_at = now()
  `)
  return { saved: true }
}

const buildResumeToken = async (cartId: string, ttlMinutes: number, meta: Record<string, unknown>) => {
  await ensureRecoveryTables()
  const token = crypto.randomBytes(24).toString("base64url")
  const tokenHash = sha256(token)
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO abandoned_cart_resume_tokens_v2 (cart_id, token_hash, expires_at, meta)
    VALUES (${cartId}, ${tokenHash}, now() + (${Math.max(1, ttlMinutes)} * interval '1 minute'), ${(meta as unknown) as Prisma.JsonObject})
  `)
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
  const row = await prisma.abandonedCart.upsert({
    where: { sessionKey: input.sessionKey },
    create: {
      sessionKey: input.sessionKey,
      email: input.email ?? undefined,
      itemsJson: (input.itemsJson ?? []) as never,
      total: input.total ?? undefined,
      updatedAt: new Date(),
    },
    update: {
      email: input.email ?? undefined,
      itemsJson: (input.itemsJson ?? undefined) as never,
      total: input.total ?? undefined,
      updatedAt: new Date(),
    },
  })
  const meta = input.meta ?? {}
  const checkoutStage = typeof meta.checkoutStage === "string" ? meta.checkoutStage : undefined
  const paymentStatus = typeof meta.paymentStatus === "string" ? meta.paymentStatus : undefined
  const lastVisitedPage = typeof meta.lastVisitedPage === "string" ? meta.lastVisitedPage : undefined
  const couponCode = typeof meta.couponCode === "string" ? meta.couponCode : undefined
  const customerName = typeof meta.name === "string" ? meta.name : undefined
  const addressJson = meta.address && typeof meta.address === "object" && !Array.isArray(meta.address) ? meta.address : undefined

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "AbandonedCart"
    SET
      user_id = COALESCE(${input.userId ?? null}, user_id),
      guest_id = COALESCE(${input.guestId ?? null}, guest_id),
      mobile = COALESCE(${input.mobile ?? null}, mobile),
      last_active_at = now(),
      lifecycle_state = ${lifecycleState},
      checkout_stage = COALESCE(${checkoutStage ?? null}, checkout_stage),
      payment_status = COALESCE(${paymentStatus ?? null}, payment_status),
      coupon_code = COALESCE(${couponCode ?? null}, coupon_code),
      last_visited_page = COALESCE(${lastVisitedPage ?? null}, last_visited_page),
      customer_name = COALESCE(${customerName ?? null}, customer_name),
      address_json = CASE WHEN ${addressJson ? 1 : 0} = 1 THEN (${(addressJson as unknown) as Prisma.JsonObject})::jsonb ELSE address_json END,
      metadata = metadata || ${((meta as unknown) as Prisma.JsonObject)}::jsonb,
      status = CASE
        WHEN ${eventType} IN ('order_completed', 'manual_clear') THEN 'converted'
        WHEN ${eventType} IN ('payment_failed') THEN 'abandoned'
        ELSE status
      END,
      abandoned_at = CASE
        WHEN ${eventType} IN ('order_completed', 'manual_clear') THEN NULL
        WHEN ${eventType} IN ('payment_failed') THEN COALESCE(abandoned_at, now())
        ELSE abandoned_at
      END
    WHERE id = ${row.id}
  `)
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO abandoned_cart_events_v2 (cart_id, event_type, meta)
    VALUES (${row.id}, ${eventType}, ${((input.meta ?? {}) as unknown) as Prisma.JsonObject})
  `)

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
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO abandoned_cart_recovery_queue_v2 (cart_id, step_no, channel, scheduled_at, payload, status)
          VALUES (
            ${row.id},
            ${step.stepNo},
            ${channel},
            now() + (${Math.max(0, Number(step.delayMinutes ?? 0))} * interval '1 minute'),
            ${({
              template: step.template ?? `abandoned_step_${step.stepNo}`,
              includeCoupon: Boolean(step.includeCoupon),
            } as unknown) as Prisma.JsonObject},
            'pending'
          )
          ON CONFLICT (cart_id, step_no, channel)
          DO NOTHING
        `)
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
  const candidates = await prisma.$queryRaw<
    Array<{
      id: string
      status: string
      updated_at: Date
      last_active_at: Date | null
      lifecycle_state: string
      total: number | null
      items_json: Prisma.JsonValue
      recovery_disabled: boolean
      ignored: boolean
    }>
  >(Prisma.sql`
    SELECT id, status, "updatedAt" as updated_at, last_active_at, lifecycle_state, total, "itemsJson" as items_json, recovery_disabled, ignored
    FROM "AbandonedCart"
    WHERE status IN ('active', 'abandoned')
      AND recovery_disabled = false
      AND ignored = false
  `)
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
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AbandonedCart"
      SET status = 'abandoned', abandoned_at = COALESCE(abandoned_at, now())
      WHERE id = ${cart.id}
    `)
    marked += 1
    for (const step of schedule.filter((entry) => entry.active !== false)) {
      for (const channel of step.channels) {
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO abandoned_cart_recovery_queue_v2 (cart_id, step_no, channel, scheduled_at, payload, status)
          VALUES (
            ${cart.id},
            ${step.stepNo},
            ${channel},
            now() + (${step.delayMinutes} * interval '1 minute'),
            ${({
              template: step.template ?? `abandoned_step_${step.stepNo}`,
              includeCoupon: Boolean(step.includeCoupon),
            } as unknown) as Prisma.JsonObject},
            'pending'
          )
          ON CONFLICT (cart_id, step_no, channel)
          DO NOTHING
        `)
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
  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      cart_id: string
      step_no: number
      channel: RecoveryChannel
      payload: Prisma.JsonValue
      status: RecoveryStatus
      email: string | null
      mobile: string | null
      total: number | null
      items_json: Prisma.JsonValue
      coupon_code: string | null
      messages_sent: number
      converted_at: Date | null
      recovery_disabled: boolean
      ignored: boolean
      session_key: string
    }>
  >(Prisma.sql`
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
  `)
  const settings = await getSettings()
  const maxReminders = Math.max(1, Number(settings.maxRemindersPerCart ?? DEFAULT_SETTINGS.maxRemindersPerCart))
  const checkoutBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  let sent = 0
  let failed = 0
  let skipped = 0
  for (const row of rows) {
    try {
      if (row.converted_at || row.recovery_disabled || row.ignored || row.messages_sent >= maxReminders) {
        await prisma.$executeRaw(Prisma.sql`UPDATE abandoned_cart_recovery_queue_v2 SET status='skipped' WHERE id = ${row.id}::uuid`)
        skipped += 1
        continue
      }
      const to = row.channel === "email" ? row.email : row.mobile
      if (!to) {
        await prisma.$executeRaw(Prisma.sql`UPDATE abandoned_cart_recovery_queue_v2 SET status='failed', error_message='Missing recipient' WHERE id = ${row.id}::uuid`)
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
      await prisma.$transaction([
        prisma.$executeRaw(Prisma.sql`
          UPDATE abandoned_cart_recovery_queue_v2
          SET status = 'sent', sent_at = now()
          WHERE id = ${row.id}::uuid
        `),
        prisma.$executeRaw(Prisma.sql`
          INSERT INTO abandoned_cart_messages_v2 (cart_id, queue_id, channel, template_used, sent_to, status)
          VALUES (${row.cart_id}, ${row.id}::uuid, ${row.channel}, ${templateKey}, ${to}, 'sent')
        `),
        prisma.$executeRaw(Prisma.sql`
          UPDATE "AbandonedCart"
          SET messages_sent = messages_sent + 1, last_message_at = now()
          WHERE id = ${row.cart_id}
        `),
      ])
      sent += 1
    } catch (error) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE abandoned_cart_recovery_queue_v2
        SET status = 'failed', error_message = ${error instanceof Error ? error.message.slice(0, 200) : "Unknown error"}
        WHERE id = ${row.id}::uuid
      `)
      failed += 1
    }
  }
  return { due: rows.length, sent, failed, skipped }
}

export const markCartConverted = async (input: { sessionKey?: string | null; email?: string | null; mobile?: string | null; orderId?: string | null; revenue?: number | null; channel?: string | null }) => {
  await ensureRecoveryTables()
  const settings = await getSettings()
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM "AbandonedCart"
    WHERE (${input.sessionKey ?? null}::text IS NOT NULL AND "sessionKey" = ${input.sessionKey ?? null})
       OR (${input.email ?? null}::text IS NOT NULL AND email = ${input.email ?? null})
       OR (${input.mobile ?? null}::text IS NOT NULL AND mobile = ${input.mobile ?? null})
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `)
  const cart = rows[0]
  if (!cart) return { updated: false }

  // Best-effort attribution: if no explicit channel provided, infer from last used resume token.
  let channel = input.channel ?? null
  if (!channel) {
    const tokenRows = await prisma.$queryRaw<Array<{ meta: Prisma.JsonValue }>>(Prisma.sql`
      SELECT meta
      FROM abandoned_cart_resume_tokens_v2
      WHERE cart_id = ${cart.id}
        AND last_used_at IS NOT NULL
      ORDER BY last_used_at DESC
      LIMIT 1
    `)
    const meta = tokenRows[0]?.meta
    const inferred =
      meta && typeof meta === "object" && !Array.isArray(meta) ? safeString((meta as any).channel) || safeString((meta as any).source) : ""
    if (inferred) channel = inferred
  }

  await prisma.$transaction([
    prisma.$executeRaw(Prisma.sql`
      UPDATE "AbandonedCart"
      SET status='converted', converted_at=now(), converted_order_id=${input.orderId ?? null}, recovered_channel = ${channel}
      WHERE id = ${cart.id}
    `),
    prisma.$executeRaw(Prisma.sql`
      UPDATE abandoned_cart_recovery_queue_v2
      SET status='cancelled'
      WHERE cart_id = ${cart.id} AND status='pending'
    `),
  ])
  if ((input.revenue ?? 0) > 0) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO abandoned_cart_analytics_daily_v2 (date_key, total_abandoned, recovered_count, recovered_revenue, by_channel, updated_at)
      VALUES (CURRENT_DATE, 0, 1, ${input.revenue ?? 0}, ${({ [input.channel ?? "unknown"]: 1 } as unknown) as Prisma.JsonObject}, now())
      ON CONFLICT (date_key)
      DO UPDATE SET
        recovered_count = abandoned_cart_analytics_daily_v2.recovered_count + 1,
        recovered_revenue = abandoned_cart_analytics_daily_v2.recovered_revenue + EXCLUDED.recovered_revenue,
        updated_at = now()
    `)
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
  return prisma.$queryRaw<
    Array<{
      id: string
      session_key: string
      email: string | null
      mobile: string | null
      user_id: string | null
      total: number | null
      updated_at: Date
      last_active_at: Date | null
      abandoned_at: Date | null
      status: string
      messages_sent: number
      last_message_at: Date | null
      converted_at: Date | null
      items_json: Prisma.JsonValue
    }>
  >(Prisma.sql`
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
    WHERE (${input?.converted ?? null}::text IS NULL
        OR (${input?.converted === "yes"} AND converted_at IS NOT NULL)
        OR (${input?.converted === "no"} AND converted_at IS NULL))
      AND (${input?.userType ?? null}::text IS NULL
        OR (${input?.userType === "registered"} AND user_id IS NOT NULL)
        OR (${input?.userType === "guest"} AND user_id IS NULL))
      AND (${input?.minValue ?? null}::numeric IS NULL OR total >= ${input?.minValue ?? null})
      AND (${input?.maxValue ?? null}::numeric IS NULL OR total <= ${input?.maxValue ?? null})
      AND (${input?.q ?? null}::text IS NULL OR COALESCE(email,'') ILIKE ${`%${input?.q ?? ""}%`} OR COALESCE(mobile,'') ILIKE ${`%${input?.q ?? ""}%`} OR "sessionKey" ILIKE ${`%${input?.q ?? ""}%`})
    ORDER BY COALESCE(abandoned_at, "updatedAt") DESC
    LIMIT 200
  `)
}

export const getAbandonedCartTimeline = async (cartId: string) => {
  await ensureRecoveryTables()
  const [events, messages, queue] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; event_type: string; meta: Prisma.JsonValue; created_at: Date }>>(Prisma.sql`
      SELECT id, event_type, meta, created_at
      FROM abandoned_cart_events_v2
      WHERE cart_id = ${cartId}
      ORDER BY created_at DESC
      LIMIT 200
    `),
    prisma.$queryRaw<Array<{ id: string; channel: string; template_used: string | null; sent_to: string | null; status: string; sent_at: Date }>>(Prisma.sql`
      SELECT id, channel, template_used, sent_to, status, sent_at
      FROM abandoned_cart_messages_v2
      WHERE cart_id = ${cartId}
      ORDER BY sent_at DESC
      LIMIT 200
    `),
    prisma.$queryRaw<Array<{ id: string; step_no: number; channel: string; scheduled_at: Date; sent_at: Date | null; status: string; error_message: string | null }>>(Prisma.sql`
      SELECT id, step_no, channel, scheduled_at, sent_at, status, error_message
      FROM abandoned_cart_recovery_queue_v2
      WHERE cart_id = ${cartId}
      ORDER BY scheduled_at DESC
      LIMIT 200
    `),
  ])
  return { events, messages, queue }
}

export const getRecoverableCartBySession = async (sessionKey: string) => {
  await ensureRecoveryTables()
  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      session_key: string
      email: string | null
      items_json: Prisma.JsonValue
      total: number | null
      status: string
      converted_at: Date | null
      updated_at: Date
    }>
  >(Prisma.sql`
    SELECT
      id,
      "sessionKey" as session_key,
      email,
      "itemsJson" as items_json,
      total,
      status,
      converted_at,
      "updatedAt" as updated_at
    FROM "AbandonedCart"
    WHERE "sessionKey" = ${sessionKey}
    LIMIT 1
  `)
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
  const tokenRows = await prisma.$queryRaw<Array<{ cart_id: string }>>(Prisma.sql`
    SELECT cart_id
    FROM abandoned_cart_resume_tokens_v2
    WHERE token_hash = ${tokenHash}
      AND expires_at > now()
    LIMIT 1
  `)
  const cartId = tokenRows[0]?.cart_id
  if (cartId) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE abandoned_cart_resume_tokens_v2
      SET last_used_at = now()
      WHERE token_hash = ${tokenHash}
    `)
    const rows = await prisma.$queryRaw<
      Array<{
        id: string
        session_key: string
        email: string | null
        items_json: Prisma.JsonValue
        total: number | null
        status: string
        converted_at: Date | null
        updated_at: Date
      }>
    >(Prisma.sql`
      SELECT
        id,
        "sessionKey" as session_key,
        email,
        "itemsJson" as items_json,
        total,
        status,
        converted_at,
        "updatedAt" as updated_at
      FROM "AbandonedCart"
      WHERE id = ${cartId}
      LIMIT 1
    `)
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
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO abandoned_cart_recovery_queue_v2 (cart_id, step_no, channel, scheduled_at, status, payload)
      VALUES (${cartId}, 0, ${channel}, now(), 'pending', ${({ template: "manual_send_now" } as unknown) as Prisma.JsonObject})
      ON CONFLICT (cart_id, step_no, channel)
      DO UPDATE SET scheduled_at = now(), status='pending'
    `)
  }
  return { queued: channels.length }
}

export const setRecoveryFlags = async (cartId: string, input: { recoveryDisabled?: boolean; ignored?: boolean }) => {
  await ensureRecoveryTables()
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "AbandonedCart"
    SET
      recovery_disabled = COALESCE(${input.recoveryDisabled ?? null}, recovery_disabled),
      ignored = COALESCE(${input.ignored ?? null}, ignored)
    WHERE id = ${cartId}
  `)
}

export const getAbandonedAnalytics = async () => {
  await ensureRecoveryTables()
  const [summaryRows, topProductsRows] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint; converted: bigint; recovered_revenue: number }>>(Prisma.sql`
      SELECT
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::bigint as converted,
        COALESCE(SUM(CASE WHEN converted_at IS NOT NULL THEN total ELSE 0 END), 0)::numeric as recovered_revenue
      FROM "AbandonedCart"
      WHERE status IN ('abandoned', 'converted')
    `),
    prisma.$queryRaw<Array<{ product_name: string; abandon_count: bigint }>>(Prisma.sql`
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
    `),
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
  await prisma.$executeRaw(Prisma.sql`
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
  `)
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

