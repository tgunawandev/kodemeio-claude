# CLAUDE.md - abcfood-n8n-workflow

## Project Overview

This is **abcfood-n8n-workflow**, an n8n workflow automation project for the **abcfood** platform with version control and development scripts.

**Production deployment** is managed separately in `abcfood-platform-ops/apps/n8n/`.

## Tech Stack

- **n8n**: Workflow automation platform (runs directly via npm, not Docker in dev)
- **PostgreSQL**: External database for storing workflows and credentials
- **Dokploy**: Production deployment platform (config in platform-ops)
- **GitHub Actions**: CI validation (lint, validate)

## Development Environment

- Runs in **Coder workspace** (not local machine)
- n8n runs **directly via Node.js** (not Docker) due to Docker-in-Docker limitations
- Uses external PostgreSQL at `116.203.191.172`

## Key Commands

```bash
# Server Management
./bin/start           # Start n8n server
./bin/stop            # Stop n8n server
./bin/status          # Check status
./bin/logs            # View logs (-f to follow)
./bin/start-tunnel    # Start with Cloudflare tunnel

# Workflow Management
./bin/workflow list   # List workflows
./bin/workflow export # Export single workflow
./bin/export          # Export all + auto-commit

# API Management
./bin/api GET /workflows   # Direct API access
./bin/user list            # User management
./bin/credential list      # Credential management
./bin/execution list       # Execution history
./bin/variable list        # Variables
./bin/tag list             # Tags

# Backup & Deploy
./bin/backup              # Backup database
./bin/deploy-workflows    # Import to production
```

## Important Files

| File | Purpose |
|------|---------|
| `bin/*` | CLI management scripts |
| `scripts/lib/*.sh` | Shared library (colors, config, common) |
| `scripts/*.sh` | Build, deployment, and test scripts |
| `workflows/mattermost/*.json` | Mattermost integration workflows |
| `workflows/*.json` | Other workflow definitions (version controlled) |
| `tests/mattermost/*.sh` | Integration tests for Mattermost workflows |
| `docs/*.md` | All documentation (except README.md and CLAUDE.md) |
| `.env` | Local environment config (gitignored) |
| `docker-compose.yml` | Development Docker config (optional) |

## File Organization Rules

**IMPORTANT: Follow these conventions strictly**

### Markdown Files

- ✅ **Root directory:** ONLY `README.md` and `CLAUDE.md`
- ✅ **All other .md files:** Must be in `docs/` folder
- ✅ **Workflow-specific docs:** Can be in `workflows/<category>/README.md`

**Examples:**
```
✅ CORRECT:
- CLAUDE.md                          # Project instructions
- README.md                          # Project overview
- docs/SLASH_COMMAND_DESIGN_V2.md   # Design documentation
- docs/MIGRATION_STRATEGY.md        # Migration docs
- workflows/mattermost/README.md     # Mattermost workflow docs

❌ WRONG:
- SETUP_GUIDE.md                     # Should be docs/SETUP_GUIDE.md
- API_DOCS.md                        # Should be docs/API_DOCS.md
```

### Workflow Files

- ✅ **Mattermost workflows:** `workflows/mattermost/mm_*.json`
- ✅ **Shared workflows:** `workflows/shared-*.json`
- ✅ **Business workflows:** `workflows/<domain>.<feature>.json`

**Naming Convention:**
- `mm_*` prefix for Mattermost integrations
- `shared-*` prefix for reusable components
- Descriptive names using snake_case or kebab-case

### Script Files

- ✅ **CLI tools:** `bin/<name>` (no extension, executable)
- ✅ **Build/deploy scripts:** `scripts/<name>.sh`
- ✅ **Test scripts:** `tests/<category>/test_<name>.sh`
- ✅ **Test helpers:** `tests/<category>/assertions.sh`

### Test Files

