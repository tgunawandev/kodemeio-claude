#!/bin/bash
# =============================================================================
# setup-local.sh — Install and sync Claude Code local environment
# =============================================================================
# Run on any machine to install Claude Code and sync all agents, skills,
# commands, rules, and keybindings from the repo.
#
# Safe to re-run — updates existing files with newer versions from repo.
#
# Usage:
#   ./scripts/setup-local.sh           # Full setup + sync
#   ./scripts/setup-local.sh --sync    # Skip tool install, just sync config
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
CLAUDE_DIR="${HOME}/.claude"
SYNC_ONLY=false

[[ "${1:-}" == "--sync" ]] && SYNC_ONLY=true

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }

echo "================================================================"
echo "  Setup Claude Code — Local Environment"
echo "================================================================"
echo ""

if [ "$SYNC_ONLY" = false ]; then
    # 1. Install Claude Code + Playwright CLI
    if command -v claude &>/dev/null; then
        log_success "[1/5] Claude Code installed: $(claude --version 2>/dev/null)"
    else
        log_info "[1/5] Installing Claude Code..."
        npm install -g @anthropic-ai/claude-code@latest
        log_success "Claude Code installed"
    fi
    if ! command -v playwright-cli &>/dev/null; then
        log_info "  Installing playwright-cli..."
        npm install -g @playwright/cli 2>/dev/null && log_success "  playwright-cli installed" || log_warn "  playwright-cli install failed"
    fi

    # 2. Install system tools
    log_info "[2/5] Checking system tools..."
    MISSING=()
    command -v tmux &>/dev/null || MISSING+=(tmux)
    command -v fzf  &>/dev/null || MISSING+=(fzf)
    command -v jq   &>/dev/null || MISSING+=(jq)
    command -v yq   &>/dev/null || MISSING+=(yq)
    if [ ${#MISSING[@]} -gt 0 ]; then
        log_info "Installing: ${MISSING[*]}"
        sudo apt install -y "${MISSING[@]}" 2>/dev/null || log_warn "apt install failed — install manually: ${MISSING[*]}"
    fi
    log_success "System tools OK"

    # 3. Install dev tools
    log_info "[3/5] Checking dev tools..."
    command -v ruff     &>/dev/null || { pip3 install ruff 2>/dev/null || uv tool install ruff 2>/dev/null || log_warn "Install ruff manually"; }
    command -v prettier &>/dev/null || npm install -g prettier 2>/dev/null || log_warn "Install prettier manually"
    if ! command -v wt &>/dev/null; then
        log_info "  Installing worktrunk (wt)..."
        if command -v cargo &>/dev/null; then
            cargo install worktrunk 2>/dev/null && log_success "  worktrunk installed via cargo" || log_warn "  cargo install failed"
        elif command -v brew &>/dev/null; then
            brew install worktrunk 2>/dev/null && log_success "  worktrunk installed via brew" || log_warn "  brew install failed"
        else
            log_warn "  Install worktrunk manually: cargo install worktrunk OR brew install worktrunk"
        fi
    fi
    log_success "Dev tools OK"
else
    log_info "Skipping tool install (--sync mode)"
fi

# 4. Sync config from repo → local (updates existing files)
log_info "[4/5] Syncing config from repo → local..."
mkdir -p "$CLAUDE_DIR"/{agents,skills,commands,rules,plugins}

# rsync: update all files, delete removed ones, keep local-only extras
sync_dir() {
    local name="$1" src="$2" dst="$3"
    if [ -d "$src" ]; then
        rsync -a --delete "$src/" "$dst/"
        log_success "  $name synced"
    fi
}

sync_dir "agents"   "$REPO_DIR/config/.claude/agents"   "$CLAUDE_DIR/agents"
sync_dir "skills"   "$REPO_DIR/config/.claude/skills"   "$CLAUDE_DIR/skills"
sync_dir "commands" "$REPO_DIR/config/.claude/commands" "$CLAUDE_DIR/commands"
sync_dir "rules"    "$REPO_DIR/config/.claude/rules"    "$CLAUDE_DIR/rules"

# Single files — always update
cp "$REPO_DIR/config/.claude/keybindings.json" "$CLAUDE_DIR/" 2>/dev/null && log_success "  keybindings synced" || true
cp "$REPO_DIR/config/.claude/statusline-command.sh" "$CLAUDE_DIR/" 2>/dev/null && chmod +x "$CLAUDE_DIR/statusline-command.sh" 2>/dev/null && log_success "  statusline-command.sh synced" || true

# Settings — only create if missing (user may have local customizations)
if [ ! -f "$CLAUDE_DIR/settings.json" ]; then
    cp "$REPO_DIR/config/.claude/settings.json" "$CLAUDE_DIR/settings.json"
    log_success "  Created settings.json (first time)"
else
    log_warn "  settings.json exists — not overwriting (run sync-config to push local changes)"
fi

# Plugin manifests — always update (Claude Code auto-fetches plugins from marketplaces)
[ -f "$REPO_DIR/config/.claude/plugins/known_marketplaces.json" ] && \
    cp "$REPO_DIR/config/.claude/plugins/known_marketplaces.json" "$CLAUDE_DIR/plugins/" && \
    log_success "  plugin marketplaces synced" || true
[ -f "$REPO_DIR/config/.claude/plugins/installed_plugins.json" ] && \
    cp "$REPO_DIR/config/.claude/plugins/installed_plugins.json" "$CLAUDE_DIR/plugins/" && \
    log_success "  plugin manifest synced" || true

# MCP config — always update
if [ -f "$REPO_DIR/.mcp.json" ]; then
    cp "$REPO_DIR/.mcp.json" "$HOME/.mcp.json"
    log_success "  ~/.mcp.json synced"
fi

# 5. Auth check
log_info "[5/5] Checking authentication..."
if [ -f "$CLAUDE_DIR/.credentials.json" ]; then
    log_success "  Credentials found"
else
    log_warn "  No credentials — run: claude login"
fi

# Install git hook for sync reminders
HOOK_FILE="$REPO_DIR/.git/hooks/pre-push"
if [ -d "$REPO_DIR/.git/hooks" ] && [ ! -f "$HOOK_FILE" ]; then
    cat > "$HOOK_FILE" << 'HOOK'
#!/bin/bash
# Remind to sync local config before pushing
REPO_DIR="$(git rev-parse --show-toplevel)"
LOCAL_DIR="${HOME}/.claude"

# Check if any local skill/agent is newer than the repo copy
needs_sync=false
for dir in agents skills commands rules; do
    if [ -d "$LOCAL_DIR/$dir" ] && [ -d "$REPO_DIR/config/.claude/$dir" ]; then
        local_newest=$(find "$LOCAL_DIR/$dir" -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1)
        repo_newest=$(find "$REPO_DIR/config/.claude/$dir" -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1)
        if [ -n "$local_newest" ] && [ -n "$repo_newest" ]; then
            if [ "$(echo "$local_newest > $repo_newest" | bc 2>/dev/null)" = "1" ]; then
                needs_sync=true
                break
            fi
        fi
    fi
done

if [ "$needs_sync" = true ]; then
    echo ""
    echo -e "\033[1;33m[WARN]\033[0m Local ~/.claude/ has newer files than repo."
    echo -e "       Run: \033[1mmake sync-config\033[0m before pushing."
    echo ""
    # Warning only — don't block the push
fi
HOOK
    chmod +x "$HOOK_FILE"
    log_success "  Installed pre-push hook (sync reminder)"
fi

# Summary
echo ""
echo "================================================================"
agents=$(find "$CLAUDE_DIR/agents" -name "*.md" 2>/dev/null | wc -l)
skills=$(find "$CLAUDE_DIR/skills" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
commands=$(find "$CLAUDE_DIR/commands" -name "*.md" 2>/dev/null | wc -l)
rules=$(find "$CLAUDE_DIR/rules" -name "*.md" 2>/dev/null | wc -l)
echo "  Agents: $agents | Skills: $skills | Commands: $commands | Rules: $rules"
log_success "Setup complete. Run 'claude' to start."
echo "================================================================"
