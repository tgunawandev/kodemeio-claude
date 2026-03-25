#!/bin/bash
# =============================================================================
# entrypoint-sdk.sh — SDK API server entrypoint (lightweight)
# =============================================================================
set -euo pipefail

echo "================================================================"
echo "  kodemeio-claude SDK — API Server"
echo "================================================================"

# ─── Git configuration ───────────────────────────────────────────────
if [ -n "${GIT_USER_NAME:-}" ]; then
    git config --global user.name "$GIT_USER_NAME"
fi
if [ -n "${GIT_USER_EMAIL:-}" ]; then
    git config --global user.email "$GIT_USER_EMAIL"
fi
if [ -n "${GITHUB_TOKEN:-}" ]; then
    export GH_TOKEN="${GITHUB_TOKEN}"
    echo "${GITHUB_TOKEN}" | gh auth login --with-token 2>/dev/null && \
        gh auth setup-git 2>/dev/null || true
fi

# Safe directories for all mounted repos
for dir in /opt/dev/*/; do
    [ -d "$dir/.git" ] && git config --global --add safe.directory "$dir"
done
for dir in /opt/dev/*/*/; do
    [ -d "$dir/.git" ] && git config --global --add safe.directory "$dir"
done

# ─── Claude Code auth setup ──────────────────────────────────────────
if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    if [ ! -f /home/dev/.claude.json ] || ! grep -q 'hasCompletedOnboarding' /home/dev/.claude.json 2>/dev/null; then
        echo '{"hasCompletedOnboarding": true}' > /home/dev/.claude.json
        echo "  [+] Created .claude.json with onboarding bypass"
    fi
fi

if [ -n "${ANTHROPIC_API_KEY:-}" ] && [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    echo "  [!] WARNING: Both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN are set."
    echo "      ANTHROPIC_API_KEY takes precedence — uses API credits, NOT your subscription."
fi

# ─── Claude Code verification ────────────────────────────────────────
echo "Claude Code version: $(claude --version 2>/dev/null || echo 'not found')"
echo "Starting SDK API server on :${SDK_PORT:-3100}..."
echo "================================================================"

# ─── Start SDK server ────────────────────────────────────────────────
cd /opt/sdk
exec node server.js
