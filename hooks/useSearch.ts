import { useRouter } from "next/navigation"
import { useMemo, useState, FormEvent } from "react"
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts"

export function useSearch() {
  const router = useRouter()
  const { products } = useStorefrontProducts(120)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return products
    return products.filter((item) => item.name.toLowerCase().includes(normalizedQuery))
  }, [normalizedQuery])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim())
    }
    const queryString = params.toString()
    router.push(queryString ? `/products?${queryString}` : "/products")
    setSearchOpen(false)
  }

  return {
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    handleSearch,
  }
}