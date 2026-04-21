"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

export default function AboutJourneyEditor({ value, onChange }: { value: any, onChange: (v: any) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onChange({ ...value, mediaUrl: base64 });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className=" border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">Our Journey</CardTitle>
      </CardHeader>
      <CardContent className="px-4 space-y-4">
        <div>
          <Label className="text-xs text-[#646464]">Section Title</Label>
          <Input 
            value={value.title || ''} 
            onChange={(e) => onChange({ ...value, title: e.target.value })} 
            placeholder="Enter section title" 
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-[#646464]">Description 1 (Max 250 chars)</Label>
            <Textarea 
              maxLength={250} 
              value={value.desc1 || ''} 
              onChange={(e) => onChange({ ...value, desc1: e.target.value })} 
              placeholder="Enter description" 
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464]">Description 2 (Max 250 chars)</Label>
            <Textarea 
              maxLength={250} 
              value={value.desc2 || ''} 
              onChange={(e) => onChange({ ...value, desc2: e.target.value })} 
              placeholder="Enter description" 
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Media Upload (Image or Video)</Label>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center gap-4">
              <Input type="file" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="w-auto" />
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-[#4A1D1F]" />}
            </div>
            {value.mediaUrl && (
              <div className="relative inline-block w-fit mt-2 group">
                {value.mediaUrl.startsWith('data:video/') || value.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={value.mediaUrl} controls className="h-32 w-auto rounded border shadow-sm" />
                ) : (
                  <img src={value.mediaUrl} alt="Media preview" className="h-32 w-auto object-cover rounded border shadow-sm" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-white rounded-full shadow-md text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onChange({ ...value, mediaUrl: '' })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}