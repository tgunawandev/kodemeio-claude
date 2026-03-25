---
name: authentik-admin
description: >
  Authentik identity provider administration for kodemeio infrastructure.
  Supports multiple Authentik instances via profiles (auth.kodeme.io,
  auth.abcfood.app, etc.). Covers user provisioning, invitations,
  group management, OAuth2/LDAP/SAML/Proxy provider setup, forward auth,
  email (welcome/recovery via Authentik SMTP), audit logging, and
  troubleshooting. Use when working with kctl-ak CLI or managing any
  Authentik instance.
version: 1.1.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Authentik Administration

## Managed Instances

kctl-ak supports multiple Authentik instances via profiles:

| Profile | URL | Use |
|---|---|---|
| `kodemeio` | https://auth.kodeme.io | Kodemeio internal services |
| `abcfood` | https://auth.abcfood.app | ABC Food |

```bash
# Target a specific instance
kctl-ak -p abcfood users list
kctl-ak -p kodemeio health

# Switch default profile
kctl-ak config use abcfood
```

Config: `~/.config/kodemeio/config.yaml`

## CLI Tool: kctl-ak

Installed globally via `uv tool install ./cli`. Run `kctl-ak` from anywhere.

### Global Options

```bash
kctl-ak [--json] [--quiet] [--profile NAME] [--url URL] [--token TOKEN] <command>
```

- `--profile / -p`: target a specific Authentik instance
- `--json`: output as JSON (for scripting/piping)
- `--quiet / -q`: suppress info messages

## Multi-Instance Management

```bash
kctl-ak config add <name> --url <url> --token <token>     # Add instance
kctl-ak config add <name> --url <url> --token <token> --roles-dir /path/to/roles
kctl-ak config use <name>                                   # Switch default
kctl-ak config remove <name>                                # Remove instance
kctl-ak config profiles                                     # List all with status
kctl-ak config current                                      # Show active + connection
kctl-ak config show                                         # Full config (masked)
kctl-ak config set <key> <value>                            # Edit config
kctl-ak config test                                         # Test connection
```

Each profile can have its own: url, token, roles_dir, group_structure, smtp config.

## User Management

```bash
kctl-ak users list [--page N] [--active|--inactive]
kctl-ak users get <id|username|email>
kctl-ak users search <term>
kctl-ak users create <email> [--name NAME] [--username NAME] [--password PASS] [--groups g1,g2]
kctl-ak users update <identifier> <field> <value>
kctl-ak users password <identifier> [password]
kctl-ak users recovery <identifier>
kctl-ak users activate <identifier>
kctl-ak users deactivate <identifier>
kctl-ak users delete <identifier> [--force]
kctl-ak users groups <identifier>
kctl-ak users export [--format json|csv]
kctl-ak users me
```

## Invitations & Onboarding

```bash
# Smart invite: creates user if new, re-sends welcome if existing
kctl-ak users invite <email> [--name NAME] [--groups g1,g2] [--send-mail]

# Re-send welcome email to existing user (e.g. expired link)
kctl-ak users re-invite <identifier>

# List users who were invited but never logged in
kctl-ak users pending

# Bulk invite from JSON file
kctl-ak users bulk-invite <file.json> [--send-mail]
```

Bulk invite file format:
```json
[
  {"email": "alice@kodeme.io", "name": "Alice", "groups": "ak-app-plane-all,ak-app-zulip-all"},
  {"email": "bob@kodeme.io", "name": "Bob", "groups": "ak-app-mattermost-all"}
]
```

## Role-Based Provisioning

```bash
kctl-ak users roles                                         # List available roles
kctl-ak users role <name>                                   # Show role details
kctl-ak users provision <email> <role> [role2...] [--send-mail]  # Provision with roles
kctl-ak users provision <email> <role> --name "Display Name" --send-mail
```

Roles are defined in `roles/*.yaml`. Each maps to a set of groups.

| Role | Description | Use Case |
|---|---|---|
| `admin` | Full IT admin | All apps + superuser |
| `basic-user` | Standard employee | Mattermost only |
| `office-user` | Office worker | Mattermost + Grafana view |
| `erp-user` | ERP user | Mattermost + Odoo |
| `devops` | DevOps engineer | Mattermost + Grafana admin + N8N |
| `mattermost-user` | Chat only | Mattermost |

## Email (via Authentik's SMTP)

All emails are sent through Authentik's built-in SMTP config (no local SMTP needed):

```bash
kctl-ak mail test [--to EMAIL]                # Check SMTP config + send test
kctl-ak mail send-welcome <identifier>        # Welcome email (72h link, account_confirmation template)
kctl-ak mail send-recovery <identifier>       # Password reset email (60m link, password_reset template)
kctl-ak mail send-password <identifier>       # Set password + send recovery email
kctl-ak mail recovery-link <identifier>       # Generate link without email
```

