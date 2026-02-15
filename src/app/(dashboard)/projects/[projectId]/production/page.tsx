import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductionClient } from "@/components/production-client";

function ProductionFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-10 w-64" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

async function ProductionContent({ projectId }: { projectId: string }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [scenes, characters] = await Promise.all([
    prisma.scene.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: {
        characters: {
          include: {
            character: { select: { id: true, name: true } },
          },
        },
        assets: {
          where: { assetType: "IMAGE", selected: true },
          take: 1,
          select: { thumbnailUrl: true, outputUrl: true },
        },
      },
    }),
    prisma.character.findMany({
      where: { projectId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const scenesForClient = scenes.map((s) => ({
    id: s.id,
    sceneId: s.sceneId,
    sourceText: s.sourceText,
    reason: s.reason,
    act: s.act,
    actTitle: s.actTitle,
    macroScene: s.macroScene,
    storyBeat: s.storyBeat,
    narrativePurpose: s.narrativePurpose,
    emotionalTone: s.emotionalTone,
    setting: s.setting as Record<string, string> | null,
    camera: s.camera as Record<string, string> | null,
    actions: s.actions,
    keyframeUrl: s.keyframeUrl,
    sortOrder: s.sortOrder,
    characterNames: s.characters.map((sc) => sc.character.name),
    thumbnailUrl: s.assets[0]?.thumbnailUrl ?? s.assets[0]?.outputUrl ?? null,
  }));

  return (
    <ProductionClient
      projectId={project.id}
      projectName={project.name}
      scenes={scenesForClient}
      characters={characters}
    />
  );
}

export default async function ProductionPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await props.params;

  return (
    <Suspense fallback={<ProductionFallback />}>
      <ProductionContent projectId={projectId} />
    </Suspense>
  );
}
