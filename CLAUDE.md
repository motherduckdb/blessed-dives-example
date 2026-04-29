# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

This is a **Blessed Dives** repo — version-controlled MotherDuck Dives deployed via GitHub Actions CI/CD. Each dive is a React TSX component that queries live MotherDuck data.

## Setup (for agents)

This repo is designed to be **forked** — the user should have their own fork for CI/CD to work. If the user hasn't set up yet, walk them through the README's Getting Started and Token Setup sections.

**Token handling**: The user must provide a MotherDuck API token. Ask them for it — never invent or guess tokens. For local dev, a personal read/write token is fine — write it to `.dive-preview/.env`. For the CI/CD GitHub secret (`MOTHERDUCK_TOKEN`), **strongly recommend a service account token** ([docs](https://motherduck.com/docs/key-tasks/service-accounts-guide/)). Dives are owned by whatever account's token deploys them — if a personal token is used, collaborators can't edit or redeploy those dives. A shared service account ensures the whole team can collaborate on published dives.

## Repository Structure

- **`dives/<dive-name>/`** — Each dive gets its own folder with:
  - `<dive-name>.tsx` — React component using `useSQLQuery` from `@motherduck/react-sql-query` and `recharts` for visualization. Exports a default component. May still export a `REQUIRED_DATABASES` array (kept for local preview / legacy runtimes), but the deploy script strips it before upload — the source of truth for share dependencies is `requiredResources` in `dive_metadata.json`.
  - `dive_metadata.json` — `{ "id": "", "title": "...", "description": "...", "requiredResources": [{ "url": "md:_share/<db>/<uuid>", "alias": "<alias>" }] }`. The `id` is left empty for new dives (populated on first deploy). Title is used to match existing dives for updates. `requiredResources` is required (use `[]` if the dive needs no shares) — `scripts/validate-dives.sh` enforces this in CI.
- **`.dive-preview/`** — Committed Vite scaffolding for local preview (minus `.env`, `node_modules/`, `src/dive.tsx` which are gitignored).
- **`.github/workflows/`** — CI/CD for deploying dives on merge and cleaning up previews.

## How Deployment Works

- **On merge to main**: `deploy_dives.yaml` detects changed dive folders via path filters, then creates or updates the live dive using the DuckDB CLI + MotherDuck extension.
- **On PR**: A preview dive is deployed with title `"<Title>:<branch> (Preview)"` and a comment with a link is posted to the PR.
- **On branch delete**: `cleanup_preview_dives.yaml` deletes preview dives matching the branch name.
- To register a new dive for CI, add a filter line to `deploy_dives.yaml` under the `filters:` block (e.g., `my-dive: dives/my-dive/**`).

## Local Preview

1. `cd .dive-preview`
2. `cp .env.example .env` and paste a MotherDuck read/write token
3. `npm install && npm run dev`
4. Create `src/dive.tsx` re-exporting the target dive: `export { default } from "../../dives/<name>/<name>";`
5. Open `http://localhost:5173`

The `.dive-preview/` directory uses a Vite + React setup with an SDK shim (`src/md-sdk.tsx`) that provides the same `useSQLQuery` API as the production dive runtime.

## Key Patterns in Dive Code

- Share dependencies live in `dive_metadata.json` under `requiredResources` and are passed to MotherDuck as `required_resources` on `MD_CREATE_DIVE` / `MD_UPDATE_DIVE_CONTENT`. The deploy script strips any `REQUIRED_DATABASES` export from the source before upload (a duplicate const + server-side metadata causes a runtime error).
- If you keep a `REQUIRED_DATABASES` export for local preview, it **must be a single line** — the CI strip step uses a regex that only matches single-line declarations.
- Use `N()` helper for safe numeric conversion: `const N = (v) => (v != null ? Number(v) : 0);`
- Always use fully qualified table names: `"database"."schema"."table"`
- Use per-section loading skeletons rather than a single full-page loader
- Available libraries: `react`, `recharts`, `lucide-react`, `@motherduck/react-sql-query`

## Creating a New Dive

1. Create `dives/<name>/` with `<name>.tsx` and `dive_metadata.json` (including `requiredResources`)
2. Add a filter line to `.github/workflows/deploy_dives.yaml`
3. Run `./scripts/validate-dives.sh` to confirm the metadata schema is valid
4. Test locally via the `.dive-preview/` setup
