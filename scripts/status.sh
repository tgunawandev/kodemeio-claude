#!/bin/bash
# =============================================================================
# status.sh — One-page Claude Code status dashboard
# =============================================================================
# Shows a comprehensive overview of your Claude Code setup — local, repo,
# and remote server status in a single terminal view.
#
# Usage:
#   ./scripts/status.sh           # Full dashboard
#   ./scripts/status.sh --json    # Machine-readable JSON output
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
CLAUDE_DIR="${HOME}/.claude"
CONFIG_DIR="$REPO_DIR/config/.claude"
JSON_MODE=false
[[ "${1:-}" == "--json" ]] && JSON_MODE=true

# ─── Colors ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}●${NC} $1"; }
warn() { echo -e "  ${YELLOW}●${NC} $1"; }
fail() { echo -e "  ${RED}●${NC} $1"; }
dim()  { echo -e "  ${DIM}$1${NC}"; }
hdr()  { echo -e "\n${BOLD}${CYAN}$1${NC}"; }

# ─── Collect data ────────────────────────────────────────────────────

# Local Claude Code
claude_installed=false
claude_version=""
if command -v claude &>/dev/null; then
    claude_installed=true
    claude_version=$(claude --version 2>/dev/null || echo "unknown")
fi

# Auth
has_credentials=false
[ -f "$CLAUDE_DIR/.credentials.json" ] && has_credentials=true
has_oauth=false
[ -f "$HOME/.claude.json" ] && has_oauth=true

