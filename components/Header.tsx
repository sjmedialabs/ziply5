"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import { useSearch } from "../hooks/useSearch"
import LocationDropdown from "./LocationDropdown"
import { Search, User, ShoppingCart } from "lucide-react"

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery, handleSearch } = useSearch()

  return (
    <header className="sticky top-0 z-50">
      {/* Top Marquee Bar */}
      <div className="bg-yellow-400 py-2.5 overflow-hidden">
        <div className="marquee-container">
          <div className="marquee-content">
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
      <nav className="bg-white py-4 w-full">
      <div className="w-full px-4 max-w-7xl mx-auto flex items-center justify-between">

        {/* MOBILE MENU BUTTON */}
        <button 
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/#products" className="font-bold text-black hover:text-gray-700 transition-colors text-[15px]">
              Products
            </Link>
            <Link href="/#best-sellers" className="font-bold text-black hover:text-gray-700 transition-colors text-[15px]">
              Best Sellers
            </Link>
            <Link href="/#combos" className="font-bold text-black hover:text-gray-700 transition-colors text-[15px]">
              Combos
            </Link>
          </div>
            
            <div className="flex-1 md:flex-none flex justify-center">
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

            <LocationDropdown />
            
            <button 
              onClick={() => setSearchOpen(!searchOpen)} 
              className="p-2 hover:bg-zinc-50 cursor-pointer rounded-full transition-colors"
            >
              <Search size={20} className="text-zinc-700" />
            </button>
            <Link href="/profile" className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
              <User size={20} className="text-zinc-700" />
            </Link>
            <Link href="/cart" className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
              <ShoppingCart size={20} className="text-zinc-700" />
            </Link>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden bg-white border-t px-6 py-4 space-y-4 shadow-md">
          <Link href="/#products" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
            Products
          </Link>
          <Link href="/#best-sellers" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
            Best Sellers
          </Link>
          <Link href="/#combos" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
            Combos
          </Link>
        </div>
      )}

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24" onClick={() => setSearchOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input type="text" placeholder="Search for delicious meals..." className="flex-1 px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
              <button type="submit" className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors">Search</button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}