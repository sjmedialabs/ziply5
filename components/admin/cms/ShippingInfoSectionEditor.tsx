"use client"

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/dashboard/RichTextEditor';
import ImageUploader from './ImageUploader';

interface ShippingInfoProps {
  value?: {
    title?: string;
    description?: string;
    bgImage?: string;
    content?: string;
  };
  onChange: (value: ShippingInfoProps['value']) => void;
}

export default function ShippingInfoSectionEditor({ value = { content: '' }, onChange }: ShippingInfoProps) {
  return (
    <Card className=" p-6 border-[#E8DCC8] space-y-6">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Shipping Info Hero Banner</Label>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Title</Label>
            <Input
              value={value.title || ''}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              placeholder="Enter banner title"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Description</Label>
            <Textarea
              value={value.description || ''}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
              placeholder="Enter banner description"
              className="min-h-[80px] text-sm resize-y"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Banner Image</Label>
            <ImageUploader 
              value={value.bgImage || ''} 
              onChange={(image) => onChange({ ...value, bgImage: image })} 
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#E8DCC8] pt-6">
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Shipping Info Content</Label>
        <p className="text-xs text-[#646464] mb-4">Use the rich text editor below to format your shipping information.</p>
        <RichTextEditor
          value={value.content || ''}
          onChange={(content) => onChange({ ...value, content })}
        />
      </div>
    </Card>
  );
}