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

- **Zones**: kodeme.io + 20+ subdomains
- **Architecture**: Cloudflare Edge → cloudflared tunnel → Traefik → Dokploy
- **CLI**: `kctl-cloudflare` (Python, installed via `uv tool install ./cli`)
- **IaC**: Terraform in kodemeio-infra/kodemeio-cloudflare/
- **Config**: `~/.config/kodemeio/config.yaml` → `profiles.<profile>.cloudflare`

## Commands

| Command | Description |
|---------|-------------|
| `kctl-cloudflare zones list` | All DNS zones |
| `kctl-cloudflare zones get <zone>` | Zone details |
| `kctl-cloudflare records list [--zone] [--type]` | DNS records |
| `kctl-cloudflare tunnels list` | Cloudflare Tunnels |
| `kctl-cloudflare tunnels get <name>` | Tunnel details |
| `kctl-cloudflare waf list [--zone]` | WAF firewall rules |
| `kctl-cloudflare waf ip-rules [--zone]` | IP access rules |
| `kctl-cloudflare waf rate-limits [--zone]` | Rate limiting rules |
| `kctl-cloudflare cache status [--zone]` | Cache settings |
| `kctl-cloudflare cache purge-all [--zone]` | Purge all cache |
| `kctl-cloudflare cache purge [--zone] <urls...>` | Purge specific URLs |
| `kctl-cloudflare ssl status [--zone]` | SSL/TLS mode |
| `kctl-cloudflare ssl certificates [--zone]` | Certificate packs |
| `kctl-cloudflare workers list` | Worker scripts |
| `kctl-cloudflare workers routes [--zone]` | Worker routes |
| `kctl-cloudflare workers kv` | KV namespaces |
| `kctl-cloudflare r2 list` | R2 buckets |
| `kctl-cloudflare r2 get <name>` | Bucket details |
| `kctl-cloudflare export all [--zone]` | Full zone export JSON |
| `kctl-cloudflare terraform init` | Terraform init |
| `kctl-cloudflare terraform plan` | Terraform plan |
| `kctl-cloudflare terraform apply` | Terraform apply |
| `kctl-cloudflare terraform destroy` | Terraform destroy |
| `kctl-cloudflare terraform output` | Terraform output |
| `kctl-cloudflare terraform validate` | Terraform validate |
| `kctl-cloudflare health check` | Composite API health |
| `kctl-cloudflare config init/show/test/use` | Configuration |

## Global Options

`--json` `--quiet` `-q` `--profile` `-p` `--api-token` `--account-id` `--version` `-V`

## Terraform Workflow

```bash
kctl-cloudflare terraform plan     # Review changes
kctl-cloudflare terraform apply    # Apply changes
kctl-cloudflare terraform output   # Check state
```

## Troubleshooting

- DNS not resolving: `records list --zone` → `dig +short <domain>`
- Tunnel down: `tunnels list` → `docker logs cloudflared`
- SSL issues: `ssl status --zone` → should be "strict"
- Cache stale: `cache purge-all --zone`
