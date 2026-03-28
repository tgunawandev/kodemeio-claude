---
description: Odoo 18 ERP administration via kctl-odoo CLI. Covers user management, module operations, database backup/restore, system parameters, scheduled actions, health checks, ORM shell calls, data import/export, and multi-instance profile management. Use when working with kctl-odoo CLI or managing Odoo instances.
---

# Odoo Admin Skill (kctl-odoo)

## Overview

`kctl-odoo` is the Kodemeio CLI for managing Odoo 18 ERP instances. It uses Odoo's JSON-RPC API with API key authentication. Installed via `uv tool install ./cli` from the kodemeio-odoo repo.

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

### Mail Management

```bash
kctl-odoo mail status                         # Mail server status and queue counts
kctl-odoo mail queue [--state outgoing|exception|sent] [--limit 50]
kctl-odoo mail send <to> --subject "..." --body "..."
kctl-odoo mail retry [--all] [--id ID]        # Retry failed emails
kctl-odoo mail purge [--days 30] [--state sent] [--force]
kctl-odoo mail servers list                   # List incoming/outgoing servers
kctl-odoo mail servers test <id>              # Test mail server connection
kctl-odoo mail fetchmail                      # Trigger incoming mail fetch
```

### Session Management

```bash
kctl-odoo sessions list [--user USER]         # List active sessions
kctl-odoo sessions kill <sid>                 # Kill specific session
kctl-odoo sessions kill-user <user> [--force] # Kill all sessions for user
kctl-odoo sessions stats                      # Session statistics
```

### Worker Management

```bash
kctl-odoo workers status                      # Worker process status
kctl-odoo workers count                       # Current worker count
kctl-odoo workers restart [--graceful]        # Restart workers
kctl-odoo workers stats                       # Worker performance stats
```

### Performance Monitoring

```bash
kctl-odoo performance overview                # Overall performance summary
kctl-odoo performance slow-queries [--limit 20] [--min-duration MS]
kctl-odoo performance long-running [--threshold 60]
kctl-odoo performance table-sizes [--top 20]
kctl-odoo performance index-usage [--model MODEL]
kctl-odoo performance cache-stats             # ORM cache statistics
kctl-odoo performance profiler [--duration 60] [--output FILE]
```

### Queue Job Management

```bash
kctl-odoo jobs list [--state pending|enqueued|started|failed] [--limit 50]
kctl-odoo jobs get <id>                       # Job details
kctl-odoo jobs retry <id>                     # Retry failed job
kctl-odoo jobs retry-all [--state failed]     # Retry all failed jobs
kctl-odoo jobs cancel <id>                    # Cancel pending job
kctl-odoo jobs purge [--state done] [--days 7] [--force]
kctl-odoo jobs stats                          # Queue job statistics
```

### Security Management

```bash
kctl-odoo security access-rights list [--model MODEL]
kctl-odoo security access-rights check <model> <user> [--operation read|write|create|unlink]
kctl-odoo security record-rules list [--model MODEL]
kctl-odoo security groups list                # List security groups
kctl-odoo security groups members <group>     # List group members
kctl-odoo security audit [--user USER] [--days 7]
kctl-odoo security api-keys list [--user USER]
```

### Company Management

```bash
kctl-odoo companies list                      # List all companies
kctl-odoo companies get <id|name>             # Company details
kctl-odoo companies create <name> [--parent ID] [--currency CODE]
kctl-odoo companies update <id> [--name NAME] [--email EMAIL]
kctl-odoo companies switch <id>               # Switch active company context
kctl-odoo companies users <id>                # List users in company
```

### Partner Management

```bash
kctl-odoo partners list [--customer] [--supplier] [--company]
kctl-odoo partners get <id|name>              # Partner details
kctl-odoo partners search <term>              # Search partners
kctl-odoo partners create <name> [--email EMAIL] [--phone PHONE] [--company]
kctl-odoo partners update <id> [--name NAME] [--email EMAIL]
kctl-odoo partners merge <source_ids> --into <target_id> [--force]
kctl-odoo partners duplicates [--model res.partner]
kctl-odoo partners export [--format csv|json] [--domain DOMAIN]
```

### Storage Management

```bash
kctl-odoo storage overview                    # Disk usage overview
kctl-odoo storage attachments [--model MODEL] [--top 20]
kctl-odoo storage filestore-size              # Filestore disk usage
kctl-odoo storage db-size                     # Database size breakdown
kctl-odoo storage cleanup [--dry-run]         # Clean orphaned attachments
kctl-odoo storage assets rebuild              # Rebuild web assets
kctl-odoo storage sessions cleanup [--days 7] # Clean expired sessions
```

### Tenant Management

