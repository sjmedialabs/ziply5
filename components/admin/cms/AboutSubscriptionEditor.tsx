"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AboutSubscriptionEditor({ value, onChange }: { value: any, onChange: (v: any) => void }) {
  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="bg-[#FFFBF3] border-b border-[#E8DCC8] py-3">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">5. Subscription Section</CardTitle>
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
          <Label className="text-xs text-[#646464]">Description</Label>
          <Textarea 
            value={value.description || ''} 
            onChange={(e) => onChange({ ...value, description: e.target.value })} 
          />
        </div>
      </CardContent>
    </Card>
  );
}