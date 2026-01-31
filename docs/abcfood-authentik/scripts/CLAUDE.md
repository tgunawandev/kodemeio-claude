# Claude Instructions - Authentik User Management

## Quick Reference: Create User

```bash
AUTHENTIK_BOOTSTRAP_TOKEN=PxPcbreslJMhcpJofvRi7aYxcvwFqzN3dGKViZ65HMUaywbgeNx4umL0yeGC \
AUTHENTIK_API_URL=https://auth.abcfood.app/api/v3 \
./scripts/ak-users.sh provision --quiet <email> <role>
```

## Roles

| Role | Use Case |
|------|----------|
| `full-user` | Standard employee - access to all apps |
| `mattermost-user` | Chat only access |

## Examples

### Create full user
```bash
AUTHENTIK_BOOTSTRAP_TOKEN=PxPcbreslJMhcpJofvRi7aYxcvwFqzN3dGKViZ65HMUaywbgeNx4umL0yeGC \
AUTHENTIK_API_URL=https://auth.abcfood.app/api/v3 \
./scripts/ak-users.sh provision --quiet john@abcfood.com full-user
```

### Create Mattermost-only user
```bash
AUTHENTIK_BOOTSTRAP_TOKEN=PxPcbreslJMhcpJofvRi7aYxcvwFqzN3dGKViZ65HMUaywbgeNx4umL0yeGC \
AUTHENTIK_API_URL=https://auth.abcfood.app/api/v3 \
./scripts/ak-users.sh provision --quiet jane@abcfood.com mattermost-user
```

## Output Format

```
Authentik Provisioning Log
Operation: user-create
Identifier: john
Timestamp: 2026-01-27 15:45:57

Workspace: abcfood
Email: john@abcfood.com
Name: john
Roles: full-user
Active: true

Status: CREATED
User ID: 542
Groups Added: grp-app-user-all grp-app-user-mattermost
Groups Existed:
Groups Failed:

Invitation Link:
https://auth.abcfood.app/if/flow/recovery/?flow_token=<token>

Login: https://auth.abcfood.app
Mattermost: https://mm.abcfood.app
Email sender: system@abcfood.app
Note: If email not in inbox, check junk/spam folder
```

## Logs

Logs are automatically saved to:
```
logs/provision-<username>-<YYYYMMDD-HHMMSS>.log
```

## Credentials

From `.env.production`:
- **API URL**: `https://auth.abcfood.app/api/v3`
- **API Token**: `PxPcbreslJMhcpJofvRi7aYxcvwFqzN3dGKViZ65HMUaywbgeNx4umL0yeGC`

## Important Notes

1. Always use `--quiet` flag for clean output
2. Role files are in `roles/` directory
3. Logs auto-save to `logs/` directory
4. If user exists, groups are updated and recovery link generated
5. New users get invitation link to set password
