"use client"

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploaderProps {
  value?: string;
  onChange: (image: string) => void;
  altText?: string;
  onAltChange?: (alt: string) => void;
}

export default function ImageUploader({ 
  value, 
  onChange, 
  altText = '', 
  onAltChange,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState(value || '');
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeImage = () => {
    setPreview('');
    onChange('');
  };

  return (
    <Card className="w-48 p-3 space-y-0">
      {/* <Label className="text-xs font-semibold uppercase text-[#646464] block text-center">Image</Label> */}
      <div className="space-y-2">
        {preview ? (
          <div className="relative group">
            <img 
              src={preview} 
              
              className="w-full h-24 rounded object-cover shadow-sm" 
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute -top-2 -right-2 cursor-pointer h-6 w-6 p-0 bg-white rounded-full shadow-md hover:bg-red-50"
              onClick={removeImage}
            >
              <X className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        ) : (
          <div
            className={`h-24 rounded-lg border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center text-sm p-2 ${
              dragActive 
                ? 'border-[#7B3010] bg-[#FFFBF3]' 
                : 'border-[#E8DCC8] hover:border-[#7B3010]'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileRef.current?.click()}
          >
            {dragActive ? (
              <Upload className="h-5 w-5 text-[#7B3010] animate-bounce mb-1" />
            ) : (
              <ImageIcon className="h-5 w-5 text-[#646464] mb-1" />
            )}
            <span className="text-xs text-[#646464]">Drop or click</span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      {/* {onAltChange && (
        <div className="space-y-1 pt-1 border-t">
          <Label className="text-xs text-[#646464]">Alt</Label>
          <input
            type="text"
            value={altText}
            onChange={(e) => onAltChange(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded border border-[#D9D9D1] focus:ring-1 focus:ring-[#FFC222] focus:border-transparent"
            placeholder="Description for accessibility"
          />
        </div>
      )} */}
    </Card>
  );
}

