# CLAUDE.md - abcfood-frappe-15

Instructions for Claude Code when working with this Frappe 15 repository for **abcfood** platform.

## ⚠️ IMPORTANT: DEVELOPMENT ONLY

**This repository is for LOCAL DEVELOPMENT only!**

For production deployment, use: `/home/tgunawan/projects/kodemeio-platform-ops/apps/frappe-15/` (official frappe_docker structure)

### Production vs Development

| Aspect | Development (This Repo) | Production (platform-ops) |
|--------|------------------------|---------------------------|
| Location | `/home/tgunawan/projects/abcfood-frappe-15/` | `/home/tgunawan/projects/kodemeio-platform-ops/apps/frappe-15/` |
| Domain | `frappe-15-dev.abcfood.app` (Cloudflare tunnel) | `frp.abcfood.app` (Dokploy) |
| Purpose | Local development, testing | Production deployment |
| Compose | `docker-compose.yml` (local Redis) | `compose.yaml` (official frappe_docker) |
| Database | Can be local or external | External MariaDB only |
| Approach | Traditional bench setup | Official frappe_docker architecture |

## Repository Purpose

This is the **development** repository for Frappe Framework v15 with FRM custom apps.

**NOTICE**:
- This uses Frappe Framework only - **NOT ERPNext**
- The FRM apps are custom business applications
- **Use for local development only**

## Deployment Architecture

### Official frappe_docker Structure

