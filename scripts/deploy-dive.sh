#!/usr/bin/env bash
#
# Deploy a single dive to MotherDuck.
#
# Usage:
#   ./scripts/deploy-dive.sh <dive-folder-name>
#
# Prerequisites:
#   duckdb must be on PATH with the motherduck extension installed.
#
# Environment:
#   MOTHERDUCK_TOKEN  (required) – MotherDuck API token
#   PREVIEW_BRANCH    (optional) – when set, deploys as a preview dive
#                                  with title "<Title>:<branch> (Preview)"
#
# Outputs (preview mode only):
#   Prints a markdown table row to stdout:
#     | <title> | [Open Dive](<url>) |
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DIVE_NAME="${1:?Usage: deploy-dive.sh <dive-folder-name>}"
DIVE_DIR="${REPO_ROOT}/dives/${DIVE_NAME}"

if [ ! -d "${DIVE_DIR}" ]; then
  echo "Dive folder not found: ${DIVE_DIR}" >&2
  exit 1
fi

META="${DIVE_DIR}/dive_metadata.json"
TITLE=$(jq -r '.title' "$META")
DESCRIPTION=$(jq -r '.description' "$META")

if ! jq -e 'has("requiredResources") and (.requiredResources | type == "array")' "$META" >/dev/null; then
  echo "Error: ${DIVE_NAME}/dive_metadata.json must declare requiredResources (array). Run scripts/validate-dives.sh." >&2
  exit 1
fi

# Build a DuckDB list literal: [{'url': '...', 'alias': '...'}, ...].
REQUIRED_RESOURCES_SQL=$(jq -r -f "${SCRIPT_DIR}/required-resources-sql.jq" "$META")

if [ -n "${PREVIEW_BRANCH:-}" ]; then
  DEPLOY_TITLE="${TITLE}:${PREVIEW_BRANCH} (Preview)"
else
  DEPLOY_TITLE="${TITLE}"
fi

EXISTING_DIVE_ID=$(duckdb md: -csv -noheader -c "SELECT id FROM MD_LIST_DIVES() WHERE title = '${DEPLOY_TITLE}'")
if [ -z "$EXISTING_DIVE_ID" ]; then
  EXISTING_DIVE_COUNT=0
else
  EXISTING_DIVE_COUNT=$(echo "$EXISTING_DIVE_ID" | wc -l | tr -d ' ')
fi

# Strip REQUIRED_DATABASES export — required_resources is now passed to MD_*_DIVE_CONTENT
# as server-side metadata, so a duplicate const in content causes a runtime error.
CONTENT_SQL="(SELECT regexp_replace(content, 'export const REQUIRED_DATABASES[^\n]*\n', '', 'g') FROM read_text('${DIVE_DIR}/${DIVE_NAME}.tsx'))"

if (( EXISTING_DIVE_COUNT == 0 )); then
  echo "  Creating new dive '${DEPLOY_TITLE}'..." >&2
  DIVE_ID=$(duckdb md: -csv -noheader -c "SET VARIABLE content = ${CONTENT_SQL}; SELECT id FROM MD_CREATE_DIVE(title = '${DEPLOY_TITLE}', content = getvariable('content'), description = '${DESCRIPTION}', api_version = 1, required_resources = ${REQUIRED_RESOURCES_SQL})")
elif (( EXISTING_DIVE_COUNT == 1 )); then
  echo "  Updating existing dive '${DEPLOY_TITLE}' (${EXISTING_DIVE_ID})..." >&2
  duckdb md: -csv -noheader -c "SET VARIABLE content = ${CONTENT_SQL}; FROM MD_UPDATE_DIVE_CONTENT(id = '${EXISTING_DIVE_ID}'::UUID, content = getvariable('content'), api_version = 1, required_resources = ${REQUIRED_RESOURCES_SQL}); FROM MD_UPDATE_DIVE_METADATA(id = '${EXISTING_DIVE_ID}'::UUID, title = '${DEPLOY_TITLE}', description = '${DESCRIPTION}');"
  DIVE_ID="${EXISTING_DIVE_ID}"
else
  echo "Error: Found ${EXISTING_DIVE_COUNT} dives with title '${DEPLOY_TITLE}'. Expected 0 or 1." >&2
  exit 1
fi

echo "  Deployed: https://app.motherduck.com/dives/${DIVE_ID}" >&2

if [ -n "${PREVIEW_BRANCH:-}" ]; then
  echo "| ${DEPLOY_TITLE} | [Open Dive](https://app.motherduck.com/dives/${DIVE_ID}) |"
fi
