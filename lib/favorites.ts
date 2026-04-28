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

export const toggleFavoriteSlug = async (slug: string): Promise<boolean> => {
  const existing = getFavoriteSlugs()
  const isFavorite = existing.includes(slug)
  const next = isFavorite ? existing.filter((item) => item !== slug) : [...existing, slug]
  
  // Always update local storage first (optimistic/fallback)
  if (typeof window !== "undefined") {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
    emitFavoritesUpdated()

    // If authenticated, sync with Database
    const token = window.localStorage.getItem("ziply5_access_token")
    const userStr = window.localStorage.getItem("ziply5_user")
    const userId = userStr ? JSON.parse(userStr).id : null

    if (token && userId) {
      try {
        await fetch("/api/v1/favorites", {
          method: isFavorite ? "DELETE" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-user-id": userId
          },
          body: JSON.stringify({ slug })
        })
      } catch (err) {
        console.error("DB Favorite sync failed:", err)
      }
    }
  }

  return !isFavorite
}

export const syncFavoritesFromDb = (slugs: string[]) => {
  setFavoriteSlugs(slugs)
}