This deployment follows the official [frappe/frappe_docker](https://github.com/frappe/frappe_docker) architecture:

```
┌─────────────────────────────────────────────────────────────┐
│  Dokploy Domain: frp.abcfood.app                             │
│  Points to Frontend (Nginx on port 8080)                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │   Frontend (Nginx)   │  Handles Host header routing
        │   Port: 8080         │  FRAPPE_SITE_NAME_HEADER=$host
        └──────────┬───────────┘
                   │
        ┌──────────┴──────────────────────────┐
        │                                    │
┌───────▼────────┐                  ┌────────▼──────┐
│  Backend       │                  │  Websocket    │
│  (Gunicorn)    │                  │  (Node.js)    │
│  Port: 8000     │                  │  Port: 9000    │
└────────────────┘                  └───────────────┘

┌────────────────┐  ┌────────────────┐
│ Queue-Short    │  │ Queue-Long     │
│ bench worker   │  │ bench worker   │
└────────────────┘  └────────────────┘

┌────────────────┐
│  Scheduler     │
│  bench schedule│
└────────────────┘

All services share: sites:/home/frappe/frappe-bench/sites
```

### Services

| Service | Purpose | Port | Command |
|---------|---------|------|---------|
| **configurator** | One-time setup | - | Runs `bench set-config` to configure DB/Redis |
| **frontend** | Nginx reverse proxy | 8080 | Handles Host header routing |
| **backend** | Gunicorn WSGI | 8000 | Serves Frappe application |
| **websocket** | Socket.IO | 9000 | Real-time updates |
| **queue-short** | Short queue workers | - | `bench worker --queue short,default` |
| **queue-long** | Long queue workers | - | `bench worker --queue long,default,short` |
| **scheduler** | Scheduled tasks | - | `bench schedule` |

## Current Deployment

- **Domain**: `frp.abcfood.app`
- **Dokploy Project**: `hz-abcfood-prod`
- **Dokploy Server**: `hz-cx43-frappe-prod` (46.224.37.31)
- **MariaDB**: External at `88.99.226.47:3306`
- **Redis**: External at `88.99.226.47:6379`
- **Image**: `ghcr.io/tgunawandev/abcfood-frappe-15:latest`

## Environment Variables

### Required for External DB/Redis

```bash
DB_HOST=88.99.226.47
DB_PORT=3306
REDIS_CACHE=redis://default:PASSWORD@88.99.226.47:6379/0
REDIS_QUEUE=redis://default:PASSWORD@88.99.226.47:6379/1
REDIS_SOCKETIO=redis://default:PASSWORD@88.99.226.47:6379/2
```

### Important

- `FRAPPE_SITE_NAME_HEADER=$host` - Routes by Host header (default behavior)
- DO NOT set specific site names unless you want all requests to go to one site

## Building Custom Images

### With FRM Apps

Create `apps.json` with your custom apps:

```json
[
  {
    "url": "https://github.com/tgunawandev/frm-core",
    "branch": "main"
  },
  {
    "url": "https://github.com/tgunawandev/frm-sfa",
    "branch": "main"
  },
  {
    "url": "https://github.com/tgunawandev/frm-lfa",
    "branch": "main"
  }
]
```

Build using docker-bake:

```bash
docker buildx bake \
  --set custom.args.APPS_JSON_BASE64=$(cat apps.json | base64 -w 0) \
  --set custom.tags=ghcr.io/tgunawandev/abcfood-frappe-15:latest \
  custom

docker push ghcr.io/tgunawandev/abcfood-frappe-15:latest
```

### Without Custom Apps

For just Frappe Framework:

```bash
docker buildx bake \
  --set custom.tags=ghcr.io/tgunawandev/abcfood-frappe-15:latest \
  custom
```

## Site Creation

After deployment, create the site:

```bash
# SSH to server
ssh root@frp.abcfood.app

# Find backend container
docker ps | grep backend

# Create site
docker exec <backend-container> bench new-site frp.abcfood.app \
  --admin-password 'your-password' \
  --db-host 88.99.226.47 \
  --db-root-password 'your-db-password'

# Install FRM apps
docker exec <backend-container> bench --site frp.abcfood.app install-app frm-core
docker exec <backend-container> bench --site frp.abcfood.app install-app frm-sfa
docker exec <backend-container> bench --site frp.abcfood.app install-app frm-lfa
```

## Key Learnings (Do NOT Repeat Mistakes)

### ❌ Wrong Approaches We Tried

1. **Custom single-container setup with `bench start`**
   - Problem: Uses development server, no proper Host routing
   - Result: 404 errors, couldn't route to sites

2. **Gunicorn without frontend nginx**
   - Problem: No Host header forwarding from Dokploy
   - Result: 404 unless accessing with correct Host header

3. **Manual JSON config files**
   - Problem: Complex, error-prone, credentials in logs
   - Result: Maintenance nightmare

4. **Mixing development and production approaches**
   - Problem: Procfile/honcho for production
   - Result: Unnecessary complexity

### ✅ Correct Approach (Official frappe_docker)

1. **Use official architecture**
   - Nginx frontend handles Host routing
   - Separate containers for each service
   - Configurator sets up config properly

2. **Configurator service**
   - Runs `bench set-config` commands
   - Sets up `common_site_config.json` correctly
   - Runs once on startup

3. **Frontend with nginx-entrypoint.sh**
   - Handles `FRAPPE_SITE_NAME_HEADER=$host`
   - Routes requests to correct site based on Host header
   - Works with Dokploy's domain routing

4. **Shared volume**
   - All services mount `sites:/home/frappe/frappe-bench/sites`
   - Site data persists across container restarts

## Troubleshooting

### 404 Errors

If site returns 404:

1. **Check configurator completed**
   ```bash
   docker ps -a | grep configurator
   # Should show exit code 0
   ```

2. **Check frontend nginx config**
   ```bash
   docker exec <frontend-container> cat /etc/nginx/conf.d/default.conf
   # Should have proxy_set_header Host $host
   ```

3. **Check site name matches Host header**
   ```bash
   docker exec <backend-container> ls sites/
   # Should show frp.abcfood.app
   ```

4. **Test with correct Host header**
   ```bash
   docker exec <backend-container> curl -H "Host: frp.abcfood.app" http://localhost:8000/
   # Should return 200 OK
   ```

### Configurator Fails

```bash
# Check logs
docker logs <configurator-container>

# Re-run manually
docker compose up configurator --force-recreate
```

### Database Connection Issues

```bash
# Test from container
docker exec <backend-container> mysql -h 88.99.226.47 -u root -p
```

## Directory Structure (Based on Official frappe_docker)

```
abcfood-frappe-15/
├── apps/                    # Custom FRM apps
│   ├── frm-core/
│   ├── frm-sfa/
│   └── frm-lfa/
├── images/                  # Official structure
│   ├── custom/             # Custom image Containerfile
│   ├── production/         # Production erpnext image (NOT USED)
│   └── bench/              # Bench image
├── resources/               # Nginx resources
│   ├── nginx-entrypoint.sh
│   └── nginx-template.conf
├── compose.yaml             # Main compose (from official)
├── docker-bake.hcl          # Build config (from official)
├── example.env              # Example environment (from official)
└── .github/workflows/       # CI/CD
```

## Important Files

- `compose.yaml`: Main compose file (from official frappe_docker)
- `images/custom/Containerfile`: Custom image definition
- `docker-bake.hcl`: Build configuration
- `apps.json`: Custom apps to include in build (base64 encoded)

## Development Commands (bin/)

**IMPORTANT:** Always use `bin/` scripts for development, NOT `docker compose` directly.

Helper scripts in the `bin/` directory for local development:

| Command | Description |
|---------|-------------|
| `bin/start` | Start all containers in foreground |
| `bin/start-bg` | Start all containers in background |
| `bin/stop` | Stop all containers |
| `bin/restart` | Restart all containers |
| `bin/status` | Show container status and health |
| `bin/logs` | View container logs (supports service filter) |
| `bin/console` | Open Frappe console |
| `bin/db-shell` | Open MariaDB shell |
| `bin/migrate` | Run bench migrate |
| `bin/build` | Build frontend assets |
| `bin/clear-cache` | Clear Frappe cache |
| `bin/backup` | Create site backup |
| `bin/export` | Export DocTypes/fixtures |
| `bin/api` | Test API endpoints |
| `bin/start-tunnel` | Start Cloudflare tunnel |
| `bin/tunnel` | Manage Cloudflare tunnel |

### Environment Files

The repository has two pre-configured environment files:

| File | Purpose | Database | Redis |
|------|---------|----------|-------|
| `.env.local` | Local dev with `bin/start-bg` | External (116.203.191.172) | localhost:6379 |
| `.env.docker` | Docker dev with `docker-compose` | Local db service | redis-cache/queue/socketio:6379 |

**To switch environments:**

```bash
# For local development (bin/start-bg)
cp .env.local .env

# For Docker development
cp .env.docker .env
```

### Quick Start

```bash
# Start development environment
bin/start-bg

# Check status
bin/status

# View logs
bin/logs backend

# Run migrations after code changes
bin/migrate

# Clear cache
bin/clear-cache

# Stop everything
bin/stop
```

## Rules for Claude

1. **NEVER** create custom Docker setups without studying official frappe_docker first
2. **ALWAYS** use the official architecture with frontend/backend/workers
3. **NEVER** use `bench start` or Procfile in production
4. **ALWAYS** use configurator service for setup
5. **NEVER** manually edit `common_site_config.json` - use `bench set-config`
6. **ALWAYS** test with Host header when troubleshooting 404s
7. **USE** `bin/` commands for development tasks instead of raw docker commands

## References

- Official frappe_docker: https://github.com/frappe/frappe_docker
- Custom Apps Guide: https://github.com/frappe/frappe_docker/blob/main/docs/container-setup/02-build-setup.md#define-custom-apps

## Environment Variables Management (Vault)

This project uses **centralized encrypted credential management** via `vault` command with SOPS encryption.

- **Vault Location**: `~/Git/dotenvs/`
- **Encrypted Backup**: `abcfood-frappe-15.env.encrypt`
- **GPG Key**: `73E03F83D0E039D39A419375A4E468569E7232B1`
- **Encryption**: SOPS with GPG

### Quick Commands

```bash
# Backup .env to vault
vault encrypt
# Creates: ~/Git/dotenvs/abcfood-frappe-15.env.encrypt

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
mv abcfood-frappe-15.env.encrypt abcfood-frappe-15.staging.env.encrypt
# 3. Restore original
cd -
mv .env .env.staging
mv .env.backup .env

# Decrypt staging
sops --decrypt --pgp 73E03F83D0E039D39A419375A4E468569E7232B1 \
  --input-type dotenv --output-type dotenv \
  ~/Git/dotenvs/abcfood-frappe-15.staging.env.encrypt > .env.staging
```

