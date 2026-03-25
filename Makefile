.PHONY: up down build shell kodemeio kontenos journaltx kidneuro infra core health logs task \
       sdk-up sdk-down sdk-build dev dev-down dev-build \
       collect sync-config sync-secrets sync-secrets-dry sync-all \
       install-kctl check-kctl backup restore verify verify-container setup-local

# ─── Production (full dev container) ─────────────────────────────────

up:
	docker compose -f docker-compose.prod.yml up -d

down:
	docker compose -f docker-compose.prod.yml down

build:
	docker compose -f docker-compose.prod.yml build

# ─── SDK API only (lightweight) ──────────────────────────────────────

sdk-up:
	docker compose -f docker-compose.sdk.yml up -d

sdk-down:
	docker compose -f docker-compose.sdk.yml down

sdk-build:
	docker compose -f docker-compose.sdk.yml build

# ─── Development (local) ─────────────────────────────────────────────

dev:
	docker compose up -d

dev-down:
	docker compose down

dev-build:
	docker compose build

# ─── Interactive sessions ────────────────────────────────────────────

shell:
	docker exec -it kodemeio-claude zsh

kodemeio:
	docker exec -it kodemeio-claude tmux attach -t kodemeio

kontenos:
	docker exec -it kodemeio-claude tmux attach -t kontenos

journaltx:
	docker exec -it kodemeio-claude tmux attach -t journaltx

kidneuro:
	docker exec -it kodemeio-claude tmux attach -t kidneuro

infra:
	docker exec -it kodemeio-claude tmux attach -t infra

core:
	docker exec -it kodemeio-claude tmux attach -t core

# ─── Health & status ─────────────────────────────────────────────────

health:
	docker exec kodemeio-claude bash /usr/local/bin/health.sh

logs:
	docker logs -f kodemeio-claude

# ─── Headless task ───────────────────────────────────────────────────

task:
	@read -p "Workspace: " ws; read -p "Prompt: " prompt; \
	docker exec kodemeio-claude claude -p "$$prompt" \
	  --dangerously-skip-permissions \
	  --allowedTools "Bash,Read,Edit" --output-format json \
	  --cwd "/opt/dev/$$ws"

# ─── Config sync (run on laptop before deploy) ──────────────────────

sync-config:
	./scripts/sync-config.sh

sync-secrets:
	./scripts/sync-secrets.sh

sync-secrets-dry:
	./scripts/sync-secrets.sh --dry-run

# Full sync: config + secrets → ready for deploy
sync-all: sync-config sync-secrets

# ─── kctl-* CLI tools (run inside container) ─────────────────────────

install-kctl:
	docker exec kodemeio-claude /opt/scripts/install-kctl.sh

check-kctl:
	docker exec kodemeio-claude /opt/scripts/install-kctl.sh --check

# ─── Backup & restore ────────────────────────────────────────────────

backup:
	./scripts/backup-runtime.sh

restore:
	@read -p "Backup dir: " dir; \
	docker cp "$$dir/." kodemeio-claude:/home/dev/.claude/

# ─── Verification ────────────────────────────────────────────────────

verify:
	./scripts/verify-scores.sh

verify-container:
	docker exec kodemeio-claude bash /opt/scripts/verify-scores.sh /home/dev/.claude

# ─── Setup (local machine) ───────────────────────────────────────────

setup-local:
	./scripts/setup-local.sh

# ─── Knowledge base (existing functionality) ─────────────────────────

collect:
	./scripts/collect.sh
