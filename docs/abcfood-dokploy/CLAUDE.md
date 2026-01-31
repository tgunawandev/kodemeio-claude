# CLAUDE.md - abcfood-dokploy

Dokploy management CLI tools for ABC Food platform.

## Overview

CLI tools for managing Dokploy deployments across all ABC Food services.

## CLI Commands

```bash
# Overall status
bin/dokploy-status

# Project management
bin/dokploy-projects list
bin/dokploy-projects show <project-id>

# App management
bin/dokploy-apps list
bin/dokploy-apps show <app-id>

# Server management
bin/dokploy-servers list
bin/dokploy-servers show <server-id>

# Apps per server
bin/dokploy-server-apps <server-id>

# Deployment history
bin/dokploy-deployments list
bin/dokploy-deployments show <deployment-id>
```

## Environment

Required environment variables:
```bash
export DOKPLOY_API_URL="https://your-dokploy.com"
export DOKPLOY_API_KEY="your-api-key"
```

## Deployment Model

Each service repo has:
- `docker-compose.prod.yml` - Production compose file
- `scripts/deploy.sh` - Deployment script using Dokploy API

Dokploy points to each repo's docker-compose.prod.yml via Git source.

## Important Notes

1. Always use service-specific deploy.sh scripts for deployments
2. These CLI tools are for monitoring and management only
3. Never store API keys in code
