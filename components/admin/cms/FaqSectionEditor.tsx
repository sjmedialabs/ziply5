"use client"

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DynamicList from './DynamicList';

interface FaqItem {
  question: string;
  answer: string;
  isVisible?: boolean;
}

interface FaqSectionProps {
  value?: FaqItem[];
  onChange: (value: FaqItem[]) => void;
}

export default function FaqSectionEditor({ value = [], onChange }: FaqSectionProps) {
  const items = Array.isArray(value) ? value : [];

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
              onChange(newItems);
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
          onChange(newItems);
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
            onChange(newItems);
          }}
          placeholder="Enter FAQ answer"
          className="min-h-[80px] text-sm resize-y"
        />
      </div>
    </div>
  );

  return (
    <DynamicList
      title="Frequently Asked Questions"
      items={items}
      onChange={onChange}
      renderItem={renderItem}
      emptyMessage="No FAQs added yet. Click Add to create one."
    />
  );
}