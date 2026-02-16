"use client";

import { Search } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function SearchTrigger() {
  return (
    <SidebarGroup className="py-2">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search"
              className="bg-sidebar-accent/50 border border-sidebar-border/50 shadow-none hover:bg-sidebar-accent group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent"
              onClick={() => {
                document.dispatchEvent(new CustomEvent("open-command-palette"));
              }}
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground group-data-[collapsible=icon]:hidden">Search...</span>
              <kbd className="pointer-events-none ml-auto text-[10px] bg-muted/50 border border-sidebar-border rounded px-1.5 py-0.5 font-mono text-muted-foreground group-data-[collapsible=icon]:hidden">
                {"\u2318"}K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
