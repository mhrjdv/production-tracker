import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Film, Users, Layers, Sparkles } from "lucide-react";
import DashboardLoading from "./loading";

async function DashboardContent() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const projects = await prisma.project.findMany({
        where: { userId: session.user.id },
        include: {
            _count: {
                select: {
                    scenes: true,
                    characters: true,
                },
            },
            scenes: {
                where: { keyframeUrl: { not: null } },
                select: { id: true },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back, {session.user.name?.split(" ")[0] ?? "there"}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {projects.length === 0
                            ? "Create your first project to get started"
                            : `You have ${projects.length} project${projects.length === 1 ? "" : "s"}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/projects/upload-script">
                        <Button variant="outline" className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            Upload Script
                        </Button>
                    </Link>
                    <Link href="/projects/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Project
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Projects Grid */}
            {projects.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Film className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                        <p className="text-muted-foreground text-center max-w-sm mb-6">
                            Create your first production project to start tracking scenes,
                            characters, and your creative vision.
                        </p>
                        <Link href="/projects/new">
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Create Your First Project
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => {
                        const totalScenes = project._count.scenes;
                        const completedScenes = project.scenes.length;
                        const progress =
                            totalScenes > 0
                                ? Math.round((completedScenes / totalScenes) * 100)
                                : 0;

                        return (
                            <Link key={project.id} href={`/projects/${project.id}`}>
                                <Card className="group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer h-full">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                                                {project.name}
                                            </CardTitle>
                                            <Badge
                                                variant={
                                                    project.status === "active"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                                className="shrink-0"
                                            >
                                                {project.status}
                                            </Badge>
                                        </div>
                                        {project.description && (
                                            <CardDescription className="line-clamp-2">
                                                {project.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Layers className="h-3.5 w-3.5" />
                                                {totalScenes} scenes
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5" />
                                                {project._count.characters} characters
                                            </div>
                                        </div>
                                        {totalScenes > 0 && (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">
                                                        Keyframes
                                                    </span>
                                                    <span className="font-medium">{progress}%</span>
                                                </div>
                                                <Progress value={progress} className="h-1.5" />
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <p className="text-xs text-muted-foreground">
                                            Updated{" "}
                                            {new Date(project.updatedAt).toLocaleDateString(
                                                "en-US",
                                                {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                }
                                            )}
                                        </p>
                                    </CardFooter>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardContent />
        </Suspense>
    );
}
