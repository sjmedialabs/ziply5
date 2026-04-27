"use client"

import OffersModulePage from "@/components/dashboard/OffersModulePage"

export default function AdminOffersProductDiscountsPage() {
  return (
    <OffersModulePage
      type="product_discount"
      title="Product-Level Discounts"
      subtitle="Product/category discount rules with schedule, priority, and stacking."
    />
  )
}
