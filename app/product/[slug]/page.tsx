"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState("M")
  const [searchOpen, setSearchOpen] = useState(false)

  // Mock product data
  const product = {
    name: "Oversized Graffiti Tee",
    price: 28.0,
    description:
      "Bold street style meets comfort. This oversized tee features unique graffiti-style graphics and is made from premium cotton for all-day wear. Perfect for layering or wearing solo.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  }

  const handleAddToCart = () => {
    console.log("Added to cart:", { product: product.name, size: selectedSize, quantity })
    router.push("/cart")
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
            <span className="cart-badge">2</span>
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

      {/* Product Detail Section */}
      <main className="product-detail-section">
        <div className="product-detail-container">
          {/* Product Image */}
          <div className="product-detail-image">
            <img src={product.image || "/placeholder.svg"} alt={product.name} />
          </div>

          {/* Product Info */}
          <div className="product-detail-info">
            <div className="product-badge new">NEW</div>
            <h1 className="product-detail-title">{product.name}</h1>
            <div className="product-detail-price">${product.price.toFixed(2)}</div>

            <p className="product-detail-description">{product.description}</p>

            {/* Size Selection */}
            <div className="size-selection">
              <label className="size-label">SIZE</label>
              <div className="size-options">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    className={`size-button ${selectedSize === size ? "selected" : ""}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="quantity-selection">
              <label className="quantity-label">QUANTITY</label>
              <div className="quantity-controls">
                <button className="quantity-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  −
                </button>
                <span className="quantity-value">{quantity}</span>
                <button className="quantity-btn" onClick={() => setQuantity(quantity + 1)}>
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="btn-primary hover-lift"
              style={{ textAlign: "center", display: "block", width: "100%" }}
            >
              ADD TO CART
            </button>
          </div>
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
