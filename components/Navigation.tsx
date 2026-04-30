"use client"

import Link from "next/link"
import { useSearch } from "../hooks/useSearch"

export default function Navigation() {
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery, handleSearch } = useSearch()

  return (
    <>
      <nav className="bg-white py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#products" className="font-semibold text-amber-900 hover:text-amber-700 transition-colors text-[15px]">
              Products
            </Link>
            <Link href="/#best-sellers" className="font-semibold text-amber-900 hover:text-amber-700 transition-colors text-[15px]">
              Best Sellers
            </Link>
            <Link href="/products?type=combo" className="font-semibold text-amber-900 hover:text-amber-700 transition-colors text-[15px]">
              Combos
            </Link>
          </div>

          <div className="flex-1 md:flex-none flex justify-center md:absolute md:left-1/2 md:-translate-x-1/2">
            <Link href="/" className="flex items-center">
              <span className="font-heading text-3xl md:text-4xl font-extrabold text-amber-900 tracking-tight">
                Z<span className="text-amber-900">i</span>PLY<span className="text-amber-900">5</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <button className="hidden lg:flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-amber-900 border border-zinc-200 rounded-full px-4 py-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Select Location
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
              <svg className="w-5 h-5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <Link href="/profile" className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
              <svg className="w-5 h-5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
            <Link href="/cart" className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
              <svg className="w-5 h-5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24" onClick={() => setSearchOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input type="text" placeholder="Search for delicious meals..." className="flex-1 px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
              <button type="submit" className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors">
                Search
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}