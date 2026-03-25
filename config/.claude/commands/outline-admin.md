---
name: outline-admin
description: >
  Outline wiki administration for kodemeio infrastructure.
  Supports multiple Outline instances via profiles (outline.kodeme.io, etc.).
  Covers document management, collection CRUD, user provisioning, group
  management, share links, comments, event logs, search, health checks,
  and dashboard. Use when working with kctl-outline CLI or managing any
  Outline wiki instance.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Outline Wiki Administration

## Managed Instances

kctl-outline supports multiple Outline instances via profiles:

| Profile | URL | Use |
|---|---|---|
| `kodemeio` | https://outline.kodeme.io | Kodemeio internal wiki |

```bash
# Target a specific instance
kctl-outline -p kodemeio documents list
kctl-outline -p kodemeio health

# Switch default profile
kctl-outline config use kodemeio
```

Config: `~/.config/kodemeio/config.yaml`

## CLI Tool: kctl-outline

Installed globally via `uv tool install ./cli`. Run `kctl-outline` from anywhere.

### Global Options

```bash
kctl-outline [--json] [--quiet] [--profile NAME] [--url URL] [--token TOKEN] <command>
```

- `--profile / -p`: target a specific Outline instance
- `--json`: output as JSON (for scripting/piping)
- `--quiet / -q`: suppress info messages

## Multi-Instance Management

```bash
kctl-outline config init                                         # Interactive setup
kctl-outline config add <name> --url <url> --token <token>       # Add instance
kctl-outline config use <name>                                   # Switch default
kctl-outline config remove <name>                                # Remove instance
kctl-outline config profiles                                     # List all with status
kctl-outline config current                                      # Show active + connection
kctl-outline config show                                         # Full config (masked)
kctl-outline config set <key> <value>                            # Edit config
kctl-outline config test                                         # Test connection
kctl-outline config migrate                                      # Migrate flat -> scoped format
```

## Document Management

```bash
kctl-outline documents list [--collection ID] [--offset N] [--limit N]
kctl-outline documents get <doc-id>
kctl-outline documents create <title> --collection <id> [--text "markdown"] [--parent ID]
kctl-outline documents update <doc-id> [--title "New Title"] [--text "body"] [--append]
kctl-outline documents delete <doc-id> [--permanent] [--force]
kctl-outline documents search <query> [--collection ID] [--limit N]
kctl-outline documents export <doc-id>
kctl-outline documents move <doc-id> --collection <id> [--parent ID]
kctl-outline documents archive <doc-id>
kctl-outline documents unarchive <doc-id>
```

## Top-Level Search

```bash
kctl-outline search <query> [--collection ID] [--limit N]
```

## Collection Management

```bash
kctl-outline collections list
kctl-outline collections get <collection-id>
kctl-outline collections create <name> [--description "desc"] [--permission read_write] [--color "#FF0000"]
kctl-outline collections update <collection-id> [--name "New Name"] [--description "desc"]
kctl-outline collections delete <collection-id> [--force]
kctl-outline collections export <collection-id>
```

## User Management

```bash
kctl-outline users list [--filter active|invited|suspended]
kctl-outline users get <user-id>
kctl-outline users invite <email> [--name NAME] [--role admin|member|viewer]
kctl-outline users update <user-id> [--name NAME] [--role ROLE]
kctl-outline users activate <user-id>
kctl-outline users deactivate <user-id>
```

## Group Management

```bash
kctl-outline groups list
kctl-outline groups get <group-id>
kctl-outline groups create <name>
kctl-outline groups update <group-id> --name "New Name"
kctl-outline groups delete <group-id> [--force]
kctl-outline groups add-user <group-id> <user-id>
kctl-outline groups remove-user <group-id> <user-id>
```

## Share Links

```bash
kctl-outline shares list
kctl-outline shares create <document-id> [--children]
kctl-outline shares revoke <share-id> [--force]
```

## Comments

```bash
kctl-outline comments list <document-id>
kctl-outline comments create <document-id> "Comment text"
kctl-outline comments delete <comment-id> [--force]
```

## Events (Activity Feed)

```bash
kctl-outline events list [--name documents.create] [--collection ID] [--document ID]
```

## Repo-to-Outline Sync

Sync markdown docs (README.md, CLAUDE.md, SECURITY.md, CHANGELOG.md, docs/*.md) from kodemeio repos into Outline wiki. One-way (repo -> Outline), manual only, dry-run by default.

Collection mapping: kodemeio-core -> Infrastructure, kodemeio-app -> Applications, kodemeio-ext -> Extensions, kodemeio-infra -> Platform, kodemeio-docs -> Documentation.

```bash
kctl-outline sync run <path>                    # Dry-run: show what would change
kctl-outline sync run <path> --no-dry-run       # Actually sync
kctl-outline sync run <path> --no-dry-run --force  # Re-sync even if unchanged
kctl-outline sync run --all --no-dry-run        # Sync all known repos
kctl-outline sync status                        # Show tracked repos
kctl-outline sync diff <path>                   # Show what would change
kctl-outline sync init <path>                   # Create .outline-sync.yaml
kctl-outline sync reset [<path>] [--force]      # Clear sync state (NOT Outline docs)
```

State file: `~/.config/kodemeio/outline-sync.json`

## Monitoring & Health

```bash
kctl-outline health [--watch] [--interval N]
kctl-outline dashboard [--watch] [--interval N]
```

## Outline API Pattern

All Outline API calls are POST requests to `/api/{resource}.{action}`:
- `POST /api/documents.list` with JSON body `{"offset": 0, "limit": 25}`
- `POST /api/documents.search` with JSON body `{"query": "term"}`
- Response: `{"data": [...], "pagination": {"total": N, "offset": N, "limit": N}}`
- Auth: `Authorization: Bearer <token>`

Generate API tokens in Outline UI: Settings > API > Personal API Tokens.

## Integration Points

- **kodemeio-authentik** -- OIDC provider at auth.kodeme.io (app slug: `outline`)
- **kodemeio-postgres-16** -- shared PostgreSQL database
- **kodemeio-outline-redis** -- dedicated Redis for sessions/cache
- **Hetzner S3** -- file/image storage
- **kodemeio-mailcow** -- SMTP at mail.kodeme.io

## Troubleshooting

### Cannot connect to Outline
1. `kctl-outline health` -- check health endpoint and API auth
2. Verify the Outline container is running: `docker ps | grep outline`
3. Check Traefik routing for outline.kodeme.io

### Authentication failures
1. `kctl-outline config test` -- verify token is valid
2. Regenerate API token in Outline UI: Settings > API
3. Check OIDC config if SSO login fails

### Document search not working
1. Verify PostgreSQL full-text search is enabled
2. `kctl-outline search "test"` -- check if any results return
3. Check Outline logs: `make logs`

### Share links not accessible
1. `kctl-outline shares list` -- verify share exists and is published
2. Check Outline's ALLOWED_DOMAINS and URL config
3. Verify Traefik is routing share URLs correctly
