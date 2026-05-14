import test from "node:test"
import assert from "node:assert/strict"
import {
  calculateZiply5Shipping,
  matchZiply5ShippingSlab,
  totalPacksFromCheckoutLines,
  assertZiply5ShippingWithinSlabCap,
  assertZiply5ShippingMatchesSlab,
} from "@/src/lib/shipping/ziply5-shipping"

const expectCharge = (
  packs: number,
  charge: number,
  opts?: { freeLargeOrder?: boolean },
) => {
  const r = calculateZiply5Shipping(packs)
  assert.equal(r.chargeInr, charge, `packs=${packs}`)
  assert.equal(r.usedHighestSlabFallback, false, `usedHighestSlabFallback packs=${packs}`)
  assert.equal(r.freeLargeOrderShipping, opts?.freeLargeOrder ?? false, `freeLargeOrder packs=${packs}`)
}

test("slab charges (spec table)", () => {
  expectCharge(1, 125)
  expectCharge(2, 125)
  expectCharge(3, 125)
  expectCharge(4, 250)
  expectCharge(5, 250)
  expectCharge(6, 250)
  expectCharge(7, 450)
  expectCharge(18, 450)
  expectCharge(19, 550)
  expectCharge(24, 550)
  expectCharge(30, 550)
})

test("31+ packs: free shipping", () => {
  expectCharge(31, 0, { freeLargeOrder: true })
  expectCharge(100, 0, { freeLargeOrder: true })
})

test("zero or invalid packs => no charge", () => {
  assert.equal(calculateZiply5Shipping(0).chargeInr, 0)
  assert.equal(calculateZiply5Shipping(-3).chargeInr, 0)
})

test("matchZiply5ShippingSlab edge boundaries", () => {
  assert.equal(matchZiply5ShippingSlab(3).slab?.chargeInr, 125)
  assert.equal(matchZiply5ShippingSlab(4).slab?.chargeInr, 250)
  assert.equal(matchZiply5ShippingSlab(6).slab?.chargeInr, 250)
  assert.equal(matchZiply5ShippingSlab(7).slab?.chargeInr, 450)
  assert.equal(matchZiply5ShippingSlab(30).slab?.chargeInr, 550)
  assert.equal(matchZiply5ShippingSlab(31).slab, null)
})

test("shipping cap allows discounted or free shipping", () => {
  assert.equal(assertZiply5ShippingWithinSlabCap(0, 5).ok, true)
  assert.equal(assertZiply5ShippingWithinSlabCap(100, 5).ok, true)
  assert.equal(assertZiply5ShippingWithinSlabCap(300, 5).ok, false)
})

test("large-order free cap: only zero shipping allowed when packs > 30", () => {
  assert.equal(assertZiply5ShippingWithinSlabCap(0, 40).ok, true)
  assert.equal(assertZiply5ShippingWithinSlabCap(1, 40).ok, false)
})

test("strict slab match helper", () => {
  assert.equal(assertZiply5ShippingMatchesSlab(250, 5).ok, true)
  assert.equal(assertZiply5ShippingMatchesSlab(125, 5).ok, false)
  assert.equal(assertZiply5ShippingMatchesSlab(0, 40).ok, true)
  assert.equal(assertZiply5ShippingMatchesSlab(550, 40).ok, false)
})

test("totalPacksFromCheckoutLines sums quantities", () => {
  assert.equal(
    totalPacksFromCheckoutLines([
      { quantity: 2 },
      { quantity: 3 },
    ]),
    5,
  )
})
