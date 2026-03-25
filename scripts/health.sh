#!/bin/bash
# =============================================================================
# health.sh — Container health check
# =============================================================================
# Used by Docker HEALTHCHECK and Makefile to verify the container is healthy.
# Exit 0 = healthy, Exit 1 = unhealthy
# =============================================================================
set -euo pipefail

errors=0

# Check Claude Code is installed
if ! command -v claude &>/dev/null; then
    echo "FAIL: claude command not found"
    errors=$((errors + 1))
else
    echo "OK: claude $(claude --version 2>/dev/null || echo 'unknown')"
fi

# Check git is configured
if git config --global user.email &>/dev/null; then
    echo "OK: git configured ($(git config --global user.email))"
else
    echo "FAIL: git not configured"
    errors=$((errors + 1))
fi

# Check tmux sessions
session_count=$(tmux list-sessions 2>/dev/null | wc -l || echo "0")
echo "OK: $session_count tmux session(s)"

# Check mounted workspaces
workspace_count=0
for dir in /opt/dev/*/; do
    [ -d "$dir/.git" ] && workspace_count=$((workspace_count + 1))
done
echo "OK: $workspace_count workspace(s) mounted"

# Check SDK API if enabled
if [ "${ENABLE_SDK_API:-false}" = "true" ]; then
    if curl -sf http://localhost:3100/health &>/dev/null; then
        echo "OK: SDK API responding"
    else
        echo "FAIL: SDK API not responding"
        errors=$((errors + 1))
    fi
fi

# Result
if [ $errors -gt 0 ]; then
    echo "UNHEALTHY: $errors check(s) failed"
    exit 1
fi

echo "HEALTHY"
exit 0
