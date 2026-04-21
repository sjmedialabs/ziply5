"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface ItemActions {
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  remove: (index: number) => void;
}

interface DynamicListProps<T = any> {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, actions: ItemActions) => React.ReactNode;
  emptyMessage?: string;
}

export default function DynamicList<T>({
  title,
  items = [],
  onChange,
  renderItem,
  emptyMessage = 'No items. Add one above.',
}: DynamicListProps<T>) {
  const addItem = () => onChange([...items, {} as T]);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [items[index], items[index - 1]];
    onChange(newItems);
  };

  const moveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [items[index + 1], items[index]];
    onChange(newItems);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <Card className="space-y-3 p-4 border-[#E8DCC8]">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#4A1D1F] text-sm uppercase tracking-wide">
          {title}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="h-7 px-3 text-xs cursor-pointer border-[#E8DCC8] hover:bg-[#FFFBF3]"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-xs text-[#646464] border-2 border-dashed border-[#E8DCC8] rounded-lg">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-auto">
          {items.map((item, index) => (
            <Card key={index} className="p-4 relative border-[#E8DCC8]">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 text-xs text-[#646464] font-mono">
                  <span className="font-bold">#{index + 1}</span>
                  <GripVertical className="h-3 w-3 cursor-grab opacity-50" />
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 cursor-pointer w-6 p-0 hover:bg-[#FFFBF3]"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 cursor-pointer w-6 p-0 hover:bg-[#FFFBF3]"
                    onClick={() => moveDown(index)}
                    disabled={index === items.length - 1}
                  >
                    <ChevronDown className="h-3 cursor-pointer w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 cursor-pointer w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                {renderItem(item, index, { moveUp, moveDown, remove })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}

