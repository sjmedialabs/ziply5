"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)

  const orders = [
    {
      id: "#GZ-00124",
      date: "Nov 15, 2023",
      status: "Delivered",
      total: 93.0,
      items: 2,
    },
    {
      id: "#GZ-00098",
      date: "Oct 22, 2023",
      status: "In Transit",
      total: 156.0,
      items: 3,
    },
  ]

  const handleEditProfile = () => {
    console.log("Edit profile clicked")
    alert("Edit profile coming soon!")
  }

  const handleViewOrder = (orderId: string) => {
    console.log("View order:", orderId)
    alert(`Order details for ${orderId} coming soon!`)
  }

  const handleSettingClick = (setting: string) => {
    console.log("Setting clicked:", setting)
    if (setting === "logout") {
      alert("Logout functionality coming soon!")
    } else {
      alert(`${setting} coming soon!`)
    }
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

      {/* Profile Section */}
      <main className="profile-section">
        <div className="profile-container">
          <h1 className="profile-title">YOUR PROFILE</h1>

          {/* Profile Info */}
          <div className="profile-info-card">
            <div className="profile-avatar">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop" alt="Profile" />
            </div>
            <div className="profile-info">
              <h2>Alex Rivera</h2>
              <p>alex.rivera@email.com</p>
              <button onClick={handleEditProfile} className="btn-secondary hover-lift edit-profile-btn">
                EDIT PROFILE
              </button>
            </div>
          </div>

          {/* Order History */}
          <div className="order-history">
            <h2 className="section-title">ORDER HISTORY</h2>
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div>
                      <h3>{order.id}</h3>
                      <p className="order-date">{order.date}</p>
                    </div>
                    <div className={`order-status status-${order.status.toLowerCase().replace(" ", "-")}`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="order-details">
                    <p>
                      {order.items} {order.items === 1 ? "item" : "items"}
                    </p>
                    <p className="order-total">${order.total.toFixed(2)}</p>
                  </div>
                  <button onClick={() => handleViewOrder(order.id)} className="btn-secondary hover-lift view-order-btn">
                    VIEW DETAILS
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Settings Section */}
          <div className="profile-settings">
            <h2 className="section-title">SETTINGS</h2>
            <div className="settings-list">
              <button className="setting-item" onClick={() => handleSettingClick("Shipping Address")}>
                <span>Shipping Address</span>
                <span>→</span>
              </button>
              <button className="setting-item" onClick={() => handleSettingClick("Payment Methods")}>
                <span>Payment Methods</span>
                <span>→</span>
              </button>
              <button className="setting-item" onClick={() => handleSettingClick("Email Preferences")}>
                <span>Email Preferences</span>
                <span>→</span>
              </button>
              <button className="setting-item logout" onClick={() => handleSettingClick("logout")}>
                <span>Logout</span>
                <span>→</span>
              </button>
            </div>
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