| Command | Email Template | Link Expiry | Use Case |
|---|---|---|---|
| `mail send-welcome` | account_confirmation.html | 72 hours | New user onboarding |
| `mail send-recovery` | password_reset.html | 60 minutes | Forgot password |
| `users invite --send-mail` | account_confirmation.html | 72 hours | New user invite |
| `users re-invite` | account_confirmation.html | 72 hours | Resend expired invite |
| `users provision --send-mail` | account_confirmation.html | 72 hours | Provision + welcome |

## Group Management

```bash
kctl-ak groups list
kctl-ak groups get <id|name>
kctl-ak groups tree                                         # Visual hierarchy
kctl-ak groups create <name> [--parent NAME] [--superuser]
kctl-ak groups add-user <group> <user>
kctl-ak groups remove-user <group> <user>
kctl-ak groups members <id|name>
kctl-ak groups sync [--dry-run] [--file PATH]               # Sync from group-structure.yaml
kctl-ak groups export [--format json|yaml]
```

## Application & Provider Management

```bash
kctl-ak apps list
kctl-ak apps get <slug>
kctl-ak apps create <name> <slug> [--provider ID] [--launch-url URL]
kctl-ak apps launch-urls
kctl-ak apps access <slug>

kctl-ak providers list [--type oauth2|ldap|saml|proxy]
kctl-ak providers oauth2 list|get|create|credentials|delete
kctl-ak providers ldap list|get|create|delete
kctl-ak providers saml list|get|create|metadata|delete
kctl-ak providers proxy list|get|create|delete
```

## Quick Setup (Provider + App in one command)

```bash
kctl-ak setup oauth2 "ServiceName" "https://service.kodeme.io/callback"
kctl-ak setup proxy "ServiceName" "https://service.kodeme.io"
kctl-ak setup admin <username>
kctl-ak setup recovery <username>
kctl-ak setup status
```

## Monitoring & Health

```bash
kctl-ak health [--watch]
kctl-ak dashboard [--compact] [--watch]
kctl-ak maintenance status|version|tasks|outposts|workers|config|clean
kctl-ak maintenance settings                              # View all system settings
kctl-ak maintenance settings --set <key> --value <val>    # Modify a setting
kctl-ak maintenance impersonation                         # View impersonation status
kctl-ak maintenance impersonation --enable/--disable      # Toggle impersonation
kctl-ak maintenance impersonation --require-reason        # Require reason for impersonation
```

### System Settings

View and modify Authentik system settings (security, user defaults, general):

```bash
kctl-ak maintenance settings                                        # View all
kctl-ak maintenance settings --set impersonation --value false       # Disable impersonation
kctl-ak maintenance settings --set default_user_change_email --value true
kctl-ak maintenance settings --set event_retention --value "days=90"

# Per-instance (e.g. disable impersonation on production)
kctl-ak -p abcfood maintenance impersonation --disable
kctl-ak -p kodemeio maintenance impersonation --enable --require-reason
```

Available settings: `impersonation`, `impersonation_require_reason`, `default_user_change_name`, `default_user_change_email`, `default_user_change_username`, `gdpr_compliance`, `avatars`, `default_token_duration`, `default_token_length`, `event_retention`, `reputation_lower_limit`, `reputation_upper_limit`.

## Audit & Security

```bash
kctl-ak audit list [--action TYPE] [--user IDENT]
kctl-ak audit logins [--failed]
kctl-ak audit stats [--days N]
kctl-ak audit tail [--interval N]                           # Live tail

kctl-ak sessions list [--user IDENT]
kctl-ak sessions kill <session_id>
kctl-ak sessions kill-user <user> [--force]
kctl-ak sessions stats

kctl-ak tokens list [--user IDENT]
kctl-ak tokens create <identifier> <user> [--intent api]
kctl-ak tokens view <identifier>                            # Show actual key
kctl-ak tokens rotate <identifier>
kctl-ak tokens expire-all <user> [--force]
```

## Flows & Blueprints

```bash
kctl-ak flows list [--designation TYPE]
kctl-ak flows get <slug>
kctl-ak flows bindings <slug>
kctl-ak flows export <slug>

kctl-ak blueprints instances
kctl-ak blueprints apply <id>
kctl-ak blueprints export <flow_slug>
```

## Provider Decision Tree

When connecting a new service to Authentik:

1. **Service supports OIDC/OAuth2?** -> Use **OAuth2 Provider**
   - `kctl-ak setup oauth2 "ServiceName" "https://service.kodeme.io/callback"`
   - Best for: Mattermost, Grafana, Odoo, Gitea, Plane, Zulip, most modern apps

