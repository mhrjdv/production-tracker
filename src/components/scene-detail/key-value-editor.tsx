"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface KeyValueEditorProps {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export function KeyValueEditor({ value, onChange }: KeyValueEditorProps) {
  const entries = Object.entries(value);

  const updateKey = (oldKey: string, newKey: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  };

  const updateValue = (key: string, newVal: string) => {
    onChange({ ...value, [key]: newVal });
  };

  const removeEntry = (key: string) => {
    const { [key]: _, ...rest } = value;
    onChange(rest);
  };

  const addEntry = () => {
    const key = `field_${entries.length + 1}`;
    onChange({ ...value, [key]: "" });
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center gap-2">
          <Input
            value={key}
            onChange={(e) => updateKey(key, e.target.value)}
            className="h-8 text-xs w-1/3"
            placeholder="Key"
          />
          <Input
            value={val}
            onChange={(e) => updateValue(key, e.target.value)}
            className="h-8 text-xs flex-1"
            placeholder="Value"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeEntry(key)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addEntry}
        className="h-7 gap-1 text-xs"
      >
        <Plus className="h-3 w-3" /> Add field
      </Button>
    </div>
  );
}
