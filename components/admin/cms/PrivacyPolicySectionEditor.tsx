"use client"

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/dashboard/RichTextEditor';

interface PrivacyPolicyProps {
  value?: {
    content?: string;
  };
  onChange: (value: PrivacyPolicyProps['value']) => void;
}

export default function PrivacyPolicySectionEditor({ value = { content: '' }, onChange }: PrivacyPolicyProps) {

  return (
    <Card className=" p-6 border-[#E8DCC8]">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Privacy Policy Content</Label>
        <p className="text-xs text-[#646464] mb-4">Use the rich text editor below to format your privacy policy.</p>
      </div>
      <div>
        <RichTextEditor
          value={value.content || ''}
          onChange={(content) => onChange({ content })}
      
        />
      </div>
    </Card>
  );
}