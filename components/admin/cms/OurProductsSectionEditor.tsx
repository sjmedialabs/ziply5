"use client"

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DynamicList from './DynamicList';
import ImageUploader from './ImageUploader';

interface ProductItem {
  name: string;
  image: string;
  description: string;
  alt: string;
}

interface OurProductsProps {
  value?: {
    title: string;
    items: ProductItem[];
  };
  onChange: (value: OurProductsProps['value']) => void;
}

export default function OurProductsSectionEditor({ value = { title: '', items: [] }, onChange }: OurProductsProps) {
  const [localValue, setLocalValue] = useState(value);

  const updateTitle = (title: string) => {
    const newValue = { ...localValue, title };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const updateItems = (items: ProductItem[]) => {
    const newValue = { ...localValue, items };
    setLocalValue(newValue);
    onChange(newValue);
  };

  const renderItem = (item: ProductItem, index: number, actions: any) => (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-2 gap-4 items-start">
        <div>
          <Label className="text-xs font-semibold text-[#646464] mb-1 block">Product Image</Label>
          <ImageUploader 
            value={item.image}
            onChange={(image) => {
              const newItems = [...localValue.items];
              newItems[index].image = image;
              newItems[index].alt = image ? item.name || `Product ${index + 1}` : '';
              updateItems(newItems);
            }}
            altText={item.alt}
            onAltChange={(alt) => {
              const newItems = [...localValue.items];
              newItems[index].alt = alt;
              updateItems(newItems);
            }}
          />
        </div>
        <div>
          <div className="">
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Name</Label>
              <Input
                value={item.name}
                onChange={(e) => {
                  const newItems = [...localValue.items];
                  newItems[index].name = e.target.value;
                  if (!newItems[index].alt) newItems[index].alt = e.target.value;
                  updateItems(newItems);
                }}
                className="h-8 text-sm"
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#646464] mb-1 block">Description</Label>
              <Textarea
                value={item.description}
                onChange={(e) => {
                  const newItems = [...localValue.items];
                  newItems[index].description = e.target.value;
                  updateItems(newItems);
                }}
                className="h-16 text-sm resize-none"
                placeholder="Enter product escription"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="space-y-0 p-6 border-[#E8DCC8]">
      <div>
        <Label className="text-sm font-semibold text-[#4A1D1F] mb-2 block">Our Products Section</Label>
        <p className="text-xs text-[#646464] ">Add products with images and descriptions.</p>
      </div>
      
      <div>
        <Label className="text-xs font-semibold text-[#646464] mb-1 block">Section Title</Label>
        <Input
          value={localValue.title}
          onChange={(e) => updateTitle(e.target.value)}
          className="max-w-md h-8 text-sm"
          placeholder="Enter Section Title"
        />
      </div>

      <DynamicList
        title="Product Items"
        items={localValue.items}
        onChange={updateItems}
        renderItem={renderItem}
        emptyMessage="No products. Add products to showcase."
      />
    </Card>
  );
}

