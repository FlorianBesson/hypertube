# =============================================================================
# Magneto Makefile
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

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "$(BLUE)%-20s$(NC) %s\n", $$1, $$2}'

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

dev: check-env dev-build dev-up  ## Start development environment (build + up)
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

dev-restart: ## Restart development containers
	@echo "$(BLUE)Restarting development containers...$(NC)"
	docker compose -f compose.dev.yml restart

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
prod-logs: ## Show all container logs
	docker compose -f compose.prod.yml logs -f --tail 100
# =============================================================================
# Database commands
# =============================================================================

db-seed: ## Seed the database with initial data
	@echo "$(BLUE)Seeding database...$(NC)"
	docker compose -f compose.dev.yml exec api-express npx prisma db seed

db-reset: ## Reset database migrations and re-seed
	@echo "$(BLUE)Resetting database and seeding...$(NC)"
	docker compose -f compose.dev.yml exec api-express npx prisma migrate reset --force

db-status: ## Check database migration status
	@echo "$(BLUE)Checking database migration status...$(NC)"
	docker compose -f compose.dev.yml exec api-express npx prisma migrate status

prisma-studio: ## Start Prisma Studio container and print URL
	@echo "$(BLUE)Starting Prisma Studio...$(NC)"
	docker compose -f compose.dev.yml up -d prisma-studio
	@echo "$(GREEN)Prisma Studio is running at:$(NC) http://localhost:5555"


build: dev-build ## Alias for dev-build
up: dev-up ## Alias for dev-up
restart: dev-restart ## Alias for dev-restart
down: dev-down ## Alias for dev-down
logs: ## Show all container logs
	docker compose -f compose.dev.yml logs -f --tail 100
re: down dev
h: help
