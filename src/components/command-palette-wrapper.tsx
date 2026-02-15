"use client";

import { CommandPalette, type CommandPaletteProject, type CommandPaletteScene } from "@/components/command-palette";

interface CommandPaletteWrapperProps {
    projects: CommandPaletteProject[];
    scenes: CommandPaletteScene[];
}

export function CommandPaletteWrapper({ projects, scenes }: CommandPaletteWrapperProps) {
    return <CommandPalette projects={projects} scenes={scenes} />;
}
