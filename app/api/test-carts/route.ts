import { NextRequest } from "next/server"
export const dynamic = "force-dynamic"
import { ok, fail } from "@/src/server/core/http/response"
import { pgQuery } from "@/src/server/db/pg"
import { ensureRecoveryTables, detectAbandonedCarts, processRecoveryQueue } from "@/src/server/modules/abandoned-carts/recovery.service"

export async function GET(request: NextRequest) {
  try {
    await ensureRecoveryTables()
    
    // 1. FORCE all active carts to appear inactive for 5 minutes (bypassing the wait threshold)
    await pgQuery("UPDATE \"AbandonedCart\" SET last_active_at = now() - interval '5 minutes' WHERE status = 'active'")
    
    // 2. Run the detection logic (Simulates the cron job)
    const detectionResult = await detectAbandonedCarts()

    // 3. FORCE all pending queue items to be OVERDUE so they get processed immediately
    await pgQuery("UPDATE abandoned_cart_recovery_queue_v2 SET scheduled_at = now() - interval '5 minutes', status = 'pending', error_message = NULL WHERE status IN ('pending', 'failed')")
    
    // 4. Force the worker to process the queue right now (Simulates the background worker)
    const processingResult = await processRecoveryQueue()

    const carts = await pgQuery('SELECT id, status, abandoned_at, "updatedAt", mobile FROM "AbandonedCart" ORDER BY "updatedAt" DESC LIMIT 10')
    const queue = await pgQuery('SELECT id, cart_id, step_no, channel, status, scheduled_at, error_message FROM abandoned_cart_recovery_queue_v2 ORDER BY scheduled_at ASC LIMIT 50')
    const now = await pgQuery('SELECT now() as current_time')
    
    // Check which ones SHOULD be picked up now
    const due = await pgQuery(`
      SELECT q.id, q.status, q.scheduled_at
      FROM abandoned_cart_recovery_queue_v2 q
      JOIN "AbandonedCart" c ON c.id = q.cart_id
      WHERE q.status = 'pending'
        AND q.scheduled_at <= now()
    `)
    
    return ok({ 
      db_time: now[0]?.current_time,
      detectionResult,
      processingResult,
      due_count: due.length,
      due_items: due,
      carts, 
      queue
    }, "Simulated entire abandonment lifecycle successfully")
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 500)
  }
}
