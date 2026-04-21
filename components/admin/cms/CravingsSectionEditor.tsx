"use client"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DynamicList from './DynamicList';
import ImageUploader from './ImageUploader';

interface CravingsItem {
  image: string;
  buttonText: string;
  alt: string;
}

interface CravingsProps {
  value?: {
    title?: string;
    buttonText?: string;
    url?: string;
    items: CravingsItem[];
  };
  onChange: (value: CravingsProps['value']) => void;
}

export default function CravingsSectionEditor({ value = { title: '', buttonText: '', url: '', items: [] }, onChange }: CravingsProps) {
  const [localValue, setLocalValue] = useState(value);

  const updateField = (field: 'title' | 'buttonText' | 'url', val: string) => {
    const newValue = { ...localValue, [field]: val };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const updateItems = (items: CravingsItem[]) => {
    const newValue = { ...localValue, items };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const renderItem = (item: CravingsItem, index: number, actions: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div>
        <Label className="text-xs font-semibold text-[#646464] mb-1 block">Cravings Image</Label>
        <ImageUploader 
          value={item.image}
          onChange={(image) => {
            const newItems = [...localValue.items];
            newItems[index].image = image;
            newItems[index].alt = image ? `Cravings ${index + 1}` : '';
            updateItems(newItems);
          }}
          altText={item.alt}
          onAltChange={(alt) => {
            const newItems = [...localValue.items];
            newItems[index].alt = alt;
            updateItems(newItems);
          }}
        />
      </div>
      {/* <div>
        <Label className="text-xs font-semibold text-[#646464] mb-1 block">Button Text</Label>
        <Input
          value={item.buttonText}
          onChange={(e) => {
            const newItems = [...localValue.items];
            newItems[index].buttonText = e.target.value;
            updateItems(newItems);
          }}
          className="h-8 text-sm"
          placeholder="e.g. Order Now"
        />
      </div> */}
    </div>
  );

  return (
    <Card className="space-y-4 p-6 border-[#E8DCC8]">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Cravings Section</Label>
        <p className="text-xs text-[#646464] mb-4">Manage cravings gallery items.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Section Title</Label>
          <Input
            value={localValue.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            className="h-8 text-sm"
            placeholder="Enter section title"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Button Text</Label>
          <Input
            value={localValue.buttonText || ''}
            onChange={(e) => updateField('buttonText', e.target.value)}
            className="h-8 text-sm"
            placeholder="Enter button text"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Button URL</Label>
          <Input
            value={localValue.url || ''}
            onChange={(e) => updateField('url', e.target.value)}
            className="h-8 text-sm"
            placeholder="Enter URL"
          />
        </div>
      </div>

      <DynamicList
        title="Cravings Items"
        items={localValue.items}
        onChange={updateItems}
        renderItem={renderItem}
        emptyMessage="No cravings items. Add gallery items."
      />
    </Card>
  );
}
