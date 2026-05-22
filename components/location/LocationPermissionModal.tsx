"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getBrowserLocationGuidance } from "@/lib/location/permission.service"
import { MapPin } from "lucide-react"

type LocationPermissionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  permanentlyBlocked: boolean
  enabling: boolean
  onEnableLocation: () => void
  onContinueWithout: () => void
}

export function LocationPermissionModal({
  open,
  onOpenChange,
  permanentlyBlocked,
  enabling,
  onEnableLocation,
  onContinueWithout,
}: LocationPermissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!enabling}>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#601c10]/10">
            <MapPin className="h-6 w-6 text-[#601c10]" />
          </div>
          <DialogTitle className="text-center">Enable your location</DialogTitle>
          <DialogDescription className="text-center">
            Turning on location helps us show accurate delivery availability and a better nearby
            shopping experience for your area.
          </DialogDescription>
        </DialogHeader>

        {permanentlyBlocked ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Location access is blocked in your browser settings. Please enable it manually.
            <span className="mt-2 block text-xs text-amber-800">{getBrowserLocationGuidance()}</span>
          </p>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full bg-[#601c10] hover:bg-[#4a160c]"
            disabled={enabling}
            onClick={onEnableLocation}
          >
            {enabling ? "Detecting location..." : "Enable Location"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={enabling}
            onClick={onContinueWithout}
          >
            Continue Without Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
