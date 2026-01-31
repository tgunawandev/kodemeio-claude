# CLAUDE.md - abcfood-hetzner-cloud

Hetzner Cloud infrastructure management for ABC Food platform.

## Overview

Terraform-based infrastructure for Hetzner Cloud resources.

## Key Files

| File | Purpose |
|------|---------|
| `main.tf` | Provider configuration |
| `servers.tf` | VPS server definitions |
| `networks.tf` | Private network configuration |
| `firewalls.tf` | Firewall rules |
| `variables.tf` | Input variables |
| `outputs.tf` | Output values |

## CLI Commands

```bash
# Infrastructure status
bin/hetzner-status

# Server management
bin/hetzner-servers list
bin/hetzner-servers show <name>

# Network management
bin/hetzner-networks list

# Firewall management
bin/hetzner-firewalls list

# Terraform operations
bin/infra-init      # Initialize
bin/infra-plan      # Plan changes
bin/infra-apply     # Apply changes
bin/infra-output    # Show outputs
```

## Environment

Required environment variable:
```bash
export HCLOUD_TOKEN="your-hetzner-api-token"
```

## Current Servers

Check with: `bin/hetzner-servers list`

## Important Notes

1. Always run `bin/infra-plan` before `bin/infra-apply`
2. Never commit `terraform.tfvars` (contains secrets)
3. State file should be stored remotely (S3/Terraform Cloud)