- ✅ **Test suites:** `tests/<category>/test_<name>.sh`
- ✅ **Test helpers:** `tests/<category>/<helper>.sh`
- ✅ **Test runner:** `tests/<category>/run_all.sh`
- ✅ **Test docs:** `tests/README.md`

**Why curl instead of vitest:**
- Webhooks are tested with HTTP requests, not JavaScript unit tests
- curl is simple, direct, and works with any n8n deployment
- vitest is for JavaScript/TypeScript code testing, not workflow testing

## Architecture

```
This Repo (Development)              Platform-Ops (Production)
├── bin/* (CLI tools)                ├── docker-compose.yml
├── scripts/lib/* (shared)           ├── .env
├── workflows/*.json                 ├── scripts/
└── .env (dev config)                └── backups/
         │                                    │
         └──── Workflows ─────────────────────┘
               (version controlled)
```

## Workflow Versioning

1. Create/edit workflows in n8n UI
2. Run `./bin/export` to export + commit
3. Push to GitHub
4. Production: `./scripts/deploy-workflows.sh` (in platform-ops)

## Credentials & Security

- Credentials are **encrypted in database** using `N8N_ENCRYPTION_KEY`
- Encryption key stored in **1Password** and `.env`
- Same encryption key must be used in dev and production
- Never commit `.env` or actual credentials
- Use `./bin/credential backup` for credential export

## Database

- **Development**: External PostgreSQL `116.203.191.172:5432/n8n`
- **Production**: Dokploy managed PostgreSQL
- Workflows stored in database, exported to JSON for version control

## Common Tasks

### Start Development
```bash
./bin/start
# Access at http://localhost:5678
# Or with tunnel: ./bin/start-tunnel
```

### Save Work
```bash
./bin/export  # Exports + commits
git push
```

### Deploy to Production
```bash
# In platform-ops/apps/n8n:
./scripts/deploy-workflows.sh
```

## Related Repositories

- **Production Config**: `abcfood-platform-ops/apps/n8n/`
- **Workflows**: This repo (`workflows/*.json`)

## Notes

- n8n API key required for export/import (generate in Settings → API)
- First time setup requires creating owner account in UI
- Encryption key is critical - losing it means losing access to credentials

## ⚠️ CRITICAL: Mattermost Bot Configuration

### bot-webhook-plugin - NEVER DISABLE

**The `bot-webhook-plugin` in Mattermost MUST remain ENABLED. This is CRITICAL.**

**Why it's required:**
- Native Mattermost Outgoing Webhooks ONLY work in **public channels**
- The `bot-webhook-plugin` intercepts @mentions to bot users and forwards them to n8n
- Without it, **private channels cannot interact with @erp-ai or @hris-ai bots**

**Plugin Configuration (in Mattermost System Console → Plugins):**
```json
{
  "bot-webhook-plugin": {
    "botid": "8pizjff57bbdmdknfy9r68ta7w",
    "webhookurl": "https://n8n.abcfood.app/webhook/mm-ai-router"
  }
}
```

**If you encounter duplicate responses:**
- The issue is that BOTH bot-webhook-plugin AND DM pollers trigger
- Fix by adding de-duplication logic to the DM poller workflows
- **NEVER disable the bot-webhook-plugin as a "fix"**

### Production Workflow IDs

These are the correct production workflow IDs for AI Agent tools:

| Tool | Workflow Name | PROD ID |
|------|--------------|---------|
| Customer | mm_erp_customer | JKZSkswQJEI8XTHo |
| Invoice | mm_erp_invoice | dngiR0y42hbXZ4g1 |
| Sale | mm_erp_sale | xGQXiRu3ud6esy5G |
| Stock | mm_erp_stock | gkeEnxwb8vM5qaGU |
| Approval | mm_erp_approval | pjwrKcvJLzP3TL9l |

**Shared Workflows:**

