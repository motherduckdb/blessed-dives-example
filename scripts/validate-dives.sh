#!/usr/bin/env bash
#
# Validate dive_metadata.json for every dive under dives/.
#
# Checks each dive's metadata has:
#   - title         (non-empty string)
#   - description   (non-empty string)
#   - id            (string; may be empty for new dives)
#   - requiredResources (array of {url, alias}; url must start with "md:")
#
# Exits non-zero on the first failure with a human-readable message.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIVES_DIR="${REPO_ROOT}/dives"

fail() {
  echo "validate-dives: $1" >&2
  exit 1
}

shopt -s nullglob
DIVE_DIRS=("${DIVES_DIR}"/*/)
if (( ${#DIVE_DIRS[@]} == 0 )); then
  fail "no dives found under ${DIVES_DIR}"
fi

for dir in "${DIVE_DIRS[@]}"; do
  name="$(basename "${dir%/}")"
  meta="${dir}dive_metadata.json"

  [ -f "$meta" ] || fail "${name}: missing dive_metadata.json"
  jq -e . "$meta" >/dev/null 2>&1 || fail "${name}: dive_metadata.json is not valid JSON"

  jq -e 'has("title") and (.title | type == "string") and (.title | length > 0)' "$meta" >/dev/null \
    || fail "${name}: title must be a non-empty string"
  jq -e 'has("description") and (.description | type == "string") and (.description | length > 0)' "$meta" >/dev/null \
    || fail "${name}: description must be a non-empty string"
  jq -e 'has("id") and (.id | type == "string")' "$meta" >/dev/null \
    || fail "${name}: id must be a string (use \"\" for new dives)"

  jq -e 'has("requiredResources") and (.requiredResources | type == "array")' "$meta" >/dev/null \
    || fail "${name}: requiredResources must be present and an array (use [] if no shares are needed)"

  jq -e '.requiredResources | all(type == "object" and (.url | type == "string") and (.url | startswith("md:")) and (.alias | type == "string") and (.alias | length > 0))' "$meta" >/dev/null \
    || fail "${name}: every requiredResources entry must be { url: \"md:...\", alias: \"<non-empty>\" }"

  echo "  ok: ${name}"
done

echo "validate-dives: all dives pass"
