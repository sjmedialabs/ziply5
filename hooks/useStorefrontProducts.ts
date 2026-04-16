"use client"

import { useEffect, useState } from "react"
import { toStorefrontProduct, type StorefrontProduct } from "@/lib/storefront-products"

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const storefrontProductsCache = new Map<number, { at: number; products: StorefrontProduct[] }>()
const inFlightFetches = new Map<number, Promise<StorefrontProduct[]>>()

export function useStorefrontProducts(limit = 200) {
  const cached = storefrontProductsCache.get(limit)
  const cachedValid = cached && Date.now() - cached.at <= CACHE_TTL_MS

  const [products, setProducts] = useState<StorefrontProduct[]>(cachedValid ? cached!.products : [])
  const [loading, setLoading] = useState<boolean>(() => !cachedValid)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    const cachedNow = storefrontProductsCache.get(limit)
    const cachedValidNow = cachedNow && Date.now() - cachedNow.at <= CACHE_TTL_MS
    if (cachedValidNow) {
      setProducts(cachedNow!.products)
      setLoading(false)
      setError("")
      return
    }

    const existing = inFlightFetches.get(limit)
    if (existing) {
      setLoading(true)
      setError("")
      existing
        .then((next) => {
          if (cancelled) return
          setProducts(next)
          setError("")
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load products")
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return
    }

    setLoading(true)
    setError("")

    const fetchProducts = (async (): Promise<StorefrontProduct[]> => {
      const res = await fetch(`/api/v1/products?page=1&limit=${limit}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed")
      const rows = json.data?.items ?? []
      return rows.map((x: unknown) => toStorefrontProduct(x as never))
    })()

    inFlightFetches.set(limit, fetchProducts)

    fetchProducts
      .then((next) => {
        if (cancelled) return
        storefrontProductsCache.set(limit, { at: Date.now(), products: next })
        setProducts(next)
        setError("")
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load products")
      })
      .finally(() => {
        inFlightFetches.delete(limit)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [limit])

  return { products, loading, error }
}