# Local config counts
local_agents=$(find "$CLAUDE_DIR/agents" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
local_skills=$(find "$CLAUDE_DIR/skills" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
local_commands=$(find "$CLAUDE_DIR/commands" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
local_rules=$(find "$CLAUDE_DIR/rules" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

# Repo config counts
repo_agents=$(find "$CONFIG_DIR/agents" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
repo_skills=$(find "$CONFIG_DIR/skills" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
repo_commands=$(find "$CONFIG_DIR/commands" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
repo_rules=$(find "$CONFIG_DIR/rules" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

# Sync status (compare local vs repo)
sync_status="synced"
sync_details=()
for dir in agents skills commands rules; do
    if [ -d "$CLAUDE_DIR/$dir" ] && [ -d "$CONFIG_DIR/$dir" ]; then
        diff_output=$(diff -rq "$CLAUDE_DIR/$dir" "$CONFIG_DIR/$dir" 2>/dev/null || true)
        if [ -n "$diff_output" ]; then
            count=$(echo "$diff_output" | wc -l | tr -d ' ')
            sync_details+=("$dir:$count")
            sync_status="out-of-sync"
        fi
    fi
done

# Settings.json checks
has_settings=false
has_hooks=false
has_plugins=false
thinking_enabled=false
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    has_settings=true
    grep -q '"PreToolUse"' "$CLAUDE_DIR/settings.json" 2>/dev/null && has_hooks=true
    grep -q '"enabledPlugins"' "$CLAUDE_DIR/settings.json" 2>/dev/null && has_plugins=true
    grep -q '"alwaysThinkingEnabled".*true' "$CLAUDE_DIR/settings.json" 2>/dev/null && thinking_enabled=true
fi

# MCP config
has_mcp=false
mcp_servers=0
if [ -f "$HOME/.mcp.json" ]; then
    has_mcp=true
    mcp_servers=$(grep -c '"command"' "$HOME/.mcp.json" 2>/dev/null || echo "0")
fi

# Git status
git_branch=""
git_clean=true
git_remote=""
if [ -d "$REPO_DIR/.git" ]; then
    git_branch=$(git -C "$REPO_DIR" branch --show-current 2>/dev/null || echo "")
    git_status=$(git -C "$REPO_DIR" status --porcelain 2>/dev/null || echo "")
    [ -n "$git_status" ] && git_clean=false
    git_remote=$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || echo "none")
fi

# Dev tools
has_ruff=$(command -v ruff &>/dev/null && echo true || echo false)
has_prettier=$(command -v prettier &>/dev/null && echo true || echo false)
has_pnpm=$(command -v pnpm &>/dev/null && echo true || echo false)
has_uv=$(command -v uv &>/dev/null && echo true || echo false)
has_gh=$(command -v gh &>/dev/null && echo true || echo false)
has_docker=$(command -v docker &>/dev/null && echo true || echo false)

# kctl tools installed
kctl_installed=0
kctl_total=14
for tool in kctl-ak kctl-glitchtip kctl-mailcow kctl-mdm kctl-outline kctl-pg \
            kctl-plane kctl-rmm kctl-zulip kctl-odoo kctl-1password kctl-dokploy \
            kctl-cloudflare kctl-hetzner; do
    command -v "$tool" &>/dev/null && kctl_installed=$((kctl_installed + 1))
done

# kctl config
has_kctl_config=false
[ -f "$HOME/.config/kodemeio/config.yaml" ] && has_kctl_config=true

# Remote server (quick check, 2s timeout)
server_host="${HETZNER_SSH:-root@dokploy.kodeme.io}"
container_running=false
container_healthy=false
sdk_api_up=false

if [ "$has_docker" = true ]; then
    # Check local container
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'kodemeio-claude'; then
        container_running=true
        health=$(docker inspect --format='{{.State.Health.Status}}' kodemeio-claude 2>/dev/null || echo "none")
        [ "$health" = "healthy" ] && container_healthy=true
    fi
fi

# Try SDK API (local first, then remote)
sdk_response=""
for url in "http://localhost:3100/health" "http://127.0.0.1:3100/health"; do
    sdk_response=$(curl -sf --connect-timeout 2 --max-time 3 "$url" 2>/dev/null || true)
    [ -n "$sdk_response" ] && { sdk_api_up=true; break; }
done

sdk_in_flight=""
sdk_max_concurrent=""
if [ -n "$sdk_response" ]; then
    sdk_in_flight=$(echo "$sdk_response" | jq -r '.inFlight // empty' 2>/dev/null || echo "")
    sdk_max_concurrent=$(echo "$sdk_response" | jq -r '.maxConcurrent // empty' 2>/dev/null || echo "")
fi

# Pre-push hook
has_hook=false
[ -f "$REPO_DIR/.git/hooks/pre-push" ] && has_hook=true

# ─── JSON output ─────────────────────────────────────────────────────

if [ "$JSON_MODE" = true ]; then
    cat <<ENDJSON
{
  "timestamp": "$(date -Iseconds)",
  "claude": {
    "installed": $claude_installed,
    "version": "$claude_version"
  },
  "auth": {
    "credentials": $has_credentials,
    "oauth": $has_oauth
  },
  "config": {
    "local": { "agents": $local_agents, "skills": $local_skills, "commands": $local_commands, "rules": $local_rules },
    "repo":  { "agents": $repo_agents,  "skills": $repo_skills,  "commands": $repo_commands,  "rules": $repo_rules },
    "sync_status": "$sync_status",
    "settings": $has_settings,
    "hooks": $has_hooks,
    "plugins": $has_plugins,
    "thinking": $thinking_enabled,
    "mcp_servers": $mcp_servers
  },
  "tools": {
    "ruff": $has_ruff, "prettier": $has_prettier, "pnpm": $has_pnpm,
    "uv": $has_uv, "gh": $has_gh, "docker": $has_docker,
    "kctl_installed": $kctl_installed, "kctl_total": $kctl_total,
    "kctl_config": $has_kctl_config
  },
  "server": {
    "container_running": $container_running,
    "container_healthy": $container_healthy,
    "sdk_api_up": $sdk_api_up,
    "sdk_in_flight": ${sdk_in_flight:-null},
    "sdk_max_concurrent": ${sdk_max_concurrent:-null}
  },
  "git": {
    "branch": "$git_branch",
    "clean": $git_clean,
    "pre_push_hook": $has_hook
  }
}
ENDJSON
    exit 0
fi

# ─── Dashboard output ────────────────────────────────────────────────

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Claude Code Status Dashboard${NC}         $(date '+%Y-%m-%d %H:%M')"
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"

# ── Claude Code ──
hdr "CLAUDE CODE"
if [ "$claude_installed" = true ]; then
    ok "Installed: ${BOLD}$claude_version${NC}"
else
    fail "Not installed — run: npm i -g @anthropic-ai/claude-code"
fi
if [ "$has_credentials" = true ]; then ok "Credentials: found"; else warn "Credentials: missing (run: claude login)"; fi
if [ "$has_oauth" = true ]; then ok "OAuth: configured"; else dim "OAuth: not set"; fi

# ── Config ──
hdr "CONFIG (local / repo)"
printf "  %-12s ${BOLD}%-8s${NC} │ ${DIM}%-8s${NC}\n" "" "Local" "Repo"
printf "  %-12s %-8s │ %-8s\n" "Agents" "$local_agents" "$repo_agents"
printf "  %-12s %-8s │ %-8s\n" "Skills" "$local_skills" "$repo_skills"
printf "  %-12s %-8s │ %-8s\n" "Commands" "$local_commands" "$repo_commands"
printf "  %-12s %-8s │ %-8s\n" "Rules" "$local_rules" "$repo_rules"
echo ""
if [ "$sync_status" = "synced" ]; then
    ok "Sync: ${GREEN}in sync${NC}"
else
    warn "Sync: ${YELLOW}out of sync${NC} — run: make sync-config"
    for detail in "${sync_details[@]}"; do
        dir="${detail%%:*}"
        count="${detail##*:}"
        dim "  $dir: $count file(s) differ"
    done
fi

# ── Settings ──
hdr "SETTINGS"
if [ "$has_settings" = true ]; then ok "settings.json: found"; else fail "settings.json: missing"; fi
if [ "$has_hooks" = true ];    then ok "Hooks: configured (PreToolUse/PostToolUse)"; else warn "Hooks: not configured"; fi
if [ "$has_plugins" = true ];  then ok "Plugins: enabled"; else warn "Plugins: not configured"; fi
if [ "$thinking_enabled" = true ]; then ok "Extended thinking: on"; else dim "Extended thinking: off"; fi
if [ "$has_mcp" = true ]; then ok "MCP servers: $mcp_servers configured"; else dim "MCP: not configured"; fi

# ── Tools ──
hdr "DEV TOOLS"
tool_line=""
for pair in "ruff:$has_ruff" "prettier:$has_prettier" "pnpm:$has_pnpm" "uv:$has_uv" "gh:$has_gh" "docker:$has_docker"; do
    name="${pair%%:*}"
    val="${pair##*:}"
    if [ "$val" = true ]; then
        tool_line+="${GREEN}●${NC}$name  "
    else
        tool_line+="${RED}●${NC}$name  "
    fi
done
echo -e "  $tool_line"

if [ "$kctl_installed" -eq "$kctl_total" ]; then
    ok "kctl tools: ${BOLD}$kctl_installed/$kctl_total${NC} installed"
elif [ "$kctl_installed" -gt 0 ]; then
    warn "kctl tools: ${BOLD}$kctl_installed/$kctl_total${NC} installed"
else
    dim "kctl tools: 0/$kctl_total (run: make install-kctl inside container)"
fi
if [ "$has_kctl_config" = true ]; then ok "kctl config: found"; else warn "kctl config: missing (~/.config/kodemeio/config.yaml)"; fi

# ── Server ──
hdr "SERVER"
if [ "$container_running" = true ]; then
    ok "Container: ${GREEN}running${NC}"
    if [ "$container_healthy" = true ]; then
        ok "Health: ${GREEN}healthy${NC}"
    else
        warn "Health: ${YELLOW}not healthy${NC}"
    fi
else
    dim "Container: not running locally"
fi

if [ "$sdk_api_up" = true ]; then
    ok "SDK API: ${GREEN}up${NC} — ${sdk_in_flight:-0}/${sdk_max_concurrent:-3} tasks in flight"
else
    dim "SDK API: not reachable (localhost:3100)"
fi

# ── Git ──
hdr "GIT"
if [ -n "$git_branch" ]; then
    ok "Branch: ${BOLD}$git_branch${NC}"
else
    dim "Not a git repo"
fi
if [ "$git_clean" = true ]; then
    ok "Working tree: ${GREEN}clean${NC}"
else
    warn "Working tree: ${YELLOW}uncommitted changes${NC}"
fi
if [ "$has_hook" = true ]; then
    ok "Pre-push hook: installed"
else
    dim "Pre-push hook: not installed (run: make setup-local)"
fi

# ── Summary bar ──
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"

# Count issues
issues=0
[ "$claude_installed" = false ] && issues=$((issues + 1))
[ "$has_credentials" = false ] && issues=$((issues + 1))
[ "$has_settings" = false ] && issues=$((issues + 1))
[ "$sync_status" != "synced" ] && issues=$((issues + 1))
[ "$git_clean" = false ] && issues=$((issues + 1))

if [ "$issues" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}All clear${NC} — no issues found"
else
    echo -e "  ${YELLOW}${BOLD}$issues issue(s)${NC} need attention"
fi
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
echo ""
