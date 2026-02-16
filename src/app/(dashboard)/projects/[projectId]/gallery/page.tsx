import { Suspense } from "react";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { GalleryClient } from "@/components/gallery-client";

function GalleryFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-lg" />
        ))}
      </div>
    </div>
  );
}

async function GalleryContent({ projectId }: { projectId: string }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const assets = await prisma.sceneAssetVersion.findMany({
    where: { scene: { projectId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sceneId: true,
      shotId: true,
      promptPackageId: true,
      parentVersionId: true,
      platformId: true,
      assetType: true,
      status: true,
      platformKey: true,
      platformLabel: true,
      versionNumber: true,
      title: true,
      prompt: true,
      negativePrompt: true,
      modelName: true,
      sourceUrl: true,
      externalAssetId: true,
      outputUrl: true,
      thumbnailUrl: true,
      costEstimateUsd: true,
      generationSeconds: true,
      queueWaitSeconds: true,
      compareGroup: true,
      metadata: true,
      provenance: true,
      rightsState: true,
      selected: true,
      tags: true,
      notes: true,
      createdAt: true,
      createdBy: { select: { name: true } },
      scene: {
        select: {
          sceneId: true,
          storyBeat: true,
          act: true,
          macroScene: true,
        },
      },
    },
  });

  const assetsForClient = assets.map((a) => ({
    id: a.id,
    sceneDbId: a.sceneId,
    sceneId: a.scene.sceneId,
    storyBeat: a.scene.storyBeat,
    act: a.scene.act,
    macroScene: a.scene.macroScene,
    shotId: a.shotId,
    promptPackageId: a.promptPackageId,
    parentVersionId: a.parentVersionId,
    platformId: a.platformId,
    assetType: a.assetType,
    status: a.status,
    platformKey: a.platformKey,
    platformLabel: a.platformLabel,
    versionNumber: a.versionNumber,
    title: a.title,
    prompt: a.prompt,
    negativePrompt: a.negativePrompt,
    modelName: a.modelName,
    sourceUrl: a.sourceUrl,
    externalAssetId: a.externalAssetId,
    outputUrl: a.outputUrl,
    thumbnailUrl: a.thumbnailUrl,
    costEstimateUsd: a.costEstimateUsd ? Number(a.costEstimateUsd) : null,
    generationSeconds: a.generationSeconds,
    queueWaitSeconds: a.queueWaitSeconds,
    compareGroup: a.compareGroup,
    metadata: a.metadata as Record<string, unknown> | null,
    provenance: a.provenance as Record<string, unknown> | null,
    rightsState: a.rightsState,
    selected: a.selected,
    tags: a.tags,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    createdByName: a.createdBy?.name ?? null,
  }));

  return (
    <GalleryClient
      projectId={project.id}
      projectName={project.name}
      assets={assetsForClient}
    />
  );
}

export default async function GalleryPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await props.params;

  return (
    <Suspense fallback={<GalleryFallback />}>
      <GalleryContent projectId={projectId} />
    </Suspense>
  );
}
