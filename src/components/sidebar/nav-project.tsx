"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  Users,
  Clock,
  BookOpen,
  GalleryHorizontalEnd,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

function getProjectNav(projectId: string) {
  return [
    { label: "Overview", href: `/projects/${projectId}`, icon: LayoutDashboard },
    { label: "Production", href: `/projects/${projectId}/production`, icon: Film },
    { label: "Characters", href: `/projects/${projectId}/characters`, icon: Users },
    { label: "Timeline", href: `/projects/${projectId}/timeline`, icon: Clock },
    { label: "Creative Bible", href: `/projects/${projectId}/bible`, icon: BookOpen },
    { label: "Gallery", href: `/projects/${projectId}/gallery`, icon: GalleryHorizontalEnd },
  ] as const;
}

export function NavProject() {
  const pathname = usePathname();

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1];

  if (!projectId || projectId === "new" || projectId === "upload-script") {
    return null;
  }

  const items = getProjectNav(projectId);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Project</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
