import { useState, FormEvent } from "react"

export function useSearch() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    console.log("Searching for:", searchQuery)
    setSearchOpen(false)
  }

  return {
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    handleSearch
  }
}