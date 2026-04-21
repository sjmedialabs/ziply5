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

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const token = window.localStorage.getItem("ziply5_access_token");
      const form = new FormData();
      form.append("files", file);
      form.append("folder", "cms/about");
      const res = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const json = await res.json();
      if (json.data?.files?.[0]?.url) {
        onChange({ ...value, mediaUrl: json.data.files[0].url });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className=" border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">1. Our Journey</CardTitle>
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
            <Label className="text-xs text-[#646464]">Description 1 (Max 150 chars)</Label>
            <Textarea 
              maxLength={150} 
              value={value.desc1 || ''} 
              onChange={(e) => onChange({ ...value, desc1: e.target.value })} 
              placeholder="Enter description" 
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464]">Description 2 (Max 150 chars)</Label>
            <Textarea 
              maxLength={150} 
              value={value.desc2 || ''} 
              onChange={(e) => onChange({ ...value, desc2: e.target.value })} 
              placeholder="Enter description" 
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-[#646464]">Media Upload (Image or Video)</Label>
          <div className="flex items-center gap-4 mt-1">
            <Input type="file" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} className="w-auto" />
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-[#4A1D1F]" />}
            {value.mediaUrl && (
              <div className="flex items-center gap-2">
                <a href={value.mediaUrl} target="_blank" className="text-xs text-blue-600 underline">View current media</a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onChange({ ...value, mediaUrl: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}