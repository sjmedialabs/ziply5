"use client"

import type React from "react"
import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"

// Product data
const categories = [
  { id: 1, name: "Cashew Delight Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
  { id: 2, name: "Plan Rava Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fruit.png-zkxgWG2CoPWuSifvMhWWBgnIXsrdzw.png" },
  { id: 3, name: "Cashew Chicken", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
  { id: 4, name: "Prawns Biryani", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Burger.png-KL84dDVpks5I4G2XOUmLsuqHZq8eBz.png" },
  { id: 5, name: "Cashew Delight Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
  { id: 6, name: "Chicken Biryani", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beef.png-2CUGA48h1jJI07o8jBTnyTXuCL8mHr.png" },
  { id: 7, name: "Panner Curry Rice", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beef.png-2CUGA48h1jJI07o8jBTnyTXuCL8mHr.png" },
]

const trendingProducts = [
  { id: 1, name: "ZIPLY5 PLAIN WHITE RICE", subtitle: "loream ipsum dummy text", price: 299, originalPrice: null, image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%2069-Wad13TxQUuVaYNy0jtfCIdXuusTAP5.png", badge: null, gradient: "from-[#5B9BD5] to-[#3A7FC2]", featured: false },
  { id: 2, name: "SPCL DAL MAKHANI RICE", subtitle: "All Dressed Up", price: 349, originalPrice: null, image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%2069-Wad13TxQUuVaYNy0jtfCIdXuusTAP5.png", badge: null, gradient: "from-[#A78BDA] to-[#8B6FC0]", featured: false },
  { id: 3, name: "ZIPLY5 SPCL VEG RICE", subtitle: "Jalapeo Cheddar Blaze", price: 229, originalPrice: 290, discount: "5% off", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%2069-Wad13TxQUuVaYNy0jtfCIdXuusTAP5.png", badge: null, gradient: "from-[#8BC34A] to-[#689F38]", featured: true },
  { id: 4, name: "ZIPLY5 PONGAL", subtitle: "Rockin' Ranch", price: 279, originalPrice: null, image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%2069-Wad13TxQUuVaYNy0jtfCIdXuusTAP5.png", badge: null, gradient: "from-[#4A90D9] to-[#2E6EB5]", featured: false },
]

const bestSellers = [
  { id: 1, name: "SPCL DAL MAKHANI RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Mushroom%20Curry%20Rice%201-HXqEHZCMyWWV2BNnZyH0ab0PBduJG7.png", bgColor: "#8B7355", isNonVeg: true, showAddBtn: true },
  { id: 2, name: "MANCHBOOS PRAWN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Machboos%20Prawn%20Rice%201-myZMnhQwIEX56xNVKHM0oNhZuB0Drz.png", bgColor: "#7B68A6", isNonVeg: true, showAddBtn: false },
  { id: 3, name: "MANCHBOOS CHICKEN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Machboos%20Chk%20Rice%201-UCe2aa7Dd0MLeBrrglhnoDuDFxkd91.png", bgColor: "#2B7A78", isNonVeg: true, showAddBtn: false },
  { id: 4, name: "MANCHBOOS PRAWN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Kaju%20Chk%20Curry%20Rice%201-i8wGwe88fBPNeexVcy6IIVzEIy4K46.png", bgColor: "#4A7C4E", isNonVeg: true, showAddBtn: false },
  { id: 5, name: "MANCHBOOS PRAWN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Palak%20Chk%20Rice%201-P88GAbA7CEe7gxdVDNdd6Y5qNi2KVi.png", bgColor: "#2B8B8B", isNonVeg: true, showAddBtn: false },
  { id: 6, name: "MANCHBOOS CHICKEN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Dal%20Rice%201-Yve5sxlshAZEd6IgCqqnyO5knMJjyH.png", bgColor: "#A64B7B", isNonVeg: true, showAddBtn: false },
]

const cravingsGallery = [
  { id: 1, title: "Comfort in 5 Mins", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=400&fit=crop" },
  { id: 2, title: "Umami Mode", image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=400&fit=crop" },
  { id: 3, title: "Green Out Here", image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300&h=400&fit=crop" },
  { id: 4, title: "Seafood Flex", image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=300&h=400&fit=crop" },
  { id: 5, title: "Comfort in 5 Mins", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=400&fit=crop" },
  { id: 6, title: "Umami Mode", image: "https://images.unsplash.com/photo-1482049016gy899a9b4z?w=300&h=400&fit=crop" },
]

export default function HomePage() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Searching for:", searchQuery)
    setSearchOpen(false)
  }

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">
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
      <nav className="bg-white py-4 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#products" className="font-semibold text-amber-900 hover:text-amber-700 transition-colors text-[15px]">
              Products
            </Link>
            <Link href="/#best-sellers" className="font-semibold text-amber-900 hover:text-amber-700 transition-colors text-[15px]">
              Best Sellers
            </Link>
            <Link href="/#combos" className="font-semibold text-amber-900 hover:text-amber-700 transition-colors text-[15px]">
              Combos
            </Link>
          </div>

          {/* Center Logo */}
          <div className="flex-1 md:flex-none flex justify-center md:absolute md:left-1/2 md:-translate-x-1/2">
            <Link href="/" className="flex items-center">
              <span className="font-heading text-3xl md:text-4xl font-extrabold text-amber-900 tracking-tight">
                Z<span className="text-amber-900">i</span>PLY<span className="text-amber-900">5</span>
              </span>
            </Link>
          </div>

          {/* Right Actions */}
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

      {/* Search Overlay */}
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Hero Background Image */}
        <div className="relative min-h-[450px] md:min-h-[550px] lg:min-h-[620px]">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hero%20banner-CDaQZeTiFLqC26eXZYmjH9CGeO5Ob4.png"
            alt="Ziply5 Special Veg Rice"
            fill
            className="object-cover object-center"
            priority
          />
          
          {/* Text Overlay */}
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4 md:px-8 lg:px-12">
              <div className="max-w-xl">
                <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-amber-900 leading-[1.1] mb-4 italic">
                  Nothing Artificial.<br />
                  Everything Delicious.
                </h1>
                <p className="text-base md:text-lg lg:text-xl text-amber-100 font-semibold uppercase tracking-wide max-w-md italic" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
                  Taste the authentic flavors<br />
                  of home-cooked meals!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Slider Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {[0, 1, 2].map((dot) => (
            <button
              key={dot}
              onClick={() => setCurrentSlide(dot)}
              className={`w-2.5 h-2.5 rounded-full transition-all border-2 border-amber-900/50 ${currentSlide === dot ? "bg-amber-900 w-6" : "bg-white/80"}`}
            />
          ))}
        </div>
      </section>

      {/* Our Products - Category Scroll */}
      <section id="products" className="bg-[#F97316] py-[60px]">
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="font-heading text-[24px] md:text-[36px] font-bold text-white text-center mb-10 tracking-[0.5px]">
            OUR PRODUCTS
          </h2>

          <div className="relative flex items-center">
            {/* Left Arrow */}
            <button
              onClick={() => scrollCategories("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-1/2 hover:scale-105"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Categories Scroll */}
            <div
              ref={categoryScrollRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide px-12 py-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/product/${category.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex-shrink-0 group"
                >
                  {/* Pill-shaped card */}
                  <div 
                    className="bg-white rounded-full w-[140px] md:w-[180px] h-[220px] md:h-[260px] flex flex-col items-center pt-5 pb-5 px-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03]"
                    style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                  >
                    {/* Circular image */}
                    <div className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-full overflow-hidden mb-4 flex-shrink-0">
                      <Image
                        src={category.image}
                        alt={category.name}
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Product name */}
                    <h3 className="font-semibold text-[#5B2C2C] text-center text-[14px] md:text-[15px] leading-tight mb-1.5">
                      {category.name}
                    </h3>
                    {/* Subtitle */}
                    <p className="text-[#8B8B8B] text-[11px] md:text-[12px] text-center leading-tight px-1 line-clamp-2">
                      {category.subtitle}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Right Arrow */}
            <button
              onClick={() => scrollCategories("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-1/2 hover:scale-105"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Food That's Trending */}
      <section id="trending" className="bg-[#F3F4F6] py-[70px]">
        <div className="max-w-[1200px] mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-[24px] md:text-[36px] font-extrabold text-[#4A1D1F] tracking-[0.5px]">
              FOOD THAT&apos;S TRENDING
            </h2>
            <Link
              href="/#trending"
              className="flex items-center gap-2 bg-[#4A1D1F] text-white px-4 py-2 rounded-full font-semibold text-[14px] hover:bg-[#3a1517] transition-colors"
            >
              view all
              <span className="w-5 h-5 rounded-full border border-white flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingProducts.map((product) => (
              <div
                key={product.id}
                className={`group bg-white rounded-[16px] overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${
                  product.featured ? 'ring-2 ring-[#EF4444] shadow-lg' : 'shadow-[0_10px_25px_rgba(0,0,0,0.08)]'
                } hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)]`}
              >
                {/* Image Section with Gradient */}
                <div className={`relative h-[180px] bg-gradient-to-b ${product.gradient} rounded-t-[16px] flex items-center justify-center`}>
                  {/* Veg Icon */}
                  <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-green-600 rounded-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    </div>
                  </div>
                  {/* Product Image */}
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={120}
                    height={140}
                    className="w-[100px] md:w-[120px] h-auto object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Content Section */}
                <div className="p-[14px] flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Product Name */}
                      <h3 className="font-semibold text-[#4A1D1F] text-[14px] leading-tight mb-1 truncate">
                        {product.name}
                      </h3>
                      {/* Subtitle */}
                      <p className="text-[#6B7280] text-[12px] mb-1.5 truncate">
                        {product.subtitle}
                      </p>
                      {/* Price */}
                      {product.originalPrice ? (
                        <div className="flex flex-col">
                          <span className="text-[#9CA3AF] line-through text-[11px]">Rs. {product.originalPrice}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#F97316] text-[16px]">Rs. {product.price}</span>
                            {product.discount && (
                              <span className="text-green-600 text-[10px] font-medium">{product.discount}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#6B7280] text-[12px]">{product.subtitle}</span>
                      )}
                    </div>
                    {/* ADD Button */}
                    <button 
                      onClick={(e) => e.preventDefault()}
                      className="flex-shrink-0 border border-[#EF4444] text-[#EF4444] bg-transparent px-3 py-1 rounded-full text-[12px] font-semibold hover:bg-[#EF4444] hover:text-white transition-colors self-end"
                    >
                      ADD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section id="best-sellers" className="bg-[#F5F0E1] py-[60px]">
        <div className="max-w-[1200px] mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-[24px] md:text-[36px] font-extrabold text-[#4A1D1F] tracking-[0.5px]">
              BEST SELLERS
            </h2>
            <Link
              href="/#best-sellers"
              className="flex items-center gap-2 bg-[#4A1D1F] text-white px-4 py-2 rounded-full font-semibold text-[14px] hover:bg-[#3a1517] transition-colors"
            >
              view all
              <span className="w-5 h-5 rounded-full border border-white flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bestSellers.map((product) => (
              <div
                key={product.id}
                className="group cursor-pointer"
              >
                {/* Card */}
                <div 
                  className="rounded-[20px] p-5 relative overflow-hidden transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl h-[320px] md:h-[360px] flex flex-col"
                  style={{ backgroundColor: product.bgColor }}
                >
                  {/* Non-veg Badge */}
                  {product.isNonVeg && (
                    <span className="absolute top-4 right-4 bg-[#F97316] text-white text-[11px] font-semibold px-3 py-1 rounded-full z-10">
                      Non-veg
                    </span>
                  )}
                  
                  {/* Product Image */}
                  <div className="flex-1 flex items-center justify-center py-4">
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={180}
                      height={220}
                      className="w-auto h-[180px] md:h-[200px] object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  
                  {/* Product Info - Inside Card */}
                  <div className="mt-auto text-center pb-2">
                    <h3 className="font-semibold text-white text-[15px] md:text-[16px] leading-tight mb-1 tracking-wide">
                      {product.name}
                    </h3>
                    <p className="text-white/70 text-[11px] md:text-[12px] uppercase tracking-wide">
                      {product.subtitle}
                    </p>
                    
                    {/* ADD Button - Only for first card */}
                    {product.showAddBtn && (
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 w-full bg-[#4A1D1F] text-white py-2.5 rounded-full text-[13px] font-semibold hover:bg-[#3a1517] transition-colors"
                      >
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Veg / Non-Veg Collection Banner */}
      <section className="bg-cyan-400 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left - Large Product */}
            <div className="relative">
              <div className="bg-cyan-300 rounded-3xl p-8 relative overflow-hidden">
                <span className="absolute top-4 left-4 bg-red-500 text-white font-bold px-4 py-2 rounded-full text-sm transform -rotate-12">
                  NEW
                </span>
                <div className="flex justify-center">
                  <div className="relative w-64 h-64 md:w-80 md:h-80">
                    <Image
                      src="https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=400&fit=crop"
                      alt="Special Veg Rice"
                      fill
                      className="object-cover rounded-full shadow-2xl"
                    />
                  </div>
                </div>
                <div className="absolute bottom-6 left-6 bg-white rounded-xl p-3 shadow-lg">
                  <p className="font-heading text-orange-500 font-bold text-xs">ZIPLY5</p>
                  <p className="font-heading text-zinc-900 font-extrabold">SPECIAL</p>
                  <p className="font-heading text-green-600 font-extrabold">VEG RICE</p>
                </div>
              </div>
            </div>

            {/* Right - Collection Info */}
            <div className="text-center md:text-left">
              <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-zinc-900 mb-4">
                OUR VEG<br />NON VEG<br />COLLECTION
              </h2>
              <div className="bg-yellow-400 rounded-3xl p-6 inline-block mt-4">
                <p className="font-heading text-zinc-900 font-bold text-sm mb-2">HOMESTYLE FOOD,</p>
                <p className="font-heading text-zinc-900 font-bold text-sm mb-4">INSTANT IN YOUR PLATE</p>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <Image
                      src="https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=100&h=100&fit=crop"
                      alt="Chicken Biryani"
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <div>
                    <p className="font-heading text-orange-600 font-extrabold">CHICKEN</p>
                    <p className="font-heading text-orange-600 font-extrabold">BIRYANI</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fuel Your Cravings */}
      <section className="bg-amber-50 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-zinc-900">
              FUEL YOUR CRAVINGS
            </h2>
            <Link
              href="https://instagram.com"
              target="_blank"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white px-4 py-2 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              FOLLOW @ZIPLY5
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {cravingsGallery.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-48 md:w-56 group cursor-pointer"
              >
                <div className="relative h-64 md:h-72 rounded-2xl overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="font-heading text-white font-bold text-lg">{item.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-white pt-12 pb-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Brand Card */}
            <div className="lg:col-span-1">
              <div className="bg-yellow-400 rounded-2xl p-6 text-zinc-900">
                <h3 className="font-heading text-2xl font-extrabold text-orange-500 mb-2">
                  ZIPLY<span className="text-green-600">5</span>
                </h3>
                <p className="text-sm font-medium mb-4">
                  Monday - Sunday:<br />
                  10:00am - 10:00pm
                </p>
                <p className="text-sm font-bold">+91 9901233213</p>
                <p className="text-sm">support@ziply5.com</p>
                <div className="flex gap-3 mt-4">
                  <a href="#" className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white hover:bg-zinc-700 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                  <a href="#" className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white hover:bg-zinc-700 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                  <a href="#" className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white hover:bg-zinc-700 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a href="#" className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white hover:bg-zinc-700 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                </div>
              </div>
            </div>

            {/* About */}
            <div>
              <h4 className="font-heading font-bold text-lg mb-4">About</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#" className="hover:text-orange-500 transition-colors">About Ziply5</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Special Diet</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Book now</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Menu */}
            <div>
              <h4 className="font-heading font-bold text-lg mb-4">Menu</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#" className="hover:text-orange-500 transition-colors">Ready-to-Eat Meals</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Ready-to-Cook</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Veg</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Non-veg</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Combo packs</a></li>
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-heading font-bold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#" className="hover:text-orange-500 transition-colors">About Ziply5</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Special Diet</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Book now</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="font-heading font-bold text-lg mb-4">Newsletter</h4>
              <p className="text-zinc-400 text-sm mb-4">Get recent news and updates.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email Address"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
                <button className="bg-white text-zinc-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-500 hover:text-white transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-zinc-800 pt-6 text-center text-zinc-500 text-sm">
            <p>&copy; 2026 Ziply5. All Rights Reserved</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
