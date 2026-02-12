---
description: Next.js 16 Cache Components best practices and rules
---

# Next.js 16 Cache Components Rules

## NEVER use `force-dynamic`

**NEVER** use `export const dynamic = 'force-dynamic'` or any route segment config overrides. These are not supported with Cache Components (`cacheComponents: true`) and are an anti-pattern.

```ts
// ❌ FORBIDDEN
export const dynamic = 'force-dynamic'
export const dynamic = 'force-static'
export const revalidate = 3600
export const fetchCache = 'force-cache'
```

## Use `<Suspense>` for dynamic data

When a Server Component accesses runtime data (`auth()`, `cookies()`, `headers()`, `searchParams`) or performs async operations (Prisma queries, `fetch`), extract the data-fetching into a separate async component and wrap it in `<Suspense>` with a fallback:

```tsx
import { Suspense } from "react";

// Async component that fetches data
async function DataContent() {
    const session = await auth();
    const data = await prisma.foo.findMany({ ... });
    return <div>{/* render data */}</div>;
}

// Page component wraps in Suspense
export default function Page() {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <DataContent />
        </Suspense>
    );
}
```

## Use `"use cache"` for cacheable data

For data that doesn't depend on runtime data (cookies/headers) and doesn't change frequently, use the `"use cache"` directive with `cacheLife`:

```tsx
import { cacheLife } from 'next/cache';

async function CachedContent() {
    'use cache';
    cacheLife('hours');
    const data = await fetch('...');
    return <div>{/* render data */}</div>;
}
```

## Key principles

1. **Runtime data** (`auth()`, `cookies()`, `headers()`) **must** be inside `<Suspense>`
2. **Dynamic data** (DB queries, API calls) **must** be inside `<Suspense>` or cached with `"use cache"`
3. Place `<Suspense>` boundaries as close as possible to the components that need them
4. Provide meaningful skeleton/loading fallbacks for each Suspense boundary
5. Use `connection()` from `next/server` only when you need to defer to request time without accessing runtime APIs
6. Cache tags (`cacheTag`) + `revalidateTag`/`updateTag` for on-demand revalidation
