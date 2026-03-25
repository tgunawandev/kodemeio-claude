---
name: hetzner-admin
description: >
  Hetzner Cloud infrastructure administration for kodemeio. Full CRUD for
  servers, volumes, firewalls, networks, SSH keys, IPs, snapshots, load
  balancers, and DNS. Cost reporting and infrastructure dashboard.
  Use when working with kctl-hetzner CLI or managing Hetzner Cloud resources.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Hetzner Cloud Administration for Kodemeio

## System Overview

- **Server**: cx42 (8 vCPU, 16 GB RAM) at fsn1
- **IP**: 168.119.233.161 (dokploy.kodeme.io)
- **APIs**: Cloud API v1 + DNS API v1 (separate tokens)
- **CLI**: `kctl-hetzner` (Python, installed via `uv tool install ./cli`)
- **Config**: `~/.config/kodemeio/config.yaml` → `profiles.<profile>.hetzner`

## Commands

| Command | Description |
|---------|-------------|
| `kctl-hetzner servers list` | All servers |
| `kctl-hetzner servers get <name>` | Server details |
| `kctl-hetzner servers create <name> --type --image --location` | Create server |
| `kctl-hetzner servers delete <name> [--force]` | Delete server |
| `kctl-hetzner servers reboot <name>` | Reboot server |
| `kctl-hetzner servers shutdown <name>` | Graceful shutdown |
| `kctl-hetzner servers power-off <name>` | Force power off |
| `kctl-hetzner servers rebuild <name> --image` | Reinstall OS |
| `kctl-hetzner volumes list` | All volumes |
| `kctl-hetzner volumes create <name> --size N` | Create volume |
| `kctl-hetzner volumes attach/detach <id>` | Attach/detach |
| `kctl-hetzner volumes delete <id>` | Delete volume |
| `kctl-hetzner firewalls list` | All firewalls |
| `kctl-hetzner firewalls get <name>` | Firewall details + rules |
| `kctl-hetzner firewalls create <name>` | Create firewall |
| `kctl-hetzner networks list` | All networks |
| `kctl-hetzner networks create <name> --ip-range` | Create network |
| `kctl-hetzner ssh-keys list` | SSH keys |
| `kctl-hetzner ssh-keys create <name> --public-key` | Add key |
| `kctl-hetzner ssh-keys delete <id>` | Remove key |
| `kctl-hetzner ips list` | Floating + primary IPs |
| `kctl-hetzner snapshots list` | Server snapshots |
| `kctl-hetzner snapshots create --server <name>` | Create snapshot |
| `kctl-hetzner snapshots delete <id>` | Delete snapshot |
| `kctl-hetzner load-balancers list` | Load balancers |
| `kctl-hetzner dns zones` | DNS zones (separate API) |
| `kctl-hetzner dns records <zone>` | DNS records |
| `kctl-hetzner dns create-record <zone> --type --name --value` | Create record |
| `kctl-hetzner dns delete-record <id>` | Delete record |
| `kctl-hetzner status show` | Infrastructure dashboard |
| `kctl-hetzner costs estimate` | Monthly cost breakdown |
| `kctl-hetzner health check` | Cloud + DNS API check |
| `kctl-hetzner config init/show/test/use` | Configuration |

## Global Options

`--json` `--quiet` `-q` `--profile` `-p` `--token` `--dns-token` `--version` `-V`

## Server Management

```bash
kctl-hetzner servers create my-server --type cx22 --image ubuntu-24.04 --location fsn1
kctl-hetzner servers reboot my-server
kctl-hetzner servers rebuild my-server --image ubuntu-24.04
```

## DNS (separate API, separate token)

```bash
kctl-hetzner dns zones
kctl-hetzner dns records kodeme.io
kctl-hetzner dns create-record kodeme.io --type A --name www --value 168.119.233.161
```

## Troubleshooting

- Server unreachable: `servers get <name>` → `firewalls list` → `ips list`
- Costs: `costs estimate` → monthly breakdown by resource type
- DNS: uses separate DNS API — if using Cloudflare DNS, use kctl-cloudflare instead
