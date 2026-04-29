import test from "node:test"
import assert from "node:assert/strict"
import { createOfferSchema } from "@/src/server/modules/offers/offers.validator"

test("createOfferSchema: coupon requires code and positive discount", () => {
  const bad = createOfferSchema.safeParse({
    type: "coupon",
    name: "Welcome",
    code: "",
    config: { discountType: "percentage", discountValue: 10, minCartValue: 0 },
  })
  assert.equal(bad.success, false)

  const ok = createOfferSchema.safeParse({
    type: "coupon",
    name: "Welcome",
    code: "WELCOME10",
    config: { discountType: "percentage", discountValue: 10, minCartValue: 0 },
  })
  assert.equal(ok.success, true)
})

test("createOfferSchema: cart_discount requires positive discountValue", () => {
  const bad = createOfferSchema.safeParse({
    type: "cart_discount",
    name: "Flat off",
    config: { discountType: "flat", discountValue: 0, minCartValue: 1000 },
  })
  assert.equal(bad.success, false)
})

test("createOfferSchema: shipping_discount defaults are accepted", () => {
  const ok = createOfferSchema.safeParse({
    type: "shipping_discount",
    name: "Free ship",
    config: { minCartValue: 999, mode: "free" },
  })
  assert.equal(ok.success, true)
})

