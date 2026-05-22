"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUploader from "./ImageUploader";
import VideoUploader from "./VideoUploader";

export default function AboutHeroEditor({
  value = {},
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  const mediaUrl = value.heroImage || "";
  const isVideo = typeof mediaUrl === "string" && (
    /\.(mp4|webm|ogg|mov)$/i.test(mediaUrl) ||
    mediaUrl.startsWith("data:video/") ||
    mediaUrl.includes("/video/upload/") ||
    mediaUrl.includes("video")
  );

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">
          Section 1: Hero Banner
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-4">
        <div>
          <Label className="text-xs text-[#646464]">Badge Label</Label>
          <Input
            value={value.heroBadge || ""}
            onChange={(e) => onChange({ ...value, heroBadge: e.target.value })}
            placeholder="e.g. AUTHENTIC TASTE & CONVENIENCE"
          />
        </div>

        <div>
          <Label className="text-xs text-[#646464]">Hero Title</Label>
          <Input
            value={value.heroTitle || ""}
            onChange={(e) => onChange({ ...value, heroTitle: e.target.value })}
            placeholder="e.g. Delicious Indian Meals Ready in Minutes"
          />
        </div>

        <hr className="border-[#E8DCC8]/60" />

        {/* Stats Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#4A1D1F] uppercase tracking-wider">
            Stats Counters
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-[#646464]">Stat 1 Number/Value</Label>
              <Input
                value={value.stat1 || ""}
                onChange={(e) => onChange({ ...value, stat1: e.target.value })}
                placeholder="e.g. 100%"
              />
            </div>
            <div>
              <Label className="text-xs text-[#646464]">Stat 1 Description</Label>
              <Input
                value={value.stat1Desc || ""}
                onChange={(e) => onChange({ ...value, stat1Desc: e.target.value })}
                placeholder="e.g. Pure Vegetarian"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-[#646464]">Stat 2 Number/Value</Label>
              <Input
                value={value.stat2 || ""}
                onChange={(e) => onChange({ ...value, stat2: e.target.value })}
                placeholder="e.g. Zero"
              />
            </div>
            <div>
              <Label className="text-xs text-[#646464]">Stat 2 Description</Label>
              <Input
                value={value.stat2Desc || ""}
                onChange={(e) => onChange({ ...value, stat2Desc: e.target.value })}
                placeholder="e.g. Added Preservatives"
              />
            </div>
          </div>
        </div>

        <hr className="border-[#E8DCC8]/60" />

        {/* Floating Card */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#4A1D1F] uppercase tracking-wider">
            Floating Media Card
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-[#646464]">Card Label / Title</Label>
              <Input
                value={value.cardTitle || ""}
                onChange={(e) => onChange({ ...value, cardTitle: e.target.value })}
                placeholder="e.g. Premium Grade"
              />
            </div>
            <div>
              <Label className="text-xs text-[#646464]">Card Description</Label>
              <Input
                value={value.cardDesc || ""}
                onChange={(e) => onChange({ ...value, cardDesc: e.target.value })}
                placeholder="e.g. 100% Chef-Crafted"
              />
            </div>
          </div>
        </div>

        <hr className="border-[#E8DCC8]/60" />

        {/* Unified Hero Showcase Media */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#4A1D1F] uppercase tracking-wider">
            Hero Showcase Media (Image or Video)
          </h4>
          <p className="text-[10px] text-[#646464]">
            Upload an image OR a video. The system will automatically detect the media type and render it.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[#646464]">Upload Image</Label>
              <ImageUploader
                folder="cms/about-hero"
                value={!isVideo ? mediaUrl : ""}
                onChange={(image) => onChange({ ...value, heroImage: image })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[#646464]">Upload Video</Label>
              <VideoUploader
                folder="cms/about-hero"
                value={isVideo ? mediaUrl : ""}
                onChange={(video) => onChange({ ...value, heroImage: video })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}