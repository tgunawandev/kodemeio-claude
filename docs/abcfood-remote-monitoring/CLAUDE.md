# CLAUDE.md - abcfood-remote-monitoring

This file provides context and instructions for AI assistants working with this codebase.

## Project Overview

This is **abcfood-remote-monitoring**, a deployment of **Tactical RMM + MeshCentral** for remote device management. Deployed via Dokploy using the standard abcfood docker-compose patterns.

## Architecture

```
                    Traefik (Dokploy)
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
rmm.abcfood.app    api-rmm.abcfood.app    mesh.abcfood.app
    │                     │                     │
    ▼                     ▼                     ▼
┌──────────┐    ┌─────────────────┐    ┌──────────────┐
│ frontend │    │ backend + ws    │    │ meshcentral  │
│ :80      │    │ :8080           │    │ :443         │
└──────────┘    └────────┬────────┘    └──────┬───────┘
                         │                    │
              ┌──────────┴────────────────────┴─────────┐
              │              rmm-internal               │
              │  ┌────────┐ ┌────────┐ ┌──────┐ ┌─────┐ │
              │  │postgres│ │mongodb │ │redis │ │nats │ │
              │  └────────┘ └────────┘ └──────┘ └─────┘ │
              │  ┌────────┐ ┌──────────┐                │
              │  │ celery │ │celerybeat│                │
              │  └────────┘ └──────────┘                │
              └─────────────────────────────────────────┘
```

## Domains

| Domain | Service | Purpose |
|--------|---------|---------|
| `rmm.abcfood.app` | tactical-frontend | Vue.js dashboard (login, agent management) |
| `api-rmm.abcfood.app` | tactical-backend | REST API + WebSocket for agent communication |
| `mesh.abcfood.app` | meshcentral | MeshCentral for remote desktop/terminal |

## Services (11 Total)

| Service | Image | Port | Network | Description |
|---------|-------|------|---------|-------------|
| postgres | postgres:13-alpine | 5432 | internal | Tactical RMM database |
| mongodb | mongo:4.4 | 27017 | internal | MeshCentral database |
| redis | redis:6.0-alpine | 6379 | internal | Celery task queue |
| nats | tactical-nats | - | both | Agent messaging |
| tactical-init | tactical | - | internal | One-time initialization |
| tactical-backend | tactical | 8080 | both | Django REST API |
| tactical-websocket | tactical | 8080 | both | WebSocket proxy |
| tactical-frontend | tactical-frontend | 80 | dokploy | Vue.js UI |
| tactical-celery | tactical | - | internal | Background workers |
| tactical-celerybeat | tactical | - | internal | Scheduled tasks |
| meshcentral | tactical-meshcentral | 443 | both | Remote access |

## Repository Structure

```
abcfood-remote-monitoring/
├── docker-compose.prod.yml    # Main compose file for Dokploy
├── .env.example               # Environment template
├── .env                       # Environment secrets (gitignored)
├── .gitignore
├── CLAUDE.md                  # This file
└── README.md                  # User documentation
```

## Quick Commands

### Deployment (via Dokploy)

1. Create project in Dokploy
2. Set Git source to this repository
3. Configure environment variables from `.env.example`
4. Deploy using `docker-compose.prod.yml`

### Local Testing

```bash
# Copy and edit environment
cp .env.example .env
# Edit .env with your values

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker-compose.prod.yml ps
```

### Generate Passwords

```bash
# Generate strong password
openssl rand -base64 32

# Generate all required passwords
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "MONGODB_PASSWORD=$(openssl rand -base64 32)"
echo "TRMM_PASSWORD=$(openssl rand -base64 24)"
echo "MESH_PASSWORD=$(openssl rand -base64 24)"
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_HOST` | Frontend domain | `rmm.abcfood.app` |
| `API_HOST` | API domain | `api-rmm.abcfood.app` |
| `MESH_HOST` | MeshCentral domain | `mesh.abcfood.app` |
| `POSTGRES_PASSWORD` | PostgreSQL password | (generate) |
| `MONGODB_PASSWORD` | MongoDB password | (generate) |
| `TRMM_USER` | Admin username | `admin` |
| `TRMM_PASSWORD` | Admin password | (generate) |
| `MESH_USER` | MeshCentral user | `tactical` |
| `MESH_PASSWORD` | MeshCentral password | (generate) |

