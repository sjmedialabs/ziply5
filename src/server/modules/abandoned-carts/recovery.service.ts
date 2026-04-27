import { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"
import { enqueueEmail } from "@/src/server/modules/notifications/email.service"
import { smsService } from "@/src/server/integrations/sms/sms.service"

type CartEventType =
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

type RecoveryChannel = "email" | "sms" | "whatsapp"
type RecoveryStatus = "pending" | "sent" | "failed" | "cancelled" | "skipped"

const DEFAULT_SETTINGS = {
  enabled: true,
  abandonThresholdMinutes: 30,
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

const ensureRecoveryTables = async () => {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AbandonedCart"
      ADD COLUMN IF NOT EXISTS user_id text NULL,
      ADD COLUMN IF NOT EXISTS guest_id text NULL,
      ADD COLUMN IF NOT EXISTS mobile text NULL,
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
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
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "AbandonedCart"
    SET
      user_id = COALESCE(${input.userId ?? null}, user_id),
      guest_id = COALESCE(${input.guestId ?? null}, guest_id),
      mobile = COALESCE(${input.mobile ?? null}, mobile),
      last_active_at = now(),
      status = CASE WHEN ${input.eventType} IN ('payment_success', 'order_placed', 'manual_clear') THEN 'converted' ELSE 'active' END,
      abandoned_at = CASE WHEN ${input.eventType} IN ('payment_success', 'order_placed', 'manual_clear') THEN NULL ELSE abandoned_at END
    WHERE id = ${row.id}
  `)
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO abandoned_cart_events_v2 (cart_id, event_type, meta)
    VALUES (${row.id}, ${input.eventType}, ${((input.meta ?? {}) as unknown) as Prisma.JsonObject})
  `)
  return row
}

export const detectAbandonedCarts = async () => {
  await ensureRecoveryTables()
  const settings = await getSettings()
  if (!settings.enabled) return { scanned: 0, marked: 0, queued: 0 }
  const threshold = Math.max(1, Number(settings.abandonThresholdMinutes ?? DEFAULT_SETTINGS.abandonThresholdMinutes))
  const schedule = (Array.isArray(settings.schedule) ? settings.schedule : DEFAULT_SETTINGS.schedule) as Array<{
    stepNo: number
    delayMinutes: number
    channels: RecoveryChannel[]
    template?: string
    includeCoupon?: boolean
    active?: boolean
  }>
  const candidates = await prisma.$queryRaw<Array<{ id: string; status: string; updated_at: Date; total: number | null; items_json: Prisma.JsonValue; recovery_disabled: boolean; ignored: boolean }>>(Prisma.sql`
    SELECT id, status, "updatedAt" as updated_at, total, "itemsJson" as items_json, recovery_disabled, ignored
    FROM "AbandonedCart"
    WHERE status IN ('active', 'abandoned')
      AND recovery_disabled = false
      AND ignored = false
      AND "updatedAt" <= now() - (${threshold} * interval '1 minute')
  `)
  let marked = 0
  let queued = 0
  for (const cart of candidates) {
    const items = Array.isArray(cart.items_json) ? cart.items_json : []
    if (!items.length) continue
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

const renderMessage = (input: {
  name: string
  cartValue: number
  checkoutLink: string
  template: string
  channel: RecoveryChannel
}) => {
  const subject = "You left something in your cart"
  const line = `Hi ${input.name}, your cart worth Rs.${input.cartValue.toFixed(2)} is waiting. Complete checkout: ${input.checkoutLink}`
  if (input.channel === "email") {
    return {
      subject,
      body: `<p>${line}</p>`,
    }
  }
  return { subject, body: line }
}

const sendWhatsapp = async (to: string, body: string) => {
  // Reuse SMS adapter as a safe fallback if dedicated provider is absent.
  await smsService.send({ to, body: `[WA] ${body}` })
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
      const checkoutLink = `${checkoutBase}/cart/recover/${encodeURIComponent(row.session_key)}`
      const msg = renderMessage({
        name: "there",
        cartValue: Number(row.total ?? 0),
        checkoutLink,
        template: String((row.payload as any)?.template ?? `abandoned_step_${row.step_no}`),
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
          VALUES (${row.cart_id}, ${row.id}::uuid, ${row.channel}, ${String((row.payload as any)?.template ?? "")}, ${to}, 'sent')
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
  await prisma.$transaction([
    prisma.$executeRaw(Prisma.sql`
      UPDATE "AbandonedCart"
      SET status='converted', converted_at=now(), converted_order_id=${input.orderId ?? null}, recovered_channel = ${input.channel ?? null}
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

