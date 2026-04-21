"use client"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BestSellersProps {
  value?: {
    title: string;
    buttonText: string;
    url: string;
  };
  onChange: (value: BestSellersProps['value']) => void;
}

export default function BestSellersSectionEditor({ value = { title: '', buttonText: '', url: '' }, onChange }: BestSellersProps) {
  const [localValue, setLocalValue] = useState(value);

  const updateField = (field: 'title' | 'buttonText' | 'url', val: string) => {
    const newValue = { ...localValue, [field]: val };
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <Card className="space-y-4 p-6 border-[#E8DCC8]">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Best Sellers Section</Label>
        <p className="text-xs text-[#646464]">Configure best sellers header and button.</p>
      </div>
      
      <div className="space-y-2">
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Section Title</Label>
          <Input
            value={localValue.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="max-w-md h-8 text-sm"
            placeholder="Enter section title"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Button Text</Label>
            <Input
              value={localValue.buttonText}
              onChange={(e) => updateField('buttonText', e.target.value)}
              className="h-8 text-sm"
              placeholder="Enter button text"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Button URL</Label>
            <Input
              value={localValue.url}
              onChange={(e) => updateField('url', e.target.value)}
              className="h-8 text-sm"
              placeholder="Entter URL"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

