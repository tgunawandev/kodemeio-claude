---
name: 1password-admin
description: 1Password secret management administration for kodemeio infrastructure. Supports multiple profiles (kodemeio, abcfood, etc.). Covers .env file discovery, push/pull sync to 1Password vault, diff comparison, vault management, project status, backup/restore, and health diagnostics. Use when working with kctl-1password CLI or managing secrets across Kodemeio projects.
---

# 1Password Admin Skill

Manages secrets across all Kodemeio projects via 1Password using the `kctl-1password` CLI.

## Managed Instances (Profiles)

| Profile   | Vault    | Scan Roots                              |
|-----------|----------|-----------------------------------------|
| kodemeio  | Kodemeio | kodemeio-app, kodemeio-core, kodemeio-ext |
| abcfood   | ABCFood  | abcfood                                 |

## CLI Tool: `kctl-1password`

### Global Options
```
--profile, -p   Config profile (default from config)
--vault         Override vault name
--token         Override service account token
--json          JSON output mode
--quiet, -q     Suppress non-essential output
--version, -V   Show version
```

### Multi-Instance Management

Switch profiles:
```bash
kctl-1password --profile kodemeio status
kctl-1password --profile abcfood discover
kctl-1password config use abcfood
```

## Commands Reference

### Discovery & Status
```bash
# Find all .env files across scan roots
kctl-1password discover

# Check sync status for all files
kctl-1password status

# List all items in 1Password vault
kctl-1password list
```

### Sync Operations
```bash
# Push all .env files to 1Password
kctl-1password push --all [--dry-run] [--force]

# Push specific project/environment
kctl-1password push -p kodemeio-odoo-18 -e production

# Pull all from 1Password to local
kctl-1password pull --all [--dry-run] [--force] [--no-backup]

# Pull specific project/environment
kctl-1password pull -p kodemeio-react -e dev

# Show differences for a specific file
kctl-1password diff kodemeio-authentik production [--show-values]

# Show all differences
kctl-1password diff --all
```

### Vault Management
```bash
# Show vault details
kctl-1password vault info

# Create a new vault
kctl-1password vault create [name]

# List all items with metadata
kctl-1password vault items
```

### Project Operations
```bash
# List all discovered projects
kctl-1password projects list

# Show sync status for a project
kctl-1password projects status kodemeio-odoo-18

# List env files for a project
kctl-1password projects envs kodemeio-react
```

### Backup Management
```bash
# List backups
kctl-1password backup list [project]

# Restore from backup
kctl-1password backup restore kodemeio-odoo-18 production [timestamp]

# Clean old backups (keep N most recent)
kctl-1password backup clean --keep 5
```

### Health & Diagnostics
```bash
# Check op CLI, auth, vault access
kctl-1password health

# Full dashboard overview
kctl-1password health dashboard
```

### Configuration
```bash
# Initialize config (interactive)
kctl-1password config init

# Add a new profile
kctl-1password config add abcfood --vault ABCFood --token '${OP_SERVICE_ACCOUNT_TOKEN_ABCFOOD}'

# Switch default profile
kctl-1password config use kodemeio

# Show all config (tokens masked)
kctl-1password config show

# Test connection
kctl-1password config test

# List profiles
kctl-1password config profiles

# Show current profile
kctl-1password config current

# Set a config value
kctl-1password config set vault NewVaultName

# Remove a profile
kctl-1password config remove old-profile
```

## Architecture

- **No REST API**: Wraps the `op` CLI binary via subprocess
- **Auth**: `OP_SERVICE_ACCOUNT_TOKEN` env var (per-profile)
- **Storage**: Each .env file becomes a Secure Note in 1Password
- **Item naming**: `{project}/{environment}` (e.g., `kodemeio-authentik/production`)
- **Tags**: `project:{name}`, `env:{environment}`
- **Fields**: Each env var stored as a password-type field
- **Backups**: `~/.kodemeio-1password/backups/{project}/{env}/`
- **Config**: `~/.config/kodemeio/config.yaml` (service key: `onepassword`)

## Security

- Secret values are NEVER shown by default
- Use `--show-values` flag explicitly to reveal secrets in diff output
- Service account tokens support `${ENV_VAR}` references in config
- Backups are created before any pull overwrites local files

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `op not found` | Install: `bin/install-op-cli` |
| `Not authenticated` | Set `OP_SERVICE_ACCOUNT_TOKEN` env var |
| `Vault not accessible` | Check vault name and token permissions |
| `No .env files found` | Check scan_roots in config |
| `Config not found` | Run `kctl-1password config init` |

## Prerequisites

1. 1Password CLI (`op`) must be installed
2. Service account token configured
3. Vault created and accessible

Install: `uv tool install ./cli` (from kodemeio-1password repo root)
