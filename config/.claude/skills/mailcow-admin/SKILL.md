---
name: mailcow-admin
description: >
  Mailcow mail server administration for kodemeio infrastructure.
  Supports multiple Mailcow instances via profiles (mail.kodeme.io,
  mail.abcfood.app, etc.). Covers domain management, mailbox CRUD,
  alias management, DKIM, queue management, quarantine, rate limits,
  sync jobs, forwarding hosts, logs, and troubleshooting. Use when
  working with kctl-mailcow CLI or managing any Mailcow instance.
version: 0.1.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Mailcow Administration

## Managed Instances

kctl-mailcow supports multiple Mailcow instances via profiles:

| Profile | URL | Use |
|---|---|---|
| `production` | https://mail.kodeme.io | Kodemeio internal mail |
| `abcfood` | https://mail.abcfood.app | ABC Food production |

```bash
# Target a specific instance
kctl-mailcow -p abcfood domains list
kctl-mailcow -p production health

# Switch default profile
kctl-mailcow config use abcfood
```

Config: `~/.config/kodemeio/config.yaml`

## CLI Tool: kctl-mailcow

Installed globally via `uv tool install ./cli`. Run `kctl-mailcow` from anywhere.

### Global Options

```bash
kctl-mailcow [--json] [--quiet] [--profile NAME] [--url URL] [--api-key KEY] <command>
```

- `--profile / -p`: target a specific Mailcow instance
- `--json`: output as JSON (for scripting/piping)
- `--quiet / -q`: suppress info messages

## Multi-Instance Management

```bash
kctl-mailcow config init                                          # Interactive setup
kctl-mailcow config add <name> --url <url> --api-key <key>       # Add instance
kctl-mailcow config use <name>                                    # Switch default
kctl-mailcow config remove <name>                                 # Remove instance
kctl-mailcow config profiles                                      # List all with status
kctl-mailcow config current                                       # Show active + connection
kctl-mailcow config show                                          # Full config (masked)
kctl-mailcow config set <key> <value>                             # Edit config
kctl-mailcow config test                                          # Test connection
kctl-mailcow config migrate                                       # Migrate flat -> scoped format
```

## Domain Management

```bash
kctl-mailcow domains list
kctl-mailcow domains get <domain>
kctl-mailcow domains add <domain> [--description DESC] [--aliases 400] [--mailboxes 10] [--quota 10240]
kctl-mailcow domains update <domain> [--description DESC] [--active/--inactive]
kctl-mailcow domains delete <domain> [--force]
```

## Mailbox Management

```bash
kctl-mailcow mailboxes list [--domain DOMAIN]
kctl-mailcow mailboxes get <email>
kctl-mailcow mailboxes add <local_part> <domain> --password PASS [--name NAME] [--quota 3072]
kctl-mailcow mailboxes update <email> [--name NAME] [--quota N] [--password PASS] [--active/--inactive]
kctl-mailcow mailboxes delete <email> [--force]
```

## Alias Management

```bash
kctl-mailcow aliases list [--domain DOMAIN]
kctl-mailcow aliases get <id>
kctl-mailcow aliases add <address> <goto> [--active/--inactive]
kctl-mailcow aliases update <id> [--address ADDR] [--goto DEST] [--active/--inactive]
kctl-mailcow aliases delete <id> [--force]
```

## DKIM Management

```bash
kctl-mailcow dkim list                                             # Show DKIM status for all domains
kctl-mailcow dkim get <domain>                                     # Show DKIM key + DNS record
kctl-mailcow dkim generate <domain> [--selector dkim] [--length 2048]
```

## Mail Queue

```bash
kctl-mailcow queue list
kctl-mailcow queue flush [queue_id|all]
kctl-mailcow queue delete <queue_id|all> [--force]
```

## Logs

```bash
kctl-mailcow logs list <type> [--count 50]
# Types: dovecot, postfix, sogo, netfilter, autodiscover, rspamd-history, acme, watchdog, api
```

## Rate Limits

```bash
kctl-mailcow ratelimits get <mailbox>
kctl-mailcow ratelimits set <mailbox> <value> [--frame h]
```

## Quarantine

```bash
kctl-mailcow quarantine list
kctl-mailcow quarantine release <id>
kctl-mailcow quarantine delete <id> [--force]
```

## Sync Jobs

```bash
kctl-mailcow sync-jobs list
kctl-mailcow sync-jobs add <local_mailbox> --host <host> --user <user> --password <pass> [--port 993] [--interval 20]
kctl-mailcow sync-jobs delete <id> [--force]
```

## Forwarding Hosts

```bash
kctl-mailcow fwdhost list
kctl-mailcow fwdhost add <hostname> [--filter-spam/--no-filter-spam]
kctl-mailcow fwdhost delete <hostname> [--force]
```

## Monitoring & Health

```bash
kctl-mailcow status [--watch] [--interval 10]
kctl-mailcow health
kctl-mailcow dashboard [--watch] [--interval 10]
```

## API Information

Mailcow uses a non-standard REST API:
- Base: `/api/v1/`
- Auth: `X-API-Key` header
- Read: `GET /api/v1/get/{resource}/{identifier_or_all}`
- Create: `POST /api/v1/add/{resource}`
- Update: `POST /api/v1/edit/{resource}` with `{items: [...], attr: {...}}`
- Delete: `POST /api/v1/delete/{resource}` with `[item1, item2]`

API docs: `https://<mailcow-host>/api`

## Integration Points (Kodemeio)

| Integration | Method | Config |
|---|---|---|
| Authentik SSO | Generic-OIDC | Mailcow Admin UI |
| Mattermost | SMTP relay | `mail.kodeme.io:587` |
| Telegram | Watchdog webhook | `WATCHDOG_NOTIFY_WEBHOOK` |
| Cloudflare | DNS API | `cloudflare-dns.sh` |

## Troubleshooting

### Cannot send/receive mail
1. `kctl-mailcow status` -- check all containers running
2. `kctl-mailcow logs list postfix --count 100` -- check SMTP logs
3. `kctl-mailcow logs list dovecot --count 100` -- check IMAP logs
4. `kctl-mailcow queue list` -- check for stuck messages

### DKIM not working
1. `kctl-mailcow dkim get <domain>` -- verify key exists
2. Compare DNS TXT record with output
3. `kctl-mailcow dkim generate <domain>` -- regenerate if needed

### Mailbox quota issues
1. `kctl-mailcow mailboxes get <email>` -- check current usage
2. `kctl-mailcow mailboxes update <email> --quota <new_size_mb>`

### Spam issues
1. `kctl-mailcow quarantine list` -- check quarantined messages
2. `kctl-mailcow logs list rspamd-history` -- check rspamd decisions
3. `kctl-mailcow fwdhost list` -- verify trusted forwarding hosts

### Working with multiple instances
1. `kctl-mailcow config profiles` -- see all instances and status
2. `kctl-mailcow -p abcfood <command>` -- target a specific instance
3. `kctl-mailcow config use <name>` -- switch default instance
