import test from "node:test"
import assert from "node:assert/strict"
import { applySimpleDiscount, calculateBogoSavings } from "@/src/server/modules/offers/offers.math"

test("applySimpleDiscount percentage with max cap", () => {
  const amount = applySimpleDiscount(2000, { discountType: "percentage", discountValue: 10, maxDiscountCap: 300 })
  assert.equal(amount, 200)
  const capped = applySimpleDiscount(5000, { discountType: "percentage", discountValue: 10, maxDiscountCap: 300 })
  assert.equal(capped, 300)
})

test("applySimpleDiscount flat clamps to subtotal", () => {
  assert.equal(applySimpleDiscount(500, { discountType: "flat", discountValue: 200 }), 200)
  assert.equal(applySimpleDiscount(100, { discountType: "flat", discountValue: 200 }), 100)
})

test("calculateBogoSavings buy2get1 free (repeatable) uses cheapest items", () => {
  const savings = calculateBogoSavings(
    [
      { quantity: 6, unitPrice: 100 }, // 6 items => 2 cycles => 2 free units at 100
      { quantity: 3, unitPrice: 250 }, // 3 items => 1 cycle => 1 free unit at 250
    ],
    { buyQty: 2, getQty: 1, repeatable: true, rewardType: "free" },
  )
  assert.equal(savings, 100 * 2 + 250 * 1)
})

test("calculateBogoSavings buy1get1 50% off", () => {
  const savings = calculateBogoSavings([{ quantity: 2, unitPrice: 200 }], { buyQty: 1, getQty: 1, rewardType: "percentage_off", rewardValue: 50 })
  // 2 items => 1 cycle => 1 discounted unit at 50%
  assert.equal(savings, 100)
})

test("calculateBogoSavings respects maxFreeUnits", () => {
  const savings = calculateBogoSavings([{ quantity: 9, unitPrice: 100 }], { buyQty: 2, getQty: 1, repeatable: true, maxFreeUnits: 1 })
  assert.equal(savings, 100)
})

