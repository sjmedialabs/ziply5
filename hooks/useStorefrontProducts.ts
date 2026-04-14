"use client"

import { useEffect, useState } from "react"
import { toStorefrontProduct, type StorefrontProduct } from "@/lib/storefront-products"

export function useStorefrontProducts(limit = 200) {
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    fetch(`/api/v1/products?page=1&limit=${limit}`)
      .then((r) => r.json())
      .then((json: { success?: boolean; data?: { items?: unknown[] }; message?: string }) => {
        if (cancelled) return
        if (json.success === false) {
          setError(json.message ?? "Failed to load products")
          return
        }
        const rows = json.data?.items ?? []
        setProducts(rows.map((x) => toStorefrontProduct(x as never)))
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load products")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [limit])

  return { products, loading, error }
}
