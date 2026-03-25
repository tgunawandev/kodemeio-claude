#!/bin/bash
# =============================================================================
# entrypoint.sh — Pre-flight checks + tmux session setup
# =============================================================================
set -euo pipefail

echo "================================================================"
echo "  kodemeio-claude — Remote Development Container"
echo "================================================================"

# ─── Initialize config volume ────────────────────────────────────────
# On first run, the claude-runtime volume is empty. Seed it from the
# image's baked-in config (agents, skills, commands, settings).
# On subsequent runs, the volume already has data — only add missing files.
CLAUDE_DIR="/home/dev/.claude"
BAKED_DIR="/opt/claude-config-baked"

if [ -d "$BAKED_DIR" ] && [ -d "$CLAUDE_DIR" ]; then
    # Copy baked config into runtime volume (don't overwrite existing)
    cp -rn "$BAKED_DIR"/* "$CLAUDE_DIR"/ 2>/dev/null || true
    echo "  [+] Claude config initialized from image"
fi

# ─── Seed MCP credentials if mounted ──────────────────────────────────
if [ -f "/home/dev/.claude-credentials.json" ] && [ -s "/home/dev/.claude-credentials.json" ]; then
    cp /home/dev/.claude-credentials.json "$CLAUDE_DIR/.credentials.json" 2>/dev/null || true
    echo "  [+] MCP OAuth credentials loaded"
else
    echo "  [-] No MCP credentials mounted (cloud MCP servers may not work)"
fi

# ─── Seed project directories for each workspace ─────────────────────
for ws_dir in /opt/dev/*/; do
    [ -d "$ws_dir" ] || continue
    ws_path=$(echo "$ws_dir" | sed 's|/$||')
    proj_id=$(echo -n "$ws_path" | sed 's|/|-|g; s|^-||')
    proj_dir="$CLAUDE_DIR/projects/$proj_id"
    if [ ! -d "$proj_dir" ]; then
        mkdir -p "$proj_dir/memory"
    fi
done

# ─── Git configuration ───────────────────────────────────────────────
if [ -n "${GIT_USER_NAME:-}" ]; then
    git config --global user.name "$GIT_USER_NAME"
fi
if [ -n "${GIT_USER_EMAIL:-}" ]; then
    git config --global user.email "$GIT_USER_EMAIL"
fi
if [ -n "${GITHUB_TOKEN:-}" ]; then
    export GH_TOKEN="${GITHUB_TOKEN}"
    # Authenticate gh CLI and register as git credential helper
    # This avoids storing the token in plaintext in ~/.gitconfig
    echo "${GITHUB_TOKEN}" | gh auth login --with-token 2>/dev/null && \
        gh auth setup-git 2>/dev/null && \
        echo "  [+] GitHub authenticated (gh credential helper)" || \
        echo "  [!] gh auth failed — git push over HTTPS may not work"
fi

# Safe directories for all mounted repos (clear first to prevent accumulation)
git config --global --unset-all safe.directory 2>/dev/null || true
for dir in /opt/dev/*/; do
    [ -d "$dir/.git" ] && git config --global --add safe.directory "$dir"
done
# Also handle nested repos (e.g. kodemeio-core/kodemeio-react)
for dir in /opt/dev/*/*/; do
    [ -d "$dir/.git" ] && git config --global --add safe.directory "$dir"
done

# ─── SSH key permissions ─────────────────────────────────────────────
if [ -d /home/dev/.ssh ]; then
    # Can't chmod on read-only mount, but ensure ssh-agent works
    eval "$(ssh-agent -s)" > /dev/null 2>&1 || true
    for key in /home/dev/.ssh/id_*; do
        [ -f "$key" ] && [[ "$key" != *.pub ]] && ssh-add "$key" 2>/dev/null || true
    done
fi

# ─── Claude Code auth setup ──────────────────────────────────────────
# When using subscription (OAuth token), ensure onboarding is bypassed
if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    if [ ! -f /home/dev/.claude.json ] || ! grep -q 'hasCompletedOnboarding' /home/dev/.claude.json 2>/dev/null; then
        echo '{"hasCompletedOnboarding": true}' > /home/dev/.claude.json
        echo "  [+] Created .claude.json with onboarding bypass"
    fi
fi

# Warn if both auth methods are set (API key overrides subscription)
if [ -n "${ANTHROPIC_API_KEY:-}" ] && [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    echo "  [!] WARNING: Both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN are set."
    echo "      ANTHROPIC_API_KEY takes precedence — uses API credits, NOT your subscription."
    echo "      Unset one to avoid confusion."
fi

# ─── Firewall (optional, requires NET_ADMIN) ────────────────────────
if [ "${ENABLE_FIREWALL:-false}" = "true" ]; then
    sudo /usr/local/bin/init-firewall.sh || echo "Warning: Firewall setup failed (requires --cap-add=NET_ADMIN)"
fi

# ─── Claude Code verification ────────────────────────────────────────
echo "Claude Code version: $(claude --version 2>/dev/null || echo 'not found')"

# ─── Install kctl-* CLI tools from mounted repos ────────────────────
if [ -f /opt/scripts/install-kctl.sh ]; then
    echo ""
    /opt/scripts/install-kctl.sh
fi

# ─── Create tmux sessions for each company ───────────────────────────
create_tmux_session() {
    local name="$1"
    local path="$2"
    if [ -d "$path" ]; then
        tmux new-session -d -s "$name" -c "$path" 2>/dev/null || true
        echo "  [+] tmux session: $name → $path"
    else
        echo "  [-] skipped: $name ($path not mounted)"
    fi
}

echo ""
echo "Creating tmux sessions..."
create_tmux_session "kodemeio"  "/opt/dev/kodemeio-app"
create_tmux_session "kontenos"  "/opt/dev/kontenos-app"
create_tmux_session "journaltx" "/opt/dev/journaltx-app"
create_tmux_session "kidneuro"  "/opt/dev/kidneuro-app"
create_tmux_session "infra"     "/opt/dev/kodemeio-infra"
create_tmux_session "core"      "/opt/dev/kodemeio-core"
echo ""

# ─── Start SDK API server in background (if enabled) ────────────────
if [ "${ENABLE_SDK_API:-false}" = "true" ] && [ -d /opt/sdk ]; then
    echo "Starting SDK API server on :${SDK_PORT:-3100}..."
    cd /opt/sdk && node server.js &
fi

# ─── Execute CMD ─────────────────────────────────────────────────────
echo "Ready. Executing: $*"
echo "================================================================"
exec "$@"
