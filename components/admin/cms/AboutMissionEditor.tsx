"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function AboutMissionEditor({ value, onChange }: { value: any, onChange: (v: any) => void }) {
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
        onChange({ ...value, imageUrl: json.data.files[0].url });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="bg-[#FFFBF3] border-b border-[#E8DCC8] py-3">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">2. Our Mission</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-[#646464]">Title</Label>
          <Input 
            value={value.title || ''} 
            onChange={(e) => onChange({ ...value, title: e.target.value })} 
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464]">Description (Max 150 chars)</Label>
          <Textarea 
            maxLength={150} 
            value={value.description || ''} 
            onChange={(e) => onChange({ ...value, description: e.target.value })} 
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464]">Mission Image</Label>
          <div className="flex items-center gap-4 mt-1">
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} className="w-auto" />
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-[#4A1D1F]" />}
            {value.imageUrl && <img src={value.imageUrl} alt="Mission" className="h-10 w-10 object-cover rounded border" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}