```bash
kctl-odoo tenants list                        # List all databases/tenants
kctl-odoo tenants create <name> [--template TEMPLATE] [--lang LANG]
kctl-odoo tenants duplicate <source> <target>
kctl-odoo tenants drop <name> [--force]       # Drop tenant database
kctl-odoo tenants backup <name> [-o FILE]     # Backup tenant
kctl-odoo tenants restore <name> <file>       # Restore tenant
kctl-odoo tenants info <name>                 # Tenant details (size, users, modules)
```

### Troubleshoot Commands

```bash
kctl-odoo troubleshoot logs [--level error|warning] [--limit 100]
kctl-odoo troubleshoot check-config           # Validate odoo.conf settings
kctl-odoo troubleshoot test-email [--to admin@kodeme.io]
kctl-odoo troubleshoot test-db                # Test database connectivity
kctl-odoo troubleshoot missing-deps           # Check Python dependencies
kctl-odoo troubleshoot stale-locks [--kill]   # Find/kill stale DB locks
kctl-odoo troubleshoot asset-check            # Verify web assets integrity
kctl-odoo troubleshoot version-info           # Full version and environment info
```

## Development Tools

```bash
kctl-odoo dev translate-export <module> [--lang LANG] [--format po|csv]
kctl-odoo dev translate-import <file> [--lang CODE] [--overwrite]
kctl-odoo dev translate-languages
kctl-odoo dev assets-regenerate [--force]
kctl-odoo dev deps-tree <module>                         # Dependency tree visualization
kctl-odoo dev deps-reverse <module>                      # What depends on this module
kctl-odoo dev cloc [--module MODULE]                     # Lines of code / module info
kctl-odoo dev model-info <model_name>                    # Field definitions for any model
```

## Server Configuration

```bash
kctl-odoo config-server mail-outgoing                    # List SMTP servers
kctl-odoo config-server mail-outgoing-add --name NAME --host HOST --port PORT [--encryption starttls]
kctl-odoo config-server mail-outgoing-test <server_id>   # Test SMTP connection
kctl-odoo config-server mail-incoming                    # List IMAP/POP3 servers
kctl-odoo config-server mail-incoming-add --name NAME --host HOST --port PORT --type imap|pop3
kctl-odoo config-server defaults-list [--model MODEL]    # List ir.default records
kctl-odoo config-server defaults-set <model> <field> <value>
kctl-odoo config-server defaults-delete <id> [--force]
```

## Report Management

```bash
kctl-odoo report list [--model MODEL]                    # List available reports
kctl-odoo report render <report_name> <record_ids> [--format pdf|html] [--output FILE]
kctl-odoo report templates [--model MODEL]               # List QWeb templates
```

## Business Operations (biz)

### Dashboards
```bash
kctl-odoo biz sales-summary [--period month|quarter|year] [--team TEAM]
kctl-odoo biz purchase-summary [--period month|quarter|year]
kctl-odoo biz inventory-summary [--warehouse WH]
kctl-odoo biz accounting-summary [--period month]
kctl-odoo biz manufacturing-summary
kctl-odoo biz crm-pipeline [--team TEAM]
kctl-odoo biz hr-summary
```

### Alerts
```bash
kctl-odoo biz overdue-invoices [--days 30] [--limit 50]
kctl-odoo biz overdue-orders [--type sale|purchase] [--days 7]
kctl-odoo biz low-stock [--threshold 10] [--limit 50]
kctl-odoo biz stuck-transfers [--days 3] [--limit 50]
kctl-odoo biz pending-approvals [--limit 50]
kctl-odoo biz failed-emails [--limit 50]
```

### Bulk Operations
```bash
kctl-odoo biz confirm-orders --model sale.order|purchase.order [--domain DOMAIN] [--ids IDS] [--force]
kctl-odoo biz post-invoices [--type out_invoice|in_invoice] [--domain DOMAIN] [--force]
kctl-odoo biz create-invoices [--from-orders] [--domain DOMAIN] [--force]
kctl-odoo biz validate-transfers [--type outgoing|incoming] [--domain DOMAIN] [--force]
```

### Approvals
```bash
kctl-odoo biz approve-purchases [--ids IDS] [--all] [--force]
kctl-odoo biz approve-leaves [--ids IDS] [--all] [--force]
kctl-odoo biz approve-expenses [--ids IDS] [--all] [--force]
```

## Integration

```bash
kctl-odoo integration webhook-list                       # List base.automation webhooks
kctl-odoo integration oauth-list                         # List OAuth providers
kctl-odoo integration bus-send <channel> <message>       # Send bus notification
kctl-odoo integration test-smtp [--server-id ID]         # Test SMTP connection
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
