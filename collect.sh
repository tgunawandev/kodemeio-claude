#!/bin/bash
# =============================================================================
# collect.sh - Collect all CLAUDE.md files from the ABCFood ecosystem
# =============================================================================
# Scans the abcfood project tree for CLAUDE.md files and generates a
# browsable knowledge base with categorized index, gap analysis, and
# concatenated search file.
#
# Usage:
#   ./collect.sh              # Collect and generate all output
#   ./collect.sh --dry-run    # Preview what would be collected
#   ./collect.sh --stats      # Show statistics only
#   ./collect.sh --help       # Show help message
#
# Environment variables:
#   REPOS_BASE_PATH  - Base path where repos are located
#                      Default: /home/tgunawan/project/00-new-projects/abcfood
#   DEBUG            - Set to "true" for verbose output
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPOS_BASE_PATH="${REPOS_BASE_PATH:-/home/tgunawan/project/00-new-projects/abcfood}"

# Output paths (relative to script dir)
DOCS_DIR="$SCRIPT_DIR/docs"
INDEX_FILE="$SCRIPT_DIR/INDEX.md"
GAPS_FILE="$SCRIPT_DIR/GAPS.md"
ALL_FILE="$SCRIPT_DIR/ALL-CLAUDE.md"

# Directories to exclude from scanning (space-separated)
EXCLUDE_DIRS="${EXCLUDE_DIRS:-node_modules vendor __pycache__ .venv venv .git .tox .pytest_cache .mypy_cache dist build egg-info site-packages}"

# This project's own directory name (excluded from scanning)
SELF_DIR="abcfood-claude-code"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1" >&2
    fi
}

# Check if a path should be excluded
should_exclude() {
    local path="$1"
    for exclude in $EXCLUDE_DIRS; do
        if [[ "$path" == *"/$exclude/"* ]] || [[ "$path" == *"/$exclude" ]]; then
            return 0
        fi
    done
    return 1
}

# Extract first H1 heading or first meaningful line from a CLAUDE.md file
extract_description() {
    local file="$1"
    local desc=""

    # Try first H1 heading
    desc=$(grep -m1 '^# ' "$file" 2>/dev/null | sed 's/^# //' | sed 's/[[:space:]]*$//' || echo "")
    if [[ -n "$desc" ]]; then
        echo "$desc"
        return
    fi

    # Fallback: first non-empty, non-heading line
    desc=$(grep -m1 -v '^$\|^#\|^---' "$file" 2>/dev/null | sed 's/[[:space:]]*$//' || echo "")
    if [[ -n "$desc" ]]; then
        echo "$desc"
        return
    fi

    echo "(no description)"
}

