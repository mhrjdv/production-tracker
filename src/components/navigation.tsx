"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Film,
  Users,
  Clock,
  BookOpen,
  FileText,
  Plus,
  LogOut,
  Menu,
  ChevronLeft,
  Plug,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Docs", href: "/docs", icon: FileText },
];

function getProjectNav(projectId: string): NavItem[] {
  return [
    {
      label: "Overview",
      href: `/projects/${projectId}`,
      icon: LayoutDashboard,
    },
    {
      label: "Production",
      href: `/projects/${projectId}/production`,
      icon: Film,
    },
    {
      label: "Characters",
      href: `/projects/${projectId}/characters`,
      icon: Users,
    },
    { label: "Timeline", href: `/projects/${projectId}/timeline`, icon: Clock },
    {
      label: "Creative Bible",
      href: `/projects/${projectId}/bible`,
      icon: BookOpen,
    },
  ];
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-detect projectId from URL: /projects/[projectId]/*
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1];
  const projectNav = projectId ? getProjectNav(projectId) : [];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Film className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-lg">Tracker</span>
        </Link>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-4">
        <NavLinks
          items={mainNav}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
        />

        {projectId && (
          <>
            <div className="mt-6 mb-2 px-3">
              <Link
                href="/"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                All Projects
              </Link>
            </div>
            <div className="mb-2 px-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Project
              </p>
            </div>
            <NavLinks
              items={projectNav}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </>
        )}

        <Separator className="my-4" />

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between gap-2 text-muted-foreground"
          onClick={() => {
            setMobileOpen(false);
            document.dispatchEvent(new CustomEvent("open-command-palette"));
          }}
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search...
          </span>
          <kbd className="pointer-events-none text-[10px] bg-muted rounded px-1.5 py-0.5 font-mono">
            {"\u2318"}K
          </kbd>
        </Button>

        <div className="mt-2">
          <Link href="/projects/new" onClick={() => setMobileOpen(false)}>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-primary">
                {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {session?.user?.name ?? "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4 h-14">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <span className="font-semibold">Tracker</span>
        </Link>
      </header>
    </>
  );
}
