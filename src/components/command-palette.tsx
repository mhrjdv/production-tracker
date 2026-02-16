"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  useKeyboardShortcuts,
  type KeyBinding,
} from "@/hooks/use-keyboard-shortcuts";
import {
  Film,
  Crosshair,
  Clock,
  Users,
  BookOpen,
  GitCompareArrows,
  Layers,
  LayoutDashboard,
  Search,
  Plug,
  Keyboard,
  GalleryHorizontalEnd,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

export interface CommandPaletteProject {
  id: string;
  name: string;
}

export interface CommandPaletteScene {
  id: string;
  sceneId: string;
  storyBeat: string;
  projectId: string;
}

export interface CommandPaletteShot {
  id: string;
  shotCode: string;
  description: string;
}

interface CommandPaletteProps {
  projects?: CommandPaletteProject[];
  scenes?: CommandPaletteScene[];
  shots?: CommandPaletteShot[];
  onSwitchTab?: (tab: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function CommandPalette({
  projects = [],
  scenes = [],
  shots = [],
  onSwitchTab,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Allow external components (e.g. sidebar search button) to open the palette
  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener("open-command-palette", handler);
    return () => document.removeEventListener("open-command-palette", handler);
  }, []);

  // Detect current project and scene from URL
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const currentProjectId = projectMatch?.[1];
  const sceneMatch = pathname.match(/^\/projects\/[^/]+\/scenes\/([^/]+)/);
  const isOnScenePage = !!sceneMatch;

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  // ─── Navigation shortcuts ────────────────────────────────

  const navBindings: KeyBinding[] = useMemo(() => {
    const bindings: KeyBinding[] = [
      {
        key: "mod+k",
        label: "Open command palette",
        action: () => setOpen((v) => !v),
        group: "General",
      },
      {
        key: "g d",
        label: "Go to Dashboard",
        action: () => navigate("/home"),
        group: "Navigation",
      },
      {
        key: "g i",
        label: "Go to Integrations",
        action: () => navigate("/integrations"),
        group: "Navigation",
      },
      {
        key: "?",
        label: "Show keyboard shortcuts",
        action: () => {
          setOpen(true);
          setShowShortcuts(true);
        },
        group: "General",
      },
    ];

    if (currentProjectId) {
      bindings.push(
        {
          key: "g p",
          label: "Go to Production",
          action: () => navigate(`/projects/${currentProjectId}/production`),
          group: "Navigation",
        },
        {
          key: "g t",
          label: "Go to Timeline",
          action: () => navigate(`/projects/${currentProjectId}/timeline`),
          group: "Navigation",
        },
        {
          key: "g c",
          label: "Go to Characters",
          action: () => navigate(`/projects/${currentProjectId}/characters`),
          group: "Navigation",
        },
        {
          key: "g b",
          label: "Go to Creative Bible",
          action: () => navigate(`/projects/${currentProjectId}/bible`),
          group: "Navigation",
        },
        {
          key: "g g",
          label: "Go to Gallery",
          action: () => navigate(`/projects/${currentProjectId}/gallery`),
          group: "Navigation",
        },
      );
    }

    return bindings;
  }, [currentProjectId, navigate]);

  useKeyboardShortcuts(navBindings);

  // Reset showShortcuts when dialog closes
  useEffect(() => {
    if (!open) setShowShortcuts(false);
  }, [open]);

  // ─── Current project scenes for quick access ─────────────

  const currentScenes = useMemo(
    () =>
      currentProjectId
        ? scenes.filter((s) => s.projectId === currentProjectId)
        : [],
    [currentProjectId, scenes],
  );

  // ─── Icon mapping ────────────────────────────────────────

  const navIcon = (label: string) => {
    if (label.includes("Dashboard"))
      return <LayoutDashboard className="h-4 w-4" />;
    if (label.includes("Production")) return <Film className="h-4 w-4" />;
    if (label.includes("Timeline")) return <Clock className="h-4 w-4" />;
    if (label.includes("Characters")) return <Users className="h-4 w-4" />;
    if (label.includes("Bible")) return <BookOpen className="h-4 w-4" />;
    if (label.includes("Integrations")) return <Plug className="h-4 w-4" />;
    if (label.includes("Gallery"))
      return <GalleryHorizontalEnd className="h-4 w-4" />;
    return <Search className="h-4 w-4" />;
  };

  // ─── Shortcuts help view ─────────────────────────────────

  if (showShortcuts) {
    return (
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Keyboard Shortcuts"
      >
        <CommandInput placeholder="Filter shortcuts..." />
        <CommandList>
          <CommandEmpty>No shortcuts found.</CommandEmpty>
          {Object.entries(
            navBindings.reduce<Record<string, KeyBinding[]>>((acc, b) => {
              const group = b.group ?? "Other";
              if (!acc[group]) acc[group] = [];
              acc[group].push(b);
              return acc;
            }, {}),
          ).map(([group, bindings]) => (
            <CommandGroup key={group} heading={group}>
              {bindings.map((b) => (
                <CommandItem
                  key={b.key}
                  onSelect={() => {
                    setOpen(false);
                    b.action();
                  }}
                >
                  <Keyboard className="h-4 w-4" />
                  {b.label}
                  <CommandShortcut>{formatKey(b.key)}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    );
  }

  // ─── Main command palette ────────────────────────────────

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search scenes, projects, or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {navBindings
            .filter((b) => b.group === "Navigation")
            .map((b) => (
              <CommandItem
                key={b.key}
                onSelect={() => {
                  setOpen(false);
                  b.action();
                }}
              >
                {navIcon(b.label)}
                {b.label}
                <CommandShortcut>{formatKey(b.key)}</CommandShortcut>
              </CommandItem>
            ))}
        </CommandGroup>

        {/* Current project scenes */}
        {currentScenes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Scenes">
              {currentScenes.map((scene) => (
                <CommandItem
                  key={scene.id}
                  onSelect={() =>
                    navigate(
                      `/projects/${scene.projectId}/scenes/${scene.sceneId}`,
                    )
                  }
                >
                  <Crosshair className="h-4 w-4" />
                  <span className="font-mono text-xs mr-1.5">
                    {scene.sceneId}
                  </span>
                  {scene.storyBeat || "Untitled"}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Scene-specific commands (when on scene detail page) */}
        {isOnScenePage && onSwitchTab && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Scene Tabs">
              {[
                {
                  tab: "script",
                  label: "Switch to Script",
                  icon: <Film className="h-4 w-4" />,
                },
                {
                  tab: "shots",
                  label: "Switch to Shots",
                  icon: <Crosshair className="h-4 w-4" />,
                },
                {
                  tab: "assets",
                  label: "Switch to Assets",
                  icon: <Layers className="h-4 w-4" />,
                },
                {
                  tab: "compare",
                  label: "Switch to Compare",
                  icon: <GitCompareArrows className="h-4 w-4" />,
                },
                {
                  tab: "timeline",
                  label: "Switch to Timeline",
                  icon: <Clock className="h-4 w-4" />,
                },
              ].map((item) => (
                <CommandItem
                  key={item.tab}
                  onSelect={() => {
                    setOpen(false);
                    onSwitchTab(item.tab);
                  }}
                >
                  {item.icon}
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Shots in current scene */}
        {isOnScenePage && shots.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Shots">
              {shots.map((shot) => (
                <CommandItem
                  key={shot.id}
                  onSelect={() => {
                    setOpen(false);
                    if (onSwitchTab) onSwitchTab("shots");
                  }}
                >
                  <Crosshair className="h-4 w-4" />
                  <span className="font-mono text-xs mr-1.5">
                    {shot.shotCode}
                  </span>
                  <span className="truncate">{shot.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* All projects */}
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => navigate(`/projects/${project.id}`)}
                >
                  <Film className="h-4 w-4" />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Actions */}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setShowShortcuts(true);
            }}
          >
            <Keyboard className="h-4 w-4" />
            Show keyboard shortcuts
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function formatKey(key: string): string {
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");

  return key
    .split("+")
    .map((part) => {
      if (part === "mod") return isMac ? "\u2318" : "Ctrl";
      if (part === "shift") return isMac ? "\u21E7" : "Shift";
      if (part === "alt") return isMac ? "\u2325" : "Alt";
      if (part === "meta" || part === "cmd") return "\u2318";
      if (part === "ctrl") return "Ctrl";
      return part.toUpperCase().replace(" ", " then ");
    })
    .join(isMac ? "" : "+");
}
