---
name: laserman-webapp-dev
description: >
  Web application development patterns for Laserman V2 Next.js app.
  Use when: building pages, components, server actions, API routes, or any web app feature.
  Covers: Next.js 16 App Router patterns, React 19 server components, Prisma queries,
  server actions with Zod validation, Radix UI + Tailwind styling, scene-centric page architecture.
  Triggers on: building UI, adding pages, creating components, writing server actions,
  API routes, form handling, data fetching, layout changes, dashboard features,
  scene detail, shot detail, timeline, production view, compare view, prompt package UI.
---

# Laserman Webapp Dev

## Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4, Radix UI primitives, shadcn/ui components
- **Database:** PostgreSQL + Prisma v7
- **Auth:** NextAuth.js v5 (credentials provider, JWT sessions)
- **Storage:** Cloudflare R2 (S3-compatible)
- **AI:** OpenRouter for multi-model support
- **Validation:** Zod

## Architecture

```
src/app/
  (auth)/          # Login, register (no dashboard layout)
  (dashboard)/     # Dashboard layout with sidebar nav
    page.tsx       # Projects list (landing)
    projects/
      new/         # Create project
      upload-script/ # Script upload + AI parse
      [projectId]/
        page.tsx      # Project overview
        production/   # Scene list, shot breakdown
        bible/        # Film identity / production bible
        characters/   # Character management
        scenes/
          [sceneId]/  # Scene detail (primary workspace)
        timeline/     # Assembly timeline
    integrations/  # Extension token management
  api/
    auth/          # NextAuth routes
    ai/            # AI pipeline endpoints
    extension/     # Extension API (Bearer token auth)
    upload/        # R2 file uploads
```

## Page Patterns

### Scene Detail (Primary Workspace)

The scene detail page (`/projects/[projectId]/scenes/[sceneId]`) is the most important page. Users live here.

Structure:
- **Header:** Scene ID badge, act/sequence breadcrumb, scene title
- **Left panel:** Script excerpt (always visible — recognition not recall)
- **Center:** Shot list + assets gallery (tabbed or split)
- **Right panel:** Metadata, prompt packages, provenance drawer

Current implementation: `src/app/(dashboard)/projects/[projectId]/scenes/[sceneId]/page.tsx` (server component) + `src/components/scene-detail-client.tsx` (client component)

### Shot Detail (Phase 1 addition)

When Shot model exists, add `/projects/[projectId]/scenes/[sceneId]/shots/[shotId]`:
- Prompt packages for this shot
- Captured versions grid with compare
- Run cards per platform
- Selection controls

### Timeline

Current: `src/app/(dashboard)/projects/[projectId]/timeline/page.tsx`
- Lanes by asset type (video, image, audio, music)
- Default: selected winners only
- Drag-to-reorder within lanes

## Component Patterns

### Server vs Client Split

```
page.tsx (Server Component)
  ├── Fetch data with Prisma (auth check first)
  ├── Pass serializable props to client component
  └── <ClientComponent data={...} />

*-client.tsx (Client Component)
  ├── "use client" directive
  ├── useState/useEffect for interactivity
  ├── Call server actions for mutations
  └── Optimistic updates where possible
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| SceneAssetsPanel | `scene-assets-panel.tsx` | Main AI versioning UI — add/edit/compare versions |
| SceneDetailClient | `scene-detail-client.tsx` | Scene workspace — integrates all scene UI |
| ProductionClient | `production-client.tsx` | Scene list and production overview |
| IntegrationsClient | `integrations-client.tsx` | Extension token management |

### UI Components (shadcn/ui)

Located in `src/components/ui/`. Use these for all UI:
Button, Input, Select, Textarea, Card, Badge, Dialog, Label, Tabs, Separator, ScrollArea, DropdownMenu, AlertDialog, Tooltip, Popover, Command, Checkbox, RadioGroup

## Server Action Patterns

All in `src/lib/actions.ts`. Follow this pattern:

```typescript
"use server";

export async function createThing(input: CreateThingInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = createThingSchema.parse(input);

  const result = await prisma.thing.create({
    data: { ...validated, userId: session.user.id },
  });

  revalidatePath(`/projects/${result.projectId}`);
  return { success: true, data: result };
}
```

Rules:
- Always authenticate first with `auth()`
- Validate all input with Zod
- Use `prisma.$transaction` for multi-step mutations
- Call `revalidatePath()` after mutations
- Return `{ success, data?, error? }` shape
- Never expose internal IDs in error messages

## API Route Patterns

### Extension API Routes (`/api/extension/*`)

These use Bearer token auth, not session auth:

```typescript
import { authenticateExtensionRequest } from "@/lib/extension-auth";

export async function GET(request: Request) {
  const auth = await authenticateExtensionRequest(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // auth.userId and auth.tokenId are available
  // ... handle request
}
```

### Internal API Routes

Use `auth()` from NextAuth for session-based auth.

## Data Fetching

- **Pages:** Fetch directly with Prisma in server components
- **Client refresh:** Call server actions or use `router.refresh()`
- **Extension:** REST API with Bearer token
- **Real-time (future):** Consider Server-Sent Events for sync status

## Keyboard Shortcuts (Phase 1)

Plan for Linear-style keyboard accelerators:
- `Cmd+K` — command palette (search scenes/shots/versions/prompts)
- `S` — select/deselect current version as winner
- `C` — open compare view for current group
- `N` — new shot / new version (context-dependent)
- `E` — edit current entity
- `?` — searchable shortcuts help

## References

- Page and component patterns: [references/page-patterns.md](references/page-patterns.md)
- Component architecture details: [references/component-patterns.md](references/component-patterns.md)
- Current actions: `src/lib/actions.ts`
- Current schema: `prisma/schema.prisma`
