# =============================================================================
# Hypertube Makefile
# =============================================================================

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m

# =============================================================================
# Environment check
# =============================================================================

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
	@echo "$(BLUE)PHP:$(NC) http://localhost:$${APP_LISTEN_ENDPOINT:-8080}"
	@echo "$(BLUE)React:$(NC) http://localhost:5173"

dev-build: 
	@echo "$(BLUE)Building development containers...$(NC)"
	docker compose -f compose.dev.yml build

dev-up: ## Start development containers
	@echo "$(BLUE)Starting development containers...$(NC)"
	docker compose -f compose.dev.yml up -d

dev-restart: css-php-build css-react-build ## Restart development containers
	@echo "$(BLUE)Restarting development containers...$(NC)"
	docker compose -f compose.dev.yml restart

dev-down: ## Stop development containers and clean CSS files
	@echo "$(BLUE)Stopping development containers...$(NC)"
	docker compose -f compose.dev.yml down
	@$(MAKE) css-clean


build: dev-build ## Alias for dev-build
up: dev-up ## Alias for dev-up
restart: dev-restart ## Alias for dev-restart
down: dev-down ## Alias for dev-down
logs: ## Show all container logs
	docker compose -f compose.dev.yml logs -f --tail 100

# =============================================================================
# Database migration commands
# =============================================================================

prisma-studio: ## Start Prisma Studio database browser
	@echo "$(BLUE)Starting Prisma Studio on http://localhost:5555$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop$(NC)"
	@docker compose -f compose.dev.yml exec api npx prisma studio --browser none --port 5555
