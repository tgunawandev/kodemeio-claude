---
name: telegram-admin
description: >
  Telegram bot platform administration via kctl-telegram CLI (8 groups, ~29 commands).
  MUST use for ANY kctl-telegram operation.
  Triggers on: "bots", "broadcast", "cancel", "chatwoot", "check", "config", "current", "dashboard", "generate", "groups", "health", "init", "kctl-telegram", "messages", "migrate", "profile", "profiles", "remove", "schedule", "scheduled", "send", "skill", "test".
  Auto-generated: 2026-04-05
  registry_hash: 4ce5c35774f1
---

# telegram-admin — kctl-telegram CLI Reference

> Auto-generated from `kctl-telegram` command registry. Do not edit manually.
> To regenerate: `kctl-telegram skill generate`
> To add custom content: edit `SKILL.extra.md` in the same directory.

## Overview

**CLI:** `kctl-telegram`
**Command groups:** 8
**Total commands:** ~29
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

### `kctl-telegram bots`

Manage Telegram bots.

| Command | Description |
|---------|-------------|
| `bots add <token> [--display_name]` | Register a new Telegram bot. |
| `bots get <bot_id>` | Show bot details. |
| `bots list` | List all registered bots. |
| `bots remove <bot_id> [--force]` | Remove a bot. |
| `bots update <bot_id> [--display_name] [--is_active]` | Update a bot's settings. |

### `kctl-telegram chatwoot`

Manage Chatwoot integrations.

| Command | Description |
|---------|-------------|
| `chatwoot add <bot_id> <inbox_identifier> <base_url> <api_token>` | Link a Chatwoot inbox to a Telegram bot. |
| `chatwoot list` | List Chatwoot inboxes linked to Telegram bots. |
| `chatwoot remove <inbox_id> [--force]` | Remove a Chatwoot inbox integration. |

### `kctl-telegram config`

Manage CLI configuration and profiles.

| Command | Description |
|---------|-------------|
| `config add <name> [--url] [--api_key] [--set_default]` | Add or update a profile's Telegram connection. |
| `config current` | Show the active profile and connection status. |
| `config init [--url] [--api_key] [--name]` | Initialize CLI configuration (interactive if no flags given). |
| `config migrate` | Migrate config from flat format to service-scoped format. |
| `config profiles` | List all profiles with Telegram connection status. |
| `config remove <name> [--force] [--service_only]` | Remove a profile or just its Telegram config. |
| `config set <key> <value> [--profile_arg]` | Set a configuration value for the current service. |
| `config show` | Show full configuration (API keys masked). |
| `config test` | Test API connection with current configuration. |
| `config use <name>` | Switch the default profile. |

**Examples:**
```bash
kctl-telegram config set url https://telegram.new.io
kctl-telegram config set api_key new-key-value
kctl-telegram config set default_profile abcfood
```

### `kctl-telegram dashboard`

System overview dashboard.

### `kctl-telegram groups`

Manage Telegram groups.

| Command | Description |
|---------|-------------|
| `groups get <group_id>` | Show group details. |
| `groups list` | List all tracked groups. |
| `groups update <group_id> <field> <value>` | Update a group field. |

### `kctl-telegram health`

Health checks and diagnostics.

### `kctl-telegram messages`

Send and manage messages.

| Command | Description |
|---------|-------------|
| `messages broadcast <text> [--bot_id] [--parse_mode]` | Broadcast a message to all groups. |
| `messages cancel <message_id>` | Cancel a scheduled message. |
| `messages schedule <text> <target_id> <at> [--bot_id]` | Schedule a message for later delivery. |
| `messages scheduled` | List scheduled messages. |
| `messages send <chat_id> <text> [--bot_id] [--parse_mode]` | Send a message to a specific chat. |

### `kctl-telegram skill`

Claude Code skill management.

| Command | Description |
|---------|-------------|
| `skill generate [--output] [--install] [--check]` | Auto-generate SKILL.md from CLI command registry. |

**Examples:**
```bash
kctl-telegram skill generate
kctl-telegram skill generate --install
kctl-telegram skill generate --check
```

## Configuration

Shared config: `~/.config/kodemeio/config.yaml`

```bash
kctl-telegram config init       # Interactive setup
kctl-telegram config show       # Show current config
kctl-telegram config profiles   # List profiles
kctl-telegram config current    # Show active profile
kctl-telegram config validate   # Verify config
```
