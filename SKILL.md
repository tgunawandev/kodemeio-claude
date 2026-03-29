---
name: claude-admin
description: >
  Claude Code environment administration via kctl-claude CLI (11 groups, ~31 commands).
  MUST use for ANY kctl-claude operation.
  Triggers on: "api", "backup", "check", "completions", "config", "doctor", "env", "health", "kctl-claude", "profile", "restore", "setup", "status", "sync", "update", "verify".
  Auto-generated: 2026-03-29
---

# claude-admin — kctl-claude CLI Reference

> Auto-generated from `kctl-claude` command registry. Do not edit manually.
> To regenerate: `kctl-claude skill generate`
> To add custom content: edit `SKILL.extra.md` in the same directory.

## Overview

**CLI:** `kctl-claude`
**Command groups:** 11
**Total commands:** ~31
**Install:** `cd cli && uv tool install --editable .`

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | JSON output |
| `--quiet`, `-q` | Suppress info messages |
| `--format`, `-f` | Output format: pretty/json/csv/yaml |
| `--no-header` | Omit CSV header row |
| `--profile`, `-p` | Config profile name |
| `--version`, `-V` | Show version |

## Command Reference

### `kctl-claude api`

SDK REST API operations.

| Command | Description |
|---------|-------------|
| `api health` | Check SDK API health. |
| `api task <prompt> [--workspace] [--bare]` | Send a task to Claude Code via SDK API. |

### `kctl-claude backup`

Backup and restore Claude Code runtime.

| Command | Description |
|---------|-------------|
| `backup create` | Backup container runtime volume. |
| `backup restore <backup_dir>` | Restore runtime from backup. |

### `kctl-claude completions`

Generate or install shell completions.

Usage: `kctl-claude completions [--shell] [--install]`

### `kctl-claude config`

Manage CLI configuration and profiles.

| Command | Description |
|---------|-------------|
| `config add <name> [--config_dir] [--backup_dir] [--set_default]` | Add or update a profile's Claude configuration.

Example: kctl-claude config add work --config-dir ~/.claude-work |
| `config current` | Show the active profile and its Claude configuration. |
| `config init [--config_dir] [--backup_dir] [--name]` | Initialize CLI configuration (interactive if no flags given). |
| `config profiles` | List all profiles. |
| `config remove <name> [--force] [--service_only]` | Remove a profile or just its Claude config. |
| `config set <key> <value> [--profile_arg]` | Set a configuration value for the current service.

Examples:
  kctl-claude config set config_dir /path/to/dir
  kctl-claude config set backup_dir /path/to/backups
  kctl-claude config set default_profile work |
| `config show` | Show full configuration. |
| `config use <name>` | Switch the default profile.

Example: kctl-claude config use work |
| `config validate` | Validate the current configuration. |

### `kctl-claude doctor`

Diagnostics and health checks.

### `kctl-claude env`

Environment file management.

| Command | Description |
|---------|-------------|
| `env check` | Validate .env file. |
| `env deploy` | Deploy .env to Hetzner server. |
| `env generate` | Interactive .env generator. |

### `kctl-claude setup`

Setup Claude Code on local, VPS, or Docker.

| Command | Description |
|---------|-------------|
| `setup compare` | Compare setup modes side-by-side. |
| `setup docker` | Show Docker deployment commands. |
| `setup init` | Run session initialization (git, SSH, tmux, kctl tools).

Note: for shell-affecting steps (SSH agent, env vars), source directly:
  source scripts/init-session.sh |
| `setup local` | Setup local development environment (laptop). |
| `setup vps [--check] [--skip_repos]` | Setup VPS/bare-metal server (requires sudo). |

### `kctl-claude status`

Status dashboard and health checks.

| Command | Description |
|---------|-------------|
| `status health` | Quick health check (exit code 0=ok, 1=issues). |
| `status updates` | Check for Claude Code updates and show changelog link. |

### `kctl-claude sync`

Sync config between local ~/.claude and repo.

| Command | Description |
|---------|-------------|
| `sync diff` | Preview what push would change (dry-run). |
| `sync pull` | Sync repo config -> local (update local environment). |
| `sync push` | Sync local config -> repo (for Docker deployment). |
| `sync secrets` | Deploy kctl credentials to Hetzner. |

### `kctl-claude update`

Check for updates and upgrade kctl-claude.

### `kctl-claude verify`

Verify Claude Code config completeness.

## Configuration

Shared config: `~/.config/kodemeio/config.yaml`

```bash
kctl-claude config init       # Interactive setup
kctl-claude config show       # Show current config
kctl-claude config profiles   # List profiles
kctl-claude config current    # Show active profile
kctl-claude config validate   # Verify config
```
