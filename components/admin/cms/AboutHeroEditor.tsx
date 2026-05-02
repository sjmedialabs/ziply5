"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageUploader from './ImageUploader';

export default function AboutHeroEditor({ value = {}, onChange }: { value: any, onChange: (v: any) => void }) {

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className=" border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">Hero Banner</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-4">
        <div>
          <Label className="text-xs text-[#646464]">Banner Title</Label>
          <Input 
            value={value.title || ''} 
            onChange={(e) => onChange({ ...value, title: e.target.value })} 
            placeholder="Enter banner title"
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Banner Image</Label>
          <ImageUploader
            folder="cms/about-hero" 
            value={value.bgImage || ''} 
            onChange={(image) => onChange({ ...value, bgImage: image })} 
          />
        </div>
      </CardContent>
    </Card>
  );
}