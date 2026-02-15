"use client";

import { type ReactNode, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Pencil, Plus, X } from "lucide-react";

interface EditableCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  editContent: (reset: () => void) => ReactNode;
  onSave: () => Promise<void>;
  isEmpty?: boolean;
}

export function EditableCard({
  title,
  icon,
  children,
  editContent,
  onSave,
  isEmpty = false,
}: EditableCardProps) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await onSave();
      setEditing(false);
    });
  };

  const handleCancel = () => {
    setEditing(false);
  };

  if (isEmpty && !editing) {
    return (
      <Button
        variant="ghost"
        className="w-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground h-auto py-3 gap-2"
        onClick={() => setEditing(true)}
      >
        <Plus className="h-4 w-4" />
        Add {title}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon} {title}
        </CardTitle>
        {editing ? (
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isPending}
              className="h-7 gap-1 px-2 text-xs"
            >
              <X className="h-3 w-3" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="h-7 gap-1 px-2 text-xs"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? editContent(handleCancel) : children}
      </CardContent>
    </Card>
  );
}
