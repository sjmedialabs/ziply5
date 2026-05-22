"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "./ImageUploader";
import { RichTextEditor } from "@/components/dashboard/RichTextEditor";

export default function AboutWhoWeAreEditor({
  value = {},
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">
          Section 2: Who We Are
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-6">
        {/* Main Section Header */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#4A1D1F] uppercase tracking-wider">
            Main Header Settings
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-[#646464]">Badge Label</Label>
              <Input
                value={value.badge || ""}
                onChange={(e) => onChange({ ...value, badge: e.target.value })}
                placeholder="e.g. Brand Philosophy"
              />
            </div>
            <div>
              <Label className="text-xs text-[#646464]">Title</Label>
              <Input
                value={value.title || ""}
                onChange={(e) => onChange({ ...value, title: e.target.value })}
                placeholder="e.g. Who We Are"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#646464]">Description</Label>
            <Textarea
              value={value.description || ""}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
              placeholder="Who we are main summary paragraph..."
            />
          </div>
        </div>

        <hr className="border-[#E8DCC8]/60" />

        {/* Mission Card Editor */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#4A1D1F] uppercase tracking-wider">
            Card 1: Our Mission
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-[#646464]">Mission Title</Label>
              <Input
                value={value.missionTitle || ""}
                onChange={(e) => onChange({ ...value, missionTitle: e.target.value })}
                placeholder="e.g. Our Mission"
              />
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Mission Card Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={value.missionColour || "#4A1D1F"}
                  onChange={(e) => onChange({ ...value, missionColour: e.target.value })}
                  className="w-10 h-8 p-1 cursor-pointer rounded border-[#E8DCC8] bg-transparent"
                />
                <Input
                  type="text"
                  value={value.missionColour || "#4A1D1F"}
                  onChange={(e) => onChange({ ...value, missionColour: e.target.value })}
                  className="h-8 text-xs font-mono w-24"
                  placeholder="#4A1D1F"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Mission Icon</Label>
              <ImageUploader
                folder="cms/about-whoweare"
                value={value.missionIcon || ""}
                onChange={(icon) => onChange({ ...value, missionIcon: icon })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#646464]">Mission Description</Label>
            <Textarea
              value={value.missionDescription || ""}
              onChange={(e) =>
                onChange({ ...value, missionDescription: e.target.value })
              }
              placeholder="Mission statement details..."
            />
          </div>
        </div>

        <hr className="border-[#E8DCC8]/60" />

        {/* Vision Card Editor */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#4A1D1F] uppercase tracking-wider">
            Card 2: Our Vision
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-[#646464]">Vision Title</Label>
              <Input
                value={value.vissionTitle || ""}
                onChange={(e) => onChange({ ...value, vissionTitle: e.target.value })}
                placeholder="e.g. Our Vision"
              />
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Vision Card Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={value.visionColour || "#EF4444"}
                  onChange={(e) => onChange({ ...value, visionColour: e.target.value })}
                  className="w-10 h-8 p-1 cursor-pointer rounded border-[#E8DCC8] bg-transparent"
                />
                <Input
                  type="text"
                  value={value.visionColour || "#EF4444"}
                  onChange={(e) => onChange({ ...value, visionColour: e.target.value })}
                  className="h-8 text-xs font-mono w-24"
                  placeholder="#EF4444"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Vision Icon</Label>
              <ImageUploader
                folder="cms/about-whoweare"
                value={value.visionIcon || ""}
                onChange={(icon) => onChange({ ...value, visionIcon: icon })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#646464]">Vision Description</Label>
            <Textarea
              value={value.visionDescription || ""}
              onChange={(e) =>
                onChange({ ...value, visionDescription: e.target.value })
              }
              placeholder="Vision statement details..."
            />
          </div>
        </div>

        <hr className="border-[#E8DCC8]/60" />

        {/* Values Card Editor */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#4A1D1F] uppercase tracking-wider">
            Card 3: Our Values
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-[#646464]">Values Title</Label>
              <Input
                value={value.valueTitle || ""}
                onChange={(e) => onChange({ ...value, valueTitle: e.target.value })}
                placeholder="e.g. Our Values"
              />
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Values Card Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={value.valueColour || "#D4AF37"}
                  onChange={(e) => onChange({ ...value, valueColour: e.target.value })}
                  className="w-10 h-8 p-1 cursor-pointer rounded border-[#E8DCC8] bg-transparent"
                />
                <Input
                  type="text"
                  value={value.valueColour || "#D4AF37"}
                  onChange={(e) => onChange({ ...value, valueColour: e.target.value })}
                  className="h-8 text-xs font-mono w-24"
                  placeholder="#D4AF37"
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-2 block">Values Bullet Points (Rich Text)</Label>
            <RichTextEditor
              value={value.valuePoints || ""}
              onChange={(pointsHtml) => onChange({ ...value, valuePoints: pointsHtml })}
              placeholder="Use bullet lists to define your core company values..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
