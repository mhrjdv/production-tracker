import { Suspense } from "react";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Film,
  Users,
  Clock,
  BookOpen,
  Layers,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function ProjectOverviewFallback() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function ProjectOverviewContent({ projectId }: { projectId: string }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
    },
    include: {
      _count: {
        select: {
          scenes: true,
          characters: true,
        },
      },
      scenes: {
        select: {
          id: true,
          act: true,
          actTitle: true,
          keyframeUrl: true,
          assets: {
            where: { assetType: "IMAGE", selected: true },
            select: { id: true },
            take: 1,
          },
        },
      },
      characters: {
        select: {
          id: true,
          name: true,
          role: true,
        },
        take: 6,
      },
      identity: {
        select: { data: true },
      },
    },
  });

  if (!project) notFound();

  const totalScenes = project._count.scenes;
  const completedKeyframes = project.scenes.filter((s) => s.keyframeUrl).length;
  const progress =
    totalScenes > 0 ? Math.round((completedKeyframes / totalScenes) * 100) : 0;

  // Group scenes by act for summary (with keyframe tracking)
  const actMap = new Map<
    number,
    { title: string; count: number; withKeyframe: number }
  >();
  for (const scene of project.scenes) {
    const hasKeyframe = !!(scene.keyframeUrl || scene.assets.length > 0);
    const existing = actMap.get(scene.act);
    if (existing) {
      existing.count++;
      if (hasKeyframe) existing.withKeyframe++;
    } else {
      actMap.set(scene.act, {
        title: scene.actTitle,
        count: 1,
        withKeyframe: hasKeyframe ? 1 : 0,
      });
    }
  }

  // Parse film identity data into card sections
  const identityData = (project.identity?.data ?? null) as Record<
    string,
    unknown
  > | null;
  const identityCards = identityData
    ? [
        {
          title: "Film Identity",
          keys: [
            "tone",
            "genre",
            "narrative_stance",
            "emotional_thesis",
            "pacing_philosophy",
            "narrativeStance",
            "emotionalThesis",
            "pacingPhilosophy",
          ],
        },
        {
          title: "World",
          keys: [
            "setting_principle",
            "environmental_hierarchy",
            "temporal_feel",
            "atmospheric_logic",
            "settingPrinciple",
            "environmentalHierarchy",
            "temporalFeel",
            "atmosphericLogic",
          ],
        },
        {
          title: "Cinematography",
          keys: [
            "camera_attitude",
            "lens_philosophy",
            "movement_rules",
            "cameraAttitude",
            "lensPhilosophy",
            "movementRules",
          ],
        },
        {
          title: "Visual Style",
          keys: [
            "animation_philosophy",
            "form_language",
            "texture_strategy",
            "animationPhilosophy",
            "formLanguage",
            "textureStrategy",
          ],
        },
        {
          title: "Lighting",
          keys: [
            "lighting_philosophy",
            "interior_approach",
            "exterior_approach",
            "lightingPhilosophy",
            "interiorApproach",
            "exteriorApproach",
          ],
        },
      ]
        .map((section) => {
          const entries = section.keys
            .map((key) => {
              const val = identityData[key];
              if (!val || (typeof val === "string" && !val.trim())) return null;
              const label = key
                .replace(/([A-Z])/g, " $1")
                .replace(/_/g, " ")
                .replace(/^\w/, (c) => c.toUpperCase());
              return { label, value: String(val) };
            })
            .filter((e): e is { label: string; value: string } => e !== null);
          return entries.length > 0 ? { title: section.title, entries } : null;
        })
        .filter(
          (
            c,
          ): c is {
            title: string;
            entries: { label: string; value: string }[];
          } => c !== null,
        )
    : [];

  const quickLinks = [
    {
      label: "Production",
      href: `/projects/${project.id}/production`,
      icon: Film,
      count: totalScenes,
      desc: "scenes",
    },
    {
      label: "Characters",
      href: `/projects/${project.id}/characters`,
      icon: Users,
      count: project._count.characters,
      desc: "characters",
    },
    {
      label: "Timeline",
      href: `/projects/${project.id}/timeline`,
      icon: Clock,
      count: null,
      desc: "Drag & drop",
    },
    {
      label: "Creative Bible",
      href: `/projects/${project.id}/bible`,
      icon: BookOpen,
      count: null,
      desc: "Film identity",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">{project.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3">
              <Badge
                variant={project.status === "active" ? "default" : "secondary"}
              >
                {project.status}
              </Badge>
              {project.genre && (
                <Badge variant="outline">{project.genre}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scenes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScenes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Characters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project._count.characters}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Acts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actMap.size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Keyframe Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress}%</div>
            <Progress value={progress} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="group hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <link.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {link.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {link.count !== null
                            ? `${link.count} ${link.desc}`
                            : link.desc}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Film Identity Cards */}
      {identityCards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Film Identity</h2>
            <Link
              href={`/projects/${project.id}/bible`}
              className="text-sm text-primary hover:underline"
            >
              Creative Bible →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {identityCards.map((card) => (
              <Card key={card.title} className="bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {card.entries.map((entry) => (
                    <div key={entry.label}>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        {entry.label}
                      </p>
                      <p className="text-xs line-clamp-2">{entry.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Act Breakdown with Progress */}
      {actMap.size > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Act Breakdown</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from(actMap.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([act, info]) => {
                    const actPct =
                      info.count > 0
                        ? Math.round((info.withKeyframe / info.count) * 100)
                        : 0;
                    return (
                      <div key={act} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="tabular-nums">
                              Act {act}
                            </Badge>
                            <span className="text-sm">{info.title}</span>
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {info.withKeyframe}/{info.count} keyframes
                          </span>
                        </div>
                        <Progress value={actPct} className="h-1.5" />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Characters Preview */}
      {project.characters.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Characters</h2>
            <Link
              href={`/projects/${project.id}/characters`}
              className="text-sm text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {project.characters.map((char) => (
              <Card key={char.id} className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {char.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{char.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {char.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State CTAs */}
      {totalScenes === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold mb-1">No scenes yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Start building your production by adding scenes to track.
            </p>
            <Link href={`/projects/${project.id}/production`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Scenes
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function ProjectOverviewPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await props.params;

  return (
    <Suspense fallback={<ProjectOverviewFallback />}>
      <ProjectOverviewContent projectId={projectId} />
    </Suspense>
  );
}
