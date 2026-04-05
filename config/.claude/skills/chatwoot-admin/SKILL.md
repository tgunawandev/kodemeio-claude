---
name: chatwoot-admin
description: >
  Chatwoot customer engagement platform administration via kctl-chatwoot CLI. MUST use for ANY Chatwoot operation — conversations, contacts, agents, inboxes, teams, labels, webhooks. Triggers on: "kctl-chatwoot", "chatwoot", "customer support", "inbox", "conversation", "agent assignment", "chat widget", "chatwoot webhook", or ANY customer engagement platform task.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Chatwoot Administration

## Managed Instances

kctl-chatwoot supports multiple Chatwoot instances via profiles:

| Profile | URL | Use |
|---|---|---|
| `kodemeio` | https://chat.kodeme.io | Kodemeio customer support |

```bash
# Target a specific instance
kctl-chatwoot -p kodemeio conversations list
kctl-chatwoot -p kodemeio health

# Switch default profile
kctl-chatwoot config use kodemeio
```

Config: `~/.config/kodemeio/config.yaml`

## CLI Tool: kctl-chatwoot

Installed globally via `uv tool install ./cli`. Run `kctl-chatwoot` from anywhere.

### Global Options

```bash
kctl-chatwoot [--json] [--quiet] [--profile NAME] [--url URL] [--token TOKEN] [--account-id ID] <command>
```

- `--profile / -p`: target a specific instance
- `--url`: override Chatwoot base URL
- `--token`: override API access token
- `--account-id`: override account ID (default: 1)
- `--json`: output as JSON
- `--quiet / -q`: suppress info messages

## Multi-Instance Management

```bash
kctl-chatwoot config init                                          # Interactive setup
kctl-chatwoot config add <name> --url <url> [--token TK] [--account-id ID]  # Add profile
kctl-chatwoot config use <name>                                    # Switch default
kctl-chatwoot config remove <name> [--service-only] [--force]      # Remove profile
kctl-chatwoot config profiles                                      # List all with status
kctl-chatwoot config current                                       # Show active + connection
kctl-chatwoot config show                                          # Full config (masked)
kctl-chatwoot config set <key> <value>                             # Edit config
kctl-chatwoot config test                                          # Test connection
kctl-chatwoot config migrate                                       # Migrate format
```

## Health & Dashboard

```bash
kctl-chatwoot health [--watch] [--interval 10]                     # Health score (0-100)
kctl-chatwoot dashboard [--watch] [--interval 10] [--compact]      # System overview
```

Health scoring: API reachable (30pts) + profile valid (25pts) + inboxes exist (20pts) + agents active (25pts).

## Conversation Management

```bash
kctl-chatwoot conversations list [--status open|resolved|pending] [--inbox-id ID] [--page N]
kctl-chatwoot conversations get <id>                               # Conversation details
kctl-chatwoot conversations create --contact-id ID --inbox-id ID [--message TEXT]
kctl-chatwoot conversations assign <id> --agent-id ID              # Assign to agent
kctl-chatwoot conversations resolve <id>                           # Mark as resolved
kctl-chatwoot conversations reopen <id>                            # Reopen conversation
```

## Messages

```bash
kctl-chatwoot messages list <conversation-id>                      # Messages in conversation
kctl-chatwoot messages send <conversation-id> --content TEXT [--private]  # Send message
```

## Contact Management

```bash
kctl-chatwoot contacts list [--page N]                             # All contacts
kctl-chatwoot contacts get <id>                                    # Contact details
kctl-chatwoot contacts search <query>                              # Search by name/email/phone
kctl-chatwoot contacts create --name NAME [--email] [--phone]      # Create contact
kctl-chatwoot contacts update <id> [--name] [--email] [--phone]    # Update contact
```

## Agent Management

```bash
kctl-chatwoot agents list                                          # All agents
kctl-chatwoot agents get <id>                                      # Agent details
kctl-chatwoot agents create --name NAME --email EMAIL --role ROLE  # Add agent
```

Roles: `agent`, `administrator`

## Inbox Management

```bash
kctl-chatwoot inboxes list                                         # All inboxes
kctl-chatwoot inboxes get <id>                                     # Inbox details
kctl-chatwoot inboxes create --name NAME --channel-type TYPE       # Create inbox
kctl-chatwoot inboxes delete <id> [--force]                        # Remove inbox
```

Channel types: api, email, web_widget, whatsapp, facebook, instagram, telegram, line, sms.

## Team Management

```bash
kctl-chatwoot teams list                                           # All teams
kctl-chatwoot teams get <id>                                       # Team details + members
kctl-chatwoot teams create --name NAME [--description TEXT]        # Create team
kctl-chatwoot teams delete <id> [--force]                          # Remove team
```

## Label Management

```bash
kctl-chatwoot labels list                                          # All labels
kctl-chatwoot labels create --title TITLE [--description] [--color]  # Create label
kctl-chatwoot labels delete <id> [--force]                         # Remove label
```

## Reports & Analytics

```bash
kctl-chatwoot reports summary [--since 7]                          # Account metrics
kctl-chatwoot reports agents [--since 7]                           # Per-agent metrics
```

Metrics: conversations_count, incoming_messages, outgoing_messages, avg_first_response_time, avg_resolution_time.

## Webhook Management

```bash
kctl-chatwoot webhooks list                                        # All webhooks
kctl-chatwoot webhooks create --url URL [--subscriptions LIST]     # Create webhook
kctl-chatwoot webhooks delete <id> [--force]                       # Remove webhook
```

## API Structure

The CLI talks to the Chatwoot REST API:

- **Base URL**: `https://chat.kodeme.io/api/v1`
- **Auth**: `api_access_token` query parameter
- **Account-scoped**: Most endpoints at `/api/v1/accounts/{account_id}/`
- **Resources**: conversations, messages, contacts, agents, inboxes, teams, labels, reports, webhooks

## Architecture

- **Chatwoot v4.11.1** (Rails + Sidekiq)
- **PostgreSQL 16** with pgvector (AI-ready)
- **Redis 7** (cache + Sidekiq queue)
- **SSO** via Authentik (OIDC)
- **S3** for file storage (Hetzner Object Storage)
- **Deployed** via Dokploy with Traefik reverse proxy

### Channels Supported

Live chat (web widget), Email, Facebook Messenger, Instagram DM, WhatsApp (Cloud API + WAHA), Telegram, LINE, SMS, API channel.

## Troubleshooting

```bash
# Check system health
kctl-chatwoot health

# Test connection with token
kctl-chatwoot config test

# View open conversations
kctl-chatwoot conversations list --status open

# Check agent availability
kctl-chatwoot agents list

# JSON output for debugging
kctl-chatwoot --json conversations list | jq .
```
