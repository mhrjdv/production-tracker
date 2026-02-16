"use client";

import Link from "next/link";
import { Film, PanelLeft } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { SearchTrigger } from "./search-trigger";
import { NavWorkspace } from "./nav-workspace";
import { NavProject } from "./nav-project";
import { NavProjectsList, type ProjectItem } from "./nav-projects-list";
import { UserMenu } from "./user-menu";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  projects: ProjectItem[];
}

export function AppSidebar({ projects, ...props }: AppSidebarProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link
            href="/home"
            className="flex items-center gap-2 group-data-[collapsible=icon]:hidden transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Film className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-lg">
              Lazer
            </span>
          </Link>
          <button
            onClick={toggleSidebar}
            className="group-data-[collapsible=icon]:flex hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors hover:bg-primary/20 cursor-pointer group/logo"
            title="Expand Sidebar"
          >
            <Film className="h-4 w-4 text-primary group-hover/logo:hidden" />
            <PanelLeft className="h-4 w-4 text-primary hidden group-hover/logo:block" />
          </button>
          <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SearchTrigger />
        <NavWorkspace />
        <NavProject />
        <SidebarSeparator />
        <NavProjectsList projects={projects} />
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
