"use client"

import { useState, useRef, useEffect } from "react"
import { MapPin, ChevronDown } from "lucide-react"
import { useLocations } from "../hooks/useLocations"

export default function LocationDropdown({
  type = 'city',
  value,
  onChange,
  parentState,
}: {
  type?: 'warehouse' | 'state' | 'city'
  value?: string
  onChange?: (value: string, label: string) => void
  parentState?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState(value || `Select ${type}`)

  const ref = useRef<HTMLDivElement>(null)
  const { data: locations, loading } = useLocations(type, parentState)

  // Load initial value from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !value) {
      try {
        const saved = localStorage.getItem(`ziply5-location-${type}`)
        if (saved) {
          const { value: savedVal, label: savedLabel } = JSON.parse(saved)
          if (savedLabel) {
            setSelected(savedLabel)
            if (onChange) onChange(savedVal, savedLabel)
          }
        }
      } catch (e) {
        console.error("Failed to parse saved location", e)
      }
    }
  }, [type, value, onChange])

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
    loc.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      
      {/* BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 cursor-pointer rounded-full px-4 py-2 text-sm text-[#2A1810] bg-white border border-[#D9D9D1] hover:text-[#7B3010] hover:bg-[#FFFBF3] transition shadow-sm"
      >
        <MapPin size={16} />
        <span className="truncate max-w-[150px]">{selected}</span>
        <ChevronDown size={16} />
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 left-0 lg:left-auto mt-3 w-64 bg-white border border-zinc-200 rounded-xl shadow-lg z-50">
          
          {/* SEARCH */}
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder={`Search ${type}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#7B3010]"
            />
          </div>

          {/* LIST */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-3 text-sm text-zinc-500 text-center">Loading...</p>
            ) : filtered.length > 0 ? (
              filtered.map((loc) => (
                <button
                  key={loc.value}
                  onClick={() => {
                    setSelected(loc.label)
                    if (typeof window !== "undefined") {
                      localStorage.setItem(`ziply5-location-${type}`, JSON.stringify({ value: loc.value, label: loc.label }))
                      window.dispatchEvent(new CustomEvent("ziply5:location-updated", { detail: { type, location: loc } }))
                    }
                    if (onChange) onChange(loc.value, loc.label)
                    setOpen(false)
                    setSearch("")
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#7B3010] cursor-pointer hover:text-white transition"
                >
                  {loc.label}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-zinc-500">
                No {type} found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}