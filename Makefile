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
	@echo "$(BLUE)React:$(NC) http://localhost:5173"

dev-build: 
	@echo "$(BLUE)Building development containers...$(NC)"
	docker compose -f compose.dev.yml build

dev-up: ## Start development containers
	@echo "$(BLUE)Starting development containers...$(NC)"
	docker compose -f compose.dev.yml up -d

dev-down: ## Stop development containers and clean CSS files
	@echo "$(BLUE)Stopping development containers...$(NC)"
	docker compose -f compose.dev.yml down

# =============================================================================
# Production commands
# =============================================================================

prod: check-env prod-build prod-up ## Start production environment (build + up)
	@echo "$(GREEN)Production environment started!$(NC)"

prod-build: ## Build production containers
	@echo "$(BLUE)Building production containers...$(NC)"
	docker compose -f compose.prod.yml build

prod-up: ## Start production containers
	@echo "$(BLUE)Starting production containers...$(NC)"
	docker compose -f compose.prod.yml up -d

prod-restart: ## Restart production containers
	@echo "$(BLUE)Restarting production containers...$(NC)"
	docker compose -f compose.prod.yml restart

prod-down: ## Stop production containers
	@echo "$(BLUE)Stopping production containers...$(NC)"
	docker compose -f compose.prod.yml down



build: dev-build ## Alias for dev-build
up: dev-up ## Alias for dev-up
restart: dev-restart ## Alias for dev-restart
down: dev-down ## Alias for dev-down
logs: ## Show all container logs
	docker compose -f compose.dev.yml logs -f --tail 100

re: down dev
