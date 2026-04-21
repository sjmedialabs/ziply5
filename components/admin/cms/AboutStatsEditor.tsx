"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, X } from 'lucide-react';

export default function AboutStatsEditor({ value, onChange }: { value: any, onChange: (v: any) => void }) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const stats = value.stats || [];

  const handleUpload = async (file: File, idx: number) => {
    setUploadingIdx(idx);
    try {
      const token = window.localStorage.getItem("ziply5_access_token");
      const form = new FormData();
      form.append("files", file);
      form.append("folder", "cms/about/icons");
      const res = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const json = await res.json();
      if (json.data?.files?.[0]?.url) {
        const newStats = [...stats];
        newStats[idx].iconUrl = json.data.files[0].url;
        onChange({ ...value, stats: newStats });
      }
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="bg-[#FFFBF3] border-b border-[#E8DCC8] py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">3. Stats Section</CardTitle>
        <Button size="sm" variant="outline" onClick={() => onChange({ ...value, stats: [...stats, { title: '', description: '', iconUrl: '' }] })}>
          <Plus className="h-4 w-4 mr-2" /> Add Stat
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        <div>
          <Label className="text-xs text-[#646464]">Main Stats Description</Label>
          <Textarea 
            value={value.mainDescription || ''} 
            onChange={(e) => onChange({ ...value, mainDescription: e.target.value })} 
            placeholder="Enter the overall description for the stats section" 
          />
        </div>

        <div className="space-y-4">
          {stats.map((stat: any, idx: number) => (
            <div key={idx} className="p-4 border rounded-lg bg-gray-50 flex gap-4 items-start relative">
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs text-[#646464]">Stat Title</Label>
                  <Input 
                    value={stat.title} 
                    onChange={(e) => { const newS = [...stats]; newS[idx].title = e.target.value; onChange({ ...value, stats: newS }); }} 
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#646464]">Description (Max 50 chars)</Label>
                  <Input 
                    maxLength={50} 
                    value={stat.description} 
                    onChange={(e) => { const newS = [...stats]; newS[idx].description = e.target.value; onChange({ ...value, stats: newS }); }} 
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#646464]">Icon Upload</Label>
                  <div className="flex items-center gap-4 mt-1">
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], idx)} className="w-auto" />
                    {uploadingIdx === idx && <Loader2 className="h-4 w-4 animate-spin text-[#4A1D1F]" />}
                    {stat.iconUrl && (
                      <div className="flex items-center gap-2">
                        <img src={stat.iconUrl} alt="Icon" className="h-8 w-8 object-contain rounded border" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            const newS = [...stats];
                            newS[idx].iconUrl = '';
                            onChange({ ...value, stats: newS });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => {
                const newS = stats.filter((_: any, i: number) => i !== idx);
                onChange({ ...value, stats: newS });
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}