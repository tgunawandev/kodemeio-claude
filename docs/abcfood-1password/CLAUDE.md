# CLAUDE.md

Always use the wrapper script `bin/op-sync` (not `.venv/bin/op-sync`). The wrapper automatically sources the `.env` file for 1Password service account authentication.

## Commands
- `bin/op-sync push --all` - Push all .env files to 1Password
- `bin/op-sync pull --all` - Pull all .env files from 1Password
- `bin/op-sync status` - Check sync status
- `bin/op-sync discover` - Find all .env files
- `bin/op-sync list` - List items in 1Password vault
- `bin/op-sync diff <project> <environment>` - Show differences

## Options
- `--dry-run` - Preview without changes
- `--force` - Skip confirmation
- `-p <project> -e <env>` - Target specific project/environment

## Prerequisites
1Password CLI (`op`) must be installed. Authentication is handled automatically via the `OP_SERVICE_ACCOUNT_TOKEN` in the `.env` file.
