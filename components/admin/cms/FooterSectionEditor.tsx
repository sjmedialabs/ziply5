"use client";

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageUploader from './ImageUploader';
import DynamicList from './DynamicList';

type FooterLink = { label: string; url: string; };
type FooterSectionData = { title?: string; links?: FooterLink[] };

interface FooterProps {
  value?: {
    logo?: string;
    fromDay?: string;
    toDay?: string;
    fromTime?: string;
    toTime?: string;
    phone?: string;
    email?: string;
    social1?: string;
    social2?: string;
    social3?: string;
    social4?: string;
    section1?: FooterSectionData;
    section2?: FooterSectionData;
    section3?: FooterSectionData;
    copyrightMsg?: string;
  };
  onChange: (value: any) => void;
}

export default function FooterSectionEditor({ value = {}, onChange }: FooterProps) {
  const updateField = (field: string, val: any) => {
    onChange({ ...value, [field]: val });
  };

  const renderLinkSection = (sectionKey: 'section1' | 'section2' | 'section3', label: string) => {
    const section = value[sectionKey] || { title: '', links: [] };
    const links = section.links || [];

    const updateSectionTitle = (title: string) => {
      updateField(sectionKey, { ...section, title });
    };

    const updateLinks = (newLinks: FooterLink[]) => {
      updateField(sectionKey, { ...section, links: newLinks.slice(0, 8) });
    };

    return (
      <div className="space-y-4 p-4 border border-[#E8DCC8] rounded-xl bg-gray-50">
        <Label className="font-semibold text-sm text-[#4A1D1F]">{label}</Label>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Main Title</Label>
          <Input value={section.title || ''} onChange={(e) => updateSectionTitle(e.target.value)} placeholder="Enter section title" className="h-8 text-sm bg-white" />
        </div>
        <div>
          <DynamicList
            title="Links (Max 8)"
            items={links}
            onChange={updateLinks}
            renderItem={(item: FooterLink, index: number) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#646464] block mb-1">URL Title</Label>
                  <Input value={item.label || ''} onChange={(e) => { const newLinks = [...links]; newLinks[index] = { ...newLinks[index], label: e.target.value }; updateLinks(newLinks); }} placeholder="e.g. Privacy Policy" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-[#646464] block mb-1">URL</Label>
                  <Input value={item.url || ''} onChange={(e) => { const newLinks = [...links]; newLinks[index] = { ...newLinks[index], url: e.target.value }; updateLinks(newLinks); }} placeholder="e.g. /privacy-policy" className="h-8 text-sm" />
                </div>
              </div>
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6 border-[#E8DCC8] space-y-6">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-4 block">Footer Settings</Label>
        
        <div className="space-y-6">
          <div>
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Footer Logo</Label>
            <ImageUploader 
              value={value.logo || ''} 
              onChange={(image) => updateField('logo', image)} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#E8DCC8] pt-4">
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">From Day</Label>
              <Input
                value={value.fromDay || ''}
                onChange={(e) => updateField('fromDay', e.target.value)}
                placeholder="e.g. Monday"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">To Day</Label>
              <Input
                value={value.toDay || ''}
                onChange={(e) => updateField('toDay', e.target.value)}
                placeholder="e.g. Sunday"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">From Time</Label>
              <Input
                value={value.fromTime || ''}
                onChange={(e) => updateField('fromTime', e.target.value)}
                placeholder="e.g. 10:00am"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">To Time</Label>
              <Input
                value={value.toTime || ''}
                onChange={(e) => updateField('toTime', e.target.value)}
                placeholder="e.g. 23:00pm"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#E8DCC8] pt-4">
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Contact Number</Label>
              <Input
                value={value.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="Enter phone number"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Email Address</Label>
              <Input
                value={value.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="Enter email address"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#E8DCC8] pt-4">
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Social Media Link 1 (LinkedIn)</Label>
              <Input value={value.social1 || ''} onChange={(e) => updateField('social1', e.target.value)} placeholder="Enter URL" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Social Media Link 2 (Twitter)</Label>
              <Input value={value.social2 || ''} onChange={(e) => updateField('social2', e.target.value)} placeholder="Enter URL" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Social Media Link 3 (Facebook)</Label>
              <Input value={value.social3 || ''} onChange={(e) => updateField('social3', e.target.value)} placeholder="Enter URL" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Social Media Link 4 (YouTube)</Label>
              <Input value={value.social4 || ''} onChange={(e) => updateField('social4', e.target.value)} placeholder="Enter URL" className="h-8 text-sm" />
            </div>
          </div>

          <div className="border-t border-[#E8DCC8] pt-4 mt-2">
            <Label className="text-xs font-semibold text-[#646464] mb-1 block">Copyright Message</Label>
            <Input 
              value={value.copyrightMsg || ''} 
              onChange={(e) => updateField('copyrightMsg', e.target.value)} 
              placeholder="e.g. 2025 ziply5 All Rights Reserved" 
              className="h-8 text-sm bg-white" 
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#E8DCC8] pt-6 space-y-6">
        <Label className="text-sm font-semibold text-[#4A1D1F] block">Footer Link Sections</Label>
        {renderLinkSection('section1', 'Section 1 (e.g. About)')}
        {renderLinkSection('section2', 'Section 2 (e.g. Menu)')}
        {renderLinkSection('section3', 'Section 3 (e.g. Quick Links)')}
      </div>
    </Card>
  );
}