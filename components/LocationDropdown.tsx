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
  } = useUserLocation({ onChange })

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [menuOpen, setMenuOpen])

  const displayLabel = mounted ? locationName : "Detecting location..."

  return (
    <>
      <LocationPermissionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        permanentlyBlocked={permanentlyBlocked}
        enabling={enabling}
        onEnableLocation={handleEnableFromModal}
        onContinueWithout={continueWithoutLocation}
      />

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 rounded-full px-2 lg:px-4 py-2 text-sm text-inherit lg:text-[#2A1810] lg:bg-white lg:border lg:border-[#D9D9D1] transition shadow-none lg:shadow-sm"
          title="Click to manage location"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MapPin
            size={16}
            className={permissionState === "denied" ? "text-amber-500" : "text-current"}
          />
          <span className="truncate max-w-[150px] md:max-w-[200px] font-medium">{displayLabel}</span>
          <ChevronDown
            size={14}
            className={`hidden lg:block shrink-0 opacity-60 transition-transform ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-[#D9D9D1] bg-white py-1 shadow-lg lg:left-auto lg:right-0"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleUseCurrentLocation}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#2A1810] hover:bg-zinc-50 transition-colors"
            >
              <Navigation size={16} className="shrink-0 text-[#601c10]" />
              <span>Use Current Location</span>
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}
