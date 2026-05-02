"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Upload, Image as ImageIcon, X, Loader2 } from "lucide-react"
import { uploadAdminImage } from "@/lib/admin-upload"

interface ImageUploaderProps {
  value?: string
  onChange: (image: string) => void
  altText?: string
  onAltChange?: (alt: string) => void
  /** Storage folder under VPS upload root (passed to /api/v1/uploads). */
  folder?: string
  className?: string
}

export default function ImageUploader({
  value,
  onChange,
  folder = "cms/sections",
  className = "",
}: ImageUploaderProps) {
  const [preview, setPreview] = useState(value || "")
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreview(value || "")
  }, [value])

  const runUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.")
      return
    }
    setUploadError("")
    setUploading(true)
    try {
      const url = await uploadAdminImage(file, folder)
      if (!url) throw new Error("Upload returned no URL")
      setPreview(url)
      onChange(url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith("image/")) void runUpload(file)
    else setUploadError("Please drop an image file.")
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => setDragActive(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void runUpload(file)
    e.target.value = ""
  }

  const removeImage = () => {
    setPreview("")
    setUploadError("")
    onChange("")
  }

  return (
    <Card className={`w-48 p-3 space-y-0 ${className}`}>
      <div className="space-y-2">
        {preview ? (
          <div className="relative group">
            <img src={preview} alt="" className="w-full h-24 rounded object-cover shadow-sm" />
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded bg-white/70">
                <Loader2 className="h-6 w-6 animate-spin text-[#4A1D1F]" />
              </div>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute -top-2 -right-2 cursor-pointer h-6 w-6 p-0 bg-white rounded-full shadow-md hover:bg-red-50"
              onClick={removeImage}
              disabled={uploading}
            >
              <X className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        ) : (
          <div
            className={`h-24 rounded-lg border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center text-sm p-2 ${
              dragActive ? "border-[#7B3010] bg-[#FFFBF3]" : "border-[#E8DCC8] hover:border-[#7B3010]"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-[#7B3010] animate-spin mb-1" />
            ) : dragActive ? (
              <Upload className="h-5 w-5 text-[#7B3010] animate-bounce mb-1" />
            ) : (
              <ImageIcon className="h-5 w-5 text-[#646464] mb-1" />
            )}
            <span className="text-xs text-[#646464] text-center leading-tight">
              {uploading ? "Uploading…" : "Drop or click to upload"}
            </span>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={uploading} />
        {uploadError ? <p className="text-[10px] text-red-600 leading-tight">{uploadError}</p> : null}
        <Label className="text-[10px] text-[#9A9A92] font-normal">Stored on server — not a URL field.</Label>
      </div>
    </Card>
  )
}
