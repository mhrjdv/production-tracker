# Page Patterns Reference

## Route Structure

```
(dashboard)/
  page.tsx                                    # Projects list
  projects/
    new/page.tsx                              # Create project form
    upload-script/page.tsx                    # Script upload + AI parse
    [projectId]/
      page.tsx                                # Project overview (scenes + stats)
      production/page.tsx                     # Production view (scene list + shot breakdown)
      bible/page.tsx                          # Film identity editor
      characters/page.tsx                     # Character management
      scenes/
        [sceneId]/
          page.tsx                            # Scene detail (PRIMARY WORKSPACE)
          shots/                              # (Phase 1 — when Shot model exists)
            [shotId]/page.tsx                 # Shot detail
      timeline/page.tsx                       # Assembly timeline
  integrations/page.tsx                       # Extension tokens
```

## Page Template

Every dashboard page follows this pattern:

```tsx
// page.tsx (Server Component)
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageClient } from "@/components/page-client";

export default async function Page({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    include: { scenes: { orderBy: { sortOrder: "asc" } } },
  });

  if (!project) redirect("/");

  return <PageClient project={project} />;
}
```

## Scene Detail Page (Most Important)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Scene S001 · Act 1 — "The Discovery"    [Edit] [⋮]  │
├──────────┬──────────────────────┬───────────────────┤
│ Script   │ Shot List / Assets   │ Metadata          │
│ Excerpt  │                      │ Prompt Packages   │
│          │ [SH001] [SH002] ... │ Provenance        │
│ (always  │                      │ Rights State      │
│ visible) │ ┌─────┐ ┌─────┐    │                   │
│          │ │v1   │ │v2   │    │ Compare Group     │
│          │ │thumb│ │thumb│    │ Selection Status   │
│          │ └─────┘ └─────┘    │                   │
└──────────┴──────────────────────┴───────────────────┘
```

### Data Requirements

```typescript
// Fetch for scene detail page
const scene = await prisma.scene.findUnique({
  where: { id: sceneId },
  include: {
    assets: {
      include: { platform: true, promptPackage: true, parentVersion: true },
      orderBy: [{ assetType: "asc" }, { versionNumber: "desc" }],
    },
    promptPackages: {
      orderBy: { versionNumber: "desc" },
    },
    // shots: { orderBy: { sortOrder: "asc" } }, // Phase 1
  },
});
```

## Shot Detail Page (Phase 1)

### Layout

```
┌──────────────────────────────────────────────────────┐
│ Shot SH001 · S001 · "Wide establishing"   [Edit] [⋮] │
├─────────────────────────────┬────────────────────────┤
│ Prompt Packages             │ Run Cards              │
│ [P1] [P2] [P3]             │ ┌──────┐ ┌──────┐     │
│                             │ │ Sora │ │ Veo  │     │
│ Current: P3                 │ │ ✓Cap │ │ —    │     │
│ ┌─────────────────────┐    │ └──────┘ └──────┘     │
│ │ Base prompt...       │    │                        │
│ │ Negative prompt...   │    │ Platform Fan-Out       │
│ │ Style: cinematic     │    │ [+ Add Platform]       │
│ └─────────────────────┘    │                        │
├─────────────────────────────┴────────────────────────┤
│ Captured Versions (Compare Mode)                      │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│ │v1 ★ │ │v2   │ │v3   │ │v4   │   [Compare] [Grid] │
│ │Sora │ │Sora │ │Veo  │ │Frpk │                     │
│ └─────┘ └─────┘ └─────┘ └─────┘                    │
└──────────────────────────────────────────────────────┘
```

## Timeline Page

### Layout

```
┌──────────────────────────────────────────────────┐
│ Timeline · Project Name          [Export] [Filter] │
├──────────────────────────────────────────────────┤
│ Video  │ [S001/SH001] [S001/SH002] [S002/SH001] │
│ Audio  │ [S001 narr.] [S002 narr.]               │
│ Music  │ [Track 1 ──────────────────────]         │
│ Image  │ [S001 still] [S002 still]               │
├──────────────────────────────────────────────────┤
│ □ Show all versions  □ Show rejected              │
└──────────────────────────────────────────────────┘
```

### Data Requirements

```typescript
// Fetch selected winners for timeline
const selectedAssets = await prisma.sceneAssetVersion.findMany({
  where: {
    scene: { projectId },
    selected: true,
  },
  include: { scene: true, platform: true },
  orderBy: [
    { scene: { sortOrder: "asc" } },
    { assetType: "asc" },
  ],
});
```

## Production Page

### Layout

Scene list grouped by act, with shot count and asset coverage per scene.

```
┌──────────────────────────────────────────────────┐
│ Production · Project Name                         │
├──────────────────────────────────────────────────┤
│ Act 1 — "Setup"                                   │
│ ┌──────────────────────────────────────────────┐ │
│ │ S001 · The Discovery                          │ │
│ │ 3 shots · 12 versions · 2 selected · ⚠ rights│ │
│ ├──────────────────────────────────────────────┤ │
│ │ S002 · The Confrontation                      │ │
│ │ 2 shots · 8 versions · 1 selected            │ │
│ └──────────────────────────────────────────────┘ │
│                                                   │
│ Act 2 — "Conflict"                                │
│ ...                                               │
└──────────────────────────────────────────────────┘
```

## Command Palette

Global `Cmd+K` search across:
- Scenes (by ID, title, source text)
- Shots (by code, description)
- Versions (by prompt text, platform, model)
- Prompt packages (by name, prompt text)

Implementation: use shadcn Command component with server-side search action.

## Error States

- **Empty scene:** Show "Upload a script or create scenes manually" CTA
- **No shots:** Show "Add shots to start capturing" with assisted/manual/import options
- **No versions:** Show "Capture outputs from generation platforms" with extension install prompt
- **Rights warning:** Yellow badge on versions with UNKNOWN or RESTRICTED rights state
- **Sync failure:** Red badge with retry action on failed extension syncs
