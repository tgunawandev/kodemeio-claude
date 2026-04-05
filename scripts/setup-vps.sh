#!/bin/bash
# =============================================================================
# setup-vps.sh — One-shot VPS/bare-metal setup for Claude Code
# =============================================================================
# Installs everything the Docker image provides, directly on the server.
# Idempotent — safe to re-run. Skips already-installed components.
#
# Usage:
#   sudo ./scripts/setup-vps.sh                # Full setup
#   sudo ./scripts/setup-vps.sh --check        # Dry-run: show what would install
#   sudo ./scripts/setup-vps.sh --skip-repos   # Skip repo cloning
#
# After running:
#   su - dev
#   source /opt/kodemeio-claude/scripts/init-session.sh
#   claude
# =============================================================================
set -euo pipefail

CHECK_ONLY=false
SKIP_REPOS=false
for arg in "$@"; do
    case "$arg" in
        --check) CHECK_ONLY=true ;;
        --skip-repos) SKIP_REPOS=true ;;
    esac
done

# ─── Colors ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
log_ok()      { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err()     { echo -e "${RED}[ERR]${NC} $*"; }
log_check()   { echo -e "  $(command -v "$1" &>/dev/null && echo "${GREEN}●${NC}" || echo "${RED}●${NC}") $1"; }

# ─── Configuration ───────────────────────────────────────────────────
DEV_USER="${DEV_USER:-dev}"
DEV_UID="${DEV_UID:-1000}"
DEV_GID="${DEV_GID:-1000}"
REPOS_PATH="${REPOS_PATH:-/opt/dev}"
NODE_MAJOR=22
TERRAFORM_VERSION="1.12.1"
GITHUB_ORG="${GITHUB_ORG:-kodemeio}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
YQ_VERSION="4.44.6"

# ─── Repo list ───────────────────────────────────────────────────────
REPOS=(
    kodemeio-app
    kodemeio-core
    kodemeio-ext
    kodemeio-infra
    kontenos-app
    journaltx-app
    kidneuro-app
)

echo "================================================================"
echo "  Setup Claude Code — VPS/Bare-Metal"
echo "================================================================"
echo ""

if [ "$CHECK_ONLY" = true ]; then
    log_info "CHECK MODE — showing current state, no changes"
    echo ""
fi

# ─── Must be root ────────────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    log_err "This script must be run as root (sudo)"
    exit 1
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 1: System packages
# ═════════════════════════════════════════════════════════════════════
log_info "Phase 1: System packages"

PACKAGES=(
    # Core
    git curl wget ca-certificates sudo
    # Terminal
    tmux zsh fzf less nano vim
    # Build tools
    build-essential python3 python3-pip python3-venv
    # Network
    openssh-client iptables ipset iproute2 dnsutils
    # Utilities
    jq unzip procps man-db ffmpeg bc rsync
    # GitHub CLI
    gh
    # Database clients
    postgresql-client redis-tools
    # Documents
    pandoc
)

# Docker CLI — only add docker.io if Docker CE is not already installed
# (docker.io conflicts with containerd.io from Docker CE repos)
if ! command -v docker &>/dev/null; then
    PACKAGES+=(docker.io docker-compose)
fi

if [ "$CHECK_ONLY" = true ]; then
    for pkg in "${PACKAGES[@]}"; do
        dpkg -l "$pkg" &>/dev/null && echo -e "  ${GREEN}●${NC} $pkg" || echo -e "  ${RED}●${NC} $pkg"
    done
    log_check yq
else
    apt-get update -qq
    apt-get install -y --no-install-recommends "${PACKAGES[@]}"
    # yq (mikefarah) is not in default repos — install pinned binary
    if ! command -v yq &>/dev/null; then
        wget -qO /usr/local/bin/yq "https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}/yq_linux_amd64"
        chmod +x /usr/local/bin/yq
    fi
    apt-get clean && rm -rf /var/lib/apt/lists/*
    log_ok "System packages installed"
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 2: Node.js 22
# ═════════════════════════════════════════════════════════════════════
log_info "Phase 2: Node.js"

if [ "$CHECK_ONLY" = true ]; then
    log_check node
    log_check npm
    log_check pnpm
else
    if ! command -v node &>/dev/null || ! node --version | grep -q "v${NODE_MAJOR}"; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
        apt-get install -y nodejs
        log_ok "Node.js $NODE_MAJOR installed"
    else
        log_ok "Node.js already installed: $(node --version)"
    fi
    npm install -g pnpm@latest 2>/dev/null || true
    log_ok "pnpm installed"
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 3: Python + uv
# ═════════════════════════════════════════════════════════════════════
log_info "Phase 3: Python + uv"

if [ "$CHECK_ONLY" = true ]; then
    log_check python3
    log_check uv
else
    if ! command -v uv &>/dev/null; then
        curl -LsSf https://astral.sh/uv/install.sh | sh
        log_ok "uv installed"
    else
        log_ok "uv already installed"
    fi
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 4: Claude Code + dev tools
# ═════════════════════════════════════════════════════════════════════
log_info "Phase 4: Claude Code + dev tools"

if [ "$CHECK_ONLY" = true ]; then
    log_check claude
    log_check prettier
    log_check ruff
    log_check wt
    log_check terraform
else
    npm install -g @anthropic-ai/claude-code@latest @playwright/cli prettier 2>/dev/null || true
    log_ok "Claude Code + Playwright + prettier installed"

    # Prefer uv (already installed in Phase 3) over pip for ruff
    /root/.local/bin/uv tool install ruff 2>/dev/null || pip3 install --break-system-packages ruff || log_warn "ruff install failed"
    log_ok "ruff installed"

    # Worktrunk
    if ! command -v wt &>/dev/null; then
        curl -fsSL https://github.com/max-sixty/worktrunk/releases/latest/download/wt-x86_64-unknown-linux-gnu.tar.xz \
            | tar -xJ -C /usr/local/bin/ wt && chmod +x /usr/local/bin/wt
        log_ok "worktrunk installed"
    fi

    # Terraform
    if ! command -v terraform &>/dev/null; then
        curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" \
            -o /tmp/terraform.zip && unzip -o /tmp/terraform.zip -d /usr/local/bin/ && rm /tmp/terraform.zip
        log_ok "Terraform installed"
    fi
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 5: Create dev user
# ═════════════════════════════════════════════════════════════════════
log_info "Phase 5: User setup"

if [ "$CHECK_ONLY" = true ]; then
    id "$DEV_USER" &>/dev/null && echo -e "  ${GREEN}●${NC} user: $DEV_USER" || echo -e "  ${RED}●${NC} user: $DEV_USER (missing)"
else
    if ! id "$DEV_USER" &>/dev/null; then
        groupadd -g "$DEV_GID" "$DEV_USER" 2>/dev/null || true
        useradd -m -s /bin/zsh -u "$DEV_UID" -g "$DEV_GID" -G docker "$DEV_USER"
        echo "$DEV_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$DEV_USER"
        log_ok "User $DEV_USER created (UID=$DEV_UID)"
    else
        log_ok "User $DEV_USER already exists"
    fi

    # Shell config (REPO_DIR computed at top of script)
    [ -f "$REPO_DIR/config/zshrc" ] && cp "$REPO_DIR/config/zshrc" "/home/$DEV_USER/.zshrc"
    [ -f "$REPO_DIR/config/tmux.conf" ] && cp "$REPO_DIR/config/tmux.conf" "/home/$DEV_USER/.tmux.conf"

    # History directory
    mkdir -p /commandhistory
    chown "$DEV_USER:$DEV_USER" /commandhistory

    # Ensure uv is on dev user's PATH
    mkdir -p "/home/$DEV_USER/.local/bin"
    [ -f /root/.local/bin/uv ] && cp /root/.local/bin/uv "/home/$DEV_USER/.local/bin/"
    chown -R "$DEV_USER:$DEV_USER" "/home/$DEV_USER"
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 6: Clone repos
# ═════════════════════════════════════════════════════════════════════
log_info "Phase 6: Repositories"

if [ "$CHECK_ONLY" = true ]; then
    for repo in "${REPOS[@]}"; do
        [ -d "$REPOS_PATH/$repo/.git" ] && echo -e "  ${GREEN}●${NC} $repo" || echo -e "  ${RED}●${NC} $repo (missing)"
    done
elif [ "$SKIP_REPOS" = false ]; then
    mkdir -p "$REPOS_PATH"
    for repo in "${REPOS[@]}"; do
        target="$REPOS_PATH/$repo"
        if [ -d "$target/.git" ]; then
            log_ok "$repo already cloned"
        else
            log_info "Cloning $repo..."
            git clone "https://github.com/$GITHUB_ORG/$repo.git" "$target" 2>/dev/null || \
                log_warn "Failed to clone $repo (check GITHUB_TOKEN / SSH keys)"
        fi
    done
    chown -R "$DEV_USER:$DEV_USER" "$REPOS_PATH"
    log_ok "Repos ready at $REPOS_PATH"
else
    log_warn "Skipping repo clone (--skip-repos)"
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 7: Sync Claude Code config
# ═════════════════════════════════════════════════════════════════════
log_info "Phase 7: Claude Code config"

CLAUDE_HOME="/home/$DEV_USER/.claude"

if [ "$CHECK_ONLY" = true ]; then
    [ -d "$CLAUDE_HOME/agents" ] && echo -e "  ${GREEN}●${NC} agents" || echo -e "  ${RED}●${NC} agents"
    [ -d "$CLAUDE_HOME/skills" ] && echo -e "  ${GREEN}●${NC} skills" || echo -e "  ${RED}●${NC} skills"
    [ -f "$CLAUDE_HOME/settings.json" ] && echo -e "  ${GREEN}●${NC} settings.json" || echo -e "  ${RED}●${NC} settings.json"
    [ -f "$CLAUDE_HOME/statusline-command.sh" ] && echo -e "  ${GREEN}●${NC} statusline-command.sh" || echo -e "  ${RED}●${NC} statusline-command.sh"
    [ -f "$CLAUDE_HOME/plugins/known_marketplaces.json" ] && echo -e "  ${GREEN}●${NC} plugin marketplaces" || echo -e "  ${RED}●${NC} plugin marketplaces"
    [ -f "/home/$DEV_USER/.mcp.json" ] && echo -e "  ${GREEN}●${NC} .mcp.json" || echo -e "  ${RED}●${NC} .mcp.json"
else
    mkdir -p "$CLAUDE_HOME"/{agents,skills,commands,rules,projects,plugins}

    # Sync from repo
    for dir in agents skills commands rules; do
        [ -d "$REPO_DIR/config/.claude/$dir" ] && \
            rsync -a --delete "$REPO_DIR/config/.claude/$dir/" "$CLAUDE_HOME/$dir/" 2>/dev/null || true
    done
    [ -f "$REPO_DIR/config/.claude/keybindings.json" ] && \
        cp "$REPO_DIR/config/.claude/keybindings.json" "$CLAUDE_HOME/"
    [ -f "$REPO_DIR/config/.claude/CLAUDE.md" ] && \
        cp "$REPO_DIR/config/.claude/CLAUDE.md" "$CLAUDE_HOME/"

    # Settings — copy as-is from repo (already matches local dev environment)
    # Rewrite any /home/tgunawan → /home/$DEV_USER path references
    if [ -f "$REPO_DIR/config/.claude/settings.json" ]; then
        sed "s|/home/tgunawan|/home/$DEV_USER|g" \
            "$REPO_DIR/config/.claude/settings.json" > "$CLAUDE_HOME/settings.json"
        log_ok "settings.json installed"
    fi

    # Statusline command script
    if [ -f "$REPO_DIR/config/.claude/statusline-command.sh" ]; then
        cp "$REPO_DIR/config/.claude/statusline-command.sh" "$CLAUDE_HOME/statusline-command.sh"
        chmod +x "$CLAUDE_HOME/statusline-command.sh"
        log_ok "statusline-command.sh installed"
    fi

    # Plugin marketplaces registry (Claude Code will auto-install enabled plugins on first launch)
    if [ -f "$REPO_DIR/config/.claude/plugins/known_marketplaces.json" ]; then
        sed "s|/home/tgunawan|/home/$DEV_USER|g" \
            "$REPO_DIR/config/.claude/plugins/known_marketplaces.json" > "$CLAUDE_HOME/plugins/known_marketplaces.json"
        log_ok "plugin marketplaces registered"
    fi
    if [ -f "$REPO_DIR/config/.claude/plugins/installed_plugins.json" ]; then
        sed "s|/home/tgunawan|/home/$DEV_USER|g" \
            "$REPO_DIR/config/.claude/plugins/installed_plugins.json" > "$CLAUDE_HOME/plugins/installed_plugins.json"
        log_ok "plugin manifest installed"
    fi

    # MCP server config (project-scoped MCP servers)
    if [ -f "$REPO_DIR/.mcp.json" ]; then
        cp "$REPO_DIR/.mcp.json" "/home/$DEV_USER/.mcp.json"
        log_ok ".mcp.json installed"
    fi

    # Copy firewall script so ENABLE_FIREWALL=true works on VPS
    [ -f "$REPO_DIR/docker/init-firewall.sh" ] && \
        cp "$REPO_DIR/docker/init-firewall.sh" /usr/local/bin/ && \
        chmod +x /usr/local/bin/init-firewall.sh

    # Ensure HISTFILE is set for persistent history
    if ! grep -q 'HISTFILE' "/home/$DEV_USER/.zshrc" 2>/dev/null; then
        echo 'export HISTFILE=/commandhistory/.zsh_history' >> "/home/$DEV_USER/.zshrc"
    fi

    chown -R "$DEV_USER:$DEV_USER" "$CLAUDE_HOME" "/home/$DEV_USER/.mcp.json" 2>/dev/null || true
    log_ok "Claude config synced"
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 8: Install kctl-* tools
# ═════════════════════════════════════════════════════════════════════
log_info "Phase 8: kctl-* tools"

if [ "$CHECK_ONLY" = true ]; then
    for tool in kctl-ak kctl-odoo kctl-pg kctl-claude kctl-dokploy kctl-hetzner kctl-cloudflare; do
        log_check "$tool"
    done
else
    if [ -f "$REPO_DIR/scripts/install-kctl.sh" ]; then
        # Run as dev user so tools install in their home
        su - "$DEV_USER" -c "export PATH=\"/home/$DEV_USER/.local/bin:\$PATH\" && bash $REPO_DIR/scripts/install-kctl.sh" || \
            log_warn "Some kctl tools failed to install — run manually: su - dev && bash scripts/install-kctl.sh"
    fi
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 9: SDK API systemd service (optional)
# ═════════════════════════════════════════════════════════════════════
log_info "Phase 9: SDK API service (optional)"

SERVICE_FILE="/etc/systemd/system/kodemeio-claude-sdk.service"
if [ "$CHECK_ONLY" = true ]; then
    systemctl is-active kodemeio-claude-sdk &>/dev/null && \
        echo -e "  ${GREEN}●${NC} systemd service: active" || \
        echo -e "  ${YELLOW}●${NC} systemd service: not configured"
else
    SDK_SERVER="$REPO_DIR/sdk/server.js"
    if [ -f "$SDK_SERVER" ]; then
        cat > "$SERVICE_FILE" << UNIT
[Unit]
Description=Kodemeio Claude SDK API
After=network.target

[Service]
Type=simple
User=$DEV_USER
WorkingDirectory=$(dirname "$SDK_SERVER")
ExecStart=$(command -v node) $SDK_SERVER
Restart=on-failure
RestartSec=5
Environment=SDK_PORT=3100
Environment=MAX_CONCURRENT=3
Environment=CLAUDE_CODE_ENABLE_AGENT_TEAMS=1
# IMPORTANT: Set SDK_API_KEY in /home/$DEV_USER/.env before enabling this service
EnvironmentFile=-/home/$DEV_USER/.env

[Install]
WantedBy=multi-user.target
UNIT
        systemctl daemon-reload
        log_ok "SDK API systemd service created (not started)"
        log_info "  Enable: systemctl enable --now kodemeio-claude-sdk"
        log_info "  Config: /home/$DEV_USER/.env (SDK_API_KEY, etc.)"
    else
        log_warn "SDK server.js not found — build first: cd sdk && pnpm install && pnpm run build"
    fi
fi

# ═════════════════════════════════════════════════════════════════════
# Summary
# ═════════════════════════════════════════════════════════════════════
echo ""
echo "================================================================"
if [ "$CHECK_ONLY" = true ]; then
    log_info "Check complete. Run without --check to install."
else
    log_ok "VPS setup complete!"
    echo ""
    echo "  Next steps:"
    echo "    1. su - $DEV_USER"
    echo "    2. source $REPO_DIR/scripts/init-session.sh"
    echo "    3. claude"
    echo ""
    echo "  Optional:"
    echo "    - Set CLAUDE_CODE_OAUTH_TOKEN in /home/$DEV_USER/.env"
    echo "    - Enable SDK API: systemctl enable --now kodemeio-claude-sdk"
    echo "    - Add to .zprofile: source $REPO_DIR/scripts/init-session.sh"
fi
echo "================================================================"
