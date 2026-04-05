---
name: waha-admin
description: >
  WAHA WhatsApp HTTP API administration via kctl-waha CLI (8 groups, ~30 commands).
  MUST use for ANY kctl-waha operation.
  Triggers on: "bridge", "check", "config", "current", "dashboard", "generate", "health", "init", "kctl-waha", "logout", "messages", "migrate", "profile", "profiles", "remove", "restart", "send", "send-image", "sessions", "setup-chatwoot", "setup-webhook", "skill", "start", "stop", "test", "webhooks".
  Auto-generated: 2026-04-05
  registry_hash: 3b251a13b2f5
---

# waha-admin — kctl-waha CLI Reference

> Auto-generated from `kctl-waha` command registry. Do not edit manually.
> To regenerate: `kctl-waha skill generate`
> To add custom content: edit `SKILL.extra.md` in the same directory.

## Overview

**CLI:** `kctl-waha`
**Command groups:** 8
**Total commands:** ~30
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

### `kctl-waha bridge`

Manage WAHA bridge sidecar.

| Command | Description |
|---------|-------------|
| `bridge health` | Check bridge sidecar health. |
| `bridge setup-chatwoot [--name] [--callback_url]` | Setup Chatwoot inbox integration via bridge. |
| `bridge setup-webhook [--session] [--webhook_url]` | Setup WAHA webhook via bridge. |
| `bridge status` | Show bridge setup status (WAHA, Chatwoot, Odoo config). |

### `kctl-waha config`

Manage CLI configuration and profiles.

| Command | Description |
|---------|-------------|
| `config add <name> [--url] [--api_key] [--bridge_url] [--set_default]` | Add or update a profile's WAHA connection. |
| `config current` | Show the active profile and connection status. |
| `config init [--url] [--api_key] [--bridge_url] [--name]` | Initialize CLI configuration (interactive if no flags given). |
| `config migrate` | Migrate config from flat format to service-scoped format. |
| `config profiles` | List all profiles with WAHA connection status. |
| `config remove <name> [--force] [--service_only]` | Remove a profile or just its WAHA config. |
| `config set <key> <value> [--profile_arg]` | Set a configuration value for the current service. |
| `config show` | Show full configuration (API keys masked). |
| `config test` | Test API connection with current configuration. |
| `config use <name>` | Switch the default profile. |

**Examples:**
```bash
kctl-waha config set url https://waha.new.io
kctl-waha config set api_key new-key-value
kctl-waha config set bridge_url http://localhost:3050
kctl-waha config set default_profile production
```

### `kctl-waha dashboard`

System overview dashboard.

### `kctl-waha health`

Health checks and diagnostics.

### `kctl-waha messages`

Send WhatsApp messages.

| Command | Description |
|---------|-------------|
| `messages send <phone> <text> [--session]` | Send a text message. |
| `messages send-image <phone> <url> [--caption] [--session]` | Send an image message. |

**Examples:**
```bash
kctl-waha messages send 6281234567890 "Hello!"
kctl-waha messages send +628123456 "Hi there" --session my-session
kctl-waha messages send-image 6281234567890 https://example.com/image.png
kctl-waha messages send-image 6281234567890 https://example.com/photo.jpg --caption "Check this out"
```

### `kctl-waha sessions`

Manage WhatsApp sessions.

| Command | Description |
|---------|-------------|
| `sessions delete <name> [--force]` | Delete a WhatsApp session. |
| `sessions get [--name]` | Show session details. |
| `sessions list [--all_sessions]` | List WhatsApp sessions. |
| `sessions logout [--name] [--force]` | Logout from a WhatsApp session. |
| `sessions me [--name]` | Show current session account info. |
| `sessions qr [--name]` | Get QR code for session authentication. |
| `sessions restart [--name]` | Restart a WhatsApp session (stop + start). |
| `sessions start [--name] [--engine]` | Start a WhatsApp session. |
| `sessions stop [--name]` | Stop a WhatsApp session. |

### `kctl-waha skill`

Claude Code skill management.

| Command | Description |
|---------|-------------|
| `skill generate [--output] [--install] [--check]` | Auto-generate SKILL.md from CLI command registry. |

**Examples:**
```bash
kctl-waha skill generate
kctl-waha skill generate --install
kctl-waha skill generate --check
```

### `kctl-waha webhooks`

Manage session webhooks.

| Command | Description |
|---------|-------------|
| `webhooks list` | List webhook configurations for all sessions. |
| `webhooks set <session> <url> [--events] [--hmac_key]` | Set webhook configuration for a session. |

**Examples:**
```bash
kctl-waha webhooks set default --url https://bridge.kodeme.io/webhook
kctl-waha webhooks set default --url https://n8n.kodeme.io/waha --events message,session.status
kctl-waha webhooks set default --url https://hook.io/waha --hmac-key mysecret
```

## Configuration

Shared config: `~/.config/kodemeio/config.yaml`

```bash
kctl-waha config init       # Interactive setup
kctl-waha config show       # Show current config
kctl-waha config profiles   # List profiles
kctl-waha config current    # Show active profile
kctl-waha config validate   # Verify config
```
