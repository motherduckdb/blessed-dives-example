# Blessed Dives 🤿 ✨

Version-controlled [MotherDuck Dives](https://motherduck.com/docs/key-tasks/ai-and-motherduck/dives/) with CI/CD. Dives are interactive visualizations you create with natural language, built as React components and SQL queries on top of your live MotherDuck data.

This starter repo gives you local development with hot reload, GitHub Actions for PR-based preview, and automated deployment on merge. Fork it and start deploying.

> **See it in action**: [Video walkthrough](https://youtu.be/61ouqduhIbc) | [Full documentation](https://motherduck.com/docs/key-tasks/ai-and-motherduck/managing-dives-as-code/)

Works with any AI client connected to the [MotherDuck MCP Server](https://motherduck.com/docs/sql-reference/mcp/) -- Claude Code, Cursor, and others. The repo includes a `CLAUDE.md` that teaches the agent the folder conventions, component contract, and CI plumbing so you can go from "pull this Dive down" to "push up a PR" without explaining any of it.

## Prerequisites

- **MotherDuck account** -- free at [app.motherduck.com](https://app.motherduck.com)
- **MotherDuck MCP server** -- [install for your client](https://motherduck.com/docs/key-tasks/ai-and-motherduck/connecting-ai-tools-to-motherduck/) (Claude Code, Cursor, etc.). The MCP `get_dive_guide` tool provides full authoring docs for dive components.
- **Node.js 18+**
- **An AI agent** (optional but recommended) -- [Claude Code](https://docs.anthropic.com/en/docs/build-with-claude/claude-code/overview), Cursor, or any client connected to the MotherDuck MCP Server

> **Dev Container**: This repo includes a [dev container](.devcontainer/devcontainer.json) with Node 20, DuckDB, and dependencies pre-installed. Open it in GitHub Codespaces or VS Code Dev Containers to skip local setup.

## Getting Started

1. **Fork this repo** to your own GitHub account (you'll need your own repo for CI/CD to work).
2. Clone your fork:
   ```bash
   git clone <your-fork-url>
   cd blessed-dives-example
   ```

## Token Setup

You need a MotherDuck API token to run dives locally and in CI.

- **For local development**: a personal read/write token works fine. Go to [app.motherduck.com](https://app.motherduck.com) > Settings > API Tokens > Create token (read/write).
- **For CI / shared repos**: create a [service account](https://motherduck.com/docs/key-tasks/service-accounts-guide/) so deployed dives aren't tied to a personal account. Add the service account's token as a GitHub repository secret named **`MOTHERDUCK_TOKEN`** (Settings > Secrets and variables > Actions > New repository secret).

Write your token to the local env file:

```bash
cd .dive-preview
cp .env.example .env
# Open .env and paste your token as the value of VITE_MOTHERDUCK_TOKEN
```

> **Agent note**: If the user hasn't provided a token yet, ask them for it. Do not invent or guess tokens.

## Local Preview

**Quick start** (requires `make`):

```bash
make setup                        # first time: install deps + create .env
make preview eastlake-sales       # preview the example dive
```

**Manual steps** (equivalent to the above):

```bash
cd .dive-preview
npm install

# Point the preview at the example dive
echo 'export { default } from "../../dives/eastlake-sales/eastlake-sales";' > src/dive.tsx

npm run dev
# Open http://localhost:5173
```

The `.dive-preview/` directory is a committed Vite + React scaffold with an SDK shim (`src/md-sdk.tsx`) that provides the same `useSQLQuery` API as the production dive runtime.

Run `make help` to see all available shortcuts.

## Dive Structure

Each dive lives in its own folder under `dives/`:

```
dives/
└── my-dive/
    ├── my-dive.tsx           # React component (the dive itself)
    └── dive_metadata.json    # Title, description, ID
```

- **`<dive-name>.tsx`** -- React component using `useSQLQuery` for live SQL queries. Must have a default export. Use the MCP `get_dive_guide` tool for the full component API, available libraries, and design system.
- **`dive_metadata.json`** -- `{ "id": "", "title": "...", "description": "..." }`. Leave `id` empty for new dives (populated on first deploy). The `title` is used to match existing dives for updates, so keep it stable.

## Creating a New Dive

### Option A: Pull an existing Dive from MotherDuck

If you already have a Dive published in MotherDuck, you can pull it into this repo for local development. Copy the share link from the MotherDuck UI and tell your agent:

```
Set up this dive for local development: https://app.motherduck.com/dives/...
```

The agent uses the MCP Server to read the Dive source, save it to a local folder, register it for CI, and start the dev server -- all automatically.

### Option B: Create from scratch

1. Scaffold the dive folder (or create `dives/<name>/` with `<name>.tsx` and `dive_metadata.json` manually):
   ```bash
   make new-dive my-dive
   ```
2. Create your dive in `dives/my-dive/my-dive.tsx`. You can:
   - **Copy an existing dive** from `dives/eastlake-sales/eastlake-sales.tsx` and adapt it to your data.
   - **Generate with an AI agent** -- if you have the [MotherDuck MCP server](https://motherduck.com/docs/key-tasks/ai-and-motherduck/connecting-ai-tools-to-motherduck/) connected, ask your agent to create the dive component for you. The MCP Server provides schema context so the agent writes accurate SQL against your live data.
   - **Export from the MotherDuck UI** -- create a Dive at [app.motherduck.com](https://app.motherduck.com), then copy its source into your `.tsx` file.
3. Register the dive in CI -- add a filter line to `.github/workflows/deploy_dives.yaml`:
   ```yaml
   filters: |
     eastlake-sales: dives/eastlake-sales/**
     my-dive: dives/my-dive/**
   ```
4. Preview locally:
   ```bash
   make preview my-dive
   ```

### Iterating with an AI agent

With the Vite dev server running, you can iterate on the Dive using your AI agent. Restyle charts, rewrite SQL queries, add filters, swap visualizations -- describe what you want and the agent handles it. Changes hot-reload instantly in the browser.

## CI/CD Setup

### GitHub Secret

Set `MOTHERDUCK_TOKEN` as a repository secret (Settings > Secrets and variables > Actions). This must be a **read/write** token.

> **Recommended**: Use a [service account](https://motherduck.com/docs/key-tasks/service-accounts-guide/) token so published dives aren't tied to a personal account.

### How It Works

- **On PR**: Changed dives get deployed as previews with title `"<Title>:<branch> (Preview)"`. A comment with a link is posted to the PR.
- **On merge to main**: Changed dives are created or updated in the token owner's account.
- **On branch delete**: Preview dives matching the branch name are automatically cleaned up.

The `deploy_dives.yaml` workflow uses [dorny/paths-filter](https://github.com/dorny/paths-filter) to detect which dives changed. Each dive must be registered in the `filters:` block (see step 3 above).

## Sharing Dives with Your Team

When a Dive queries databases that aren't shared with your organization, the MCP Server can create org-scoped shares so your team can view the Dive. Ask your agent:

```
Share the data for my revenue Dive with my team
```

For CI/CD, use a [service account](https://motherduck.com/docs/key-tasks/service-accounts-guide/) token so deployed Dives aren't tied to a personal account -- this ensures anyone with repo access can edit and redeploy.

## Resources

- [Managing Dives as Code](https://motherduck.com/docs/key-tasks/ai-and-motherduck/managing-dives-as-code/) -- full documentation for this workflow
- [Video walkthrough](https://youtu.be/61ouqduhIbc) -- end-to-end demo of pull, edit, preview, deploy
- [Creating Visualizations with Dives](https://motherduck.com/docs/key-tasks/ai-and-motherduck/dives/) -- how Dives work, tips for better prompts
- [Dives SQL Functions](https://motherduck.com/docs/sql-reference/motherduck-sql-reference/ai-functions/dives/) -- manage Dives directly from SQL
- [MotherDuck MCP Server](https://motherduck.com/docs/sql-reference/mcp/) -- connect your AI assistant to MotherDuck
