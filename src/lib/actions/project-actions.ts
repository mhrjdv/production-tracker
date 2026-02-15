"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

// ─── Project Actions ─────────────────────────────────────────

export async function createProject(data: {
    name: string;
    description?: string;
    genre?: string;
    identity?: Record<string, unknown>;
    characters?: Array<{
        name: string;
        role: string;
        coreIdentity?: string;
    }>;
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const project = await prisma.project.create({
        data: {
            name: data.name,
            description: data.description,
            genre: data.genre,
            user: { connect: { id: session.user.id } },
            ...(data.identity && {
                identity: {
                    create: {
                        data: data.identity as Prisma.InputJsonValue,
                    },
                },
            }),
            ...(data.characters &&
                data.characters.length > 0 && {
                characters: {
                    create: data.characters.map((c) => ({
                        name: c.name,
                        role: c.role,
                        coreIdentity: c.coreIdentity,
                    })),
                },
            }),
        },
    });

    revalidatePath("/");
    redirect(`/projects/${project.id}`);
}

export async function deleteProject(projectId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.project.delete({
        where: {
            id: projectId,
            userId: session.user.id,
        },
    });

    revalidatePath("/");
    redirect("/");
}

export async function getUserProjects() {
    const session = await auth();
    if (!session?.user?.id) return [];

    return prisma.project.findMany({
        where: { userId: session.user.id },
        include: {
            _count: {
                select: {
                    scenes: true,
                    characters: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });
}
