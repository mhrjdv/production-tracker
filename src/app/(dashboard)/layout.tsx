import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { CommandPaletteWrapper } from "@/components/command-palette-wrapper";
import { Film } from "lucide-react";

/**
 * Server component that fetches auth + project data
 * and renders the sidebar + command palette.
 */
async function DashboardData() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [projects, scenes] = await Promise.all([
    prisma.project.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.scene.findMany({
      where: { project: { userId: session.user.id } },
      select: { id: true, sceneId: true, storyBeat: true, projectId: true },
      orderBy: { sortOrder: "asc" },
      take: 50,
    }),
  ]);

  return (
    <>
      <AppSidebar projects={projects} />
      <CommandPaletteWrapper projects={projects} scenes={scenes} />
    </>
  );
}

function SidebarSkeleton() {
  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-sidebar p-4 gap-4">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <DashboardData />
      </Suspense>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4 py-2 md:hidden">
          <SidebarTrigger />
          <Film className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Lazer</span>
        </header>
        <div className="flex-1 px-4 py-6 md:px-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
