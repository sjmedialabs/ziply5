"use client"

import { useState, useRef, useEffect } from "react"
import { MapPin, ChevronDown, } from "lucide-react"

const locations = [
  "Hyderabad",
  "Bangalore",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Coimbatore",
]

export default function LocationDropdown() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState("Select Location")

  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = locations.filter((loc) =>
    loc.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      
      {/* BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 cursor-pointer rounded-full px-4 py-2 text-sm text-black hover:text-gray-800 transition"
      >
        <MapPin size={16} />
        <span>{selected}</span>
        <ChevronDown size={16} />
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-3 w-64 bg-white border border-zinc-200 rounded-xl shadow-lg z-50">
          
          {/* SEARCH */}
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Search location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full  px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* LIST */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setSelected(loc)
                    setOpen(false)
                    setSearch("")
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#51282b] cursor-pointer hover:text-white transition"
                >
                  {loc}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-zinc-500">
                No locations found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}