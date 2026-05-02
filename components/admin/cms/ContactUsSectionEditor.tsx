"use client";

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ImageUploader from './ImageUploader';

interface ContactUsProps {
  value?: {
    title?: string;
    description?: string;
    bgImage?: string;
    mainTitle?: string;
    mainDescription?: string;
    address?: string;
    addressDescription?: string;
    addressIcon?: string;
    phone?: string;
    phoneDescription?: string;
    phoneIcon?: string;
    email?: string;
    emailDescription?: string;
    emailIcon?: string;
    formTitle?: string;
    formDescription?: string;
  };
  onChange: (value: any) => void;
}

export default function ContactUsSectionEditor({ value = {}, onChange }: ContactUsProps) {
  const updateField = (field: string, val: string) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Card className="p-6 border-[#E8DCC8] space-y-6">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Contact Us Hero Banner</Label>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Title</Label>
            <Input
              value={value.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Enter banner title"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Description</Label>
            <Textarea
              value={value.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Enter banner description"
              className="min-h-[80px] text-sm resize-y"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Banner Image</Label>
            <ImageUploader
              folder="cms/contact"
              value={value.bgImage || ''}
              onChange={(image) => updateField('bgImage', image)}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#E8DCC8] pt-6 space-y-6">
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Contact Us Details</Label>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Main Title</Label>
          <Input
            value={value.mainTitle || ''}
            onChange={(e) => updateField('mainTitle', e.target.value)}
            placeholder="Enter main title (e.g. Get In Touch)"
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Main Description</Label>
          <Textarea
            value={value.mainDescription || ''}
            onChange={(e) => updateField('mainDescription', e.target.value)}
            placeholder="Enter main description"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-6 border-[#E8DCC8]">
          
          {/* Location Details */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-[#E8DCC8]">
            <Label className="font-semibold text-sm text-[#4A1D1F]">Location Details</Label>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Icon</Label>
              <ImageUploader folder="cms/contact" value={value.addressIcon || ''} onChange={(img) => updateField('addressIcon', img)} />
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Address</Label>
              <Input value={value.address || ''} onChange={(e) => updateField('address', e.target.value)} placeholder="Enter address" />
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Description</Label>
              <Textarea value={value.addressDescription || ''} onChange={(e) => updateField('addressDescription', e.target.value)} placeholder="Enter description" className="h-16 resize-none" />
            </div>
          </div>

          {/* Phone Details */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-[#E8DCC8]">
            <Label className="font-semibold text-sm text-[#4A1D1F]">Phone Details</Label>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Icon</Label>
              <ImageUploader folder="cms/contact" value={value.phoneIcon || ''} onChange={(img) => updateField('phoneIcon', img)} />
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Contact Number</Label>
              <Input value={value.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="Enter contact number" />
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Description</Label>
              <Textarea value={value.phoneDescription || ''} onChange={(e) => updateField('phoneDescription', e.target.value)} placeholder="Enter description" className="h-16 resize-none" />
            </div>
          </div>

          {/* Email Details */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-[#E8DCC8]">
            <Label className="font-semibold text-sm text-[#4A1D1F]">Email Details</Label>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Icon</Label>
              <ImageUploader folder="cms/contact" value={value.emailIcon || ''} onChange={(img) => updateField('emailIcon', img)} />
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Email Address</Label>
              <Input value={value.email || ''} onChange={(e) => updateField('email', e.target.value)} placeholder="Enter email address" />
            </div>
            <div>
              <Label className="text-xs text-[#646464] block mb-1">Description</Label>
              <Textarea value={value.emailDescription || ''} onChange={(e) => updateField('emailDescription', e.target.value)} placeholder="Enter description" className="h-16 resize-none" />
            </div>
          </div>
        </div>

        {/* Contact Form Details */}
        <div className="border-t border-[#E8DCC8] pt-6 space-y-4">
          <Label className="font-semibold text-sm text-[#4A1D1F]">Contact Form Details</Label>
          <div>
            <Label className="text-xs text-[#646464] block mb-1">Form Title</Label>
            <Input
              value={value.formTitle || ''}
              onChange={(e) => updateField('formTitle', e.target.value)}
              placeholder="Enter form title (e.g. Send Us)"
            />
          </div>
          <div>
            <Label className="text-xs text-[#646464] block mb-1">Form Description</Label>
            <Textarea
              value={value.formDescription || ''}
              onChange={(e) => updateField('formDescription', e.target.value)}
              placeholder="Enter form description"
              className="h-16 resize-y"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}