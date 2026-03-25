---
name: zulip-admin
description: >
  Zulip team chat administration for kodemeio infrastructure.
  Supports multiple Zulip instances via profiles (zulip.kodeme.io).
  Covers user management, stream management, messaging, topics,
  user groups, invitations, custom emoji, realm settings,
  health checks, and announcements. Use when working with
  kctl-zulip CLI or managing any Zulip instance.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Zulip Administration

## Managed Instances

kctl-zulip supports multiple Zulip instances via profiles:

| Profile | URL | Use |
|---|---|---|
| `production` | https://zulip.kodeme.io | Kodemeio team chat |

```bash
# Target a specific instance
kctl-zulip -p production users list
kctl-zulip -p production health

# Switch default profile
kctl-zulip config use production
```

Config: `~/.config/kodemeio/config.yaml`

## CLI Tool: kctl-zulip

Installed globally via `uv tool install ./cli`. Run `kctl-zulip` from anywhere.

### Global Options

```bash
kctl-zulip [--json] [--quiet] [--profile NAME] [--url URL] [--email EMAIL] [--api-key KEY] <command>
```

- `--profile / -p`: target a specific Zulip instance
- `--json`: output as JSON (for scripting/piping)
- `--quiet / -q`: suppress info messages

## Multi-Instance Management

```bash
kctl-zulip config init                                        # Interactive setup
kctl-zulip config add <name> --url <url> --email <email> --api-key <key>
kctl-zulip config use <name>                                  # Switch default
kctl-zulip config remove <name>                               # Remove instance
kctl-zulip config profiles                                    # List all with status
kctl-zulip config current                                     # Show active + connection
kctl-zulip config show                                        # Full config (masked)
kctl-zulip config set <key> <value>                           # Edit config
kctl-zulip config test                                        # Test connection
kctl-zulip config migrate                                     # Migrate flat -> scoped
```

## User Management

```bash
kctl-zulip users list [--include-deactivated]
kctl-zulip users get <user_id>
kctl-zulip users create <email> --name "Full Name" --password PASS [--role member]
kctl-zulip users update <user_id> [--name NAME] [--role ROLE]
kctl-zulip users deactivate <user_id> [--force]
kctl-zulip users reactivate <user_id>
```

Roles: owner (100), admin (200), moderator (300), member (400), guest (600)

## Stream Management

```bash
kctl-zulip streams list [--subscribed] [--web-public]
kctl-zulip streams get <stream_id_or_name>
kctl-zulip streams create <name> [-d DESCRIPTION] [--private] [--history-public]
kctl-zulip streams update <stream> [--name NAME] [-d DESCRIPTION] [--private/--public]
kctl-zulip streams delete <stream> [--force]
kctl-zulip streams subscribe <stream> [--users user1@email,user2@email]
kctl-zulip streams unsubscribe <stream> [--users user1@email,user2@email]
```

## Messages

```bash
kctl-zulip messages list [--stream NAME] [--topic TOPIC] [--before N] [--after N]
kctl-zulip messages send "content" --stream NAME --topic TOPIC
kctl-zulip messages send "content" --to user1@email,user2@email
kctl-zulip messages update <message_id> [--content TEXT] [--topic TOPIC]
kctl-zulip messages delete <message_id> [--force]
```

## Topics

```bash
kctl-zulip topics list --stream <stream_name_or_id>
```

## User Groups

```bash
kctl-zulip groups list
kctl-zulip groups get <group_id>
kctl-zulip groups create <name> [-d DESCRIPTION] [--members 1,2,3]
kctl-zulip groups update <group_id> [--name NAME] [-d DESCRIPTION]
kctl-zulip groups delete <group_id> [--force]
kctl-zulip groups add-member <group_id> <user_ids>
kctl-zulip groups remove-member <group_id> <user_ids>
```

## Realm (Server) Settings

```bash
kctl-zulip realm settings                                     # Show server settings
kctl-zulip realm get <key>                                    # Get specific setting
kctl-zulip realm update <key> <value>                         # Update setting (admin)
```

## Invitations

