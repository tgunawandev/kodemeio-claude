#!/bin/bash
# =============================================================================
# sync-secrets.sh — Deploy secrets to Hetzner for the Claude Code container
# =============================================================================
# Syncs local credential files to the Hetzner server. These files contain
# secrets and are NEVER committed to git.
#
# What gets synced:
#   ~/.config/kodemeio/config.yaml  → kctl-* CLI credentials (all 11 tools)
#   (Adapts paths for container: /home/tgunawan/... → /opt/dev/...)
#
# Usage:
#   ./scripts/sync-secrets.sh                    # Deploy to Hetzner
#   ./scripts/sync-secrets.sh --dry-run          # Preview only
#   ./scripts/sync-secrets.sh --server user@host # Custom server
# =============================================================================
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }

# Defaults
SERVER="${HETZNER_SSH:-root@dokploy.kodeme.io}"
REMOTE_CONFIG_DIR="/opt/kodemeio-claude-secrets"
DRY_RUN=false

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        --server) SERVER="$2"; shift 2 ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

echo "================================================================"
echo "  Sync secrets → Hetzner ($SERVER)"
echo "================================================================"

# ─── kctl config.yaml ────────────────────────────────────────────────
LOCAL_CONFIG="$HOME/.config/kodemeio/config.yaml"
if [ ! -f "$LOCAL_CONFIG" ]; then
    log_error "Local config not found: $LOCAL_CONFIG"
    exit 1
fi

# Create a container-adapted copy (fix paths)
TEMP_CONFIG=$(mktemp)
sed \
    -e 's|/home/tgunawan/project/00-new-projects/kodemeio-app|/opt/dev/kodemeio-app|g' \
    -e 's|/home/tgunawan/project/00-new-projects/kodemeio-core|/opt/dev/kodemeio-core|g' \
    -e 's|/home/tgunawan/project/00-new-projects/kodemeio-ext|/opt/dev/kodemeio-ext|g' \
    -e 's|/home/tgunawan/project/00-new-projects/kodemeio-infra|/opt/dev/kodemeio-infra|g' \
    -e 's|/home/tgunawan/project/00-new-projects/abcfood|/opt/dev/abcfood|g' \
    -e 's|~/.ssh/|/home/dev/.ssh/|g' \
    "$LOCAL_CONFIG" > "$TEMP_CONFIG"

log_info "kctl config.yaml: $(wc -l < "$TEMP_CONFIG") lines, paths adapted for container"

if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN — would sync to $SERVER:$REMOTE_CONFIG_DIR/"
    echo ""
    echo "Container-adapted config preview:"
    head -20 "$TEMP_CONFIG"
    echo "..."
    rm -f "$TEMP_CONFIG"
    exit 0
fi

# Deploy to Hetzner
log_info "Creating remote directory..."
ssh "$SERVER" "mkdir -p $REMOTE_CONFIG_DIR && chmod 700 $REMOTE_CONFIG_DIR"

log_info "Uploading config.yaml..."
scp "$TEMP_CONFIG" "$SERVER:$REMOTE_CONFIG_DIR/config.yaml"
ssh "$SERVER" "chmod 600 $REMOTE_CONFIG_DIR/config.yaml"

rm -f "$TEMP_CONFIG"

echo ""
echo "================================================================"
log_success "Secrets deployed to $SERVER:$REMOTE_CONFIG_DIR/"
echo ""
echo "Mount in docker-compose.prod.yml:"
echo "  - $REMOTE_CONFIG_DIR:/home/dev/.config/kodemeio:ro"
echo "================================================================"
