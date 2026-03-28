#!/bin/bash
# =============================================================================
# setup.sh — First-time setup: clone repos, configure git
# =============================================================================
# Run this inside the container to clone all repos if they aren't bind-mounted.
# For production use, repos are bind-mounted from the host — this script is
# primarily for standalone/testing scenarios.
# =============================================================================
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }

DEV_DIR="/opt/dev"
GITHUB_ORG="${GITHUB_ORG:-kodemeio}"

echo "================================================================"
echo "  kodemeio-claude — First-Time Setup"
echo "================================================================"
echo ""

# ─── Git config ──────────────────────────────────────────────────────
log_info "Configuring git..."
git config --global user.name "${GIT_USER_NAME:-Tri Gunawan}"
git config --global user.email "${GIT_USER_EMAIL:-tri@kodeme.io}"
git config --global init.defaultBranch main
git config --global pull.rebase false
log_success "Git configured"

# ─── Verify GitHub authentication ────────────────────────────────────
if gh auth status &>/dev/null; then
    log_success "GitHub CLI authenticated"
else
    log_warn "GitHub CLI not authenticated. Run: gh auth login"
fi

# ─── Clone repos if not present ──────────────────────────────────────
REPOS=(
    # Kodemeio
    "kodemeio-react"
    "kodemeio-odoo"
    "kodemeio-fastapi"
    "kodemeio-next"
    "kodemeio-hono"
    # Core & Infra
    "kodemeio-core"
    "kodemeio-infra"
    # Kontenos
    "kontenos-next"
    "kontenos-fastapi"
    "kontenos-react"
    # JournalTX
    "journaltx-freqtrade"
    "journaltx-quant"
    # KidNeuro
    "kidneuro-godot"
    "kidneuro-savant"
)

log_info "Checking repos in $DEV_DIR..."
cloned=0
skipped=0

for repo in "${REPOS[@]}"; do
    target="$DEV_DIR/$repo"
    if [ -d "$target/.git" ]; then
        skipped=$((skipped + 1))
    else
        log_info "Cloning $repo..."
        if gh repo clone "$GITHUB_ORG/$repo" "$target" 2>/dev/null; then
            log_success "Cloned $repo"
            cloned=$((cloned + 1))
        else
            log_warn "Failed to clone $repo (may not exist or no access)"
        fi
    fi
done

echo ""
echo "================================================================"
log_success "Setup complete: $cloned cloned, $skipped already present"
echo "================================================================"
