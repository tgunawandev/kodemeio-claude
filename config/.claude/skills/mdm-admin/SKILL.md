---
name: mdm-admin
description: Headwind MDM device management administration for kodemeio infrastructure. Covers device management, application deployment, configuration profiles, group management, admin users, audit logs, messaging, and device actions (lock/unlock/reboot/wipe/locate). Use when working with kctl-mdm CLI or managing mdm.kodeme.io.
user_invocable: false
---

# Headwind MDM Administration (kctl-mdm)

## Overview
kctl-mdm manages Headwind MDM (Android device management) instances via the REST API.
- Instance: mdm.kodeme.io (profile: kodemeio)
- API: REST at /rest/ with JWT auth (POST /rest/public/jwt/login, MD5 password hash)
- Auth: admin login -> JWT token -> Bearer auth for /rest/private/ endpoints
- HMDM password hashing: SHA1(MD5(password) + "5YdSYHyg2U") stored in DB

## Installation
```bash
cd /home/tgunawan/project/00-new-projects/kodemeio-core/kodemeio-headwind/cli
uv tool install --force --reinstall .
```

## Configuration
Config stored in ~/.config/kodemeio/config.yaml under `mdm` service key:
```yaml
profiles:
  kodemeio:
    mdm:
      url: https://mdm.kodeme.io
      username: admin
      password: Hzpw1234V1p3rboy
```

## Commands Reference

### Device Management
```bash
kctl-mdm devices list [--group GROUP_ID]     # List all enrolled devices
kctl-mdm devices get <id>                     # Device details
kctl-mdm devices search <term>                # Search by name/number/IMEI
kctl-mdm devices remove <id> [--force]        # Remove from management
kctl-mdm devices lock <id>                    # Lock device screen
kctl-mdm devices unlock <id>                  # Unlock device
kctl-mdm devices reboot <id> [--force]        # Reboot device
kctl-mdm devices wipe <id> [--force]          # Factory reset (DANGEROUS!)
kctl-mdm devices locate <id>                  # Get GPS location
kctl-mdm devices command <id> <command>       # Send custom command
kctl-mdm devices app-settings-get <id>        # Get per-device app settings
kctl-mdm devices app-settings-set <id> <app_id> key=val ...  # Set app settings
kctl-mdm devices app-settings-remove <id> [--app APP_ID]     # Remove app settings
```

### Application Management
```bash
kctl-mdm apps list [--search TERM]            # List applications
kctl-mdm apps get <id>                        # App details
kctl-mdm apps versions <id>                   # List app versions
kctl-mdm apps remove <id> [--force]           # Remove application
kctl-mdm apps configs <id>                    # Show config assignments
```

### Device Configurations
```bash
kctl-mdm configs list [--search TERM]         # List configurations
kctl-mdm configs get <id>                     # Config details with apps
kctl-mdm configs apps <id>                    # List apps in configuration
kctl-mdm configs copy <id> <new-name>         # Duplicate configuration
kctl-mdm configs remove <id> [--force]        # Delete configuration
```

### Group Management
```bash
kctl-mdm groups list                          # List device groups
kctl-mdm groups get <id>                      # Group details with devices
kctl-mdm groups create <name>                 # Create group
kctl-mdm groups remove <id> [--force]         # Delete group
```

### Admin Users
```bash
kctl-mdm users list                           # List admin users
kctl-mdm users create <login> [--name N] [--password P] [--email E]
kctl-mdm users remove <id> [--force]          # Delete admin
```

### Monitoring
```bash
kctl-mdm health                               # API health check
kctl-mdm dashboard                            # Full overview
kctl-mdm audit list [--days N] [--page P]     # Audit logs
```

### Device Status & Logs
```bash
kctl-mdm devices status <id-or-number>                   # Detailed status (battery, network, location)
kctl-mdm devices logs <id> [--limit 50]                  # Device log/history entries
```

### File Management
```bash
kctl-mdm files list                                      # List files on MDM server
kctl-mdm files upload --file <path> [--description DESC] # Upload file to MDM
kctl-mdm files push <file-id> --device <device-id> [--path /dest/path]  # Push file to device
```

### Messaging
```bash
kctl-mdm messages send <text> [--device ID] [--scope all|device|group]
kctl-mdm messages list [--page P]             # List sent messages
kctl-mdm messages remove <id>                 # Delete message
```

### Config Management
```bash
kctl-mdm config init                          # Interactive setup
kctl-mdm config add <name> --url URL --username USER --password PASS
kctl-mdm config use <name>                    # Switch profile
kctl-mdm config remove <name>                 # Remove profile
kctl-mdm config show                          # Show all config
kctl-mdm config set <key> <value>             # Set config value
kctl-mdm config profiles                      # List profiles
kctl-mdm config current                       # Show active profile
kctl-mdm config test                          # Test connection
kctl-mdm config migrate                       # Migrate flat -> scoped
```

### Global Options
```bash
kctl-mdm --json ...                           # JSON output mode
kctl-mdm --quiet ...                          # Suppress info messages
kctl-mdm --profile <name> ...                 # Use specific profile
kctl-mdm --url <url> --username <u> --password <p> ...  # Override connection
```

## Key API Endpoints (Headwind MDM 5.38.1)
- POST /rest/public/jwt/login              -> authenticate (MD5 password)
- POST /rest/private/devices/search        -> list/search devices
- GET  /rest/private/devices/number/{num}  -> device by number
- DELETE /rest/private/devices/{id}        -> delete device
- GET  /rest/private/applications/search   -> list all apps
- GET  /rest/private/applications/{id}     -> app details
- GET  /rest/private/configurations/search -> list configs
- GET  /rest/private/configurations/{id}   -> config details
- GET  /rest/private/groups/search         -> list groups
- GET  /rest/private/users/all             -> list admin users
- PUT  /rest/private/users                 -> create/update user
- DELETE /rest/private/users/other/{id}    -> delete user
- GET  /rest/private/summary/devices       -> device stats
- PUT  /rest/plugins/devicereset/private/lock        -> lock/unlock
- PUT  /rest/plugins/devicereset/private/reboot/{id} -> reboot
- PUT  /rest/plugins/devicereset/private/reset/{id}  -> factory reset
- GET  /rest/plugins/devicelocations/.../location    -> GPS location
- POST /rest/plugins/audit/private/log/search        -> audit logs
- POST /rest/plugins/messaging/private/send          -> send message
- GET  /rest/private/devices/{id}/applicationSettings       -> get device app settings
- POST /rest/private/devices/{id}/applicationSettings       -> set device app settings
- POST /rest/private/devices/{id}/applicationSettings/notify -> push settings to device

## Response Format
All HMDM API responses wrap data: `{"status":"OK","data":{...}}` or `{"status":"ERROR","message":"..."}`.

## Infrastructure
- Database: PostgreSQL at 10.0.0.3, db=hmdm, user=hmdm
- Container: kodemeioservice-kodemeioheadwind-hgfaa3-hmdm-1
- MQTT: port 31000 for device push notifications
- Config: /usr/local/tomcat/conf/Catalina/localhost/ROOT.xml
