"use client"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DynamicList from './DynamicList';
import ImageUploader from './ImageUploader';

interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
  alt: string;
}

interface HeroSectionEditorProps {
  value?: {
    title?: string;
    subtitle?: string;
    slides: HeroSlide[];
  };
  onChange: (value: HeroSectionEditorProps['value']) => void;
}

export default function HeroSectionEditor({ value = { slides: [] }, onChange }: HeroSectionEditorProps) {
  const [localValue, setLocalValue] = useState(value);

  const updateSlides = (slides: HeroSlide[]) => {
    const newValue = { ...localValue, slides };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const updateTitle = (title: string) => {
    const newValue = { ...localValue, title };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const updateSubtitle = (subtitle: string) => {
    const newValue = { ...localValue, subtitle };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const renderSlide = (slide: HeroSlide, index: number, actions: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div>
        <Label className="text-xs font-semibold text-[#646464] mb-1 block">Slide Image</Label>
        <ImageUploader 
          value={slide.image}
          onChange={(image) => {
            const newSlides = [...localValue.slides];
            newSlides[index].image = image;
            newSlides[index].alt = image ? `Hero slide ${index + 1}` : '';
            updateSlides(newSlides);
          }}
          
          onAltChange={(alt) => {
            const newSlides = [...localValue.slides];
            newSlides[index].alt = alt;
            updateSlides(newSlides);
          }}
        />
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Title</Label>
          <Input
            value={slide.title}
            onChange={(e) => {
              const newSlides = [...localValue.slides];
              newSlides[index].title = e.target.value;
              updateSlides(newSlides);
            }}
            className="h-8 text-sm"
            placeholder="Slide title"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Subtitle</Label>
          <Input
            value={slide.subtitle}
            onChange={(e) => {
              const newSlides = [...localValue.slides];
              newSlides[index].subtitle = e.target.value;
              updateSlides(newSlides);
            }}
            className="h-8 text-sm"
            placeholder="Slide subtitle"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Card className="space-y-0 p-6 border-[#E8DCC8]">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Hero Section</Label>
        <p className="text-xs text-[#646464] ">Manage carousel slides with images, titles, and subtitles. Reorder with arrows.</p>
      </div>
      
      {/* <div className="space-y-2">
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Global Title (overlay)</Label>
          <Input
            value={localValue.title || ''}
            onChange={(e) => updateTitle(e.target.value)}
            className="max-w-md h-8 text-sm"
            placeholder="e.g. Nothing Artificial. Everything Delicious."
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Global Subtitle</Label>
          <Input
            value={localValue.subtitle || ''}
            onChange={(e) => updateSubtitle(e.target.value)}
            className="max-w-md h-8 text-sm"
            placeholder="e.g. Taste the authentic flavors of home-cooked meals!"
          />
        </div>
      </div> */}

      <DynamicList
        title="Hero Slides"
        items={localValue.slides}
        onChange={updateSlides}
        renderItem={renderSlide}
        emptyMessage="No slides. Add slides to create the hero carousel."
      />

      <div className="text-xs text-[#646464] pt-2 border-t text-center">
        Tip: Minimum 3 slides recommended. Images optimized for 1920x600px.
      </div>
    </Card>
  );
}

