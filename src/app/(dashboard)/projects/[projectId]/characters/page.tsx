import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CharactersClient } from "@/components/characters-client";

function CharactersFallback() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-64" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardHeader>
                            <div className="flex items-start gap-4">
                                <Skeleton className="h-14 w-14 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-12 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

async function CharactersContent({ projectId }: { projectId: string }) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
        select: { id: true, name: true },
    });
    if (!project) notFound();

    const characters = await prisma.character.findMany({
        where: { projectId },
        orderBy: { name: "asc" },
    });

    return (
        <CharactersClient
            projectId={project.id}
            projectName={project.name}
            characters={characters}
        />
    );
}

export default async function CharactersPage(props: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await props.params;

    return (
        <Suspense fallback={<CharactersFallback />}>
            <CharactersContent projectId={projectId} />
        </Suspense>
    );
}
