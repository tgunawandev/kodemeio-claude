---
name: rustdesk-admin
description: >
  RustDesk remote desktop server administration via kctl-rustdesk CLI. MUST use for ANY RustDesk server operation — health checks, peer management, user management, audit logs, backups, or server maintenance. Triggers on: "kctl-rustdesk", "rustdesk", "remote desktop server", "rustdesk peers", "rustdesk users", "rustdesk backup", "rustdesk.kodeme.io", or ANY RustDesk server management task.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# RustDesk Server Administration for Kodemeio

## System Overview

- **Service**: RustDesk Server OSS (community edition) — self-hosted remote desktop
- **Services**: hbbs (ID/Rendezvous server) + hbbr (Relay server)
- **Domain**: rustdesk.kodeme.io
- **Host**: dokploy.kodeme.io (168.119.233.161)
- **Database**: SQLite (db_v2.sqlite3 inside hbbs container)
- **CLI**: `kctl-rustdesk` (Python, installed via `uv pip install -e packages/kctl-rustdesk`)
- **Config**: `~/.config/kodemeio/config.yaml` → `profiles.<profile>.rustdesk`
- **Repo**: kodemeio-platform/packages/kctl-rustdesk

## Architecture

- No REST API — all operations via `docker exec` + `sqlite3` queries
- Supports local execution (on Dokploy host) and remote via SSH
- Profile config stores: host, ssh_user, compose_file, env_file, project_name, domain

## Ports

| Port  | Protocol | Service              |
|-------|----------|----------------------|
| 21115 | TCP      | NAT type test        |
| 21116 | TCP+UDP  | ID/Rendezvous server |
| 21117 | TCP      | Relay server         |
| 21118 | TCP      | WebSocket (hbbs)     |
| 21119 | TCP      | WebSocket (hbbr)     |

## Commands

### Config

| Command | Description |
|---------|-------------|
| `kctl-rustdesk config init` | Initialize profile (interactive or with --host, --ssh-user, --domain) |
| `kctl-rustdesk config show` | Show current configuration |
| `kctl-rustdesk config profiles` | List all profiles |
| `kctl-rustdesk config use <name>` | Set default profile |
| `kctl-rustdesk config test` | Test connection to server |

### Health

| Command | Description |
|---------|-------------|
| `kctl-rustdesk health check` | Run health checks (containers, keys, db, ports) |
| `kctl-rustdesk health check --json` | Health check with JSON output |

### Dashboard

| Command | Description |
|---------|-------------|
| `kctl-rustdesk dashboard show` | System overview (services, resources, config, db stats) |
| `kctl-rustdesk dashboard show --compact` | Compact overview (services + config only) |

### Peers (Devices)

| Command | Description |
|---------|-------------|
| `kctl-rustdesk peers list` | List all registered peers |
| `kctl-rustdesk peers list --online` | List only online peers (last 5 min) |
| `kctl-rustdesk peers get <peer-id>` | Get peer details |
| `kctl-rustdesk peers count` | Count total and online peers |
| `kctl-rustdesk peers search <term>` | Search peers by ID, UUID, or note |
| `kctl-rustdesk peers export` | Export all peers as JSON |

### Users

| Command | Description |
|---------|-------------|
| `kctl-rustdesk users list` | List all users |
| `kctl-rustdesk users list --active` | List only active users |
| `kctl-rustdesk users get <username>` | Get user details + peer count |
| `kctl-rustdesk users count` | Count total, active, and admin users |
| `kctl-rustdesk users groups` | List user groups |
| `kctl-rustdesk users export` | Export all users as JSON |

### Audit

| Command | Description |
|---------|-------------|
| `kctl-rustdesk audit connections` | Connection history (last 50) |
| `kctl-rustdesk audit connections --today` | Today's connections only |
| `kctl-rustdesk audit connections --limit 100` | Custom limit |
| `kctl-rustdesk audit logins` | Login history |
| `kctl-rustdesk audit logins --failed` | Failed logins only |
| `kctl-rustdesk audit stats` | Connection and login statistics + top peers |
| `kctl-rustdesk audit active` | Currently active sessions (last 5 min) |

