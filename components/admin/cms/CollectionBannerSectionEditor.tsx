"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageUploader from './ImageUploader';

interface CollectionBannerProps {
  value?: {
    title?: string;
    slides?: any[];
  };
  onChange: (value: any) => void;
}

export default function CollectionBannerSectionEditor({ value = {}, onChange }: CollectionBannerProps) {
  // Default to an empty slide object so the image uploaders have a valid target
  const slide = value.slides?.[0] || { mainImage: '', secondaryImage: '' };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">Collection Banner Section</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-4">
        <div>
          <Label className="text-xs text-[#646464]">Section Title</Label>
          <Input
            value={value.title || ''}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            className="max-w-md h-8 text-sm"
            placeholder="Enter section title"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <Label className="text-xs text-[#646464] block mb-1">Main Image</Label>
            <ImageUploader
              folder="cms/collection-banner" 
              value={slide.mainImage || ''}
              onChange={(image) => onChange({ ...value, slides: [{ ...slide, mainImage: image }] })}
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464] block mb-1">Secondary Image (New Icon)</Label>
            <ImageUploader
              folder="cms/collection-banner" 
              value={slide.secondaryImage || ''}
              onChange={(image) => onChange({ ...value, slides: [{ ...slide, secondaryImage: image }] })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
