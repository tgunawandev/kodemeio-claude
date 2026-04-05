---
name: outline-admin
description: >
  Outline wiki/knowledge-base administration via kctl-outline CLI. MUST use for ANY wiki, document, collection, or knowledge base operation. Triggers on: "kctl-outline", "outline", "wiki", "knowledge base", "create document", "collection", "share document", "outline search", or ANY wiki/documentation platform task.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Outline Administration

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
- `--url`: override Outline base URL
- `--token`: override API token
- `--json`: output as JSON (for scripting/piping)
- `--quiet / -q`: suppress info messages

## Multi-Instance Management

```bash
kctl-outline config init                                          # Interactive setup
kctl-outline config add <name> --url <url> --token <token>        # Add/update profile
kctl-outline config use <name>                                    # Switch default
kctl-outline config remove <name> [--service-only] [--force]      # Remove profile
kctl-outline config profiles                                      # List all with status
kctl-outline config current                                       # Show active + connection
kctl-outline config show                                          # Full config (masked)
kctl-outline config set <key> <value>                             # Edit config (url, token, default_profile)
kctl-outline config test                                          # Test connection
kctl-outline config migrate                                       # Migrate flat -> scoped format
```

Each profile can have its own: url, token.

## Document Management

```bash
kctl-outline documents list [--collection ID] [--offset N] [--limit N]
kctl-outline documents get <doc-id>
kctl-outline documents create <title> [--collection ID] [--text MD] [--publish] [--parent ID] [--template]
kctl-outline documents update <doc-id> [--title TITLE] [--text MD] [--append] [--done]
kctl-outline documents delete <doc-id> [--permanent] [--force]
kctl-outline documents search <query> [--collection ID] [--limit N]
kctl-outline documents export <doc-id>                            # Export as Markdown
kctl-outline documents move <doc-id> [--collection ID] [--parent ID]
kctl-outline documents archive <doc-id>
kctl-outline documents unarchive <doc-id>
```

## Collection Management

```bash
kctl-outline collections list [--offset N] [--limit N]
kctl-outline collections get <collection-id>
kctl-outline collections create <name> [--description DESC] [--permission read|read_write] [--color #hex]
kctl-outline collections update <collection-id> [--name NAME] [--description DESC] [--permission PERM] [--color #hex]
kctl-outline collections delete <collection-id> [--force]
kctl-outline collections export <collection-id>                   # Triggers async export
```

### Collection Permissions
- `read` -- Members can view documents
- `read_write` -- Members can view and edit documents (default)

## User Management

```bash
kctl-outline users list [--offset N] [--limit N] [--filter all|active|invited|suspended]
kctl-outline users get <user-id>
kctl-outline users invite <email> [--name NAME] [--role admin|member|viewer]
kctl-outline users update <user-id> [--name NAME] [--role ROLE]
kctl-outline users activate <user-id>                             # Unsuspend
kctl-outline users deactivate <user-id>                           # Suspend
```

### User Roles
- `admin` -- Full admin access
- `member` -- Standard access (default)
- `viewer` -- Read-only access

## Group Management

```bash
kctl-outline groups list [--offset N] [--limit N]
kctl-outline groups get <group-id>
kctl-outline groups create <name>
kctl-outline groups update <group-id> [--name NAME]
kctl-outline groups delete <group-id> [--force]
kctl-outline groups add-user <group-id> <user-id>
kctl-outline groups remove-user <group-id> <user-id>
```

## Share Management

```bash
kctl-outline shares list [--offset N] [--limit N]
kctl-outline shares create <document-id> [--children]             # Create share link
kctl-outline shares revoke <share-id> [--force]                   # Revoke share link
```

## Comment Management

```bash
kctl-outline comments list <document-id>
kctl-outline comments create <document-id> "Comment text"
kctl-outline comments delete <comment-id> [--force]
```

## Events (Activity Feed)

