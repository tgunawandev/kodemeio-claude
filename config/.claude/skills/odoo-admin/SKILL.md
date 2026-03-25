---
description: Odoo 18 ERP administration via kctl-odoo CLI. Covers user management, module operations, database backup/restore, system parameters, scheduled actions, health checks, ORM shell calls, data import/export, and multi-instance profile management. Use when working with kctl-odoo CLI or managing Odoo instances.
---

# Odoo Admin Skill (kctl-odoo)

## Overview

`kctl-odoo` is the Kodemeio CLI for managing Odoo 18 ERP instances. It uses Odoo's JSON-RPC API with API key authentication. Installed via `uv tool install ./cli` from the kodemeio-odoo-18 repo.

## Architecture

```
cli/src/kctl_odoo/
├── cli.py              # Main Typer app, command registration
├── core/
│   ├── config.py       # SERVICE_KEY="odoo", service-scoped profiles in ~/.config/kodemeio/config.yaml
│   ├── client.py       # OdooClient — httpx JSON-RPC client
│   ├── output.py       # Rich/JSON output handler
│   ├── callbacks.py    # AppContext (shared state via ctx.obj)
│   └── exceptions.py   # KctlError hierarchy
└── commands/
    ├── config_cmd.py   # Profile management (init, add, use, remove, etc.)
    ├── users.py        # User CRUD + activate/deactivate
    ├── modules.py      # Module install/upgrade/uninstall/search
    ├── databases.py    # Database list/backup/restore/duplicate
    ├── params.py       # ir.config_parameter list/get/set
    ├── cron.py         # ir.cron list/enable/disable/run
    ├── health.py       # Health check with --watch
    ├── dashboard.py    # Instance overview
    ├── shell.py        # Execute arbitrary ORM calls
    ├── export_cmd.py   # Export records to CSV/JSON
    ├── import_cmd.py   # Import records from CSV/JSON
    └── maintenance.py  # update-list
```

## Configuration

Shared config at `~/.config/kodemeio/config.yaml` (same file as kctl-ak):

```yaml
default_profile: production
profiles:
  production:
    odoo:
      url: https://erp.kodeme.io
      database: kodemeio
      username: admin
      api_key: <api-key>
    authentik:
      url: https://auth.kodeme.io
      token: <token>
  abcfood:
    odoo:
      url: https://odoo-erp.abcfood.app
      database: abcfood
      username: admin
      api_key: <api-key>
```

### Setup

```bash
# Interactive
kctl-odoo config init

# Non-interactive
kctl-odoo config add production \
  --url https://erp.kodeme.io \
  --database kodemeio \
  --api-key $ODOO_API_KEY \
  --default

# Test connection
kctl-odoo config test

# Switch profiles
kctl-odoo config use abcfood
```

### Environment Variables

Priority: CLI flags > env vars > config file.

| Variable | Description |
|----------|-------------|
| `KCTL_ODOO_URL` | Odoo base URL |
| `KCTL_ODOO_DATABASE` | Database name |
| `KCTL_ODOO_USERNAME` | Username (default: admin) |
| `KCTL_ODOO_API_KEY` | API key |
| `KCTL_ODOO_PROFILE` | Active profile name |

## Commands Reference

### Global Flags

```
--json          Output as JSON (data to stdout, status to stderr)
--quiet, -q     Suppress info messages
--profile, -p   Config profile name
--url           Odoo URL override
--api-key       API key override
--database, -d  Database override
--username, -u  Username override
--version, -V   Show version
```

### Users

```bash
kctl-odoo users list                          # List active users
kctl-odoo users list --all                    # Include inactive
kctl-odoo users get admin                     # Get user by login
kctl-odoo users get 2                         # Get user by ID
kctl-odoo users create newuser --name "New User" --email user@example.com
kctl-odoo users update admin --name "Administrator" --tz "Asia/Jakarta"
kctl-odoo users activate someuser
kctl-odoo users deactivate someuser
```

### Modules

```bash
kctl-odoo modules list                        # List all modules
kctl-odoo modules list --state installed      # Only installed
kctl-odoo modules search "account"            # Search by name/description
kctl-odoo modules install sale_management,stock
kctl-odoo modules upgrade account_management
kctl-odoo modules uninstall my_module --force
```

### Databases

```bash
kctl-odoo databases list
kctl-odoo databases backup mydb -o backup.zip
kctl-odoo databases restore newdb backup.zip
kctl-odoo databases duplicate source_db target_db
```

### System Parameters (ir.config_parameter)

```bash
kctl-odoo config-params list                  # List all
kctl-odoo config-params list -s "web.base"    # Search by key
kctl-odoo config-params get web.base.url
kctl-odoo config-params set web.base.url https://erp.kodeme.io
```

### Scheduled Actions (ir.cron)

```bash
kctl-odoo cron list                           # List all
kctl-odoo cron list --active                  # Active only
kctl-odoo cron enable "Mail: Send Emails"
kctl-odoo cron disable 15
kctl-odoo cron run "Mail: Send Emails"        # Trigger immediately
```

### Health & Dashboard

```bash
kctl-odoo health check                        # One-time health check
kctl-odoo health check --watch --interval 30  # Continuous monitoring
kctl-odoo dashboard info                      # Instance overview
```

### Shell (ORM Calls)

```bash
# Search partners
kctl-odoo shell call res.partner search_read \
  '[[["is_company","=",true]]]' \
  -k '{"fields":["name","email"],"limit":5}'

# Count records
kctl-odoo shell call res.users search_count '[[]]'

# Get field definitions
kctl-odoo shell call sale.order fields_get '[]' \
  -k '{"attributes":["string","type","required"]}'
```

### Export & Import

```bash
# Export to JSON
kctl-odoo export records res.partner --fields name,email --limit 100

# Export to CSV
kctl-odoo export records res.partner \
  -d '[["is_company","=",true]]' \
  -f name,phone --format csv -o partners.csv

# Import from JSON
kctl-odoo import records res.partner partners.json

# Dry run (validate only)
kctl-odoo import records res.partner partners.csv --dry-run
```

### Maintenance

```bash
kctl-odoo maintenance update-list             # Scan for new modules
```

### Config Management

```bash
kctl-odoo config init                         # Interactive setup
kctl-odoo config add staging --url ... --database ... --api-key ...
kctl-odoo config use production               # Switch profile
kctl-odoo config remove staging               # Remove profile
kctl-odoo config show                         # Show all config (keys masked)
kctl-odoo config set url https://new.url
kctl-odoo config profiles                     # List with connection status
kctl-odoo config current                      # Show active connection
kctl-odoo config test                         # Test connection
kctl-odoo config migrate                      # Migrate flat → scoped format
```

## JSON-RPC Protocol

All API calls use Odoo's JSON-RPC 2.0 endpoint at `/jsonrpc`:

```json
{
  "jsonrpc": "2.0",
  "method": "call",
  "id": 1,
  "params": {
    "service": "object",
    "method": "execute_kw",
    "args": ["database", uid, "api_key", "model", "method", [], {}]
  }
}
```

Services: `common` (authenticate, version), `object` (ORM), `db` (database management).

## Instances

| Profile | URL | Database |
|---------|-----|----------|
| production | erp.kodeme.io | kodemeio |
| abcfood | odoo-erp.abcfood.app | abcfood |
| abcfood-* | odoo-*.abcfood.app | per-app DB |

## Generating API Keys

In Odoo 18: Settings → Users → select user → Preferences tab → Account Security → API Keys → New API Key.
