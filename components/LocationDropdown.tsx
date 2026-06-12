"use client"

import { useEffect, useRef } from "react"
import { MapPin, ChevronDown, Navigation } from "lucide-react"
import { LocationPermissionModal } from "@/components/location/LocationPermissionModal"
import { useUserLocation } from "@/hooks/use-user-location"

export default function LocationDropdown({
  onChange,
}: {
  type?: "warehouse" | "state" | "city"
  value?: string
  onChange?: (value: string, label: string) => void
  parentState?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    mounted,
    locationName,
    permissionState,
    modalOpen,
    setModalOpen,
    permanentlyBlocked,
    enabling,
    menuOpen,
    setMenuOpen,
    continueWithoutLocation,
    handleEnableFromModal,
    handleUseCurrentLocation,
    shouldHide,
  } = useUserLocation({ onChange })

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [menuOpen, setMenuOpen])

  if (shouldHide) return null

  const displayLabel = mounted ? locationName : "Detecting location..."

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-2 rounded-full px-2 lg:px-4 py-2 text-sm text-inherit lg:text-[#2A1810] lg:bg-white lg:border lg:border-[#D9D9D1] transition shadow-none lg:shadow-sm"
      >
        <MapPin
          size={16}
          className="text-current"
        />
        <span className="truncate max-w-[150px] md:max-w-[200px] font-medium">{displayLabel}</span>
      </div>
    </div>
  )
}
