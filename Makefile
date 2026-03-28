.PHONY: up down build shell kodemeio kontenos journaltx kidneuro infra core health logs task \
       sdk-up sdk-down sdk-build dev dev-down dev-build \
       generate-env check-env deploy-env \
       sync-config sync-secrets sync-secrets-dry sync-all \
       install-kctl check-kctl backup restore verify verify-container setup-local collect \
       daemon-status daemon-jobs daemon-queue daemon-history daemon-dashboard daemon-sessions daemon-logs daemon-config

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

# ─── Remote & monitoring ─────────────────────────────────────────────

remote:
	docker exec -it kodemeio-claude claude --remote

monitor:
	docker exec -it kodemeio-claude tmux new-session -A -s monitor -c /opt/dev

# ─── Headless task ───────────────────────────────────────────────────

task:
	@read -p "Workspace: " ws; read -p "Prompt: " prompt; \
	docker exec kodemeio-claude claude -p "$$prompt" \
	  --dangerously-skip-permissions \
	  --allowedTools "Bash,Read,Edit" --output-format json \
	  --cwd "/opt/dev/$$ws"

# ─── Environment generation ──────────────────────────────────────────

generate-env:
	./scripts/generate-env.sh

check-env:
	./scripts/generate-env.sh --check

deploy-env:
	scp .env $${HETZNER_SSH:-root@dokploy.kodeme.io}:/opt/kodemeio-claude/.env

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

# ─── KodeClaw Daemon ─────────────────────────────────────────────────

daemon-status:
	@docker exec kodemeio-claude curl -sf http://localhost:3100/dashboard/api/status | jq '{started_at, subsystems, queue_depth, in_flight, persona}'

daemon-jobs:
	@docker exec kodemeio-claude curl -sf http://localhost:3100/dashboard/api/jobs | jq '.[] | {name, schedule, workspace, enabled}'

daemon-queue:
	@docker exec kodemeio-claude curl -sf http://localhost:3100/dashboard/api/queue | jq .

daemon-history:
	@docker exec kodemeio-claude curl -sf http://localhost:3100/dashboard/api/history | jq '.[:20] | .[] | {started_at, source, workspace, status, duration_ms}'

daemon-sessions:
	@docker exec kodemeio-claude curl -sf http://localhost:3100/dashboard/api/sessions | jq .

daemon-logs:
	@docker exec kodemeio-claude tail -50 /tmp/kodeclaw-daemon.log 2>/dev/null || echo "No daemon logs found"

daemon-config:
	@docker exec kodemeio-claude cat /opt/sdk/config/daemon.yaml

daemon-dashboard:
	@echo "Dashboard: http://localhost:3100/dashboard"

# ─── Legacy (knowledge base collection) ──────────────────────────────

collect:
	./scripts/collect.sh
