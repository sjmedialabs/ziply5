"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ImageUploader from './ImageUploader';

export default function AboutMissionEditor({ value, onChange }: { value: any, onChange: (v: any) => void }) {

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className=" border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">Our Mission</CardTitle>
      </CardHeader>
      <CardContent className="px-4 space-y-4">
        <div>
          <Label className="text-xs text-[#646464]">Title</Label>
          <Input 
            value={value.title || ''} 
            onChange={(e) => onChange({ ...value, title: e.target.value })} 
            placeholder="Enter section title"
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464]">Description (Max 250 chars)</Label>
          <Textarea 
            maxLength={250} 
            value={value.description || ''} 
            onChange={(e) => onChange({ ...value, description: e.target.value })} 
            placeholder="Enter description"
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Mission Image</Label>
          <ImageUploader 
            value={value.imageUrl || ''} 
            onChange={(image) => onChange({ ...value, imageUrl: image })} 
          />
        </div>
      </CardContent>
    </Card>
  );
}