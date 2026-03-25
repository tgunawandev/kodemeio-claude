---
name: plane-admin
description: >
  Plane project management administration for kodemeio infrastructure.
  Supports multiple Plane instances via profiles (plane.kodeme.io,
  plane.abcfood.app, etc.). Covers workspace management, project CRUD,
  issue tracking, cycles, modules, members, labels, states, export,
  and health monitoring. Use when working with kctl-plane CLI or
  managing any Plane instance.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Plane Administration

## Managed Instances

kctl-plane supports multiple Plane instances via profiles:

| Profile | URL | Use |
|---|---|---|
| `production` | https://plane.kodeme.io | Kodemeio internal projects |
| `abcfood` | https://plane.abcfood.app | ABC Food production |

```bash
# Target a specific instance
kctl-plane -p abcfood projects list
kctl-plane -p production health

# Switch default profile
kctl-plane config use abcfood
```

Config: `~/.config/kodemeio/config.yaml`

## CLI Tool: kctl-plane

Installed globally via `uv tool install ./cli`. Run `kctl-plane` from anywhere.

### Global Options

```bash
kctl-plane [--json] [--quiet] [--profile NAME] [--url URL] [--api-key KEY] [--workspace SLUG] <command>
```

- `--profile / -p`: target a specific Plane instance
- `--workspace / -W`: override workspace slug
- `--json`: output as JSON (for scripting/piping)
- `--quiet / -q`: suppress info messages

## Multi-Instance Management

```bash
kctl-plane config init                                          # Interactive setup
kctl-plane config add <name> --url <url> --api-key <key> --workspace <slug>
kctl-plane config use <name>                                    # Switch default
kctl-plane config remove <name>                                 # Remove instance
kctl-plane config profiles                                      # List all with status
kctl-plane config current                                       # Show active + connection
kctl-plane config show                                          # Full config (masked)
kctl-plane config set <key> <value>                             # Edit config
kctl-plane config test                                          # Test connection
kctl-plane config migrate                                       # Migrate flat → scoped format
```

Each profile can have its own: url, api_key, workspace.

## Workspace Management

```bash
kctl-plane workspaces list
kctl-plane workspaces get [SLUG]
kctl-plane workspaces create <name> [--slug SLUG]
kctl-plane workspaces update <slug> [--name NAME]
```

## Project Management

```bash
kctl-plane projects list [--workspace SLUG]
kctl-plane projects get <project-id> [--workspace SLUG]
kctl-plane projects create <name> --identifier PROJ [--workspace SLUG]
kctl-plane projects update <project-id> [--name NAME] [--description DESC]
kctl-plane projects delete <project-id> [--force]
```

## Issue Management

```bash
kctl-plane issues list --project <id> [--state STATE] [--priority PRIORITY] [--assignee ID]
kctl-plane issues get <issue-id> --project <id>
kctl-plane issues create <title> --project <id> [--priority urgent|high|medium|low]
kctl-plane issues update <issue-id> --project <id> [--name NAME] [--state ID] [--priority LEVEL]
kctl-plane issues delete <issue-id> --project <id> [--force]
kctl-plane issues assign <issue-id> <assignee-ids> --project <id>
kctl-plane issues label <issue-id> <label-ids> --project <id>
kctl-plane issues move <issue-id> <target-state-id> --project <id>
```

### Priority Levels
- `none` (0) — No priority
- `urgent` (1) — Urgent
- `high` (2) — High
- `medium` (3) — Medium
- `low` (4) — Low

## Cycle Management (Sprints)

```bash
kctl-plane cycles list --project <id>
kctl-plane cycles get <cycle-id> --project <id>
kctl-plane cycles create <name> --project <id> [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD]
kctl-plane cycles update <cycle-id> --project <id> [--name NAME]
kctl-plane cycles delete <cycle-id> --project <id> [--force]
```

## Module Management

```bash
kctl-plane modules list --project <id>
kctl-plane modules get <module-id> --project <id>
kctl-plane modules create <name> --project <id> [--start-date YYYY-MM-DD]
kctl-plane modules update <module-id> --project <id> [--name NAME]
kctl-plane modules delete <module-id> --project <id> [--force]
```

## Member Management

```bash
kctl-plane members list [--workspace SLUG] [--project ID]
kctl-plane members add <email> [--workspace SLUG] [--project ID] [--role 15]
kctl-plane members remove <member-id> [--workspace SLUG] [--project ID] [--force]
```

### Member Roles
- `5` — Guest
- `10` — Viewer
- `15` — Member (default)
- `20` — Admin

## Labels & States

```bash
# Labels
kctl-plane labels list --project <id>
kctl-plane labels create <name> --project <id> [--color #hex]
kctl-plane labels delete <label-id> --project <id> [--force]

# States
kctl-plane states list --project <id>
kctl-plane states create <name> --project <id> --group <group>
kctl-plane states update <state-id> --project <id> [--name NAME]
kctl-plane states delete <state-id> --project <id> [--force]
```

### State Groups
- `backlog` — Not yet prioritized
- `unstarted` — Ready to work on
- `started` — In progress
- `completed` — Done
- `cancelled` — Won't do

## Monitoring & Health

```bash
kctl-plane health [--watch]
kctl-plane dashboard [--watch] [--interval 10]
```

## Export

```bash
kctl-plane export <project-id> [--format csv|json] [--output file.csv]
```

## API Structure

Plane REST API at `/api/v1/` with `X-API-Key` header authentication.

Resource hierarchy: **Workspace → Project → Issue**

```
/api/v1/workspaces/
/api/v1/workspaces/{slug}/projects/
/api/v1/workspaces/{slug}/projects/{id}/issues/
/api/v1/workspaces/{slug}/projects/{id}/cycles/
/api/v1/workspaces/{slug}/projects/{id}/modules/
/api/v1/workspaces/{slug}/projects/{id}/labels/
/api/v1/workspaces/{slug}/projects/{id}/states/
/api/v1/workspaces/{slug}/projects/{id}/members/
/api/v1/workspaces/{slug}/members/
```

## Troubleshooting

### Cannot connect to Plane
1. `kctl-plane config test` — verify API key and URL
2. `kctl-plane health` — check all connectivity
3. Verify API key was created in Plane Settings → API Tokens

### Issues not showing
1. `kctl-plane projects list` — verify project access
2. `kctl-plane states list --project <id>` — verify states exist
3. Check workspace slug: `kctl-plane config current`

### Member operations failing
1. Verify you have Admin role in the workspace
2. `kctl-plane members list` — check current membership
3. API key must belong to a workspace admin

### Working with multiple instances
1. `kctl-plane config profiles` — see all instances
2. `kctl-plane -p abcfood <command>` — target specific instance
3. `kctl-plane config use <name>` — switch default
