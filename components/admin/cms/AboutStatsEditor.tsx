"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import ImageUploader from './ImageUploader';

export default function AboutStatsEditor({ value, onChange }: { value: any, onChange: (v: any) => void }) {
  const stats = value.stats || [];

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className=" border-b border-[#E8DCC8] flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">Stats Section</CardTitle>
        <Button className="cursor-pointer" size="sm" variant="outline" onClick={() => onChange({ ...value, stats: [...stats, { title: '', description: '', iconUrl: '' }] })}>
          <Plus className="h-4 w-4 mr-2" /> Add Stat
        </Button>
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
        <div>
          <Label className="text-xs text-[#646464]">Section Description</Label>
          <Textarea 
            value={value.mainDescription || ''} 
            onChange={(e) => onChange({ ...value, mainDescription: e.target.value })} 
            placeholder="Enter description" 
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
                  <Label className="text-xs text-[#646464]">Description (Max 100 chars)</Label>
                  <Input 
                    maxLength={100} 
                    value={stat.description} 
                    onChange={(e) => { const newS = [...stats]; newS[idx].description = e.target.value; onChange({ ...value, stats: newS }); }} 
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#646464] block mb-1">Icon Upload</Label>
                  <ImageUploader 
                    value={stat.iconUrl || ''} 
                    onChange={(image) => {
                      const newS = [...stats];
                      newS[idx].iconUrl = image;
                      onChange({ ...value, stats: newS });
                    }} 
                  />
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