| Workflow | PROD ID | Purpose |
|----------|---------|---------|
| shared_user_permissions | GDWWIU5QcTbXp6ue | Authentik-based access control |

**AI Agent Workflows:**

| Agent | Workflow Name | PROD ID |
|-------|--------------|---------|
| ERP AI | mm_erp_ai_agent | p8wCoQjr5FgF4n08 |
| HRIS AI | mm_hris_ai_agent | Of6pT5zGzPlJp6c8 |
| AI Router | mm_ai_router | (pending deployment) |

### Bot User IDs

| Bot | User ID |
|-----|---------|
| ERP Bot (@erp-ai) | 8pizjff57bbdmdknfy9r68ta7w |
| HRIS Bot (@hris-ai) | ugysiyt4gbrs8n1y4od5jdohsa |

### Access Control (Authentik Integration)

AI bots use **existing** Authentik department groups to control access. DO NOT create new groups.

**Permission Mapping (uses existing groups):**

| Department Group Pattern | ERP Tools | HRIS Tools |
|--------------------------|-----------|------------|
| ak-admin-super | ALL | ALL (admin) |
| ak-dept-*-executive | ALL | - |
| ak-dept-*-sales | sales, customer | - |
| ak-dept-*-finance | invoice, approval | - |
| ak-dept-*-inventory | stock | - |
| ak-dept-*-purchasing | purchase | - |
| ak-dept-*-hr | - | ALL (admin) |
| (all users) | - | self-service |

**How it works:**
1. User sends message to @erp-ai or @hris-ai
2. `shared_user_permissions` workflow looks up user's Authentik groups
3. Maps department groups to allowed tools
4. AI Agent receives `allowed_tools` list in system prompt

**Documentation:** See `docs/AI_BOT_ACCESS_CONTROL.md` for full design.

## Environment Variables Management (Vault)

This project uses **centralized encrypted credential management** via `vault` command with SOPS encryption.

- **Vault Location**: `~/Git/dotenvs/`
- **Encrypted Backup**: `abcfood-n8n-workflow.env.encrypt`
- **GPG Key**: `73E03F83D0E039D39A419375A4E468569E7232B1`
- **Encryption**: SOPS with GPG

### Quick Commands

```bash
# Backup .env to vault
vault encrypt
# Creates: ~/Git/dotenvs/abcfood-n8n-workflow.env.encrypt

# Restore .env from vault
vault decrypt
# Restores: .env from vault

# Check sync status
vault status

# Smart sync (auto-detect direction)
vault sync

# Safe inspection (without exposing secrets)
env-safe list                  # List variable names only
env-safe list --status         # Show defined/empty status
env-safe check API_KEY         # Check if key exists
env-safe validate              # Validate .env syntax
```

### Important Notes

- Always run `vault encrypt` after modifying .env
- Claude cannot read .env directly (safety hooks block access)
- Use `env-safe` commands to inspect .env without exposing values
- Vault repository: `~/Git/dotenvs/` (git-versioned, encrypted)
- Full documentation: `~/Git/dotenvs/README.md`
- Multi-environment guide: `~/Git/dotenvs/MULTI-ENVIRONMENT.md`
- Backup guide: `~/Git/dotenvs/BACKUP-GUIDE.md`

### Multi-Environment Support

For staging/production environments:

```bash
# Backup staging
# 1. Temporarily rename
mv .env .env.backup
mv .env.staging .env
vault encrypt
# 2. Rename in vault
cd ~/Git/dotenvs
mv abcfood-n8n-workflow.env.encrypt abcfood-n8n-workflow.staging.env.encrypt
# 3. Restore original
cd -
mv .env .env.staging
mv .env.backup .env

# Decrypt staging
sops --decrypt --pgp 73E03F83D0E039D39A419375A4E468569E7232B1 \
  --input-type dotenv --output-type dotenv \
  ~/Git/dotenvs/abcfood-n8n-workflow.staging.env.encrypt > .env.staging
```

