# CLAUDE.md - abcfood-cloudflare

Cloudflare infrastructure management for ABC Food platform.

## Overview

Terraform-based infrastructure for Cloudflare DNS, CDN, and security.

## Key Files

| File | Purpose |
|------|---------|
| `main.tf` | Provider configuration |
| `zones.tf` | DNS zone definitions |
| `records.tf` | DNS record management |
| `tunnels.tf` | Cloudflare Tunnel config |
| `ssl.tf` | SSL/TLS settings |
| `firewall.tf` | WAF rules |
| `caching.tf` | Cache configuration |
| `workers.tf` | Cloudflare Workers |

## CLI Commands

```bash
# Cloudflare status
bin/cloudflare-status

# Zone management
bin/cloudflare-zones list

# DNS records
bin/cloudflare-records list
bin/cloudflare-records list --zone abcfood.app

# Tunnel management
bin/cloudflare-tunnels list

# Terraform operations
bin/infra-init      # Initialize
bin/infra-plan      # Plan changes
bin/infra-apply     # Apply changes
bin/infra-output    # Show outputs
```

## Environment

Required environment variables:
```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

## DNS Zones

- `abcfood.app` - Main domain

## Important Notes

1. Always run `bin/infra-plan` before `bin/infra-apply`
2. Never commit `terraform.tfvars` (contains secrets)
3. DNS changes propagate globally (may take time)
4. Tunnels require cloudflared connector on target servers
