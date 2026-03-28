#!/bin/bash
# =============================================================================
# init-session.sh — Runtime initialization for Claude Code environments
# =============================================================================
# Shared session setup logic used by:
#   - Docker entrypoint (entrypoint.sh sources this)
#   - VPS login (.zprofile or manual)
#   - kctl-claude setup init
#
# Handles: config seeding, git, SSH, Claude auth, tmux, SDK API.
# Safe to re-run — idempotent.
#
# Environment variables (all optional with defaults):
#   CLAUDE_CODE_OAUTH_TOKEN — Claude Max subscription token
#   GIT_USER_NAME / GIT_USER_EMAIL — Git identity
#   GITHUB_TOKEN — GitHub PAT for gh CLI
#   ENABLE_SDK_API — Start SDK API server (default: false)
#   SDK_PORT — SDK API port (default: 3100)
#   ENABLE_FIREWALL — Enable iptables firewall (default: false)
#   REPOS_PATH — Where repos are (default: /opt/dev)
#   CLAUDE_DIR — Claude config dir (default: ~/.claude)
# =============================================================================
set -euo pipefail

# ─── Defaults ────────────────────────────────────────────────────────
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
REPOS_PATH="${REPOS_PATH:-/opt/dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()   { echo -e "  ${GREEN}[+]${NC} $*"; }
log_warn() { echo -e "  ${YELLOW}[!]${NC} $*"; }
log_skip() { echo -e "  [-] $*"; }

# ─── 1. Seed config from repo (if repo available) ───────────────────
REPO_DIR=""
if [ -d "$SCRIPT_DIR/../config/.claude" ]; then
    REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
elif [ -d "/opt/claude-config-baked" ]; then
    # Docker: seed from baked-in config
    REPO_DIR=""
    BAKED_DIR="/opt/claude-config-baked"
    if [ -d "$BAKED_DIR" ] && [ -d "$CLAUDE_DIR" ]; then
        cp -rn "$BAKED_DIR"/* "$CLAUDE_DIR"/ 2>/dev/null || true
        log_ok "Claude config seeded from Docker image"
    fi
fi

if [ -n "$REPO_DIR" ] && [ -d "$REPO_DIR/config/.claude" ]; then
    mkdir -p "$CLAUDE_DIR"/{agents,skills,commands,rules}
    for dir in agents skills commands rules; do
        if [ -d "$REPO_DIR/config/.claude/$dir" ]; then
            rsync -a --delete "$REPO_DIR/config/.claude/$dir/" "$CLAUDE_DIR/$dir/" 2>/dev/null || \
                cp -r "$REPO_DIR/config/.claude/$dir/"* "$CLAUDE_DIR/$dir/" 2>/dev/null || true
        fi
    done
    # Keybindings — always sync
    cp "$REPO_DIR/config/.claude/keybindings.json" "$CLAUDE_DIR/" 2>/dev/null || true
    # Settings — only create if missing
    [ ! -f "$CLAUDE_DIR/settings.json" ] && \
        cp "$REPO_DIR/config/.claude/settings.json" "$CLAUDE_DIR/settings.json" 2>/dev/null || true
    # MCP config
    [ -f "$REPO_DIR/.mcp.json" ] && cp "$REPO_DIR/.mcp.json" "$HOME/.mcp.json" 2>/dev/null || true
    log_ok "Claude config synced from repo"
fi

# ─── 2. MCP credentials ─────────────────────────────────────────────
if [ -f "$HOME/.claude-credentials.json" ] && [ -s "$HOME/.claude-credentials.json" ]; then
    cp "$HOME/.claude-credentials.json" "$CLAUDE_DIR/.credentials.json" 2>/dev/null || true
    log_ok "MCP OAuth credentials loaded"
fi

# ─── 3. Project directories ─────────────────────────────────────────
for ws_dir in "$REPOS_PATH"/*/; do
    [ -d "$ws_dir" ] || continue
    ws_path=$(echo "$ws_dir" | sed 's|/$||')
    proj_id=$(echo -n "$ws_path" | sed 's|/|-|g; s|^-||')
    proj_dir="$CLAUDE_DIR/projects/$proj_id"
    [ ! -d "$proj_dir" ] && mkdir -p "$proj_dir/memory"
done

# ─── 4. Git configuration ───────────────────────────────────────────
[ -n "${GIT_USER_NAME:-}" ] && git config --global user.name "$GIT_USER_NAME"
[ -n "${GIT_USER_EMAIL:-}" ] && git config --global user.email "$GIT_USER_EMAIL"

