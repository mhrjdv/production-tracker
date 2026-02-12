"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { SceneFormDialog } from "@/components/scene-form-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { deleteScene } from "@/lib/actions";

interface SceneActionsProps {
    projectId: string;
    scene: {
        id: string;
        sceneId: string;
        sourceText: string;
        act: number;
        actTitle: string;
        macroScene: string;
        storyBeat: string;
        reason: string;
        narrativePurpose: string | null;
        emotionalTone: string | null;
    };
}

export function SceneActions({ projectId, scene }: SceneActionsProps) {
    const router = useRouter();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    return (
        <>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditOpen(true)}
                >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
            </div>

            <SceneFormDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                projectId={projectId}
                scene={scene}
            />

            <DeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={`Delete ${scene.sceneId}?`}
                description={`This will permanently delete scene "${scene.storyBeat}". This action cannot be undone.`}
                onDelete={async () => {
                    await deleteScene(scene.id);
                    router.push(`/projects/${projectId}/production`);
                }}
            />
        </>
    );
}