### Backup

| Command | Description |
|---------|-------------|
| `kctl-rustdesk backup create` | Create backup (keys + database) |
| `kctl-rustdesk backup list` | List available backups |
| `kctl-rustdesk backup restore <file>` | Restore from backup (with confirmation) |
| `kctl-rustdesk backup clean --days 30` | Remove backups older than N days |

### Setup

| Command | Description |
|---------|-------------|
| `kctl-rustdesk setup status` | Setup status checklist |
| `kctl-rustdesk setup get-key` | Display server public key |
| `kctl-rustdesk setup client-config` | Generate client configuration string |
| `kctl-rustdesk setup firewall` | Show required firewall rules |

### Maintenance

| Command | Description |
|---------|-------------|
| `kctl-rustdesk maintenance status` | Container status and resource usage |
| `kctl-rustdesk maintenance version` | Version info (CLI, Docker Compose, image) |
| `kctl-rustdesk maintenance logs [service]` | View container logs (--lines N) |
| `kctl-rustdesk maintenance db-optimize` | VACUUM + ANALYZE SQLite database |
| `kctl-rustdesk maintenance db-stats` | Database table row counts and size |
| `kctl-rustdesk maintenance cleanup` | Remove dangling Docker images and build cache |

## Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |
| `--format pretty/json/csv/yaml` | Output format |
| `--profile <name>` / `-p` | Use specific profile |
| `--host <hostname>` | Override server host |
| `--quiet` / `-q` | Suppress info messages |
| `--no-header` | Omit column headers (CSV) |
| `--version` / `-V` | Show version |

## Config Profile

```yaml
profiles:
  production:
    rustdesk:
      host: dokploy.kodeme.io
      ssh_user: root
      compose_file: /opt/kodemeio-rustdesk/docker-compose.prod.yml
      env_file: /opt/kodemeio-rustdesk/.env.prod
      project_name: kodemeio-rustdesk
      domain: rustdesk.kodeme.io
  local:
    rustdesk:
      host: localhost
      compose_file: ./docker-compose.prod.yml
      env_file: ./.env.prod
      project_name: kodemeio-rustdesk
      domain: localhost
```

## Common Workflows

```bash
# Initial setup
kctl-rustdesk config init --host dokploy.kodeme.io --name production
kctl-rustdesk config test

# Daily monitoring
kctl-rustdesk health check
kctl-rustdesk dashboard show
kctl-rustdesk audit active

# Device management
kctl-rustdesk peers list --online
kctl-rustdesk peers search "office"
kctl-rustdesk users count

# Client onboarding — get config string for new devices
kctl-rustdesk setup client-config

# Backup before maintenance
kctl-rustdesk backup create
kctl-rustdesk maintenance db-optimize

# Investigate connection issues
kctl-rustdesk audit connections --today
kctl-rustdesk audit stats
kctl-rustdesk maintenance logs hbbs --lines 200
```

## Community Edition Limitations

- No web console (no port 21114)
- No OIDC/SSO authentication (Pro-only)
- No SMTP email notifications (Pro-only)
- No built-in S3 backup (Pro-only)
- Username/password authentication only

## Troubleshooting

- **Containers not starting**: Check `kctl-rustdesk maintenance logs` for errors
- **Peers can't connect**: Verify firewall rules with `kctl-rustdesk setup firewall`, check ports are open
- **Database locked**: Run `kctl-rustdesk maintenance db-optimize` to clean up WAL files
- **Key mismatch**: Use `kctl-rustdesk setup get-key` to verify the public key matches client config
- **SSH connection failed**: Verify SSH key is authorized on the target host, check `--host` value
