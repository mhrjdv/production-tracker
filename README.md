# Lazer

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![MCP](https://img.shields.io/badge/MCP-53_tools-green?style=for-the-badge)](https://modelcontextprotocol.io/)

> **Generate anywhere, decide here, ship with traceability.**

Lazer is an **orchestration and traceability layer** for AI-assisted film production. It does not generate media. Instead, it manages the complete lifecycle of AI-generated assets across multiple generation platforms.

```
Draft -> Generate Elsewhere -> Capture -> Compare -> Select -> Approve -> Assemble
```

---

## How It Works

1. **Plan** your production structure in the web app (projects, scenes, shots)
2. **Create** prompt packages with platform-specific adaptations
3. **Generate** on any AI platform (Sora, Veo, Midjourney, Freepik, Runway, etc.)
4. **Capture** outputs instantly via the Chrome extension side panel
5. **Compare** versions side-by-side in the web app
6. **Select** winners and route them through approval
7. **Assemble** your timeline from selected assets

---

## Key Features

### Production Structure
Organize work from Project down to Script, Scene, Shot, and Asset Version. Shots are the atomic unit of production — every AI-generated asset attaches to a shot.

### Chrome Extension (Manifest V3)
A persistent side panel that captures AI-generated outputs from any platform with one click. Four modes: Context, Capture, Reuse, and Queue. Supports offline queuing.

### MCP Server (53 Tools)
A built-in Model Context Protocol server that exposes every operation as structured tools. Connect Claude, ChatGPT, Cursor, or any MCP client to manage your entire production via AI.

### Asset Versioning
Immutable, append-only versions with full provenance tracking. Versions are never modified — selection is not deletion. Nine-stage status lifecycle from Draft to Final.

### Multi-Platform Capture
Platform detectors for Sora, Veo, Midjourney, Freepik, Runway, ElevenLabs, and Suno. DOM-based capture extracts prompts, parameters, and model info automatically.

### Compare & Select
Side-by-side version comparison with metadata overlay. Review captured versions across platforms and select winners for each shot.

### Prompt Packages
Reusable, platform-agnostic prompt definitions with per-platform adaptations, version tracking, and tag-based search.

### Timeline View
Premiere-style horizontal timeline lanes for story, image, video, and audio visibility across the full scene sequence.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Server Components) |
| Frontend | [React 19](https://reactjs.org/), [Radix UI](https://www.radix-ui.com/), [Tailwind CSS 4](https://tailwindcss.com/) |
| Database | [Prisma v7](https://www.prisma.io/) + PostgreSQL |
| Auth | [Supabase Auth](https://supabase.com/auth) (provider-agnostic abstraction) |
| Storage | [Cloudflare R2](https://www.cloudflare.com/products/r2/) (S3-compatible) |
| AI | [OpenRouter](https://openrouter.ai/) via Vercel AI SDK |
| Validation | [Zod v4](https://zod.dev/) |
| MCP | [@modelcontextprotocol/sdk](https://modelcontextprotocol.io/) |
| Extension | Chrome Manifest V3, Side Panel API |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Cloudflare R2 bucket
- Supabase project (for auth)

### Setup

```bash
# Clone the repository
git clone https://github.com/mhrjdv/production-tracker.git
cd production-tracker

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database, Supabase, R2, and OpenRouter credentials

# Set up database
npx prisma migrate dev
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

The MCP server starts automatically on port 3100 alongside the dev server.

---

## Chrome Extension

### Installation

1. Build the extension:
   ```bash
   npm run ext:build
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable **Developer Mode** (toggle in top-right)

4. Click **Load unpacked** and select the `chrome-extension/` folder

5. The Lazer icon appears in your extensions bar. Click it to open the side panel.

### Setup

1. Open the Lazer web app and go to **Settings > Integrations**

2. Click **Generate Token** to create an API token (starts with `lzr_`)

3. In the extension side panel, enter:
   - **Server URL**: Your Lazer instance URL (e.g. `http://localhost:3000`)
   - **API Token**: The `lzr_` token from step 2

4. Click **Connect** — the extension will verify the connection

### Usage

The extension has four modes:

| Mode | Purpose |
|------|---------|
| **Context** | Shows your active project, scene, and shot. Switch context here. |
| **Capture** | Auto-detects AI platform outputs. One click saves the asset to your active shot. |
| **Reuse** | Browse previously captured assets to re-use prompts on a different platform. |
| **Queue** | View pending captures (queued offline) and retry failed uploads. |

Supported platforms: Sora, Veo/Gemini, Midjourney, Freepik, Runway, ElevenLabs, Suno.

---

## MCP Server

The built-in MCP server exposes every Lazer operation as structured tools for AI agents.

| Capability | Count |
|-----------|-------|
| Tools | 53 across 11 domains |
| Resources | 7 (schema, project trees, docs) |
| Prompts | 5 (scene breakdown, shot planning, asset review, prompt refinement, production summary) |

### Connect ChatGPT (OAuth)

1. In ChatGPT, go to **Settings > Connected Apps > Add MCP Server**
2. Enter your Lazer URL: `https://your-domain.com/mcp`
3. Select **OAuth** — the login flow handles authentication automatically

### Connect Claude Desktop (STDIO)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lazer": {
      "command": "npx",
      "args": ["lazer-mcp", "--token", "lzr_your_token"],
      "env": { "DATABASE_URL": "postgresql://..." }
    }
  }
}
```

### Connect Cursor (STDIO)

Same configuration as Claude Desktop. Add it in **Cursor > Settings > MCP**.

### Standalone HTTP Server

The MCP server can also run standalone on port 3100:

```bash
# Set required env vars
export DATABASE_URL="postgresql://..."
export LAZER_MCP_DEFAULT_TOKEN="lzr_your_token"

# Start the HTTP transport
npx lazer-mcp --port 3100
```

Then point any MCP client to `http://localhost:3100/mcp` with `Authorization: Bearer lzr_your_token`.

See [MCP documentation](content/docs/mcp-server/) for the full tool reference and authentication details.

---

## Project Structure

```
src/
  app/              Next.js App Router (pages, API routes, OAuth)
  components/       UI components (scene detail, shots, compare, timeline)
  lib/              Core utilities, auth, AI, storage, server actions
    auth/           Provider-agnostic auth abstraction (Supabase adapter)
    oauth/          OAuth 2.0 endpoints for MCP clients
    actions/        Server actions (asset, scene, shot, character)
packages/
  mcp-server/       @lazer/mcp-server (53 tools, 7 resources, 5 prompts)
prisma/             Database schema & migrations
chrome-extension/   Manifest V3 side panel extension
content/docs/       Fumadocs documentation site
```

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/lazer_dev"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# AI (OpenRouter)
API_KEY="sk-or-v1-..."
AI_MODEL="anthropic/claude-haiku-4.5"

# Cloudflare R2
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="lazer-assets"
R2_PUBLIC_URL="https://..."

# MCP Server (optional)
LAZER_MCP_PORT=3100
LAZER_MCP_DEFAULT_TOKEN="lzr_..."
```

---

## Scripts

```bash
npm run dev          # Start Next.js dev server (MCP auto-starts on :3100)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
npm run ext:build    # Build Chrome extension
npm run ext:watch    # Watch Chrome extension
npm run db:migrate   # Run Prisma migrations
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

---

## Documentation

Full documentation is available at `/docs` when the app is running, powered by [Fumadocs](https://fumadocs.dev/).

- [Getting Started](content/docs/getting-started/)
- [Core Concepts](content/docs/concepts/)
- [Web App Guide](content/docs/web-app/)
- [Chrome Extension](content/docs/chrome-extension/)
- [MCP Server](content/docs/mcp-server/)
- [API Reference](content/docs/api-reference/)
- [Supported Platforms](content/docs/platforms/)

---

## Links

- [GitHub](https://github.com/mhrjdv/production-tracker)
- [LinkedIn](https://www.linkedin.com/in/-mihirjadhav/)
- [X (Twitter)](https://x.com/mhrjdv)

---

## License

MIT
