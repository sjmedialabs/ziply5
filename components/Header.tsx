"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState, useRef } from "react"
import Image from "next/image"
import CartDropdown from "./CartDropdown"
import { useSearch } from "../hooks/useSearch"
import LocationDropdown from "./LocationDropdown"
import { Search, User, ShoppingCart } from "lucide-react"

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery, handleSearch } = useSearch()

  const productRef = useRef<HTMLDivElement>(null)
  const [arrowLeft, setArrowLeft] = useState(0)

  const cartItems = [
  {
    id: 1,
    name: "Dal Makhana Rice",
    qty: 3,
    weight: "500g",
    price: 250,
    image: "https://picsum.photos/100?1",
  },
  {
    id: 2,
    name: "Spcl Veg Rice",
    qty: 6,
    weight: "250g",
    price: 250,
    image: "https://picsum.photos/100?2",
  },
  {
    id: 3,
    name: "Sambar Rice",
    qty: 4,
    weight: "250g",
    price: 250,
    image: "https://picsum.photos/100?3",
  },
  {
    id: 4,
    name: "Palak Prawn Rice",
    qty: 2,
    weight: "500g",
    price: 250,
    image: "https://picsum.photos/100?4",
  },
]

const total = 3770

  return (
    <header className="sticky top-0 z-[100]">
      {/* Top Marquee Bar */}
      <div className="bg-yellow-400 py-2.5 overflow-hidden relative z-0">
        <div className="marquee-container">
          <div className="marquee-content ">
            <span className="marquee-item ">SUBSCRIBE & SAVE</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white w-full relative z-10">
        <div className="w-full px-4 max-w-7xl mx-auto flex items-center justify-between">

          {/* MOBILE MENU BUTTON */}
          <button 
            className="lg:hidden z-40"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="hidden lg:flex items-center gap-8">

            {/* PRODUCTS WITH DROPDOWN */}
            <div
              ref={productRef}
              className="relative group flex flex-col items-center"
              onMouseEnter={() => {
                if (productRef.current) {
                  const rect = productRef.current.getBoundingClientRect()
                  setArrowLeft(rect.left + rect.width / 2)
                }
              }}
            >
              <Link href="/#products" className="font-extrabold text-black hover:text-[#f97316] transition-colors text-[15px]">
                Products
              </Link>

              {/* DROPDOWN */}
              <div className="absolute left-0 top-[calc(100%+16px)] w-[100vw] flex justify-start opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">

                <div className="relative w-full max-w-7xl">

                  {/*  DYNAMIC ARROW */}
                  {/* <div
                    className="absolute -top-3 w-0 h-0 
                      border-l-[10px] border-r-[10px] border-b-[10px] 
                      border-l-transparent border-r-transparent border-b-[#7a1e0e] transition-all duration-200"
                    style={{
                      left: arrowLeft,
                      transform: "translateX(-10%)"
                    }}
                  /> */}

                  <div className="bg-[#7a1e0e] text-white rounded-2xl shadow-xl py-10 px-8">
                    
                    <div className="grid grid-cols-4 gap-10">

                      <div>
                        <h3 className="text-lg font-bold mb-4">Breakfast</h3>
                        <ul className="space-y-3">
                          <li className="text-orange-400 font-semibold">Vegan Poha</li>
                          <li>Vegetable Upma</li>
                          <li>Idly Sambar</li>
                          <li>Pongal</li>
                          <li>Rice Kichidi</li>
                          <li>Millet - Kichidi</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold mb-4">Vegetarian</h3>
                        <ul className="space-y-3">
                          <li>Sambar Rice</li>
                          <li>Dal Rice</li>
                          <li>Rasam Rice</li>
                          <li>Lemon Rice</li>
                          <li>Paneer Butter Masala</li>
                          <li>Curd Rice</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold mb-4">Non-Vegetarian</h3>
                        <ul className="space-y-3">
                          <li>Exotic Meats (US Poultry)</li>
                          <li>Chicken Curry Rice</li>
                          <li>Chicken Biryani</li>
                          <li>Thai Green Chicken Curry</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold mb-4">Combo</h3>
                        <ul className="space-y-3">
                          <li>Exotic Meats (US Poultry)</li>
                          <li>Chicken Curry Rice</li>
                          <li>Chicken Biryani</li>
                          <li>Thai Green Chicken Curry</li>
                        </ul>
                      </div>

                    </div>

                  </div>

                </div>
              </div>
            </div>

            <Link href="/#best-sellers" className="font-extrabold text-black hover:text-[#f97316] transition-colors text-[15px]">
              Best Sellers
            </Link>

            <Link href="/#combos" className="font-extrabold text-black hover:text-[#f97316] transition-colors text-[15px]">
              Combos
            </Link>
          </div>
          
          <div className="flex-1 lg:flex-none flex justify-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/primaryLogo.png"
                alt="ZiPLY5 Logo"
                width={160}
                height={60}
                priority
                className="object-contain"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3 md:gap-5">

            <div className="hidden lg:block">
              <LocationDropdown />
            </div>
            
            <button 
              onClick={() => setSearchOpen(!searchOpen)} 
              className="p-2 hover:bg-zinc-50 cursor-pointer rounded-full transition-colors"
            >
              <Search size={20} className="text-zinc-700 hover:text-[#f97316]" />
            </button>

            <div className="hidden lg:flex items-center gap-6">

              <Link href="/profile" className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
                <User size={20} className="text-zinc-700 hover:text-[#f97316]" />
              </Link>

              {/* CART WITH DROPDOWN */}
              <div className="relative group">
                <Link href="/cart" className="p-2 rounded-full transition-colors">
                  <ShoppingCart size={20} className="text-zinc-700 hover:text-[#f97316]" />
                </Link>

                <CartDropdown items={cartItems} total={total} />

              </div>

            </div>
            
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t px-6 py-4 space-y-4 shadow-md">
          <div className="pb-4 border-b">
            <LocationDropdown />
          </div>

          <Link href="/#products" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
            Products
          </Link>
          <Link href="/#best-sellers" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
            Best Sellers
          </Link>
          <Link href="/#combos" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
            Combos
          </Link>
          <Link href="/profile" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
            Profile
          </Link>
          <Link href="/cart" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
            Cart
          </Link>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24" onClick={() => setSearchOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input 
                type="text" 
                placeholder="Search for delicious meals..." 
                className="flex-1 px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                autoFocus 
              />
              <button type="submit" className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors">
                Search
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}