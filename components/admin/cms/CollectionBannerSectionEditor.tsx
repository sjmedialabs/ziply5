"use client"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DynamicList from './DynamicList';
import ImageUploader from './ImageUploader';

interface BannerSlide {
  title: string;
  mainImage: string;
  secondaryImage: string;
  alt: string;
}

interface CollectionBannerProps {
  value?: {
    title: string;
    slides: BannerSlide[];
  };
  onChange: (value: CollectionBannerProps['value']) => void;
}

export default function CollectionBannerSectionEditor({ value = { title: '', slides: [] }, onChange }: CollectionBannerProps) {
  const [localValue, setLocalValue] = useState(value);

  const updateTitle = (title: string) => {
    const newValue = { ...localValue, title };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const updateSlides = (slides: BannerSlide[]) => {
    const newValue = { ...localValue, slides };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const renderSlide = (slide: BannerSlide, index: number, actions: any) => (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-[#646464] mb-1 block">Slide Title</Label>
        <Input
          value={slide.title}
          onChange={(e) => {
            const newSlides = [...localValue.slides];
            newSlides[index].title = e.target.value;
            updateSlides(newSlides);
          }}
          className="max-w-md h-8 text-sm"
          placeholder="Enter title"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Main Image</Label>
          <ImageUploader 
            value={slide.mainImage}
            onChange={(image) => {
              const newSlides = [...localValue.slides];
              newSlides[index].mainImage = image;
              updateSlides(newSlides);
            }}
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Secondary Image</Label>
          <ImageUploader 
            value={slide.secondaryImage}
            onChange={(image) => {
              const newSlides = [...localValue.slides];
              newSlides[index].secondaryImage = image;
              updateSlides(newSlides);
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Card className="space-y-4 p-6 border-[#E8DCC8]">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Collection Banner Section</Label>
        <p className="text-xs text-[#646464] mb-4">Manage collection banners with main and secondary images.</p>
      </div>

      <DynamicList
        title="Banner Slides"
        items={localValue.slides}
        onChange={updateSlides}
        renderItem={renderSlide}
        emptyMessage="No banners. Add banners for collection section."
      />
    </Card>
  );
}

