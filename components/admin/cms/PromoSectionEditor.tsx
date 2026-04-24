"use client"

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DynamicList from './DynamicList';

interface PromoItem {
  code: string;
  discountType: 'percentage' | 'flat' | 'free_shipping';
  value: number;
  minOrderAmount: number;
  usageLimitGlobal?: number;
  usageLimitPerUser?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  firstOrderOnly?: boolean;
}

interface PromoSectionProps {
  value?: PromoItem[];
  onChange: (value: PromoItem[]) => void;
}

export default function PromoSectionEditor({ value = [], onChange }: PromoSectionProps) {
  const items = Array.isArray(value) ? value : [];
  const [coupons, setCoupons] = useState([]);

  const saveCoupon = async (couponData: any) => {
    await fetch('/api/v1/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(couponData)
    });
  };

  const renderItem = (item: PromoItem, index: number) => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold text-[#4A1D1F]">Promo Setup</Label>
        <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-[#646464]">Active</Label>
          <input
            type="checkbox"
            checked={item.isActive !== false} // Default to true if undefined
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].isActive = e.target.checked;
              onChange(newItems);
            }}
            className="accent-[#7B3010] cursor-pointer w-4 h-4"
            title="Toggle active status"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-[#646464]">First Order Only</Label>
          <input
            type="checkbox"
            checked={item.firstOrderOnly || false}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].firstOrderOnly = e.target.checked;
              onChange(newItems);
            }}
            className="accent-[#7B3010] cursor-pointer w-4 h-4"
            title="Limit to new users only"
          />
        </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Promo Code</Label>
          <Input
            value={item.code || ''}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].code = e.target.value.toUpperCase().replace(/\s+/g, '');
              onChange(newItems);
            }}
            placeholder="Enter promo code (e.g., SAVE20)"
            className="h-8 text-sm font-normal focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Discount Type</Label>
          <select
            value={item.discountType || 'percentage'}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].discountType = e.target.value as any;
              onChange(newItems);
            }}
            className="w-full h-8 rounded-md border border-[#D9D9D1] bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="flat">Flat Amount (Rs)</option>
            <option value="free_shipping">Free Shipping</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Discount Value</Label>
          <Input
            type="number"
            value={item.value || ''}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].value = Number(e.target.value);
              onChange(newItems);
            }}
            placeholder="Enter discount value"
            className="h-8 text-sm"
            disabled={item.discountType === 'free_shipping'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Min Order Amount (Rs)</Label>
          <Input
            type="number"
            value={item.minOrderAmount || ''}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].minOrderAmount = Number(e.target.value);
              onChange(newItems);
            }}
            placeholder="Enter minimum order amount"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Global Usage Limit</Label>
          <Input
            type="number"
            value={item.usageLimitGlobal || ''}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].usageLimitGlobal = Number(e.target.value);
              onChange(newItems);
            }}
            placeholder="Enter global usage limit (empty = unlimited)"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">Per User Limit</Label>
          <Input
            type="number"
            value={item.usageLimitPerUser || ''}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].usageLimitPerUser = Number(e.target.value);
              onChange(newItems);
            }}
            placeholder="Enter per user usage limit"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-gray-500 block mb-1">Start Date</Label>
          <Input
            type="datetime-local"
            value={item.startDate || ''}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].startDate = e.target.value;
              onChange(newItems);
            }}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-[#646464] block mb-1">End Date</Label>
          <Input
            type="datetime-local"
            value={item.endDate || ''}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].endDate = e.target.value;
              onChange(newItems);
            }}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-[#E8DCC8]">
        <button
          type="button"
          onClick={() => saveCoupon({
            code: item.code,
            discountType: item.discountType,
            discountValue: item.value,
            minOrderAmount: item.minOrderAmount,
            usageLimitTotal: item.usageLimitGlobal,
            usageLimitPerUser: item.usageLimitPerUser,
            active: item.isActive,
            firstOrderOnly: item.firstOrderOnly || false,
            startsAt: item.startDate ? new Date(item.startDate).toISOString() : null,
            endsAt: item.endDate ? new Date(item.endDate).toISOString() : null
          })}
          className="bg-orange-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-orange-600 transition-colors"
        >
          Save Coupon
        </button>
      </div>
    </div>
  );

  return (
    <DynamicList
      title="Promo Codes & Coupons"
      items={items}
      onChange={onChange}
      renderItem={renderItem}
      emptyMessage="No promo codes added. Click Add to create one."
    />
  );
}