"use client";

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageUploader from './ImageUploader';

interface HeaderProps {
  value?: {
    logo?: string;
    link1Title?: string;
    link1Url?: string;
    link2Title?: string;
    link2Url?: string;
  };
  onChange: (value: any) => void;
}

export default function HeaderSectionEditor({ value = {}, onChange }: HeaderProps) {
  const updateField = (field: string, val: string) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Card className="p-6 border-[#E8DCC8] space-y-6">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-4 block">Header Settings</Label>
        
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Header Logo</Label>
            <ImageUploader
              folder="cms/header" 
              value={value.logo || ''} 
              onChange={(image) => updateField('logo', image)} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#E8DCC8] pt-4">
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Link 1 Title</Label>
              <Input
                value={value.link1Title || ''}
                onChange={(e) => updateField('link1Title', e.target.value)}
                placeholder="e.g. Special Dish"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Link 1 URL</Label>
              <Input
                value={value.link1Url || ''}
                onChange={(e) => updateField('link1Url', e.target.value)}
                placeholder="e.g. /special-dish"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#E8DCC8] pt-4">
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Link 2 Title</Label>
              <Input
                value={value.link2Title || ''}
                onChange={(e) => updateField('link2Title', e.target.value)}
                placeholder="e.g. Book now"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Link 2 URL</Label>
              <Input
                value={value.link2Url || ''}
                onChange={(e) => updateField('link2Url', e.target.value)}
                placeholder="e.g. /book"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}