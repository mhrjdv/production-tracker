// ============================================================
// Server Action: Save AI-generated project data to database
// Called after user reviews and approves generated data
// ============================================================

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { PipelineResult } from "@/lib/ai-pipeline";

interface SaveProjectInput {
    projectName: string;
    projectDescription: string;
    genre: string;
    result: PipelineResult;
}

export async function saveGeneratedProject(input: SaveProjectInput) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const { projectName, projectDescription, genre, result } = input;

    // Create the project with all related data in a single nested create
    const project = await prisma.project.create({
        data: {
            name: projectName,
            description: projectDescription,
            genre: genre,
            userId: session.user.id,

            // Create scenes — map AI output to Prisma Scene model fields
            scenes: {
                create: result.scenes.map((scene, index) => {
                    // Find matching description for this scene
                    const desc = result.sceneDescriptions.find(
                        (d) => d.scene_id === scene.scene_id
                    );

                    return {
                        sceneId: scene.scene_id,
                        sourceText: scene.source_text,
                        reason: scene.reason,
                        act: scene.act,
                        actTitle: scene.act_title,
                        macroScene: scene.macro_scene,
                        storyBeat: scene.story_beat,
                        sortOrder: index,
                        narrativePurpose: desc?.narrative_purpose ?? null,
                        emotionalTone: desc?.emotional_tone ?? null,
                        setting: (desc?.setting ?? undefined) as any,
                        camera: (desc?.camera_intent ?? undefined) as any,
                        actions: desc?.actions ?? [],
                        visualMotifs: desc?.visual_motifs ?? [],
                        constraints: desc?.constraints ?? [],
                        charactersPresent: (desc?.characters_present ?? []).map(
                            (c) => typeof c === "string" ? c : (c.name || c.character || c.behavior)
                        ),
                    };
                }),
            },

            // Create characters — map AI output to Prisma Character model fields
            characters: {
                create: result.characters.map((char) => ({
                    name: char.name,
                    role: char.role,
                    coreIdentity: char.core_identity,
                    visualCues: char.visual_cues
                        ? Object.entries(char.visual_cues).map(
                            ([k, v]) => `${k}: ${v}`
                        )
                        : [],
                    bodyLanguage: char.visual_cues?.body_language
                        ? [char.visual_cues.body_language]
                        : [],
                })),
            },

            // Create film identity — stored as JSON blob
            identity: {
                create: {
                    data: result.filmIdentity as any,
                },
            },
        },
        include: {
            scenes: true,
            characters: true,
            identity: true,
        },
    });

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath(`/projects/${project.id}`);

    return { projectId: project.id };
}
