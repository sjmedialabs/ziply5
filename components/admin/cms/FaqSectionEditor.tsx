"use client"

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DynamicList from './DynamicList';
import ImageUploader from './ImageUploader';

interface FaqItem {
  question: string;
  answer: string;
  isVisible?: boolean;
}

interface FaqSectionProps {
  value?: {
    title?: string;
    description?: string;
    bgImage?: string;
    items?: FaqItem[];
  } | FaqItem[]; // Allow legacy array structure
  onChange: (value: any) => void;
}

export default function FaqSectionEditor({ value = { items: [] }, onChange }: FaqSectionProps) {
  // Safely migrate from legacy array structure to new object structure
  const normalizedValue = Array.isArray(value) ? { items: value } : (value || { items: [] });
  const items = Array.isArray(normalizedValue.items) ? normalizedValue.items : [];

  const updateField = (field: string, val: any) => {
    onChange({ ...normalizedValue, [field]: val });
  };

  const updateItems = (newItems: FaqItem[]) => {
    onChange({ ...normalizedValue, items: newItems });
  };

  const renderItem = (item: FaqItem, index: number) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-[#646464]">Question</Label>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-[#646464]">Visible</Label>
          <input
            type="checkbox"
            checked={item.isVisible !== false} // Default to true if undefined
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].isVisible = e.target.checked;
              updateItems(newItems);
            }}
            className="accent-[#7B3010] cursor-pointer w-4 h-4"
            title="Toggle visibility"
          />
        </div>
      </div>
      <Input
        value={item.question || ''}
        onChange={(e) => {
          const newItems = [...items];
          newItems[index].question = e.target.value;
          updateItems(newItems);
        }}
        placeholder="Enter FAQ question"
        className="h-8 text-sm"
      />

      <div>
        <Label className="text-xs font-semibold text-[#646464] mb-1 block">Answer</Label>
        <Textarea
          value={item.answer || ''}
          onChange={(e) => {
            const newItems = [...items];
            newItems[index].answer = e.target.value;
            updateItems(newItems);
          }}
          placeholder="Enter FAQ answer"
          className="min-h-[80px] text-sm resize-y"
        />
      </div>
    </div>
  );

  return (
    <Card className="p-6 border-[#E8DCC8] space-y-6">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">FAQ Hero Banner</Label>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Title</Label>
            <Input
              value={normalizedValue.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Enter banner title"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Description</Label>
            <Textarea
              value={normalizedValue.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Enter banner description"
              className="min-h-[80px] text-sm resize-y"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Banner Image</Label>
            <ImageUploader
              folder="cms/faq" 
              value={normalizedValue.bgImage || ''} 
              onChange={(image) => updateField('bgImage', image)} 
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#E8DCC8] pt-6">
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">FAQ Items</Label>
        <DynamicList
          title="Frequently Asked Questions"
          items={items}
          onChange={updateItems}
          renderItem={renderItem}
          emptyMessage="No FAQs added yet. Click Add to create one."
        />
      </div>
    </Card>
  );
}