const FAVORITES_KEY = "ziply5-favorites"

const emitFavoritesUpdated = () => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("ziply5:favorites-updated"))
}

export const getFavoriteSlugs = (): string[] => {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const setFavoriteSlugs = (slugs: string[]) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(slugs))
  emitFavoritesUpdated()
}

export const toggleFavoriteSlug = (slug: string): boolean => {
  const existing = getFavoriteSlugs()
  const isFavorite = existing.includes(slug)
  const next = isFavorite ? existing.filter((item) => item !== slug) : [...existing, slug]
  setFavoriteSlugs(next)
  return !isFavorite
}
