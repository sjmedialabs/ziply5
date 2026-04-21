"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ContactUsProps {
  value?: {
    mainDescription?: string;
    address?: string;
    addressDescription?: string;
    phone?: string;
    phoneDescription?: string;
    email?: string;
    emailDescription?: string;
  };
  onChange: (value: any) => void;
}

export default function ContactUsSectionEditor({ value = {}, onChange }: ContactUsProps) {
  const updateField = (field: string, val: string) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader className="border-b border-[#E8DCC8]">
        <CardTitle className="text-sm font-semibold text-[#4A1D1F]">Contact Us Details</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-6">
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Main Description</Label>
          <Textarea
            value={value.mainDescription || ''}
            onChange={(e) => updateField('mainDescription', e.target.value)}
            placeholder="Enter main description"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 border-[#E8DCC8]">
          <div>
            <Label className="text-xs text-[#646464] block mb-1">Address</Label>
            <Input
              value={value.address || ''}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Enter address"
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464] block mb-1">Address Description</Label>
            <Textarea
              value={value.addressDescription || ''}
              onChange={(e) => updateField('addressDescription', e.target.value)}
              placeholder="Enter address description"
              className="h-10 resize-none"
            />
          </div>

          <div>
            <Label className="text-xs text-[#646464] block mb-1">Contact Number</Label>
            <Input
              value={value.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="Enter contact number"
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464] block mb-1">Contact Number Description</Label>
            <Textarea
              value={value.phoneDescription || ''}
              onChange={(e) => updateField('phoneDescription', e.target.value)}
              placeholder="Enter contact description"
              className="h-10 resize-none"
            />
          </div>

          <div>
            <Label className="text-xs text-[#646464] block mb-1">Email</Label>
            <Input
              value={value.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Enter e-mail address"
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464] block mb-1">Email Description</Label>
            <Textarea
              value={value.emailDescription || ''}
              onChange={(e) => updateField('emailDescription', e.target.value)}
              placeholder="Enter email description"
              className="h-10 resize-none"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}