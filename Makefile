
check-env: ## Check if .env file exists
	@if [ ! -f .env ]; then \
		echo "$(RED)Error: .env file not found!$(NC)"; \
		echo "$(YELLOW)Run: cp .env.example .env$(NC)"; \
		echo "$(YELLOW)Then edit .env with your configuration.$(NC)"; \
		exit 1; \
	fi

# =============================================================================
# Development commands
# =============================================================================

dev: check-env dev-build dev-up ## Start development environment (build + up)
	@echo "$(GREEN)Development environment started!$(NC)"
	# @echo "$(BLUE)React:$(NC) http://localhost:5173"
	# @echo "$(BLUE)Hono:$(NC) http://localhost:3000"

dev-build:  ## Build development containers
	@echo "$(BLUE)Building development containers...$(NC)"
	docker compose -f compose.dev.yml build

dev-up: ## Start development containers
	@echo "$(BLUE)Starting development containers...$(NC)"
	docker compose -f compose.dev.yml up -d
