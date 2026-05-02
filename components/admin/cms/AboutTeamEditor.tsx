"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import ImageUploader from './ImageUploader';

export default function AboutTeamEditor({ value, onChange }: { value: any, onChange: (v: any) => void }) {
  const members = value.members || [];

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className=" border-b border-[#E8DCC8] flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">Our Team Members</CardTitle>
        <Button className='cursor-pointer' size="sm" variant="outline" onClick={() => onChange({ ...value, members: [...members, { name: '', role: '', imageUrl: '', facebook: '', instagram: '', youtube: '' }] })}>
          <Plus className="h-4 w-4 mr-2" /> Add Member
        </Button>
      </CardHeader>
      <CardContent className="px-4 space-y-2">
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
            placeholder='Enter description'
          />
        </div>

        <div className="space-y-4">
          {members.map((member: any, idx: number) => (
            <div key={idx} className="p-4 border rounded-lg bg-gray-50 flex gap-4 items-start relative">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#646464]">Name</Label>
                  <Input value={member.name} onChange={(e) => { const newM = [...members]; newM[idx].name = e.target.value; onChange({ ...value, members: newM }); }} />
                </div>
                <div>
                  <Label className="text-xs text-[#646464]">Role</Label>
                  <Input value={member.role} onChange={(e) => { const newM = [...members]; newM[idx].role = e.target.value; onChange({ ...value, members: newM }); }} />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2 grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-[#646464]">Facebook URL</Label>
                    <Input 
                      placeholder="https://..." 
                      value={member.facebook} 
                      onChange={(e) => { const newM = [...members]; newM[idx].facebook = e.target.value; onChange({ ...value, members: newM }); }} 
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#646464]">Instagram URL</Label>
                    <Input 
                      placeholder="https://..." 
                      value={member.instagram} 
                      onChange={(e) => { const newM = [...members]; newM[idx].instagram = e.target.value; onChange({ ...value, members: newM }); }} 
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#646464]">YouTube URL</Label>
                    <Input 
                      placeholder="https://..." 
                      value={member.youtube} 
                      onChange={(e) => { const newM = [...members]; newM[idx].youtube = e.target.value; onChange({ ...value, members: newM }); }} 
                    />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 mt-2">
                  <Label className="text-xs text-[#646464] block mb-1">Image Upload</Label>
                  <ImageUploader
                    folder="cms/about-team" 
                    value={member.imageUrl || ''} 
                    onChange={(image) => {
                      const newM = [...members];
                      newM[idx].imageUrl = image;
                      onChange({ ...value, members: newM });
                    }} 
                  />
                </div>
              </div>
              <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => {
                const newM = members.filter((_: any, i: number) => i !== idx);
                onChange({ ...value, members: newM });
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