```bash
kctl-zulip invitations list
kctl-zulip invitations create "email1,email2" [--streams 1,2] [--message TEXT] [--expires MINUTES]
kctl-zulip invitations revoke <invite_id> [--force]
```

## Custom Emoji

```bash
kctl-zulip emoji list
kctl-zulip emoji upload <name> <file_path>
kctl-zulip emoji delete <emoji_name> [--force]
```

## Monitoring & Health

```bash
kctl-zulip health [--watch] [--interval N]
kctl-zulip dashboard [--watch] [--interval N]
```

## Announcements

```bash
kctl-zulip announce "message" --stream general --topic "Announcement"
```

## Message Reactions

```bash
kctl-zulip reactions add <message_id> <emoji_name>               # Add reaction to message
kctl-zulip reactions remove <message_id> <emoji_name>            # Remove reaction
kctl-zulip reactions list <message_id>                           # List reactions on message
```

## User Presence & Status

```bash
kctl-zulip presence list                                         # All users presence
kctl-zulip presence get <user_id_or_email>                       # User presence/last active
kctl-zulip presence set-status --text "In a meeting" --emoji "calendar"
```

## Scheduled Messages

```bash
kctl-zulip scheduled list                                        # List scheduled messages
kctl-zulip scheduled create --to STREAM --topic TOPIC --content TEXT --deliver-at DATETIME
kctl-zulip scheduled update <msg_id> [--content TEXT] [--deliver-at DATETIME]
kctl-zulip scheduled delete <msg_id>
```

## Muted Topics & Users

```bash
kctl-zulip muted topics                                          # List muted topics
kctl-zulip muted mute-topic <stream> <topic>
kctl-zulip muted unmute-topic <stream> <topic>
kctl-zulip muted mute-user <user_id>
kctl-zulip muted unmute-user <user_id>
```

## Drafts

```bash
kctl-zulip drafts list
kctl-zulip drafts create --to STREAM --topic TOPIC --content TEXT
kctl-zulip drafts update <draft_id> --content TEXT
kctl-zulip drafts delete <draft_id>
```

## Custom Profile Fields

```bash
kctl-zulip profile-fields list                                   # List custom profile fields
kctl-zulip profile-fields create --name NAME --type TYPE [--hint TEXT]
kctl-zulip profile-fields update <field_id> [--name NAME]
kctl-zulip profile-fields delete <field_id>
kctl-zulip profile-fields reorder --order "1,3,2"                # Reorder fields
```

## Alert Words

```bash
kctl-zulip alert-words list                                      # List alert words
kctl-zulip alert-words add word1 word2                           # Add alert words
kctl-zulip alert-words remove word1 word2                        # Remove alert words
```

## Linkifiers

```bash
kctl-zulip linkifiers list
kctl-zulip linkifiers create --pattern "#(?P<id>[0-9]+)" --url-template "https://plane.kodeme.io/issue/{id}"
kctl-zulip linkifiers delete <id>
```

## Authentication

Zulip API uses HTTP Basic authentication:
- **Email**: bot email or user email
- **API Key**: from Zulip Settings > API key

To get your API key:
1. Go to Zulip Settings > Personal Settings > API key
2. Or create a bot in Settings > Your bots

## Integration with Kodemeio

| Service | Domain | Auth Provider |
|---|---|---|
| Zulip | zulip.kodeme.io | Authentik OIDC |

SSO is handled by Authentik via `GenericOpenIdConnectBackend`.
The API key is separate from SSO and used for programmatic access.

## Troubleshooting

### Cannot connect
1. `kctl-zulip config test` -- verify credentials
2. Check that the URL is correct (https://zulip.kodeme.io)
3. Verify the API key is valid (regenerate in Zulip settings)

### Permission denied
1. Check user role: `kctl-zulip users get <your_id>`
2. Admin operations require admin role (200) or owner role (100)
3. Some endpoints require organization admin privileges

### Stream operations failing
1. Verify stream exists: `kctl-zulip streams list`
2. Check you're subscribed: `kctl-zulip streams list --subscribed`
3. Private streams need explicit access

### Message sending fails
1. Verify stream and topic exist
2. Check message content is not empty
3. For DMs, verify recipient emails are valid
