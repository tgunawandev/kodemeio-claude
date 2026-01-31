# Claude Instructions - ABCFood Authentik

## Create User (Quick Command)

```bash
AUTHENTIK_BOOTSTRAP_TOKEN=PxPcbreslJMhcpJofvRi7aYxcvwFqzN3dGKViZ65HMUaywbgeNx4umL0yeGC \
AUTHENTIK_API_URL=https://auth.abcfood.app/api/v3 \
./scripts/ak-users.sh provision --quiet <email> <role>
```

## Roles

| Role | Description |
|------|-------------|
| `full-user` | Standard employee - all apps access |
| `mattermost-user` | Chat only |

## Example

```bash
AUTHENTIK_BOOTSTRAP_TOKEN=PxPcbreslJMhcpJofvRi7aYxcvwFqzN3dGKViZ65HMUaywbgeNx4umL0yeGC \
AUTHENTIK_API_URL=https://auth.abcfood.app/api/v3 \
./scripts/ak-users.sh provision --quiet newuser@abcfood.com full-user
```

## Output

```
Authentik Provisioning Log
Operation: user-create
Identifier: newuser
Timestamp: 2026-01-27 15:45:57

Workspace: abcfood
Email: newuser@abcfood.com
Name: newuser
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

Logs auto-saved to `logs/provision-<username>-<timestamp>.log`

## Key Paths

- Scripts: `scripts/ak-*.sh`
- Roles: `roles/*.yaml`
- Logs: `logs/`
- Environment: `.env.production`
- Detailed docs: `scripts/CLAUDE.md`