## Resource Allocation

Total: ~8.5 CPU, ~6.5GB RAM

| Service | CPU | Memory |
|---------|-----|--------|
| postgres | 1.0 | 512M |
| mongodb | 1.0 | 512M |
| redis | 0.5 | 256M |
| nats | 0.5 | 256M |
| meshcentral | 1.0 | 1G |
| tactical-backend | 2.0 | 2G |
| tactical-websocket | 0.5 | 512M |
| tactical-frontend | 0.5 | 256M |
| tactical-celery | 1.0 | 1G |
| tactical-celerybeat | 0.5 | 256M |

## Traefik Routing

| Domain | Router | Service | Port | Special |
|--------|--------|---------|------|---------|
| `rmm.abcfood.app` | rmm-frontend | tactical-frontend | 80 | - |
| `api-rmm.abcfood.app` | rmm-api | tactical-backend | 8080 | Excludes `/natsws` |
| `api-rmm.abcfood.app/natsws` | rmm-natsws | tactical-websocket | 8080 | WebSocket headers |
| `mesh.abcfood.app` | rmm-mesh | meshcentral | 443 | X-Forwarded-Proto |

## Important Notes

1. **First Startup**: May take 3-5 minutes for initialization
2. **Init Container**: `tactical-init` runs once and exits (creates certs, database, etc.)
3. **TLS**: Traefik handles external TLS; MeshCentral uses self-signed internally
4. **Agent Download**: After login, download agents from the dashboard
5. **Backups**: Use standard Docker backup processes (volume backups)

## Troubleshooting

### Check Service Health

```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Check specific service logs
docker compose -f docker-compose.prod.yml logs tactical-backend
docker compose -f docker-compose.prod.yml logs tactical-init
```

### Common Issues

1. **Init not completing**: Check `tactical-init` logs for database connection issues
2. **Frontend 502**: Backend not healthy yet, wait for initialization
3. **MeshCentral not loading**: Check MongoDB connection and `meshcentral` logs
4. **Agents not connecting**: Verify `API_HOST` is accessible and DNS is correct

### Reset Everything

```bash
# Stop and remove all
docker compose -f docker-compose.prod.yml down -v

# Remove volumes (CAUTION: deletes all data)
docker volume rm rmm-postgres-data rmm-mongo-data rmm-redis-data rmm-tactical-data rmm-mesh-data

# Redeploy
docker compose -f docker-compose.prod.yml up -d
```

## Related Resources

- [Tactical RMM Documentation](https://docs.tacticalrmm.com/)
- [Tactical RMM Docker](https://github.com/amidaware/tacticalrmm/tree/master/docker)
- [MeshCentral Documentation](https://info.meshcentral.com/downloads/MeshCentral2/MeshCentral2UserGuide.pdf)

## Pre-deployment Checklist

- [ ] DNS records created for all 3 domains pointing to Dokploy server
- [ ] Strong passwords generated for all `*_PASSWORD` variables
- [ ] `.env` file created from `.env.example` with real values
- [ ] Server has sufficient resources (~8.5 CPU, ~6.5GB RAM)

## Verification After Deployment

1. **Health checks** - All services should pass health checks
2. **Access frontend** - https://rmm.abcfood.app (login page)
3. **Access MeshCentral** - https://mesh.abcfood.app
4. **API health** - https://api-rmm.abcfood.app/health/ returns OK
5. **Login** - Use `TRMM_USER`/`TRMM_PASSWORD` credentials
6. **Test agent download** - Download and install agent on test device

## Rules for Claude

1. **NEVER** commit `.env` files with real credentials
2. **ALWAYS** generate new passwords for each deployment
3. **ALWAYS** verify DNS records before deployment
4. **NEVER** expose internal network services to dokploy-network
5. **ALWAYS** use `service_completed_successfully` for init dependencies
6. **ALWAYS** include health checks for production services
