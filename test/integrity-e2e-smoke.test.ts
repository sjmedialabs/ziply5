import test from "node:test"
import assert from "node:assert/strict"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { withId } from "@/src/lib/db/supabaseIntegrity"

const enabled =
  process.env.INTEGRITY_E2E === "true" &&
  Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)

test(
  "E2E smoke: can connect to Supabase and perform a harmless select",
  { skip: !enabled },
  async () => {
    const client = getSupabaseAdmin()
    // Try a table that should exist in most installs; if none exist, this test can be adapted.
    const candidates = ["Product", "products"]
    let ok = false
    for (const table of candidates) {
      const { error } = await client.from(table).select("id").limit(1)
      if (!error) {
        ok = true
        break
      }
    }
    assert.equal(ok, true)
  },
)

test(
  "E2E smoke: `withId` produces insertable ids (does not hit DB)",
  { skip: !enabled },
  async () => {
    const payload = withId({ foo: "bar" })
    assert.ok(typeof (payload as any).id === "string")
  },
)

