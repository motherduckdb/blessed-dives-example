.DEFAULT_GOAL := help

DIVE := $(word 2,$(MAKECMDGOALS))

# -- Local development --------------------------------------------------------

.PHONY: setup
setup: ## Install preview dependencies and create .env from example
	cd .dive-preview && npm install
	@test -f .dive-preview/.env || cp .dive-preview/.env.example .dive-preview/.env
	@echo ""
	@echo "Setup complete. Edit .dive-preview/.env with your MotherDuck token."

.PHONY: preview
preview: ## Preview a dive locally (e.g. make preview eastlake-sales)
	@test -n "$(DIVE)" || { echo "Usage: make preview <name>"; exit 1; }
	@test -d "dives/$(DIVE)" || { echo "Dive folder not found: dives/$(DIVE)"; exit 1; }
	@echo 'export { default } from "../../dives/$(DIVE)/$(DIVE)";' > .dive-preview/src/dive.tsx
	cd .dive-preview && npm run dev

# -- Scaffolding ---------------------------------------------------------------

.PHONY: new-dive
new-dive: ## Scaffold a new dive (e.g. make new-dive my-dive)
	@test -n "$(DIVE)" || { echo "Usage: make new-dive <name>"; exit 1; }
	@test ! -d "dives/$(DIVE)" || { echo "Dive already exists: dives/$(DIVE)"; exit 1; }
	mkdir -p dives/$(DIVE)
	@printf '{\n  "id": "",\n  "title": "%s",\n  "description": "",\n  "requiredResources": []\n}\n' "$(DIVE)" > dives/$(DIVE)/dive_metadata.json
	@echo "Created dives/$(DIVE)/dive_metadata.json -- edit title, description, and requiredResources (must list at least one share before deploy)."
	@echo "Next: create dives/$(DIVE)/$(DIVE).tsx and register in .github/workflows/deploy_dives.yaml"

# -- Help ----------------------------------------------------------------------

.PHONY: help
help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# Treat positional args as no-op targets so Make doesn't complain
%:
	@:
