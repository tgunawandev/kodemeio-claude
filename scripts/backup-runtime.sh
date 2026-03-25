#!/bin/bash
# =============================================================================
# backup-runtime.sh — Backup Claude runtime volume to prevent data loss
# =============================================================================
# Protects against accidental `docker volume prune`.
# Backs up credentials, session data, MCP cache, and project memory.
#
# Usage:
#   ./scripts/backup-runtime.sh                     # Backup to default path
#   ./scripts/backup-runtime.sh /path/to/backups    # Custom backup path
# =============================================================================
set -euo pipefail

CONTAINER="${CONTAINER_NAME:-kodemeio-claude}"
BACKUP_DIR="${1:-/opt/kodemeio-claude-backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="$BACKUP_DIR/claude-runtime-$TIMESTAMP"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}[BACKUP]${NC} Backing up Claude runtime from $CONTAINER..."

# Check container exists
if ! docker inspect "$CONTAINER" &>/dev/null; then
    echo "Error: Container '$CONTAINER' not found"
    exit 1
fi

mkdir -p "$BACKUP_PATH"

# Copy runtime data
docker cp "$CONTAINER:/home/dev/.claude/." "$BACKUP_PATH/"
SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)

echo -e "${GREEN}[OK]${NC} Backed up to $BACKUP_PATH ($SIZE)"

# Rotate — keep last 5 backups
mapfile -t old_backups < <(ls -dt "$BACKUP_DIR"/claude-runtime-* 2>/dev/null | tail -n +6)
if [ ${#old_backups[@]} -gt 0 ]; then
    rm -rf "${old_backups[@]}"
    echo -e "${CYAN}[CLEANUP]${NC} Removed ${#old_backups[@]} old backup(s) (keeping last 5)"
fi
