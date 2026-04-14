export type CartItem = {
  slug: string
  name: string
  price: number
  image: string
  weight: string
  quantity: number
}

const CART_KEY = "ziply5-cart"

const emitCartUpdated = () => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("ziply5:cart-updated"))
}

export const getCartItems = (): CartItem[] => {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const setCartItems = (items: CartItem[]) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CART_KEY, JSON.stringify(items))
  emitCartUpdated()
}

export const getCartCount = (): number => getCartItems().reduce((sum, item) => sum + item.quantity, 0)

type CartProductInput = {
  slug: string
  name: string
  price: number
  image: string
  weight: string
}

export const addToCart = (product: CartProductInput, quantity = 1) => {
  const existing = getCartItems()
  const index = existing.findIndex((item) => item.slug === product.slug)

  if (index === -1) {
    existing.push({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      weight: product.weight,
      quantity,
    })
  } else {
    existing[index] = { ...existing[index], quantity: existing[index].quantity + quantity }
  }

  setCartItems(existing)
}

export const getCartQuantityForSlug = (slug: string): number => {
  const item = getCartItems().find((cartItem) => cartItem.slug === slug)
  return item ? item.quantity : 0
}

export const setCartItemQuantity = (product: CartProductInput, quantity: number) => {
  const existing = getCartItems()
  const nextQuantity = Math.max(0, quantity)
  const index = existing.findIndex((item) => item.slug === product.slug)

  if (index === -1 && nextQuantity > 0) {
    existing.push({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      weight: product.weight,
      quantity: nextQuantity,
    })
  } else if (index !== -1 && nextQuantity === 0) {
    existing.splice(index, 1)
  } else if (index !== -1) {
    existing[index] = { ...existing[index], quantity: nextQuantity }
  }

  setCartItems(existing)
}