# Extract a short summary (first paragraph after the H1)
extract_summary() {
    local file="$1"
    # Get first non-empty line after the first heading, skip frontmatter
    awk '
        /^# / { found_heading=1; next }
        found_heading && /^$/ { next }
        found_heading && /^[^#]/ { print; exit }
    ' "$file" 2>/dev/null | head -c 200 | sed 's/[[:space:]]*$//'
}

# Detect category from project path/name
detect_category() {
    local relative_path="$1"
    local project_name=""

    # Extract the top-level project name from the relative path
    project_name=$(echo "$relative_path" | cut -d'/' -f1)

    # Check if it's an Odoo module (nested under src/private/)
    if [[ "$relative_path" == */src/private/* ]]; then
        echo "Odoo Modules"
        return
    fi

    # Check if archived
    if [[ "$relative_path" == archived/* ]]; then
        echo "Archived"
        return
    fi

    # Match by project name patterns
    case "$project_name" in
        *odoo*)
            echo "ERP Systems"
            ;;
        *frappe*)
            echo "ERP Systems"
            ;;
        *sync*|*airflow*|*dbt*|*clickhouse*)
            echo "Data Integration"
            ;;
        *hetzner*|*cloudflare*|*dokploy*|*monitoring*|*postgres*|*redis*|*mariadb*|*cloudbeaver*)
            echo "Infrastructure"
            ;;
        *authentik*|*1password*)
            echo "Security & Identity"
            ;;
        *plane*|*mattermost*|*openproject*|*jitsi*)
            echo "Collaboration"
            ;;
        *mkdocs*|*claude-code*)
            echo "Developer Tools"
            ;;
        *metabase*)
            echo "Analytics"
            ;;
        *)
            echo "Other"
            ;;
    esac
}

# -----------------------------------------------------------------------------
# Discovery Functions
# -----------------------------------------------------------------------------

# Find all CLAUDE.md files, excluding noise directories and this project
discover_claude_files() {
    local base_path="$1"
    local files=()

    # Build find exclusion arguments
    local exclude_args=()
    for dir in $EXCLUDE_DIRS; do
        exclude_args+=(-name "$dir" -o)
    done
    # Remove trailing -o
    unset 'exclude_args[${#exclude_args[@]}-1]'

    # Find all CLAUDE.md files, pruning excluded directories and this project
    find "$base_path" \
        \( "${exclude_args[@]}" \) -prune -o \
        -path "*/$SELF_DIR/*" -prune -o \
        -path "*/$SELF_DIR" -prune -o \
        -name "CLAUDE.md" -type f -print 2>/dev/null | sort
}

# Discover all top-level project directories (for gap analysis)
discover_projects() {
    local base_path="$1"

    # Top-level abcfood-* projects
    for dir in "$base_path"/abcfood-*/; do
        [[ -d "$dir" ]] || continue
        local name
        name=$(basename "$dir")
        [[ "$name" == "$SELF_DIR" ]] && continue
        echo "$name"
    done

    # Archived projects
    if [[ -d "$base_path/archived" ]]; then
        for dir in "$base_path"/archived/*/; do
            [[ -d "$dir" ]] || continue
            echo "archived/$(basename "$dir")"
        done
    fi
}

# -----------------------------------------------------------------------------
# Generation Functions
# -----------------------------------------------------------------------------

# Copy CLAUDE.md files into docs/ preserving relative paths
copy_to_docs() {
    local base_path="$1"
    local dry_run="$2"
    local count=0

    if [[ "$dry_run" != "true" ]]; then
        rm -rf "$DOCS_DIR"
        mkdir -p "$DOCS_DIR"
    fi

    while IFS= read -r file; do
        [[ -z "$file" ]] && continue

        # Calculate relative path from base
        local relative_path="${file#$base_path/}"
        local dest="$DOCS_DIR/$relative_path"

        if [[ "$dry_run" == "true" ]]; then
            log_info "  [DRY-RUN] Would copy: $relative_path"
        else
            mkdir -p "$(dirname "$dest")"
            cp "$file" "$dest"
            log_debug "  Copied: $relative_path"
        fi

        count=$((count + 1))
    done < <(discover_claude_files "$base_path")

    echo "$count"
}

# Generate INDEX.md with categorized table
generate_index() {
    local base_path="$1"
    local dry_run="$2"

    if [[ "$dry_run" == "true" ]]; then
        log_info "  [DRY-RUN] Would generate: INDEX.md"
        return
    fi

    log_info "Generating INDEX.md..."

    # Collect files by category
    declare -A category_entries
    local categories_order=("ERP Systems" "Odoo Modules" "Data Integration" "Infrastructure" "Security & Identity" "Collaboration" "Analytics" "Developer Tools" "Other" "Archived")

    # Initialize
    for cat in "${categories_order[@]}"; do
        category_entries["$cat"]=""
    done

    while IFS= read -r file; do
        [[ -z "$file" ]] && continue

        local relative_path="${file#$base_path/}"
        local description
        description=$(extract_description "$file")
        local summary
        summary=$(extract_summary "$file")
        local category
        category=$(detect_category "$relative_path")

        # Build the display name
        local display_name="$relative_path"
        display_name="${display_name%/CLAUDE.md}"  # Remove trailing /CLAUDE.md

        # Build table row
        local link="docs/$relative_path"
        local entry="| [$display_name]($link) | $description |"

        if [[ -n "${category_entries[$category]+x}" ]]; then
            category_entries["$category"]+="$entry"$'\n'
        else
            category_entries["$category"]="$entry"$'\n'
        fi

    done < <(discover_claude_files "$base_path")

    # Write INDEX.md
    {
        echo "# CLAUDE.md Index"
        echo ""
        echo "> Auto-generated by \`collect.sh\` on $(date '+%Y-%m-%d %H:%M:%S')"
        echo "> Source: \`$REPOS_BASE_PATH\`"
        echo ""
        echo "---"
        echo ""

        local total=0

        for category in "${categories_order[@]}"; do
            local entries="${category_entries[$category]:-}"
            [[ -z "$entries" ]] && continue

            local cat_count
            cat_count=$(echo -n "$entries" | grep -c '^|' || echo 0)
            total=$((total + cat_count))

            echo "## $category"
            echo ""
            echo "| Project | Description |"
            echo "|---------|-------------|"
            echo -n "$entries"
            echo ""
        done

        echo "---"
        echo ""
        echo "**Total: $total CLAUDE.md files collected**"
        echo ""
        echo "## Quick Search"
        echo ""
        echo '```bash'
        echo '# Search across all collected CLAUDE.md files'
        echo 'grep -r "keyword" docs/'
        echo ''
        echo '# Search in the concatenated file'
        echo 'grep "keyword" ALL-CLAUDE.md'
        echo ''
        echo '# Find all files mentioning Docker'
        echo 'grep -rl "docker" docs/'
        echo '```'

    } > "$INDEX_FILE"

    log_success "Generated INDEX.md"
}

# Generate GAPS.md listing projects without CLAUDE.md
generate_gaps() {
    local base_path="$1"
    local dry_run="$2"

    if [[ "$dry_run" == "true" ]]; then
        log_info "  [DRY-RUN] Would generate: GAPS.md"
        return
    fi

    log_info "Generating GAPS.md..."

    # Get set of projects that have a root-level CLAUDE.md
    declare -A has_claude
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local relative_path="${file#$base_path/}"
        # Get the top-level project (handle archived/ prefix)
        local project
        if [[ "$relative_path" == archived/* ]]; then
            project=$(echo "$relative_path" | cut -d'/' -f1-2)
        else
            project=$(echo "$relative_path" | cut -d'/' -f1)
        fi
        has_claude["$project"]=1
    done < <(discover_claude_files "$base_path")

    # Find projects missing CLAUDE.md
    local missing=()
    while IFS= read -r project; do
        [[ -z "$project" ]] && continue
        if [[ -z "${has_claude[$project]+x}" ]]; then
            missing+=("$project")
        fi
    done < <(discover_projects "$base_path")

    # Write GAPS.md
    {
        echo "# Projects Missing CLAUDE.md"
        echo ""
        echo "> Auto-generated by \`collect.sh\` on $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "---"
        echo ""
        echo "The following **${#missing[@]}** projects do not have a root-level \`CLAUDE.md\` file:"
        echo ""
        echo "| # | Project | Category | Status |"
        echo "|---|---------|----------|--------|"

        local i=1
        for project in "${missing[@]}"; do
            local category
            category=$(detect_category "$project")
            echo "| $i | \`$project\` | $category | Missing |"
            i=$((i + 1))
        done

        echo ""
        echo "---"
        echo ""
        echo "## Template"
        echo ""
        echo "Use this template when creating a new \`CLAUDE.md\` for any of the above projects:"
        echo ""
        echo '````markdown'
        echo '# CLAUDE.md — [Project Name]'
        echo ''
        echo '## Project Overview'
        echo ''
        echo '**Purpose:** [One-line description of what this project does]'
        echo '**Stack:** [Key technologies used]'
        echo '**Deployment:** [How/where this runs]'
        echo ''
        echo '## Quick Reference'
        echo ''
        echo '```bash'
        echo '# Start development'
        echo '[command to start dev environment]'
        echo ''
        echo '# Run tests'
        echo '[command to run tests]'
        echo ''
        echo '# Deploy'
        echo '[command to deploy]'
        echo '```'
        echo ''
        echo '## Architecture'
        echo ''
        echo '[Key directories and their purposes]'
        echo ''
        echo '## Important Conventions'
        echo ''
        echo '- [Convention 1]'
        echo '- [Convention 2]'
        echo ''
        echo '## Common Tasks'
        echo ''
        echo '### [Task 1]'
        echo ''
        echo '```bash'
        echo '[commands]'
        echo '```'
        echo ''
        echo '## Troubleshooting'
        echo ''
        echo '| Problem | Solution |'
        echo '|---------|----------|'
        echo '| [problem] | [solution] |'
        echo '````'

    } > "$GAPS_FILE"

    log_success "Generated GAPS.md (${#missing[@]} projects missing CLAUDE.md)"
}

# Generate ALL-CLAUDE.md with TOC and concatenated content
generate_all() {
    local base_path="$1"
    local dry_run="$2"

    if [[ "$dry_run" == "true" ]]; then
        log_info "  [DRY-RUN] Would generate: ALL-CLAUDE.md"
        return
    fi

    log_info "Generating ALL-CLAUDE.md..."

    # First pass: collect all files for TOC
    local -a files=()
    local -a names=()
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local relative_path="${file#$base_path/}"
        local display_name="${relative_path%/CLAUDE.md}"
        files+=("$file")
        names+=("$display_name")
    done < <(discover_claude_files "$base_path")

    # Write ALL-CLAUDE.md
    {
        echo "# All CLAUDE.md Files — ABCFood Ecosystem"
        echo ""
        echo "> Auto-generated by \`collect.sh\` on $(date '+%Y-%m-%d %H:%M:%S')"
        echo "> ${#files[@]} files concatenated for full-text search"
        echo ""
        echo "---"
        echo ""
        echo "## Table of Contents"
        echo ""

        local i
        for i in "${!names[@]}"; do
            # Create anchor from name (lowercase, replace non-alnum with hyphens)
            local anchor
            anchor=$(echo "${names[$i]}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
            echo "- [${names[$i]}](#${anchor})"
        done

        echo ""
        echo "---"
        echo ""

        # Second pass: write content
        for i in "${!files[@]}"; do
            local file="${files[$i]}"
            local name="${names[$i]}"

            echo "<!-- ================================================================ -->"
            echo "<!-- ${name} -->"
            echo "<!-- ================================================================ -->"
            echo ""
            echo "## ${name}"
            echo ""
            echo "> Source: \`${file#$base_path/}\`"
            echo ""
            cat "$file"
            echo ""
            echo ""
        done

    } > "$ALL_FILE"

    log_success "Generated ALL-CLAUDE.md (${#files[@]} files)"
}

# -----------------------------------------------------------------------------
# Statistics
# -----------------------------------------------------------------------------

show_stats() {
    local base_path="$1"
    local count=0
    local total_lines=0
    local total_bytes=0

    declare -A cat_counts

    while IFS= read -r file; do
        [[ -z "$file" ]] && continue

        local relative_path="${file#$base_path/}"
        local category
        category=$(detect_category "$relative_path")
        local lines
        lines=$(wc -l < "$file")
        local bytes
        bytes=$(wc -c < "$file")

        count=$((count + 1))
        total_lines=$((total_lines + lines))
        total_bytes=$((total_bytes + bytes))
        cat_counts["$category"]=$(( ${cat_counts["$category"]:-0} + 1 ))

    done < <(discover_claude_files "$base_path")

    {
        echo ""
        echo "================================================================"
        echo "  CLAUDE.md Collection Statistics"
        echo "================================================================"
        echo "  Total files:     $count"
        echo "  Total lines:     $total_lines"
        echo "  Total size:      $(( total_bytes / 1024 )) KB"
        echo "================================================================"
        echo ""
        echo "  By Category:"

        # Sort categories by count (descending)
        for k in "${!cat_counts[@]}"; do
            echo "${cat_counts[$k]}|$k"
        done | sort -rn -t'|' -k1 | while IFS='|' read -r cnt cat_name; do
            printf "    %-25s %d\n" "$cat_name" "$cnt"
        done

        echo ""
        echo "================================================================"
    } >&2

    # Also count missing projects
    local total_projects=0
    local projects_with_claude=0
    declare -A has_claude

    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local relative_path="${file#$base_path/}"
        local project
        if [[ "$relative_path" == archived/* ]]; then
            project=$(echo "$relative_path" | cut -d'/' -f1-2)
        else
            project=$(echo "$relative_path" | cut -d'/' -f1)
        fi
        has_claude["$project"]=1
    done < <(discover_claude_files "$base_path")

    while IFS= read -r project; do
        [[ -z "$project" ]] && continue
        total_projects=$((total_projects + 1))
        if [[ -n "${has_claude[$project]+x}" ]]; then
            projects_with_claude=$((projects_with_claude + 1))
        fi
    done < <(discover_projects "$base_path")

    local coverage=0
    if [[ $total_projects -gt 0 ]]; then
        coverage=$(( projects_with_claude * 100 / total_projects ))
    fi

    {
        echo ""
        echo "  Coverage:"
        echo "    Projects with CLAUDE.md:  $projects_with_claude / $total_projects ($coverage%)"
        echo "    Projects missing:         $(( total_projects - projects_with_claude ))"
        echo ""
        echo "================================================================"
    } >&2
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    local dry_run="false"
    local stats_only="false"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)
                dry_run="true"
                shift
                ;;
            --stats)
                stats_only="true"
                shift
                ;;
            --debug)
                DEBUG="true"
                shift
                ;;
            --help|-h)
                cat <<'EOF'
Usage: ./collect.sh [OPTIONS]

Collect all CLAUDE.md files from the ABCFood ecosystem into a browsable
knowledge base with categorized index, gap analysis, and search file.

Options:
  --dry-run    Preview what would be collected without making changes
  --stats      Show statistics only (no file operations)
  --debug      Enable debug output
  --help       Show this help message

Generated files:
  docs/          Copies of all CLAUDE.md files, preserving paths
  INDEX.md       Categorized index with descriptions and links
  GAPS.md        Projects missing CLAUDE.md + template
  ALL-CLAUDE.md  All files concatenated for full-text search

Environment variables:
  REPOS_BASE_PATH  Base path for scanning (default: /home/tgunawan/project/00-new-projects/abcfood)
  EXCLUDE_DIRS     Space-separated directories to skip
  DEBUG            Set to "true" for verbose output

Examples:
  # Collect all CLAUDE.md files
  ./collect.sh

  # Preview what would be collected
  ./collect.sh --dry-run

  # Show statistics only
  ./collect.sh --stats

  # Search across collected files
  grep -r 'docker' docs/
  grep 'keyword' ALL-CLAUDE.md
EOF
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                log_error "Run './collect.sh --help' for usage"
                exit 1
                ;;
        esac
    done

    # Verify base path exists
    if [[ ! -d "$REPOS_BASE_PATH" ]]; then
        log_error "Repository base path does not exist: $REPOS_BASE_PATH"
        exit 1
    fi

    # Print header
    {
        echo ""
        echo "================================================================"
        echo "  ABCFood CLAUDE.md Collector"
        echo "================================================================"
        echo "  Dry Run:     $dry_run"
        echo "  Source:      $REPOS_BASE_PATH"
        echo "  Output:      $SCRIPT_DIR"
        echo "================================================================"
        echo ""
    } >&2

    # Stats only mode
    if [[ "$stats_only" == "true" ]]; then
        show_stats "$REPOS_BASE_PATH"
        exit 0
    fi

    # Step 1: Copy files to docs/
    log_info "Collecting CLAUDE.md files..."
    local file_count
    file_count=$(copy_to_docs "$REPOS_BASE_PATH" "$dry_run")
    if [[ "$dry_run" == "true" ]]; then
        log_info "Found $file_count CLAUDE.md files"
    else
        log_success "Collected $file_count CLAUDE.md files into docs/"
    fi

    echo "" >&2

    # Step 2: Generate INDEX.md
    generate_index "$REPOS_BASE_PATH" "$dry_run"

    # Step 3: Generate GAPS.md
    generate_gaps "$REPOS_BASE_PATH" "$dry_run"

    # Step 4: Generate ALL-CLAUDE.md
    generate_all "$REPOS_BASE_PATH" "$dry_run"

    # Show summary
    if [[ "$dry_run" != "true" ]]; then
        show_stats "$REPOS_BASE_PATH"
    fi

    {
        echo ""
        echo "================================================================"
        echo "  Collection Complete!"
        echo "================================================================"
        echo ""
        if [[ "$dry_run" == "true" ]]; then
            echo "  This was a dry run. No files were modified."
            echo "  Run without --dry-run to collect files."
        else
            echo "  Generated files:"
            echo "    docs/          $file_count CLAUDE.md files"
            echo "    INDEX.md       Categorized index"
            echo "    GAPS.md        Missing CLAUDE.md report"
            echo "    ALL-CLAUDE.md  Concatenated search file"
            echo ""
            echo "  Quick search:"
            echo "    grep -r 'keyword' docs/"
            echo "    grep 'keyword' ALL-CLAUDE.md"
        fi
        echo ""
        echo "================================================================"
    } >&2
}

main "$@"
