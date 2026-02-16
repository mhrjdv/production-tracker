"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export interface ProjectItem {
  id: string;
  name: string;
}

interface NavProjectsListProps {
  projects: ProjectItem[];
}

export function NavProjectsList({ projects }: NavProjectsListProps) {
  const pathname = usePathname();

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger>
            Projects
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <SidebarGroupAction asChild>
          <Link href="/projects/new" title="New Project">
            <Plus />
          </Link>
        </SidebarGroupAction>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => {
                const href = `/projects/${project.id}`;
                const isActive = pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={project.name}
                    >
                      <Link href={href}>
                        <Folder />
                        <span>{project.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {projects.length === 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="New Project">
                    <Link href="/projects/new">
                      <Plus />
                      <span>Create Project</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
