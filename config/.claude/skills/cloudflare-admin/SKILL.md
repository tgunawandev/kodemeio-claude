---
name: cloudflare-admin
description: >
  Cloudflare infrastructure administration for kodemeio. Manages DNS zones,
  records, tunnels, WAF rules, cache, SSL/TLS, Workers, R2 storage, and
  Terraform IaC. Use when working with kctl-cloudflare CLI or managing
  Cloudflare resources for kodeme.io.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Cloudflare Administration for Kodemeio

## System Overview

- **Zones**: kodeme.io + subdomains (20+)
- **Architecture**: Cloudflare Edge → cloudflared tunnel → Traefik → Dokploy
- **CLI**: `kctl-cloudflare` (Python, installed via `uv tool install ./cli`)
- **IaC**: Terraform configs in kodemeio-infra/kodemeio-cloudflare/
- **Config**: `~/.config/kodemeio/config.yaml` → `profiles.<profile>.cloudflare`

## Quick Reference

| Command | Description |
|---------|-------------|
| `kctl-cloudflare zones list` | All DNS zones |
| `kctl-cloudflare zones get <zone>` | Zone details |
| `kctl-cloudflare records list [--zone]` | DNS records |
| `kctl-cloudflare records export [--zone]` | BIND export |
| `kctl-cloudflare tunnels list` | Cloudflare Tunnels |
| `kctl-cloudflare tunnels get <name>` | Tunnel details |
| `kctl-cloudflare waf list [--zone]` | WAF rules |
| `kctl-cloudflare waf ip-rules [--zone]` | IP access rules |
| `kctl-cloudflare cache status [--zone]` | Cache settings |
| `kctl-cloudflare cache purge-all [--zone]` | Purge all cache |
| `kctl-cloudflare ssl status [--zone]` | SSL/TLS mode |
| `kctl-cloudflare ssl certificates [--zone]` | Certificate packs |
| `kctl-cloudflare workers list` | Worker scripts |
| `kctl-cloudflare workers routes [--zone]` | Worker routes |
| `kctl-cloudflare workers kv` | KV namespaces |
| `kctl-cloudflare r2 list` | R2 buckets |
| `kctl-cloudflare health check` | Composite health |
| `kctl-cloudflare export all [--zone]` | Full zone export |
| `kctl-cloudflare terraform plan` | Terraform plan |
| `kctl-cloudflare terraform apply` | Terraform apply |

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | JSON output |
| `--quiet`, `-q` | Suppress info |
| `--profile`, `-p` | Config profile |
| `--api-token` | API token override |
| `--account-id` | Account ID override |
| `--version`, `-V` | Show version |

## Terraform Workflow

```bash
# Plan changes
kctl-cloudflare terraform plan

# Review output, then apply
kctl-cloudflare terraform apply

# Check current state
kctl-cloudflare terraform output
```

## DNS Management

```bash
# List all records
kctl-cloudflare records list --zone kodeme.io

# Export as BIND format
kctl-cloudflare records export --zone kodeme.io
```

## Troubleshooting

### DNS not propagating
1. `kctl-cloudflare records list --zone <zone>` — verify record exists
2. Check proxy status (orange cloud vs gray)
3. `dig +short <domain>` — check resolution
4. TTL may need to expire (default 300s)

### Tunnel down
1. `kctl-cloudflare tunnels list` — check status
2. `docker logs cloudflared` — check connector logs
3. Verify tunnel token in `.env.prod`

### SSL issues
1. `kctl-cloudflare ssl status --zone <zone>` — check mode (Full Strict recommended)
2. `kctl-cloudflare ssl certificates --zone <zone>` — check cert status
