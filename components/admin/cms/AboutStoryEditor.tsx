"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "./ImageUploader";

export default function AboutStoryEditor({
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
          Section 3: Our Story
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-[#646464]">Badge Label</Label>
            <Input
              value={value.badge || ""}
              onChange={(e) => onChange({ ...value, badge: e.target.value })}
              placeholder="e.g. Our Heritage"
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464]">Story Title</Label>
            <Input
              value={value.title || ""}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              placeholder="e.g. Crafting the Taste of Home"
            />
          </div>
        </div>

        {/* Dynamic Multiple Paragraphs Array Editor */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-[#646464]">Story Paragraphs</Label>
            <button
              type="button"
              onClick={() => {
                const arr = [...(value.description || [])];
                arr.push("");
                onChange({ ...value, description: arr });
              }}
              className="text-xs text-[#4A1D1F] hover:underline font-semibold cursor-pointer"
            >
              + Add Paragraph
            </button>
          </div>
          {(!value.description || value.description.length === 0) ? (
            <p className="text-xs text-gray-400 italic">No paragraphs. Click "+ Add Paragraph" to add one.</p>
          ) : (
            <div className="space-y-3">
              {value.description.map((para: string, idx: number) => (
                <div key={idx} className="flex gap-2 items-start bg-[#FFFBF3]/40 p-2.5 rounded-xl border border-[#E8DCC8]/30">
                  <span className="text-xs font-mono font-bold mt-2 text-[#4A1D1F]">#{idx + 1}</span>
                  <Textarea
                    value={para}
                    onChange={(e) => {
                      const arr = [...(value.description || [])];
                      arr[idx] = e.target.value;
                      onChange({ ...value, description: arr });
                    }}
                    placeholder={`Enter paragraph ${idx + 1} text...`}
                    className="text-sm min-h-[70px] flex-grow bg-white border-[#E8DCC8]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const arr = value.description.filter((_: any, i: number) => i !== idx);
                      onChange({ ...value, description: arr });
                    }}
                    className="text-xs text-red-500 hover:underline mt-2 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-[#E8DCC8]/60 pt-2" />

        <div>
          <Label className="text-xs text-[#646464] block mb-1">
            Story Image
          </Label>
          <ImageUploader
            folder="cms/about-story"
            value={value.image || ""}
            onChange={(img) => onChange({ ...value, image: img })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
