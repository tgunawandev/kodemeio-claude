#!/bin/bash
# =============================================================================
# generate-env.sh — Generate .env for Hetzner/Dokploy deployment
# =============================================================================
# Interactively prompts for required secrets, generates .env ready
# for deployment. Docker Compose reads .env by default.
#
# Usage:
#   ./scripts/generate-env.sh            # Generate .env
#   ./scripts/generate-env.sh --check    # Validate existing .env
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$REPO_DIR/.env"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ─── Check mode ──────────────────────────────────────────────────────
if [ "${1:-}" = "--check" ]; then
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env not found. Run: make generate-env"
        exit 1
    fi
    echo "================================================================"
    echo "  .env Validation"
    echo "================================================================"
    errors=0
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        key=$(echo "$key" | xargs)  # trim whitespace
        value=$(echo "$value" | xargs)
        if [ -z "$value" ]; then
            # Check if this is a required field
            case "$key" in
                CLAUDE_CODE_OAUTH_TOKEN)
                    # At least one must be set
                    ;;
                SDK_API_KEY|GITHUB_TOKEN)
                    log_warn "  $key is empty (required for full functionality)"
                    ;;
                CLAUDE_CREDENTIALS|ENABLE_FIREWALL|HETZNER_SSH|GITHUB_ORG)
                    # Optional
                    ;;
                *)
                    ;;
            esac
        else
            log_success "  $key = ${value:0:8}..."
        fi
    done < "$ENV_FILE"

    # Check auth
    oauth=$(grep '^CLAUDE_CODE_OAUTH_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
    if [ -z "$oauth" ]; then
        log_error "  CLAUDE_CODE_OAUTH_TOKEN is not set! Run: claude setup-token"
        errors=$((errors + 1))
    fi

    sdk_key=$(grep '^SDK_API_KEY=' "$ENV_FILE" | cut -d= -f2-)
    if [ -z "$sdk_key" ]; then
        log_warn "  SDK_API_KEY is empty — API will be unauthenticated"
    fi

    gh_token=$(grep '^GITHUB_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
    if [ -z "$gh_token" ]; then
        log_warn "  GITHUB_TOKEN is empty — git push/PR will not work"
    fi

    echo "================================================================"
    [ $errors -eq 0 ] && log_success "Validation passed" || log_error "$errors error(s) found"
    exit $errors
fi

# ─── Generate mode ───────────────────────────────────────────────────
echo "================================================================"
echo "  Generate .env for Hetzner/Dokploy"
echo "================================================================"
echo ""

if [ -f "$ENV_FILE" ]; then
    log_warn ".env already exists. Overwrite? (y/N)"
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi
fi

prompt_value() {
    local var_name="$1"
    local description="$2"
    local default="${3:-}"
    local secret="${4:-false}"

    if [ "$secret" = "true" ]; then
        echo -en "${CYAN}$description${NC} [$var_name]: "
        read -rs value
        echo ""
    else
        echo -en "${CYAN}$description${NC} [$var_name] (${default:-empty}): "
        read -r value
    fi
    echo "${value:-$default}"
}

echo "─── Claude Code Authentication (Max subscription) ───"
echo "Run 'claude setup-token' on a machine with a browser to get your token."
echo ""

OAUTH_TOKEN=$(prompt_value "CLAUDE_CODE_OAUTH_TOKEN" "OAuth token (sk-ant-oat01-...)" "" "true")

echo ""
echo "─── SDK API ───"
SDK_API_KEY=$(prompt_value "SDK_API_KEY" "SDK bearer token (for OpenClaw/CI)" "" "true")
SDK_PORT=$(prompt_value "SDK_PORT" "SDK API port" "3100")
ENABLE_SDK_API=$(prompt_value "ENABLE_SDK_API" "Enable SDK API (true/false)" "true")
MAX_CONCURRENT=$(prompt_value "MAX_CONCURRENT" "Max concurrent tasks" "3")

echo ""
echo "─── Git ───"
GIT_USER_NAME=$(prompt_value "GIT_USER_NAME" "Git user name" "Tri Gunawan")
GIT_USER_EMAIL=$(prompt_value "GIT_USER_EMAIL" "Git email" "tri@kodeme.io")
GITHUB_TOKEN=$(prompt_value "GITHUB_TOKEN" "GitHub PAT (repo,workflow,read:org)" "" "true")

echo ""
echo "─── Hetzner / Dokploy ───"
REPOS_BASE_PATH=$(prompt_value "REPOS_BASE_PATH" "Repos path on server" "/opt/repos")
SSH_KEYS_PATH=$(prompt_value "SSH_KEYS_PATH" "SSH keys path on server" "/root/.ssh")
SECRETS_PATH=$(prompt_value "SECRETS_PATH" "kctl credentials path" "/opt/kodemeio-claude-secrets")
CLAUDE_CREDENTIALS=$(prompt_value "CLAUDE_CREDENTIALS" "MCP credentials file path (or empty)" "")

echo ""
echo "─── Optional ───"
ENABLE_FIREWALL=$(prompt_value "ENABLE_FIREWALL" "Enable firewall" "false")
TZ=$(prompt_value "TZ" "Timezone" "Asia/Jakarta")

# ─── Write .env ─────────────────────────────────────────────────
cat > "$ENV_FILE" << ENVEOF
# =============================================================================
# .env — Production environment for kodemeio-claude on Hetzner/Dokploy
# Generated: $(date -Iseconds)
# =============================================================================

# Claude Code Auth (Max subscription)
CLAUDE_CODE_OAUTH_TOKEN=${OAUTH_TOKEN}

# SDK API
SDK_API_KEY=${SDK_API_KEY}
SDK_PORT=${SDK_PORT}
ENABLE_SDK_API=${ENABLE_SDK_API}
MAX_CONCURRENT=${MAX_CONCURRENT}

# Git
GIT_USER_NAME=${GIT_USER_NAME}
GIT_USER_EMAIL=${GIT_USER_EMAIL}
GITHUB_TOKEN=${GITHUB_TOKEN}

# Hetzner / Dokploy
REPOS_BASE_PATH=${REPOS_BASE_PATH}
SSH_KEYS_PATH=${SSH_KEYS_PATH}
SECRETS_PATH=${SECRETS_PATH}
CLAUDE_CREDENTIALS=${CLAUDE_CREDENTIALS}

# Optional
ENABLE_FIREWALL=${ENABLE_FIREWALL}
HETZNER_SSH=root@dokploy.kodeme.io
GITHUB_ORG=kodemeio

# General
TZ=${TZ}
ENVEOF

chmod 600 "$ENV_FILE"

echo ""
echo "================================================================"
log_success ".env generated at $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Validate:  make check-env"
echo "  2. Deploy:    scp .env root@dokploy.kodeme.io:/opt/kodemeio-claude/"
echo "  3. Start:     make up"
echo "================================================================"
