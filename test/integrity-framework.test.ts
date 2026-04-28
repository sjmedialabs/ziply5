import test from "node:test"
import assert from "node:assert/strict"
import {
  camelToSnake,
  camelToSnakeObject,
  shouldRetryWithId,
  shouldRetryWithTimestamps,
  withId,
} from "@/src/lib/db/supabaseIntegrity"

test("camelToSnake converts camelCase to snake_case", () => {
  assert.equal(camelToSnake("createdAt"), "created_at")
  assert.equal(camelToSnake("managedById"), "managed_by_id")
})

test("camelToSnakeObject converts keys", () => {
  assert.deepEqual(camelToSnakeObject({ createdAt: "x", managedById: "y" }), {
    created_at: "x",
    managed_by_id: "y",
  })
})

test("withId generates uuid when missing", () => {
  const out = withId({ a: 1 })
  assert.equal((out as any).a, 1)
  assert.ok(typeof (out as any).id === "string")
  assert.ok((out as any).id.length >= 16)
})

test("withId preserves existing id", () => {
  const out = withId({ id: "abc", a: 1 })
  assert.equal((out as any).id, "abc")
})

test("shouldRetryWithId detects NOT NULL id failure", () => {
  assert.equal(
    shouldRetryWithId('null value in column "id" of relation "OrderItem" violates not-null constraint'),
    true,
  )
})

test("shouldRetryWithTimestamps detects timestamp NOT NULL failure", () => {
  assert.equal(
    shouldRetryWithTimestamps('null value in column "updatedAt" of relation "Product" violates not-null constraint'),
    true,
  )
})

