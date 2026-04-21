"use client"

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/dashboard/RichTextEditor';

interface ShippingInfoProps {
  value?: {
    content?: string;
  };
  onChange: (value: ShippingInfoProps['value']) => void;
}

export default function ShippingInfoSectionEditor({ value = { content: '' }, onChange }: ShippingInfoProps) {
  return (
    <Card className=" p-6 border-[#E8DCC8]">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Shipping Info Content</Label>
        <p className="text-xs text-[#646464] mb-4">Use the rich text editor below to format your shipping information.</p>
      </div>
      <div>
        <RichTextEditor
          value={value.content || ''}
          onChange={(content) => onChange({ content })}
        />
      </div>
    </Card>
  );
}