#!/bin/bash
# =============================================================================
# install-kctl.sh — Install all kctl-* CLI tools from mounted repos
# =============================================================================
# Each kctl-* tool is a Python package with a cli/ directory containing
# pyproject.toml. They are installed using `uv tool install --editable`
# so changes in the repo are immediately reflected.
#
# Usage:
#   ./install-kctl.sh          # Install all available kctl tools
#   ./install-kctl.sh --check  # Just check which are available
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

# kctl tool name → relative path from /opt/dev
declare -A KCTL_TOOLS=(
    ["kctl-ak"]="kodemeio-core/kodemeio-authentik/cli"
    ["kctl-glitchtip"]="kodemeio-core/kodemeio-glitchtip/cli"
    ["kctl-mailcow"]="kodemeio-core/kodemeio-mailcow/cli"
    ["kctl-mdm"]="kodemeio-core/kodemeio-headwind/cli"
    ["kctl-outline"]="kodemeio-core/kodemeio-outline/cli"
    ["kctl-pg"]="kodemeio-core/kodemeio-postgres-16/cli"
    ["kctl-plane"]="kodemeio-core/kodemeio-plane/cli"
    ["kctl-rmm"]="kodemeio-core/kodemeio-rmm/cli"
    ["kctl-zulip"]="kodemeio-core/kodemeio-zulip/cli"
    ["kctl-odoo"]="kodemeio-app/kodemeio-odoo-18/cli"
    ["kctl-1password"]="kodemeio-ext/kodemeio-1password/cli"
)

BASE_DIR="/opt/dev"
CHECK_ONLY="${1:-}"

echo "================================================================"
echo "  Install kctl-* CLI tools"
echo "================================================================"

installed=0
skipped=0
failed=0

for tool in $(echo "${!KCTL_TOOLS[@]}" | tr ' ' '\n' | sort); do
    cli_path="$BASE_DIR/${KCTL_TOOLS[$tool]}"

    if [ ! -f "$cli_path/pyproject.toml" ]; then
        log_warn "$tool — repo not mounted ($cli_path)"
        skipped=$((skipped + 1))
        continue
    fi

    if [ "$CHECK_ONLY" = "--check" ]; then
        if command -v "$tool" &>/dev/null; then
            log_success "$tool — installed"
        else
            log_warn "$tool — available but not installed ($cli_path)"
        fi
        continue
    fi

    # Check if already installed
    if command -v "$tool" &>/dev/null; then
        log_success "$tool — already installed"
        installed=$((installed + 1))
        continue
    fi

    # Install with uv tool install (editable so repo changes are live)
    log_info "Installing $tool from $cli_path..."
    if uv tool install --editable "$cli_path" 2>/dev/null; then
        log_success "$tool — installed"
        installed=$((installed + 1))
    else
        log_error "$tool — install failed"
        failed=$((failed + 1))
    fi
done

echo ""
echo "================================================================"
echo "  Installed: $installed | Skipped: $skipped | Failed: $failed"
echo "================================================================"