2. **Service supports SAML?** -> Use **SAML Provider**
   - `kctl-ak providers saml create "ServiceName" "https://service.kodeme.io/saml/acs"`
   - Best for: Enterprise apps (AWS, Google Workspace)

3. **Service supports LDAP bind?** -> Use **LDAP Provider**
   - Best for: Legacy apps, mail servers

4. **Service has NO auth support?** -> Use **Proxy Provider** (forward auth)
   - `kctl-ak setup proxy "ServiceName" "https://service.kodeme.io"`
   - Best for: Gatus, static sites, internal dashboards
   - Requires Traefik middleware labels

## Forward Auth Setup (Proxy Provider)

For services without built-in OIDC (e.g., Gatus):

1. Create proxy provider and application:
   ```bash
   kctl-ak setup proxy "Gatus" "https://gatus.kodeme.io"
   ```

2. Add provider to embedded outpost (via Authentik UI)

3. In the protected service's docker-compose, add Traefik labels:
   ```yaml
   labels:
     - "traefik.http.middlewares.authentik-forward-auth.forwardAuth.address=http://authentik-server:9000/outpost.goauthentik.io/auth/traefik"
     - "traefik.http.middlewares.authentik-forward-auth.forwardAuth.trustForwardHeader=true"
     - "traefik.http.middlewares.authentik-forward-auth.forwardAuth.authResponseHeaders=X-authentik-username,X-authentik-groups,X-authentik-entitlements,X-authentik-email,X-authentik-name,X-authentik-uid"
     - "traefik.http.routers.<service>.middlewares=authentik-forward-auth"
   ```

**CRITICAL**: Use `http://authentik-server:9000` (network alias on dokploy-network), NOT the external URL. The external URL hairpins through Traefik and breaks `X-Forwarded-Host` header matching.

## Group Naming Convention

```
{prefix}-{tier}-{identifier}[-{sub-identifier}]

Prefix:  ak- (Authentik-managed)
Tiers:
  admin  -- Superuser / admin groups
  svc    -- Service accounts
  role   -- Access bundles (maps to provisioning roles)
  app    -- Per-application access
  dept   -- Department groups
```

Examples: `ak-admin-super`, `ak-role-devops`, `ak-app-grafana-admin`, `ak-dept-engineering`

## Integration Targets (Kodemeio)

| Service | Type | Domain | Provider |
|---|---|---|---|
| Gatus | Forward Auth | gatus.kodeme.io | Proxy |
| Mailcow | OAuth2/OIDC | mail.kodeme.io | OAuth2 |
| Mattermost | OAuth2/OIDC | chat.kodeme.io | OAuth2 |
| Odoo | OAuth2/OIDC | erp.kodeme.io | OAuth2 |
| Grafana | OAuth2/OIDC | grafana.kodeme.io | OAuth2 |
| Plane | OAuth2/OIDC | plane.kodeme.io | OAuth2 |
| Zulip | OAuth2/OIDC | zulip.kodeme.io | OAuth2 |
| Outline | OAuth2/OIDC | outline.kodeme.io | OAuth2 |
| GlitchTip | OAuth2/OIDC | glitchtip.kodeme.io | OAuth2 |

## Troubleshooting

### User cannot access an application
1. `kctl-ak users groups <user>` -- check group membership
2. `kctl-ak apps access <app-slug>` -- check policy bindings
3. `kctl-ak audit list --user <user>` -- check auth events

### Forward auth returning 401/403
1. Verify the service uses `http://authentik-server:9000` NOT external URL
2. Check outpost has the proxy provider assigned
3. `kctl-ak maintenance outposts` -- verify outpost health
4. Check Traefik labels include all required `authResponseHeaders`

### Health check degraded
1. `kctl-ak health` -- see which checks fail
2. `kctl-ak maintenance status` -- check DB and cache
3. `kctl-ak maintenance workers` -- verify worker running

### User never received invitation email
1. `kctl-ak users pending` -- check if user is in pending list
2. `kctl-ak users re-invite <user>` -- resend welcome email
3. `kctl-ak mail test --to <email>` -- verify email delivery works

### OAuth2 token issues
1. `kctl-ak providers oauth2 get <id>` -- check token validity
2. `kctl-ak tokens list --user <user>` -- check user tokens
3. `kctl-ak audit logins --failed` -- check for auth failures

### Working with multiple instances
1. `kctl-ak config profiles` -- see all instances and connection status
2. `kctl-ak -p abcfood <command>` -- target a specific instance
3. `kctl-ak config use <name>` -- switch default instance
