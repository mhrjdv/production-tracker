import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineClient } from "@/components/timeline-client";

function TimelineFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-10 w-80" />
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="shrink-0 w-[140px]">
            <CardContent className="py-3 px-3">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function TimelineContent({ projectId }: { projectId: string }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const scenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      sceneId: true,
      storyBeat: true,
      act: true,
      actTitle: true,
      macroScene: true,
      emotionalTone: true,
      sourceText: true,
      keyframeUrl: true,
      sortOrder: true,
      assets: {
        orderBy: [{ selected: "desc" }, { createdAt: "desc" }],
        select: {
          assetType: true,
          status: true,
          selected: true,
          platformLabel: true,
          versionNumber: true,
          thumbnailUrl: true,
          outputUrl: true,
        },
      },
    },
  });

  return (
    <TimelineClient
      projectId={project.id}
      projectName={project.name}
      scenes={scenes}
    />
  );
}

export default async function TimelinePage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await props.params;

  return (
    <Suspense fallback={<TimelineFallback />}>
      <TimelineContent projectId={projectId} />
    </Suspense>
  );
}
