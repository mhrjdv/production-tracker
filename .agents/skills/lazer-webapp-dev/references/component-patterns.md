# Component Patterns Reference

## Component File Organization

```
src/components/
  ui/                    # shadcn/ui base components (do not modify)
  navigation.tsx         # Dashboard sidebar nav
  scene-detail-client.tsx    # Scene workspace (client component)
  scene-assets-panel.tsx     # AI versioning UI (client component, 56KB — largest)
  production-client.tsx      # Production overview
  characters-client.tsx      # Character management
  bible-client.tsx           # Film identity editor
  integrations-client.tsx    # Extension token management
  scene-form-dialog.tsx      # Scene create/edit dialog
  character-form-dialog.tsx  # Character create/edit dialog
  delete-dialog.tsx          # Generic delete confirmation
  scene-actions.tsx          # Scene-level action buttons
```

## Server/Client Split Rules

1. **Page files (`page.tsx`)** are always Server Components
   - Fetch data with Prisma
   - Check auth with `auth()`
   - Pass serialized data as props

2. **Client components (`*-client.tsx`)** handle interactivity
   - `"use client"` at top
   - Receive data via props (not fetched directly)
   - Call server actions for mutations
   - Manage local UI state (dialogs, forms, tabs)

3. **Never import Prisma in client components**

## Scene Assets Panel Architecture

`scene-assets-panel.tsx` is the largest component (~56KB). It handles:

- Version list with filtering (by type, platform, status)
- Add/edit version forms with all metadata fields
- Multi-platform fan-out creation
- Status and rights state management
- Prompt package linking
- Compare group functionality
- Selection (winner marking)

### Refactoring Direction

When this component grows further, split into:
```
scene-assets/
  panel.tsx              # Container and state management
  version-card.tsx       # Single version card in grid
  version-form.tsx       # Add/edit version form
  compare-view.tsx       # Side-by-side comparison
  fanout-dialog.tsx      # Multi-platform fan-out
  filter-bar.tsx         # Type/platform/status filters
  rights-drawer.tsx      # Rights & provenance detail
```

## Form Patterns

### With Dialog

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Add Shot</Button>
  </DialogTrigger>
  <DialogContent>
    <form action={async (formData) => {
      const result = await createShot(formData);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    }}>
      {/* form fields */}
    </form>
  </DialogContent>
</Dialog>
```

### With Server Action

```tsx
async function handleSubmit(data: FormData) {
  setLoading(true);
  try {
    const result = await serverAction({
      field1: data.get("field1") as string,
      // ...
    });
    if (result.success) {
      toast.success("Created");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  } finally {
    setLoading(false);
  }
}
```

## Version Card Component (Target)

Each captured version should render as a card with:

```
┌─────────────────────┐
│ [thumbnail]          │
│                      │
│ v3 · Sora · VIDEO   │  ← version + platform badge + type
│ "sora-2" · 16:9     │  ← model + aspect ratio
│ ★ Selected           │  ← selection status (if winner)
│ ⚠ Rights: Unknown   │  ← rights warning (if not COMMERCIAL_ALLOWED)
│ [Select] [Compare]  │  ← actions
└─────────────────────┘
```

## Compare View Component (Target)

```
┌──────────────────────────────────────────┐
│ Compare · S001/SH001 · Group: P3_fanout  │
├──────────┬──────────┬──────────┬─────────┤
│ v1 Sora  │ v2 Veo   │ v3 Frpk  │ v4 Kling│
│ [thumb]  │ [thumb]  │ [thumb]  │ [thumb] │
│ sora-2   │ veo-3    │ flux-1   │ kling-2 │
│ $0.10    │ $0.08    │ $0.05    │ $0.12   │
│ 12s gen  │ 8s gen   │ 3s gen   │ 15s gen │
│ [★ Pick] │ [Pick]   │ [Pick]   │ [Pick]  │
└──────────┴──────────┴──────────┴─────────┘
```

## Run Card Component (Target — Phase 1)

For prompt package fan-out:

```
┌─────────────────────────────────┐
│ 🔵 Sora                         │
│ Status: Not Run                  │
│                                  │
│ Prompt: [adapted text preview]   │
│ Settings: 16:9, 5s, sora-2      │
│                                  │
│ [Copy Prompt] [Open in Sora →]  │
└─────────────────────────────────┘
```

## Styling Conventions

- Use Tailwind utility classes (no custom CSS files for components)
- Follow shadcn/ui patterns for consistent spacing and theming
- Dark mode support via CSS variables (already configured)
- Responsive: mobile-friendly scene list, desktop-optimized detail views
- Badge colors: green = selected/approved, yellow = needs review/unknown rights, red = rejected/restricted

## Toast / Notification Pattern

Use a toast library (sonner recommended) for:
- Success: "Version captured", "Winner selected", "Prompt package saved"
- Error: "Failed to sync", "Invalid input"
- Warning: "Rights state unknown — review before shipping"
- Info: "Syncing with extension..."
