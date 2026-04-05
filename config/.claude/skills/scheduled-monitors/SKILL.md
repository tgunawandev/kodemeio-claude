---
name: scheduled-monitors
description: >
  Pre-built /loop recipes for recurring monitoring tasks across Kodemeio infrastructure. MUST use when setting up automated health checks, PR monitoring, deployment verification, or recurring scheduled tasks. Triggers on: "monitor every", "check every", "recurring check", "health check loop", "deployment monitor", "schedule monitoring", or ANY recurring monitoring setup.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - WebFetch
---

# Scheduled Monitors — /loop Recipes

## Overview

Use `/loop <interval> <prompt>` to run recurring tasks. Max 50 per session, auto-expires after 3 days. Tasks run between turns at low priority.

## Ready-to-Use Recipes

### Infrastructure Health (every 30 min)
```
/loop 30m Check all kctl services health: run kctl-pg health, kctl-ak health, kctl-mailcow health, kctl-plane health. Report any failures.
```

### PR Monitor (every 15 min)
```
/loop 15m Check for open PRs across all repos in /opt/dev/ using gh pr list. Summarize any PRs needing review.
```

### Deployment Drift Detection (every 1 hour)
```
/loop 1h For each repo in /opt/dev/*/: check if local branch is behind remote with git fetch --dry-run. Report repos that need pulling.
```

### Test Suite Health (every 2 hours)
```
/loop 2h Run a quick lint check on recently modified files across all repos. Use git diff --name-only HEAD~5 to find changed files, then run appropriate linter (ruff for .py, npx eslint for .ts/.tsx).
```

### Docker Container Status (every 10 min)
```
/loop 10m Run docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' and flag any containers that are unhealthy or restarting.
```

### Git Stash Reminder (every 4 hours)
```
/loop 4h Check all repos in /opt/dev/ for uncommitted changes using git status --porcelain. List repos with pending work.
```

### Disk Usage Monitor (every 6 hours)
```
/loop 6h Check disk usage with df -h / and du -sh /opt/dev/*/. Warn if any repo exceeds 5GB or disk is above 80%.
```

## Custom Recipes

### Create Your Own
```
/loop <interval> <prompt>
```

Intervals: `5m`, `10m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `12h`, `1d`

### Manage Running Loops
```
/loop list          # See all active loops
/loop stop <id>     # Stop a specific loop
/loop stop-all      # Stop all loops
```

## Recommended Setup for Container

Start a monitoring session on the Hetzner container:
```bash
# SSH into container
docker exec -it kodemeio-claude tmux new-session -s monitor

# Inside tmux, start Claude with monitoring loops:
claude

# Then paste your /loop commands
```

The monitoring session runs alongside your company tmux sessions (kodemeio, kontenos, etc.).

## Tips

- Keep prompts concise — they run unattended
- Use `--output-format json` in bash commands for parseable output
- Loops survive context compaction but NOT session exit
- For persistent monitoring, consider running a dedicated tmux session
- Combine with kctl-* tools for infrastructure-specific checks
