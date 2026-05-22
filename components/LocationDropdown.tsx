"use client"

import { useState, useEffect } from "react"
import { MapPin } from "lucide-react"

export default function LocationDropdown({
  type = 'city',
  value,
  onChange,
}: {
  type?: 'warehouse' | 'state' | 'city'
  value?: string
  onChange?: (value: string, label: string) => void
  parentState?: string
}) {
  const [locationName, setLocationName] = useState<string>("Detecting location...")

  const fetchBrowserGeolocation = () => {
    setLocationName("Requesting access...")
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
            const data = await res.json()
            const area = data.locality || data.city || "Current Location"
            const city = data.principalSubdivision || ""
            const loc = city ? `${area}, ${city}` : area
            
            setLocationName(loc)
            const token = localStorage.getItem("ziply5_access_token")
            const userStr = localStorage.getItem("ziply5_user")
            const userId = userStr ? JSON.parse(userStr).id : null
            const cacheKey = userId ? `ziply5-loc-${userId}` : "ziply5-loc-guest"
            localStorage.setItem(cacheKey, loc)
            if (onChange) onChange(loc, loc)
          } catch (e) {
            setLocationName("Location unavailable")
          }
        },
        (error) => {
          console.warn("Geolocation warning:", error.message || error)
          setLocationName("Location disabled")
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      )
    } else {
      setLocationName("Location not supported")
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("ziply5_access_token")
    const userStr = localStorage.getItem("ziply5_user")
    const userId = userStr ? JSON.parse(userStr).id : null

    const cacheKey = userId ? `ziply5-loc-${userId}` : "ziply5-loc-guest"
    const cached = localStorage.getItem(cacheKey)
    
    if (cached) {
      setLocationName(cached)
      if (onChange) onChange(cached, cached)
    } else {
      setLocationName("Detecting location...")
    }

    const setAndCacheLocation = (loc: string) => {
      setLocationName(loc)
      localStorage.setItem(cacheKey, loc)
      if (onChange) onChange(loc, loc)
    }

    const fetchIpLocation = async () => {
      try {
        let res = await fetch("https://freeipapi.com/api/json/")
        if (res.ok) {
          const data = await res.json()
          if (data.cityName) {
            const displayLoc = data.regionName ? `${data.cityName}, ${data.regionName}` : data.cityName
            setAndCacheLocation(displayLoc)
            return true
          }
        }
        res = await fetch("https://ipapi.co/json/")
        if (res.ok) {
          const data = await res.json()
          if (data.city) {
            const displayLoc = data.region ? `${data.city}, ${data.region}` : data.city
            setAndCacheLocation(displayLoc)
            return true
          }
        }
      } catch (e) {
        console.warn("IP tracking failed:", e)
      }
      return false
    }

    const initLocation = async () => {
      const hasIpLoc = await fetchIpLocation()
      if (!hasIpLoc && !cached) {
        fetchBrowserGeolocation()
      }
    }

    initLocation()
  }, [onChange])

  return (
    <button 
      onClick={() => fetchBrowserGeolocation()}
      className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 rounded-full px-2 lg:px-4 py-2 text-sm text-inherit lg:text-[#2A1810] lg:bg-white lg:border lg:border-[#D9D9D1] transition shadow-none lg:shadow-sm"
      title="Click to detect precise location"
    >
      <MapPin size={16} className="text-current" />
      <span className="truncate max-w-[150px] md:max-w-[200px] font-medium">{locationName}</span>
    </button>
  )
}