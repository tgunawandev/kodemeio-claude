#!/bin/bash
# =============================================================================
# sync-config.sh — Sync local Claude Code config into repo for Docker image
# =============================================================================
# Run on your laptop when you add/change agents, skills, commands, or rules.
# Changes are then committed and deployed to Hetzner via Dokploy.
#
# What gets synced (local → repo):
#   ~/.claude/agents/       → config/.claude/agents/
#   ~/.claude/skills/       → config/.claude/skills/
#   ~/.claude/commands/     → config/.claude/commands/
#   ~/.claude/rules/        → config/.claude/rules/
#   ~/.claude/keybindings.json → config/.claude/keybindings.json
#
# What does NOT get synced:
#   settings.json  — container version differs (different hooks/plugins)
#   .credentials.json — secrets, never committed
#
# Usage:
#   ./scripts/sync-config.sh           # Sync local → repo
#   ./scripts/sync-config.sh --dry-run # Preview changes without syncing
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$REPO_DIR/config/.claude"
LOCAL_DIR="${HOME}/.claude"
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERR]${NC} $*"; }

echo "================================================================"
echo "  Sync Claude Code config → Docker image"
echo "================================================================"

if [ ! -d "$LOCAL_DIR" ]; then
    log_error "$LOCAL_DIR not found. Run: make setup-local"
    exit 1
fi

if [ "$DRY_RUN" = true ]; then
    echo ""
    log_warn "DRY RUN — showing what would change:"
    echo ""
fi

# Sync a directory with diff preview
sync_dir() {
    local name="$1" src="$2" dst="$3"
    if [ ! -d "$src" ]; then
        log_warn "$name: $src not found, skipping"
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        # Show diff summary
        local changes
        changes=$(diff -rq "$src" "$dst" 2>/dev/null || true)
        if [ -n "$changes" ]; then
            echo -e "  ${CYAN}$name:${NC}"
            echo "$changes" | while read -r line; do
                echo "    $line"
            done
        else
            echo -e "  ${GREEN}$name:${NC} no changes"
        fi
    else
        log_info "Syncing $name..."
        rm -rf "$dst"
        cp -r "$src" "$dst"
        local count
        if [ "$name" = "skills" ]; then
            count=$(find "$dst" -mindepth 1 -maxdepth 1 -type d | wc -l)
        else
            count=$(find "$dst" -name "*.md" | wc -l)
        fi
        log_success "  $count $name synced"
    fi
}

sync_dir "agents"   "$LOCAL_DIR/agents"   "$CONFIG_DIR/agents"
sync_dir "skills"   "$LOCAL_DIR/skills"   "$CONFIG_DIR/skills"
sync_dir "commands" "$LOCAL_DIR/commands" "$CONFIG_DIR/commands"
sync_dir "rules"    "$LOCAL_DIR/rules"    "$CONFIG_DIR/rules"

# Keybindings
if [ -f "$LOCAL_DIR/keybindings.json" ]; then
    if [ "$DRY_RUN" = true ]; then
        if ! diff -q "$LOCAL_DIR/keybindings.json" "$CONFIG_DIR/keybindings.json" &>/dev/null; then
            echo -e "  ${CYAN}keybindings.json:${NC} changed"
        else
            echo -e "  ${GREEN}keybindings.json:${NC} no changes"
        fi
    else
        log_info "Syncing keybindings..."
        cp "$LOCAL_DIR/keybindings.json" "$CONFIG_DIR/keybindings.json"
        log_success "  keybindings.json synced"
    fi
fi

if [ "$DRY_RUN" = true ]; then
    echo ""
    log_info "Run without --dry-run to apply changes."
    exit 0
fi

# Show git diff summary
echo ""
cd "$REPO_DIR"
CHANGED=$(git diff --stat config/.claude/ 2>/dev/null || true)
if [ -n "$CHANGED" ]; then
    log_info "Git changes:"
    echo "$CHANGED"
else
    log_success "No changes detected (local and repo already in sync)"
fi

echo ""
log_warn "settings.json is NOT auto-synced (container version differs)."
log_warn "If you changed plugins/hooks locally, update config/.claude/settings.json manually."

echo ""
echo "================================================================"
log_success "Sync complete. Next: git add -A && git commit && git push"
echo "================================================================"
