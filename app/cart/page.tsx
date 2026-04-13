"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getCartItems, setCartItems, type CartItem } from "@/lib/cart"

export default function CartPage() {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartItems, setLocalCartItems] = useState<CartItem[]>([])

  useEffect(() => {
    setLocalCartItems(getCartItems())
  }, [])

  const persistCart = (next: CartItem[]) => {
    setLocalCartItems(next)
    setCartItems(next)
  }

  const updateQuantity = (slug: string, delta: number) => {
    const next = cartItems.map((item) => (item.slug === slug ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
    persistCart(next)
  }

  const removeItem = (slug: string) => {
    const next = cartItems.filter((item) => item.slug !== slug)
    persistCart(next)
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = subtotal > 75 ? 0 : 8.99
  const total = subtotal + shipping

  const handleCheckout = () => {
    console.log("Processing checkout:", { items: cartItems, total })
    alert("Checkout coming soon! Total: $" + total.toFixed(2))
  }

  return (
    <>
      {/* Top Marquee Bar */}
      <div className="marquee-bar">
        <div className="marquee-container">
          <div className="marquee-content">
            FREE SHIPPING ON ORDERS OVER $75 • NEW DROP: SKATER BOY VOL. 2 • WORLDWIDE SHIPPING • JOIN THE DISCORD FOR
            EARLY ACCESS • FREE SHIPPING ON ORDERS OVER $75 • NEW DROP: SKATER BOY VOL. 2 • WORLDWIDE SHIPPING • JOIN
            THE DISCORD FOR EARLY ACCESS •
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="navigation">
        <div className="logo">
          <Link href="/">
            GZ<span>.</span>STORE
          </Link>
          <div className="beta-badge">BETA</div>
        </div>

        <div className="nav-links">
          <Link href="/#trending" className="nav-link">
            LATEST DROPS
          </Link>
          <Link href="/#trending" className="nav-link">
            CLOTHING
          </Link>
          <Link href="/#trending" className="nav-link">
            SNEAKERS
          </Link>
          <Link href="/#trending" className="nav-link">
            ACCESSORIES
          </Link>
        </div>

        <div className="nav-actions">
          <div className="nav-icon" onClick={() => setSearchOpen(!searchOpen)}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <Link href="/profile" className="nav-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </Link>
          <Link href="/cart" className="nav-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span className="cart-badge">{cartItems.length}</span>
          </Link>
        </div>
      </nav>

      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-container" onClick={(e) => e.stopPropagation()}>
            <input type="text" placeholder="Search for products..." className="search-input" autoFocus />
            <button className="search-close" onClick={() => setSearchOpen(false)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Cart Section */}
      <main className="cart-section">
        <div className="cart-container">
          <h1 className="cart-title">YOUR CART</h1>

          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty</p>
              <Link href="/" className="btn-primary hover-lift">
                CONTINUE SHOPPING
              </Link>
            </div>
          ) : (
            <div className="cart-layout">
              {/* Cart Items */}
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.slug} className="cart-item">
                    <img src={item.image || "/placeholder.svg"} alt={item.name} className="cart-item-image" />
                    <div className="cart-item-details">
                      <h3>{item.name}</h3>
                      <p>Weight: {item.weight}</p>
                      <p className="cart-item-price">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="cart-item-controls">
                      <div className="quantity-controls">
                        <button className="quantity-btn" onClick={() => updateQuantity(item.slug, -1)}>
                          −
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button className="quantity-btn" onClick={() => updateQuantity(item.slug, 1)}>
                          +
                        </button>
                      </div>
                      <button className="remove-btn" onClick={() => removeItem(item.slug)}>
                        REMOVE
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Summary */}
              <div className="cart-summary">
                <h2 className="summary-title">ORDER SUMMARY</h2>
                <div className="summary-line">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-line">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
                </div>
                {subtotal < 75 && <p className="shipping-note">Add ${(75 - subtotal).toFixed(2)} for free shipping!</p>}
                <div className="summary-total">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <button onClick={handleCheckout} className="btn-primary hover-lift checkout-btn">
                  CHECKOUT
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <Link href="/" className="footer-logo">
            GZ.STORE
          </Link>
          <div className="footer-copyright">© 2023 Gen Z Store. All rights reserved. No Cap.</div>
          <div className="footer-links">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">
              TikTok
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
              Discord
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}
