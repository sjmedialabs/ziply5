"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "./ImageUploader";
import DynamicList from "./DynamicList";

export default function AboutSpecialityEditor({
  value = {},
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  const handleStatChange = (index: number, updatedItem: any) => {
    const newStats = [...(value.stats || [])];
    newStats[index] = updatedItem;
    onChange({ ...value, stats: newStats });
  };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">
          Section 6: Our Speciality
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-[#646464]">Badge Label</Label>
            <Input
              value={value.badge || ""}
              onChange={(e) => onChange({ ...value, badge: e.target.value })}
              placeholder="e.g. Unmatched Craftsmanship"
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464]">Section Title</Label>
            <Input
              value={value.title || ""}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              placeholder="e.g. Our Speciality"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-[#646464]">Section Description</Label>
          <Textarea
            value={value.description || ""}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            placeholder="e.g. Discover what sets our ready-to-eat meals apart from standard instant products..."
          />
        </div>

        <hr className="border-[#E8DCC8]/60 my-4" />

        {/* Dynamic Stats Repeater */}
        <DynamicList
          title="Stats Repeater"
          items={value.stats || []}
          onChange={(items) => onChange({ ...value, stats: items })}
          renderItem={(item, index) => (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#646464]">Stat Number/Text</Label>
                <Input
                  value={item.stat || ""}
                  onChange={(e) =>
                    handleStatChange(index, { ...item, stat: e.target.value })
                  }
                  placeholder="e.g. 100% or 5 Mins"
                />
              </div>
              <div>
                <Label className="text-xs text-[#646464]">Stat Description</Label>
                <Input
                  value={item.desciption || ""}
                  onChange={(e) =>
                    handleStatChange(index, { ...item, desciption: e.target.value })
                  }
                  placeholder="e.g. Chef Curated"
                />
              </div>
            </div>
          )}
        />

        <hr className="border-[#E8DCC8]/60 my-4" />

        {/* Dynamic Bullet Points Array Editor */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-[#646464]">Bullet Points Checklist</Label>
            <button
              type="button"
              onClick={() => {
                const arr = [...(value.points || [])];
                arr.push("");
                onChange({ ...value, points: arr });
              }}
              className="text-xs text-[#4A1D1F] hover:underline font-semibold cursor-pointer"
            >
              + Add Bullet Point
            </button>
          </div>
          {(!value.points || value.points.length === 0) ? (
            <p className="text-xs text-gray-400 italic">No bullet points. Click "+ Add Bullet Point" to add one.</p>
          ) : (
            <div className="space-y-3">
              {value.points.map((point: string, idx: number) => (
                <div key={idx} className="flex gap-2 items-center bg-[#FFFBF3]/40 p-2 rounded-xl border border-[#E8DCC8]/30">
                  <span className="text-xs font-mono font-bold text-[#4A1D1F]">#{idx + 1}</span>
                  <Input
                    value={point}
                    onChange={(e) => {
                      const arr = [...(value.points || [])];
                      arr[idx] = e.target.value;
                      onChange({ ...value, points: arr });
                    }}
                    placeholder={`Enter bullet point ${idx + 1} text...`}
                    className="text-sm flex-grow bg-white border-[#E8DCC8]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const arr = value.points.filter((_: any, i: number) => i !== idx);
                      onChange({ ...value, points: arr });
                    }}
                    className="text-xs text-red-500 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-[#E8DCC8]/60 my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-[#646464]">CTA Label</Label>
            <Input
              value={value.cta || ""}
              onChange={(e) => onChange({ ...value, cta: e.target.value })}
              placeholder="e.g. Explore Our Menu"
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464]">CTA Link</Label>
            <Input
              value={value.ctaLink || ""}
              onChange={(e) => onChange({ ...value, ctaLink: e.target.value })}
              placeholder="e.g. /collections"
            />
          </div>
        </div>

        <hr className="border-[#E8DCC8]/60 my-4" />

        <div>
          <Label className="text-xs text-[#646464] block mb-1">
            Section Showcase Image
          </Label>
          <ImageUploader
            folder="cms/about-speciality"
            value={value.image || ""}
            onChange={(img) => onChange({ ...value, image: img })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
