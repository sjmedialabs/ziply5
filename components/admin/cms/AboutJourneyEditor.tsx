"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, X } from "lucide-react"
import { uploadAdminImage } from "@/lib/admin-upload"

export default function AboutJourneyEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const pickMedia = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file.")
      return
    }
    setUploadError("")
    setUploading(true)
    try {
      const url = await uploadAdminImage(file, "cms/about-journey")
      if (!url) throw new Error("Upload returned no URL")
      onChange({ ...value, mediaUrl: url })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className=" border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">Our Journey</CardTitle>
      </CardHeader>
      <CardContent className="px-4 space-y-4">
        <div>
          <Label className="text-xs text-[#646464]">Section Title</Label>
          <Input value={value.title || ""} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="Enter section title" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-[#646464]">Description 1 (Max 250 chars)</Label>
            <Textarea maxLength={250} value={value.desc1 || ""} onChange={(e) => onChange({ ...value, desc1: e.target.value })} placeholder="Enter description" />
          </div>
          <div>
            <Label className="text-xs text-[#646464]">Description 2 (Max 250 chars)</Label>
            <Textarea maxLength={250} value={value.desc2 || ""} onChange={(e) => onChange({ ...value, desc2: e.target.value })} placeholder="Enter description" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Media (image upload)</Label>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex flex-wrap items-center gap-4">
              <Input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => void pickMedia(e.target.files?.[0])}
                className="w-auto max-w-xs text-sm"
              />
              {uploading ? <Loader2 className="h-4 w-4 animate-spin text-[#4A1D1F]" /> : null}
            </div>
            {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
            <p className="text-[10px] text-[#9A9A92]">Upload stores the file on the server; links are not entered manually.</p>
            {value.mediaUrl ? (
              <div className="relative inline-block w-fit mt-2 group">
                <img src={value.mediaUrl} alt="" className="h-32 w-auto max-w-full object-cover rounded border shadow-sm" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-white rounded-full shadow-md text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onChange({ ...value, mediaUrl: "" })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
