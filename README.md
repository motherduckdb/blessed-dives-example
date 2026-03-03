# Blessed Dives

This repo includes a toolkit for getting started with version-controlled [MotherDuck Dives](https://motherduck.com/dives). Dives are data applications deployed as code using React and SQL on top of your existing MotherDuck databases.

This example includes CI/CD via GitHub actions. You can develop locally with a built-in Vite server, get previews of your Dives on PRs, then merge to `main` to deploy your Dive to your MotherDuck account. This workflow enables faster iteration on Dives, plus version control and automatic deployments.

The example below assumes Claude Code is your agent -- other agents like Codex will likely work, but have not been tested. We recommend using Opus 4.6 as your model. For the best experience, point your agent at this repo and let it cook :)

## Prerequisites

- **MotherDuck account** -- free at [app.motherduck.com](https://app.motherduck.com)
- **MotherDuck MCP server** -- [install for your client](https://motherduck.com/docs/key-tasks/ai-and-motherduck/connecting-ai-tools-to-motherduck/) (Claude Code, Cursor, etc.). The MCP `get_dive_guide` tool provides full authoring docs for dive components.
- **Node.js 18+**

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
- **For CI / shared repos**: create a [service account](https://motherduck.com/docs/key-tasks/service-accounts-guide/) so deployed dives aren't tied to a personal account. Use the service account's token as your GitHub secret.

Write your token to the local env file:

```bash
cd .dive-preview
cp .env.example .env
# Open .env and paste your token as the value of MOTHERDUCK_TOKEN
```

> **Agent note**: If the user hasn't provided a token yet, ask them for it. Do not invent or guess tokens.

## Local Preview

```bash
cd .dive-preview
npm install

# Point the preview at the example dive
echo 'export { default } from "../../dives/eastlake-sales/eastlake-sales";' > src/dive.tsx

npm run dev
# Open http://localhost:5173
```

The `.dive-preview/` directory is a committed Vite + React scaffold with an SDK shim (`src/md-sdk.tsx`) that provides the same `useSQLQuery` API as the production dive runtime.

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

1. Create a new folder `dives/<name>/` with `<name>.tsx` and `dive_metadata.json`.
2. Use the MotherDuck MCP's `get_dive_guide` tool for component authoring guidance (TSX structure, `useSQLQuery`, styling, available libraries).
3. Register the dive in CI -- add a filter line to `.github/workflows/deploy_dives.yaml`:
   ```yaml
   filters: |
     eastlake-sales: dives/eastlake-sales/**
     my-dive: dives/my-dive/**
   ```
4. Preview locally:
   ```bash
   echo 'export { default } from "../../dives/my-dive/my-dive";' > .dive-preview/src/dive.tsx
   cd .dive-preview && npm run dev
   ```

## CI/CD Setup

### GitHub Secret

Set `DIVES_MOTHERDUCK_TOKEN` as a repository secret (Settings > Secrets and variables > Actions). This must be a **read/write** token.

> **Recommended**: Use a [service account](https://motherduck.com/docs/key-tasks/service-accounts-guide/) token so published dives aren't tied to a personal account.

### How It Works

- **On PR**: Changed dives get deployed as previews with title `"<Title>:<branch> (Preview)"`. A comment with a link is posted to the PR.
- **On merge to main**: Changed dives are created or updated in the token owner's account.
- **On branch delete**: Preview dives matching the branch name are automatically cleaned up.

The `deploy_dives.yaml` workflow uses [dorny/paths-filter](https://github.com/dorny/paths-filter) to detect which dives changed. Each dive must be registered in the `filters:` block (see step 3 above).
