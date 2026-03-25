---
name: rmm-admin
description: Tactical RMM + MeshCentral administration for kodemeio infrastructure. Covers agent management, remote access (Take Control), script execution, patch management, alerts, driver deployment, and service monitoring. Use when working with kctl-rmm CLI or managing rmm.kodeme.io / api-rmm.kodeme.io / mesh.kodeme.io.
---

# RMM Admin Skill

Manage Tactical RMM + MeshCentral remote monitoring platform via `kctl-rmm` CLI.

## Architecture

- **Frontend**: rmm.kodeme.io (Vue.js dashboard)
- **API**: api-rmm.kodeme.io (Django REST API, auth via X-API-KEY header)
- **MeshCentral**: mesh.kodeme.io (remote desktop/terminal)
- **11 Docker services**: postgres, mongodb, redis, nats, tactical-init, tactical-backend, tactical-websocket, tactical-frontend, tactical-celery, tactical-celerybeat, meshcentral

## Instances

| Instance | Frontend | API | MeshCentral | Profile |
|----------|----------|-----|-------------|---------|
| Kodemeio | rmm.kodeme.io | api-rmm.kodeme.io | mesh.kodeme.io | kodemeio |
| ABCFood | rmm.abcfood.app | api-rmm.abcfood.app | mesh.abcfood.app | abcfood |

## CLI: kctl-rmm

Install: `uv tool install ./cli/` from kodemeio-rmm repo.

Config stored in `~/.config/kodemeio/config.yaml` under `rmm` service key:
```yaml
profiles:
  kodemeio:
    rmm:
      url: https://api-rmm.kodeme.io
      api_key: <trmm-service-api-key>
      mesh_url: https://mesh.kodeme.io
  abcfood:
    rmm:
      url: https://api-rmm.abcfood.app
      api_key: <trmm-service-api-key>
      mesh_url: https://mesh.abcfood.app
```

### Quick Reference

```bash
# Setup
kctl-rmm config init
kctl-rmm config test
kctl-rmm config use abcfood              # Switch default profile

# Remote Access (Take Control -- opens browser)
kctl-rmm remote takecontrol <hostname>   # Take Control via TRMM dashboard
kctl-rmm remote takecontrol PCTMIGBJ     # Supports hostname lookup
kctl-rmm remote terminal <hostname>      # Open terminal via MeshCentral
kctl-rmm remote rmm                      # Open TRMM dashboard
kctl-rmm remote mesh                     # Open MeshCentral dashboard
kctl-rmm -p abcfood remote takecontrol DESKTOP-KR118VQ  # Specific profile

# Agents
kctl-rmm agents list                     # List all agents
kctl-rmm agents list --detail            # Full details
kctl-rmm agents list --client ABCFOOD    # Filter by client
kctl-rmm agents get <agent-id>           # Single agent
kctl-rmm agents ping <agent-id>          # Check connectivity
kctl-rmm agents reboot <agent-id>        # Reboot remote machine
kctl-rmm agents offline                  # Show offline agents
kctl-rmm agents summary                  # Count by client/site

# Scripts (ALWAYS use fire-and-forget mode)
kctl-rmm scripts list                    # List scripts
kctl-rmm scripts run 136 --agent <id>    # Run script on agent
kctl-rmm scripts run 135 --all           # Run on all online agents
kctl-rmm scripts history --agent <id>    # Check results
kctl-rmm scripts create "Name" --shell powershell --file script.ps1

# Drivers (POS58 thermal printer)
kctl-rmm drivers install-pos58 <id>      # Script 136
kctl-rmm drivers check-printer <id>      # Script 135

# Clients/Sites
kctl-rmm clients list
kctl-rmm clients sites --client "ABCFOOD"

# Software
kctl-rmm software list <agent-id>
kctl-rmm software search "Chrome"

# Patches
kctl-rmm patches list <agent-id>
kctl-rmm patches scan <agent-id>
kctl-rmm patches install <agent-id> --all

# Alerts
kctl-rmm alerts list --severity error
kctl-rmm alerts dismiss <alert-id>

# Services (Windows, on remote agent)
kctl-rmm services list <agent-id>
kctl-rmm services restart <agent-id> Spooler

# Tasks
kctl-rmm tasks list --agent <agent-id>
kctl-rmm tasks run <task-id>

# Monitoring
kctl-rmm health --watch
kctl-rmm dashboard

# Maintenance
kctl-rmm maintenance status
kctl-rmm maintenance restart tactical-celery
kctl-rmm maintenance logs tactical-backend
```

## Key API Patterns

- Auth: `X-API-KEY` header (NOT Bearer token)
- Script execution: ALWAYS use `output: "forget"` (fire-and-forget). The `"wait"` mode returns 500 errors.
- Alerts endpoint uses PATCH (not GET)
- Script retcode 98 = timeout
- Known scripts: ID 135 = check printer, ID 136 = install POS58 driver
- Downloads from GitHub may hang on agents (TLS/firewall); use `certutil` on Windows

## Troubleshooting

- **Persistent 500s**: Restart tactical-celery, tactical-celerybeat, tactical-backend
- **Init not completing**: Check tactical-init logs for DB connection issues
- **Frontend 502**: Backend not healthy yet, wait for initialization
- **Agents not connecting**: Verify API_HOST is accessible and DNS is correct
- **Script execution unreliable**: Use `output: "forget"` mode, check history for results
- **All agents offline**: Check if agents have network connectivity to the API host
