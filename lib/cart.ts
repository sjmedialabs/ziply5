export type CartItem = {
  id: string
  productId?: string
  variantId?: string | null
  slug: string
  name: string
  price: number
  image: string
  weight: string
  sku?: string
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
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => {
      const slug = String(item?.slug ?? "")
      const productId = item?.productId ? String(item.productId) : undefined
      const variantId = item?.variantId ? String(item.variantId) : null
      const id = String(item?.id ?? `${productId ?? slug}:${variantId ?? "default"}`)
      return {
        id,
        productId,
        variantId,
        slug,
        name: String(item?.name ?? ""),
        price: Number(item?.price ?? 0),
        image: String(item?.image ?? ""),
        weight: String(item?.weight ?? ""),
        sku: item?.sku ? String(item.sku) : undefined,
        quantity: Math.max(0, Number(item?.quantity ?? 0)),
      } satisfies CartItem
    }).filter((item) => item.quantity > 0 && (item.slug || item.productId))
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
  id?: string
  productId?: string
  variantId?: string | null
  slug: string
  name: string
  price: number
  image: string
  weight: string
  sku?: string
}

const getCartKey = (product: CartProductInput) => {
  const base = product.productId || product.id || product.slug
  return `${base}:${product.variantId ?? "default"}`
}

export const addToCart = (product: CartProductInput, quantity = 1) => {
  const existing = getCartItems()
  const key = getCartKey(product)
  const index = existing.findIndex((item) => item.id === key)

  if (index === -1) {
    existing.push({
      id: key,
      productId: product.productId || product.id,
      variantId: product.variantId ?? null,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      weight: product.weight,
      sku: product.sku,
      quantity,
    })
  } else {
    existing[index] = { ...existing[index], quantity: existing[index].quantity + quantity }
  }

  setCartItems(existing)
}

export const getCartQuantityForSlug = (slug: string): number => {
  return getCartItems()
    .filter((cartItem) => cartItem.slug === slug)
    .reduce((sum, item) => sum + item.quantity, 0)
}

export const getCartQuantity = (productId: string, variantId?: string | null): number => {
  const key = `${productId}:${variantId ?? "default"}`
  return getCartItems()
    .filter((item) => item.id === key)
    .reduce((sum, item) => sum + item.quantity, 0)
}

export const setCartItemQuantity = (product: CartProductInput, quantity: number) => {
  const existing = getCartItems()
  const nextQuantity = Math.max(0, quantity)
  const key = getCartKey(product)
  const index = existing.findIndex((item) => item.id === key)

  if (index === -1 && nextQuantity > 0) {
    existing.push({
      id: key,
      productId: product.productId || product.id,
      variantId: product.variantId ?? null,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      weight: product.weight,
      sku: product.sku,
      quantity: nextQuantity,
    })
  } else if (index !== -1 && nextQuantity === 0) {
    existing.splice(index, 1)
  } else if (index !== -1) {
    existing[index] = { ...existing[index], quantity: nextQuantity }
  }

  setCartItems(existing)
}
