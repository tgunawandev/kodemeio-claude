#!/bin/bash
# =============================================================================
# verify-scores.sh — Verify Claude Code configuration completeness
# =============================================================================
# Usage:
#   ./scripts/verify-scores.sh              # Check local ~/.claude
#   ./scripts/verify-scores.sh /path/.claude # Check specific directory
# =============================================================================
set -euo pipefail

CLAUDE_DIR="${1:-$HOME/.claude}"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

check() {
    local name="$1" result="$2"
    if [ "$result" = "true" ]; then
        echo -e "  ${GREEN}[PASS]${NC} $name"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}[FAIL]${NC} $name"
        FAIL=$((FAIL + 1))
    fi
}

echo "================================================================"
echo "  Claude Code Configuration Verification"
echo "  Directory: $CLAUDE_DIR"
echo "================================================================"
echo ""

# ─── Rules ────────────────────────────────────────────────────────────
echo -e "${CYAN}Rules:${NC}"
check "Rules directory exists" "$([ -d "$CLAUDE_DIR/rules" ] && echo true || echo false)"
rules_count=$(find "$CLAUDE_DIR/rules" -name '*.md' 2>/dev/null | wc -l)
check "At least 3 rule files ($rules_count found)" "$([ "$rules_count" -ge 3 ] && echo true || echo false)"

# ─── Hooks ────────────────────────────────────────────────────────────
echo -e "\n${CYAN}Hooks:${NC}"
check "settings.json exists" "$([ -f "$CLAUDE_DIR/settings.json" ] && echo true || echo false)"
check "PreToolUse hooks configured" "$(grep -q 'PreToolUse' "$CLAUDE_DIR/settings.json" 2>/dev/null && echo true || echo false)"
check "PostToolUse hooks configured" "$(grep -q 'PostToolUse' "$CLAUDE_DIR/settings.json" 2>/dev/null && echo true || echo false)"
check "Stop hook configured" "$(grep -q 'Stop' "$CLAUDE_DIR/settings.json" 2>/dev/null && echo true || echo false)"

# ─── Keybindings ──────────────────────────────────────────────────────
echo -e "\n${CYAN}Keybindings:${NC}"
check "keybindings.json exists" "$([ -f "$CLAUDE_DIR/keybindings.json" ] && echo true || echo false)"

# ─── Agents ───────────────────────────────────────────────────────────
echo -e "\n${CYAN}Agents:${NC}"
agents_count=$(find "$CLAUDE_DIR/agents" -name '*.md' 2>/dev/null | wc -l)
check "At least 2 agents ($agents_count found)" "$([ "$agents_count" -ge 2 ] && echo true || echo false)"

# ─── Skills ───────────────────────────────────────────────────────────
echo -e "\n${CYAN}Skills:${NC}"
skills_count=$(find "$CLAUDE_DIR/skills" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
check "At least 10 skills ($skills_count found)" "$([ "$skills_count" -ge 10 ] && echo true || echo false)"

# ─── Commands ─────────────────────────────────────────────────────────
echo -e "\n${CYAN}Commands:${NC}"
commands_count=$(find "$CLAUDE_DIR/commands" -name '*.md' 2>/dev/null | wc -l)
check "At least 1 command ($commands_count found)" "$([ "$commands_count" -ge 1 ] && echo true || echo false)"

# ─── Plugins ──────────────────────────────────────────────────────────
echo -e "\n${CYAN}Plugins:${NC}"
check "Plugins configured" "$(grep -q 'enabledPlugins' "$CLAUDE_DIR/settings.json" 2>/dev/null && echo true || echo false)"
check "alwaysThinkingEnabled" "$(grep -q 'alwaysThinkingEnabled' "$CLAUDE_DIR/settings.json" 2>/dev/null && echo true || echo false)"

# ─── MCP ──────────────────────────────────────────────────────────────
echo -e "\n${CYAN}MCP:${NC}"
check "enableAllProjectMcpServers" "$(grep -rq 'enableAllProjectMcpServers' "$CLAUDE_DIR/settings.json" "$CLAUDE_DIR/settings.local.json" 2>/dev/null && echo true || echo false)"

# ─── Auth ─────────────────────────────────────────────────────────────
echo -e "\n${CYAN}Authentication:${NC}"
check "Credentials file exists" "$([ -f "$CLAUDE_DIR/.credentials.json" ] && echo true || echo false)"

# ─── Summary ──────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL))
echo ""
echo "================================================================"
if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}ALL CHECKS PASSED${NC}: $PASS/$TOTAL"
else
    echo -e "  ${RED}$FAIL FAILED${NC}, $PASS passed out of $TOTAL checks"
fi
echo "================================================================"

exit $(( FAIL > 0 ? 1 : 0 ))
