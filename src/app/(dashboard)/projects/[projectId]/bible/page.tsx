import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BibleClient } from "@/components/bible-client";

function BibleFallback() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-64" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-1">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-5 w-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

async function BibleContent({ projectId }: { projectId: string }) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
        select: { id: true, name: true },
    });
    if (!project) notFound();

    const identity = await prisma.filmIdentity.findUnique({
        where: { projectId },
    });

    const filmData = (identity?.data as Record<string, unknown>) ?? {};
    const filmIdentity =
        (filmData.film_identity as Record<string, string>) ?? {};
    const structure = (filmData.structure as Record<string, unknown>) ?? {};

    return (
        <BibleClient
            projectId={project.id}
            projectName={project.name}
            hasIdentity={!!identity}
            filmIdentity={filmIdentity}
            filmData={filmData}
            structure={structure}
        />
    );
}

export default async function BiblePage(props: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await props.params;

    return (
        <Suspense fallback={<BibleFallback />}>
            <BibleContent projectId={projectId} />
        </Suspense>
    );
}
