"use client"

import { useEffect, useState } from "react"
import { toStorefrontProduct, type StorefrontProduct } from "@/lib/storefront-products"

export function useStorefrontProducts(limit = 200) {
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

useEffect(() => {
  let cancelled = false

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/v1/products?page=1&limit=${limit}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.message || "Failed")
      }

      if (!cancelled) {
        const rows = json.data?.items ?? []
        setProducts(rows.map((x) => toStorefrontProduct(x as never)))
      }
    } catch (err) {
      if (!cancelled) setError("Failed to load products")
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  fetchProducts()

  return () => {
    cancelled = true
  }
}, [limit])
  console.log("Returning products from hook:", products)
  return { products, loading, error }
}