if [ -n "${GITHUB_TOKEN:-}" ]; then
    export GH_TOKEN="${GITHUB_TOKEN}"
    echo "${GITHUB_TOKEN}" | gh auth login --with-token 2>/dev/null && \
        gh auth setup-git 2>/dev/null && \
        log_ok "GitHub authenticated (gh credential helper)" || \
        log_warn "gh auth failed — git push over HTTPS may not work"
fi

# Safe directories for all repos
git config --global --unset-all safe.directory 2>/dev/null || true
for dir in "$REPOS_PATH"/*/; do
    [ -d "$dir/.git" ] && git config --global --add safe.directory "$dir"
done
for dir in "$REPOS_PATH"/*/*/; do
    [ -d "$dir/.git" ] && git config --global --add safe.directory "$dir"
done

# ─── 5. SSH keys ────────────────────────────────────────────────────
if [ -d "$HOME/.ssh" ]; then
    # Only start a new agent if one isn't already running (prevents agent accumulation on VPS)
    if [ -z "${SSH_AUTH_SOCK:-}" ] || ! ssh-add -l &>/dev/null; then
        eval "$(ssh-agent -s)" > /dev/null 2>&1 || true
    fi
    for key in "$HOME"/.ssh/id_*; do
        [ -f "$key" ] && [[ "$key" != *.pub ]] && ssh-add "$key" 2>/dev/null || true
    done
fi

# ─── 6. Claude Code auth ────────────────────────────────────────────
if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    if [ ! -f "$HOME/.claude.json" ] || ! grep -q 'hasCompletedOnboarding' "$HOME/.claude.json" 2>/dev/null; then
        echo '{"hasCompletedOnboarding": true}' > "$HOME/.claude.json"
        log_ok "Created .claude.json with onboarding bypass"
    fi
    log_ok "Auth: Claude Max subscription (OAuth token)"
else
    log_warn "CLAUDE_CODE_OAUTH_TOKEN is not set — run: claude setup-token"
fi

# ─── 7. Firewall (optional) ─────────────────────────────────────────
if [ "${ENABLE_FIREWALL:-false}" = "true" ]; then
    if [ -f "/usr/local/bin/init-firewall.sh" ]; then
        sudo /usr/local/bin/init-firewall.sh || log_warn "Firewall setup failed"
    fi
fi

# ─── 8. Claude Code version ─────────────────────────────────────────
if command -v claude &>/dev/null; then
    echo "Claude Code version: $(claude --version 2>/dev/null || echo 'unknown')"
fi

# ─── 9. Install kctl-* tools ────────────────────────────────────────
KCTL_SCRIPT="${SCRIPT_DIR}/install-kctl.sh"
if [ -f "$KCTL_SCRIPT" ]; then
    echo ""
    bash "$KCTL_SCRIPT"
fi

# ─── 10. Create tmux sessions ───────────────────────────────────────
if command -v tmux &>/dev/null; then
    _create_tmux() {
        local name="$1" path="$2"
        if [ -d "$path" ]; then
            tmux new-session -d -s "$name" -c "$path" 2>/dev/null || true
            log_ok "tmux session: $name → $path"
        else
            log_skip "skipped: $name ($path not mounted)"
        fi
    }

    echo ""
    echo "Creating tmux sessions..."
    _create_tmux "kodemeio"  "$REPOS_PATH/kodemeio-app"
    _create_tmux "kontenos"  "$REPOS_PATH/kontenos-app"
    _create_tmux "journaltx" "$REPOS_PATH/journaltx-app"
    _create_tmux "kidneuro"  "$REPOS_PATH/kidneuro-app"
    _create_tmux "infra"     "$REPOS_PATH/kodemeio-infra"
    _create_tmux "core"      "$REPOS_PATH/kodemeio-core"
    echo ""
fi

# ─── 11. Start SDK API (if enabled) ─────────────────────────────────
if [ "${ENABLE_SDK_API:-false}" = "true" ]; then
    SDK_SERVER=""
    [ -f /opt/sdk/server.js ] && SDK_SERVER="/opt/sdk/server.js"
    [ -z "$SDK_SERVER" ] && [ -n "$REPO_DIR" ] && [ -f "$REPO_DIR/sdk/server.js" ] && SDK_SERVER="$REPO_DIR/sdk/server.js"

    if [ -n "$SDK_SERVER" ]; then
        echo "Starting SDK API server on :${SDK_PORT:-3100}..."
        cd "$(dirname "$SDK_SERVER")" && node "$(basename "$SDK_SERVER")" &
    else
        log_warn "SDK server.js not found — build first: cd sdk && pnpm run build"
    fi
fi