```bash
kctl-outline events list [--offset N] [--limit N] [--name EVENT_NAME] [--collection ID] [--document ID]
```

Event names follow the pattern: `documents.create`, `documents.update`, `collections.create`, etc.

## Search

```bash
kctl-outline search <query> [--collection ID] [--limit N]
```

Top-level search command that searches across all documents.

## Sync (Repo to Outline)

Sync markdown docs from git repos into Outline wiki collections.

```bash
kctl-outline sync run [PATH] [--no-dry-run] [--force] [--all]    # Sync repos (dry-run by default)
kctl-outline sync status [PATH]                                   # Show tracked sync state
kctl-outline sync diff <path>                                     # Show what would change
kctl-outline sync init <path> [--minimal]                         # Create .outline-sync.yaml
kctl-outline sync reset [PATH] [--force]                          # Clear sync state (no Outline deletion)
```

### Sync Architecture
- Parent directory maps to collection name (e.g. `kodemeio-core` -> `Infrastructure`)
- Each repo gets a parent document in its collection
- Nested files create section documents (e.g. `cli/README.md` -> "Cli" section)
- Uses `.outline-sync.yaml` for per-repo configuration
- Tracks file hashes to skip unchanged files
- Rate-limited with retry on 429 responses

## Stars (Bookmarks)

```bash
kctl-outline stars list
kctl-outline stars add <document-id>
kctl-outline stars remove <document-id>
```

## Template Management

```bash
kctl-outline templates list [--offset N] [--limit N]
kctl-outline templates create <title> [--collection ID] [--text MD] [--publish]
kctl-outline templates delete <template-id> [--permanent] [--force]
```

## Revision History

```bash
kctl-outline revisions list <document-id> [--offset N] [--limit N]
kctl-outline revisions restore <document-id> <revision-id> [--force]
```

## Attachments

```bash
kctl-outline attachments create --file <path> [--document-id ID]  # Upload file
kctl-outline attachments redirect <attachment-id>                  # Get download URL
```

## API Token Management

```bash
kctl-outline tokens list
kctl-outline tokens create --name "Token Name"                    # Save secret immediately
kctl-outline tokens delete <token-id> [--force]
```

## Monitoring & Health

```bash
kctl-outline health [--watch] [--interval 10]
kctl-outline dashboard [--watch] [--interval 10]
```

Health checks: health endpoint probe, API auth validation, team info.
Health score: 0-100 (50 for health endpoint, 30 for auth, 20 for team).

## API Structure

Outline REST API at base URL with POST-based endpoints and Bearer token authentication.

Resource hierarchy: **Team -> Collection -> Document**

```
/api/documents.list
/api/documents.info
/api/documents.create
/api/documents.update
/api/documents.delete
/api/documents.search
/api/documents.revisions
/api/collections.list
/api/collections.info
/api/collections.create
/api/users.list
/api/users.info
/api/groups.list
/api/shares.list
/api/comments.list
/api/events.list
/api/auth.info
/api/apiKeys.list
/api/stars.list
/api/attachments.create
```

## Troubleshooting

### Cannot connect to Outline
1. `kctl-outline config test` -- verify API token and URL
2. `kctl-outline health` -- check all connectivity
3. Verify API token was created in Outline Settings -> API

### Documents not showing
1. `kctl-outline collections list` -- verify collection access
2. `kctl-outline documents list --collection <id>` -- filter by collection
3. Check profile: `kctl-outline config current`

### Sync not working
1. `kctl-outline sync status` -- check tracked repos
2. `kctl-outline sync diff <path>` -- preview changes
3. Ensure parent directory matches expected collection mapping
4. Run with `--force` to re-sync all files regardless of hash

### User operations failing
1. Verify you have admin role
2. `kctl-outline users list` -- check current users
3. API token must belong to an admin user

### Working with multiple instances
1. `kctl-outline config profiles` -- see all instances
2. `kctl-outline -p <name> <command>` -- target specific instance
3. `kctl-outline config use <name>` -- switch default
