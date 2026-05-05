"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Upload, Video as VideoIcon, X, Loader2, PlayCircle } from "lucide-react"
import { uploadAdminImage } from "@/lib/admin-upload" // Reusing the same upload logic for video

interface VideoUploaderProps {
  value?: string
  onChange: (videoUrl: string) => void
  folder?: string
  className?: string
}

export default function VideoUploader({
  value,
  onChange,
  folder = "cms/hero",
  className = "",
}: VideoUploaderProps) {
  const [preview, setPreview] = useState(value || "")
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreview(value || "")
  }, [value])

  const runUpload = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setUploadError("Please choose a video file (MP4, WebM, etc.).")
      return
    }
    
    // Check file size (e.g., limit to 20MB for better performance)
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("Video is too large. Please keep it under 20MB.")
      return
    }

    setUploadError("")
    setUploading(true)
    try {
      // Reusing uploadAdminImage since it's likely a generic multipart upload
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
    if (file) void runUpload(file)
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

  const removeVideo = () => {
    setPreview("")
    setUploadError("")
    onChange("")
  }

  return (
    <Card className={`w-full p-4 space-y-0 ${className} border-[#E8DCC8]`}>
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-[#4A1D1F]">Dynamic Scroll Video</Label>
        
        {preview ? (
          <div className="relative group">
            <video 
              src={preview} 
              className="w-full h-32 rounded bg-black object-contain shadow-sm"
              muted
              loop
              onMouseOver={(e) => e.currentTarget.play()}
              onMouseOut={(e) => e.currentTarget.pause()}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-white rounded-full shadow-md hover:bg-red-50"
                onClick={removeVideo}
                disabled={uploading}
              >
                <X className="h-3 w-3 text-red-500" />
              </Button>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
               <PlayCircle className="text-white h-8 w-8 drop-shadow-lg" />
            </div>
          </div>
        ) : (
          <div
            className={`h-32 rounded-lg border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center text-sm p-4 ${
              dragActive ? "border-[#7B3010] bg-[#FFFBF3]" : "border-[#E8DCC8] hover:border-[#7B3010]"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 text-[#7B3010] animate-spin mb-2" />
            ) : dragActive ? (
              <Upload className="h-8 w-8 text-[#7B3010] animate-bounce mb-2" />
            ) : (
              <VideoIcon className="h-8 w-8 text-[#646464] mb-2" />
            )}
            <div className="text-center">
              <span className="text-sm font-medium text-[#4A1D1F]">
                {uploading ? "Uploading Video..." : "Upload Scroll Video"}
              </span>
              <p className="text-xs text-[#646464] mt-1">
                Drop MP4/WebM here or click to browse
              </p>
            </div>
          </div>
        )}
        
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleChange} disabled={uploading} />
        {uploadError && <p className="text-xs text-red-600 font-medium">{uploadError}</p>}
        
        <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
           <p className="text-[10px] text-amber-800 leading-tight">
             <strong>Pro Tip:</strong> Uploading a video here will automatically enable the "Smooth Scroll Animation" for the hero section. Remove the video to go back to the standard image slider.
           </p>
        </div>
      </div>
    </Card>
  )
}
