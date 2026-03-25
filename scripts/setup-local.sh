#!/bin/bash
# =============================================================================
# setup-local.sh — Reproduce full Claude Code local environment from scratch
# =============================================================================
# Run on any fresh machine to install and configure Claude Code with all
# agents, skills, commands, rules, keybindings, and tools.
#
# Usage:
#   ./scripts/setup-local.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
CLAUDE_DIR="${HOME}/.claude"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }

echo "================================================================"
echo "  Setup Claude Code — Local Environment"
echo "================================================================"
echo ""

# 1. Install Claude Code + Playwright CLI
if command -v claude &>/dev/null; then
    log_success "[1/8] Claude Code installed: $(claude --version 2>/dev/null)"
else
    log_info "[1/8] Installing Claude Code..."
    npm install -g @anthropic-ai/claude-code@latest
    log_success "Claude Code installed"
fi
if ! command -v playwright-cli &>/dev/null; then
    log_info "  Installing playwright-cli..."
    npm install -g @playwright/cli 2>/dev/null && log_success "  playwright-cli installed" || log_warn "  playwright-cli install failed"
fi

# 2. Install system tools
log_info "[2/8] Checking system tools..."
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
log_info "[3/8] Checking dev tools..."
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

# 4. Create directory structure
log_info "[4/8] Creating directories..."
mkdir -p "$CLAUDE_DIR"/{agents,skills,commands,rules}

# 5. Sync from repo
log_info "[5/8] Syncing config from repo..."
cp -r "$REPO_DIR/config/.claude/agents/"*   "$CLAUDE_DIR/agents/"   2>/dev/null && log_success "  agents synced" || true
cp -r "$REPO_DIR/config/.claude/skills/"*   "$CLAUDE_DIR/skills/"   2>/dev/null && log_success "  skills synced" || true
cp -r "$REPO_DIR/config/.claude/commands/"* "$CLAUDE_DIR/commands/" 2>/dev/null && log_success "  commands synced" || true
cp -r "$REPO_DIR/config/.claude/rules/"*    "$CLAUDE_DIR/rules/"    2>/dev/null && log_success "  rules synced" || true
cp "$REPO_DIR/config/.claude/keybindings.json" "$CLAUDE_DIR/" 2>/dev/null && log_success "  keybindings synced" || true

# 6. Settings (don't overwrite existing)
log_info "[6/8] Checking settings..."
if [ ! -f "$CLAUDE_DIR/settings.json" ]; then
    cp "$REPO_DIR/config/.claude/settings.json" "$CLAUDE_DIR/settings.json"
    log_success "  Created settings.json"
else
    log_warn "  settings.json already exists — not overwriting"
fi

# 7. MCP servers — always update to keep in sync
log_info "[7/8] Syncing MCP config..."
if [ -f "$REPO_DIR/.mcp.json" ]; then
    cp "$REPO_DIR/.mcp.json" "$HOME/.mcp.json"
    log_success "  ~/.mcp.json synced from repo"
fi

# 8. Auth check
log_info "[8/8] Checking authentication..."
if [ -f "$CLAUDE_DIR/.credentials.json" ]; then
    log_success "  Credentials found"
else
    log_warn "  No credentials — run: claude login"
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
