"use client"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TrendingSectionProps {
  value?: {
    title: string;
    buttonText: string;
    url: string;
  };
  onChange: (value: TrendingSectionProps['value']) => void;
}

export default function TrendingSectionEditor({ value = { title: '', buttonText: '', url: '' }, onChange }: TrendingSectionProps) {
  const [localValue, setLocalValue] = useState(value);

  const updateField = (field: keyof TrendingSectionProps['value'], val: string) => {
    const newValue = { ...localValue, [field]: val };
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <Card className="space-y-2 p-6 border-[#E8DCC8]">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Trending Section</Label>
        <p className="text-xs text-[#646464]">Configure trending products header and button.</p>
      </div>
      
      <div className="space-y-2">
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Section Title</Label>
          <Input
            value={localValue.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="max-w-md h-8 text-sm"
            placeholder="e.g. Food That's Trending"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Button Text</Label>
            <Input
              value={localValue.buttonText}
              onChange={(e) => updateField('buttonText', e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. View All"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Button URL</Label>
            <Input
              value={localValue.url}
              onChange={(e) => updateField('url', e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. /products"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

