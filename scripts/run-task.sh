#!/bin/bash
# =============================================================================
# run-task.sh — Trigger headless Claude Code task
# =============================================================================
# Usage:
#   ./run-task.sh <workspace> <prompt>
#   ./run-task.sh kodemeio-app "Fix the auth bug in the login page"
#   ./run-task.sh kodemeio-react "Add Indonesian translations for TPM"
#
# Environment:
#   ALLOWED_TOOLS  - Comma-separated tools (default: Bash,Read,Edit,Write)
#   OUTPUT_FORMAT  - Output format (default: json)
#   TIMEOUT        - Task timeout in seconds (default: 300)
# =============================================================================
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ $# -lt 2 ]; then
    echo -e "${RED}Usage: $0 <workspace> <prompt>${NC}"
    echo ""
    echo "Workspaces:"
    for dir in /opt/dev/*/; do
        [ -d "$dir/.git" ] && echo "  $(basename "$dir")"
    done
    exit 1
fi

WORKSPACE="$1"
PROMPT="$2"
ALLOWED_TOOLS="${ALLOWED_TOOLS:-Bash,Read,Edit,Write}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
TIMEOUT="${TIMEOUT:-300}"
CWD="/opt/dev/$WORKSPACE"

if [ ! -d "$CWD" ]; then
    echo -e "${RED}Error: Workspace '$WORKSPACE' not found at $CWD${NC}"
    exit 1
fi

echo -e "${CYAN}[TASK]${NC} Workspace: $WORKSPACE"
echo -e "${CYAN}[TASK]${NC} Prompt: $PROMPT"
echo -e "${CYAN}[TASK]${NC} Tools: $ALLOWED_TOOLS"
echo ""

# Run Claude Code headless
timeout "$TIMEOUT" claude -p "$PROMPT" \
    --dangerously-skip-permissions \
    --allowedTools "$ALLOWED_TOOLS" \
    --output-format "$OUTPUT_FORMAT" \
    --cwd "$CWD" || {
    exit_code=$?
    if [ $exit_code -eq 124 ]; then
        echo -e "${RED}Error: Task timed out after ${TIMEOUT}s${NC}"
    else
        echo -e "${RED}Error: Claude Code exited with code $exit_code${NC}"
    fi
    exit $exit_code
}

echo ""
echo -e "${GREEN}[DONE]${NC} Task completed"
