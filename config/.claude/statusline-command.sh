#!/bin/bash

# Read the JSON input from stdin
input=$(cat)

# Extract fields
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // "Unknown"')
raw_cwd="$cwd"
# Replace home directory with ~
cwd="${cwd/#$HOME/\~}"
version=$(echo "$input" | jq -r '.version // "Unknown"')
model_name=$(echo "$input" | jq -r '.model.display_name // "Unknown Model"')

# Detect API URL
if [[ -n "$ANTHROPIC_BASE_URL" ]]; then
    # Custom API endpoint - show full URL as set
    api_url="$ANTHROPIC_BASE_URL"
elif [[ -n "$ANTHROPIC_API_KEY" ]]; then
    # Default Anthropic API
    api_url="api.anthropic.com"
elif [[ -n "$AWS_REGION" ]]; then
    # AWS Bedrock
    api_url="bedrock.${AWS_REGION}.amazonaws.com"
elif [[ -n "$GOOGLE_CLOUD_PROJECT" ]]; then
    # Google Vertex AI
    api_url="vertex-ai.googleapis.com"
else
    # Check if cost exists (indicates API mode)
    cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
    # Use awk for reliable float comparison (bc might not be available)
    if awk -v c="$cost" 'BEGIN { exit (c > 0) ? 0 : 1 }' 2>/dev/null; then
        api_url="api.anthropic.com"
    else
        # API Usage Billing mode
        api_url="API Usage Billing"
    fi
fi

# Get git information (skip optional locks to avoid blocking)
git_info=""
if [[ -d "$raw_cwd/.git" ]] || git -C "$raw_cwd" rev-parse --git-dir > /dev/null 2>&1; then
    # Get current branch name
    branch=$(git -C "$raw_cwd" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null || \
             git -C "$raw_cwd" --no-optional-locks describe --tags --exact-match 2>/dev/null || \
             git -C "$raw_cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null || echo "unknown")

    # Check if working directory is clean
    if git -C "$raw_cwd" --no-optional-locks diff-index --quiet HEAD -- 2>/dev/null; then
        status_marker="✓"
        status_color="32"  # Green for clean
    else
        status_marker="✗"
        status_color="31"  # Red for dirty
    fi

    # Get ahead/behind information
    upstream=$(git -C "$raw_cwd" --no-optional-locks rev-parse --abbrev-ref @{upstream} 2>/dev/null)
    ahead_behind=""
    if [[ -n "$upstream" ]]; then
        ahead=$(git -C "$raw_cwd" --no-optional-locks rev-list --count @{upstream}..HEAD 2>/dev/null || echo "0")
        behind=$(git -C "$raw_cwd" --no-optional-locks rev-list --count HEAD..@{upstream} 2>/dev/null || echo "0")

        if [[ "$ahead" != "0" ]] || [[ "$behind" != "0" ]]; then
            ahead_behind=" "
            [[ "$ahead" != "0" ]] && ahead_behind+="↑$ahead"
            [[ "$behind" != "0" ]] && ahead_behind+="↓$behind"
        fi
    fi

    # Build git info string with proper escape sequences
    git_info=$(printf ' \033[0m|\033[0m \033[%smgit:(%s%s) %s\033[0m' \
        "$status_color" "$branch" "$ahead_behind" "$status_marker")
fi

# Print comprehensive statusline with all requested information
# Format: [CWD] | [Git Info] | [API URL] | [Model Name] | [Version]
# Colors: Blue for path, Green/Red for git, Magenta for API, Cyan for model, Yellow for version
printf '\033[01;34m%s\033[0m%s \033[0m|\033[0m \033[35mAPI:\033[0m \033[35m%s\033[0m \033[0m|\033[0m \033[36m%s\033[0m \033[0m|\033[0m \033[33mv%s\033[0m' \
    "$cwd" "$git_info" "$api_url" "$model_name" "$version"
