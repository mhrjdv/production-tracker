"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface StringListEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function StringListEditor({
  value,
  onChange,
  placeholder = "New item",
}: StringListEditorProps) {
  const [newItem, setNewItem] = useState("");

  const updateItem = (index: number, text: string) => {
    onChange(value.map((item, i) => (i === index ? text : item)));
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setNewItem("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeItem(i)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-xs flex-1"
          placeholder={placeholder}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={!newItem.trim()}
          className="h-8 gap-1 text-xs shrink-0"
        >
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
    </div>
  );
}
