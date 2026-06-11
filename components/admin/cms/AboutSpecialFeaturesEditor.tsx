"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "./ImageUploader";
import DynamicList from "./DynamicList";

export default function AboutSpecialFeaturesEditor({
  value = {},
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  const handleCardChange = (index: number, updatedItem: any) => {
    const newCards = [...(value.card || [])];
    newCards[index] = updatedItem;
    onChange({ ...value, card: newCards });
  };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">
          Section 5: What Makes Us Special
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-[#646464]">Badge Label</Label>
            <Input
              value={value.badge || ""}
              onChange={(e) => onChange({ ...value, badge: e.target.value })}
              placeholder="e.g. Unrivaled Experience"
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464]">Section Title</Label>
            <Input
              value={value.title || ""}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              placeholder="e.g. What Makes Us Special"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-[#646464]">Section Description</Label>
          <Textarea
            value={value.description || ""}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            placeholder="e.g. We merge traditional slow-cooking recipes with cutting-edge preservation science."
          />
        </div>

        <hr className="border-[#E8DCC8]/60 my-4" />

        <DynamicList
          title="Feature Cards Repeater"
          items={value.card || []}
          onChange={(items) => onChange({ ...value, card: items })}
          renderItem={(item, index) => (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#646464]">Card Title</Label>
                  <Input
                    value={item.title || ""}
                    onChange={(e) =>
                      handleCardChange(index, { ...item, title: e.target.value })
                    }
                    placeholder="e.g. Zero Preservatives"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#646464]">Card Description</Label>
                  <Input
                    value={item.description || ""}
                    onChange={(e) =>
                      handleCardChange(index, {
                        ...item,
                        description: e.target.value,
                      })
                    }
                    placeholder="e.g. Absolutely no artificial chemical additives..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#646464]">Card Badge Label</Label>
                  <Input
                    value={item.badge || ""}
                    onChange={(e) =>
                      handleCardChange(index, { ...item, badge: e.target.value })
                    }
                    placeholder="e.g. Pure"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#646464] block mb-1">Card Badge Icon</Label>
                  <ImageUploader
                    folder="cms/about-specialfeatures"
                    value={item.badgeicon || ""}
                    onChange={(image) =>
                      handleCardChange(index, { ...item, badgeicon: image })
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-[#646464] block mb-1">Card Main Icon</Label>
                <ImageUploader
                  folder="cms/about-specialfeatures"
                  value={item.icon || ""}
                  onChange={(image) =>
                    handleCardChange(index, { ...item, icon: image })
                  }
                />
              </div>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}
