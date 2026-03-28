#!/bin/bash
# =============================================================================
# entrypoint.sh — Docker container entrypoint
# =============================================================================
# Delegates to init-session.sh for the shared initialization logic,
# then executes the container CMD (default: tmux).
# =============================================================================
set -euo pipefail

echo "================================================================"
echo "  kodemeio-claude — Remote Development Container"
echo "================================================================"

# ─── Run shared session initialization ───────────────────────────────
# init-session.sh handles: config seeding, git, SSH, Claude auth,
# tmux sessions, kctl tools, and SDK API startup.
export REPOS_PATH="${REPOS_PATH:-/opt/dev}"
export CLAUDE_DIR="${CLAUDE_DIR:-/home/dev/.claude}"

source /opt/scripts/init-session.sh

# ─── Execute CMD ─────────────────────────────────────────────────────
echo "Ready. Executing: $*"
echo "================================================================"
exec "$@"
