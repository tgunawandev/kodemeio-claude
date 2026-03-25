---
name: worktrunk
description: >
  Git worktree management for parallel AI agent workflows. Simplifies creating,
  switching, listing, merging, and removing worktrees. Use when working on multiple
  features/fixes in parallel, running concurrent Claude Code agents, or managing
  isolated workspaces for different tasks.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Worktrunk — Git Worktree Manager

## Overview

`wt` (worktrunk) makes Git worktrees as easy as branches. Each worktree is an
isolated copy of the repo where you can work without affecting other worktrees.
Perfect for running multiple Claude Code agents in parallel on different tasks.

## Quick Start

```bash
# List all worktrees
wt list

# Create and switch to a new worktree for a feature
wt switch -c feat/add-auth

# Switch to an existing worktree
wt switch feat/add-auth

# Switch to default branch (main)
wt switch ^

# Switch to previous worktree
wt switch -

# Checkout a GitHub PR
wt switch pr:123

# Merge current worktree to main and auto-cleanup
wt merge

# Remove a worktree
wt remove feat/add-auth
```

## Commands

### `wt switch [branch]`
Switch to a worktree. Creates a new worktree if one doesn't exist for the branch.

| Flag | Description |
|------|-------------|
| `-c`, `--create` | Create a new branch |
| `^` | Switch to default branch (main) |
| `-` | Switch to previous worktree |
| `pr:N` | Checkout GitHub PR #N |
| `mr:N` | Checkout GitLab MR #N |

### `wt list`
List all worktrees with status, changes, and CI info.

| Flag | Description |
|------|-------------|
| `--format json` | JSON output |
| `--branches` | Show branches only |

### `wt merge [target]`
Squash-merge current branch into target (defaults to main). Auto-removes the worktree after merge.

| Flag | Description |
|------|-------------|
| `--no-squash` | Keep individual commits |
| `--no-remove` | Don't remove worktree after merge |

### `wt remove [branch]`
Remove a worktree. Defaults to current. Deletes branch if merged.

| Flag | Description |
|------|-------------|
| `-D`, `--force-delete` | Force delete even if unmerged |
| `--no-delete-branch` | Keep the branch after removal |

## Workflows

### Parallel Feature Development
```bash
# Agent 1: Working on auth
wt switch -c feat/auth
claude -p "Implement JWT auth for the API"

# Agent 2: Working on tests (separate worktree)
wt switch -c feat/tests
claude -p "Add test coverage for user service"

# Agent 3: Bug fix
wt switch -c fix/login-redirect
claude -p "Fix the redirect loop on login page"

# Check status of all
wt list

# Merge completed work
wt switch feat/auth
wt merge main
```

### PR Review Workflow
```bash
# Checkout a PR for review
wt switch pr:42

# Review, make changes, push
claude -p "Review this PR and suggest improvements"

# Done — switch back
wt switch ^
```

### Quick Fix While Mid-Feature
```bash
# Currently working on a feature...
# Urgent bug reported — switch to a fix branch
wt switch -c fix/urgent-bug
# Fix the bug
claude -p "Fix the null pointer in checkout flow"
# Merge to main
wt merge
# Back to feature work
wt switch -
```

## Configuration

### Shell Integration (required for directory switching)
```bash
wt config shell install
```

### Project Hooks
Create `.wt/hooks/` in your repo:
- `create.sh` — Runs when creating a new worktree (e.g., `pnpm install`)
- `pre-merge.sh` — Runs before merge (e.g., run tests)
- `post-merge.sh` — Runs after merge (e.g., cleanup)

## Tips

- Worktrees share the `.git` directory — no extra cloning needed
- Build caches can be shared across worktrees for faster builds
- Each worktree gets its own working directory — changes are fully isolated
- `wt list --format json` is useful for scripting and automation
- Use descriptive branch names: `feat/`, `fix/`, `chore/` prefixes
