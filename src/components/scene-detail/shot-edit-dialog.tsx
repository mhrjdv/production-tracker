"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { updateShotAction, type UpdateShotInput } from "@/lib/shot-server-actions";
import type { ShotItem } from "./types";

// ─── Props ─────────────────────────────────────────────────

interface ShotEditDialogProps {
  shot: ShotItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ─────────────────────────────────────────────

export function ShotEditDialog({
  shot,
  open,
  onOpenChange,
}: ShotEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [angle, setAngle] = useState("");
  const [framing, setFraming] = useState("");
  const [movement, setMovement] = useState("");
  const [lensNotes, setLensNotes] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (next && shot) {
      setDescription(shot.description);
      setAngle(shot.angle ?? "");
      setFraming(shot.framing ?? "");
      setMovement(shot.movement ?? "");
      setLensNotes(shot.lensNotes ?? "");
      setFormError(null);
    }
    onOpenChange(next);
  };

  const handleSave = () => {
    if (!shot || !description.trim()) return;

    startTransition(async () => {
      try {
        setFormError(null);
        const input: UpdateShotInput = {
          description: description.trim(),
          angle: angle.trim() || null,
          framing: framing.trim() || null,
          movement: movement.trim() || null,
          lensNotes: lensNotes.trim() || null,
        };
        await updateShotAction(shot.id, input);
        onOpenChange(false);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to update shot",
        );
      }
    });
  };

  if (!shot) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {shot.shotCode}</DialogTitle>
          <DialogDescription>
            Update shot details and camera direction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What happens in this shot..."
            />
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-1.5">
              <Label>Framing</Label>
              <Input
                value={framing}
                onChange={(e) => setFraming(e.target.value)}
                placeholder="e.g. Close-up"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Angle</Label>
              <Input
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="e.g. Low angle"
              />
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-1.5">
              <Label>Movement</Label>
              <Input
                value={movement}
                onChange={(e) => setMovement(e.target.value)}
                placeholder="e.g. Dolly in"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lens Notes</Label>
              <Input
                value={lensNotes}
                onChange={(e) => setLensNotes(e.target.value)}
                placeholder="e.g. 85mm f/1.4"
              />
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!description.trim() || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
