-- Optional migration (columns are also added at runtime via ensureRecoveryTables).
ALTER TABLE "AbandonedCart"
  ADD COLUMN IF NOT EXISTS steps_completed int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abandon_reason text NULL;

-- Reset stale test queue timings after deploy (optional).
-- UPDATE abandoned_cart_recovery_queue_v2 q
-- SET status = 'pending', scheduled_at = c.abandoned_at + interval '0 minutes', error_message = NULL
-- FROM "AbandonedCart" c
-- WHERE c.id = q.cart_id AND c.status = 'abandoned' AND q.step_no = 1 AND q.status = 'sent';
