# CLAUDE.md - AI Assistant Guidelines

## Project Overview

Plane project management deployment for ABCFood with native OIDC SSO (Authentik) and Mattermost integration.

## Critical Rules

### Rule #1: Native OIDC Authentication (Authentik SSO)

- **Native OIDC is implemented** - Custom Docker images with OIDC support
- All users authenticate via auth.abcfood.app through native OIDC flow
- No oauth2-proxy or forward auth needed - direct integration

### Rule #2: Dokploy Deployment Pattern

- Uses dokploy-network for external routing
- SERVICE_NAME_IN_COMPOSE=proxy (main service)
- SERVICE_PORT=80
- Dokploy may auto-configure some Traefik labels

## Architecture

```
Internet → Traefik → plane-proxy → Plane services
                          ↓
              User clicks "Sign in with SSO"
                          ↓
              Redirect to Authentik (auth.abcfood.app)
                          ↓
              Callback to /api/v1/oidc-auth/
                          ↓
              Auto-login/create user in Plane
```

## Key Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Main deployment config |
| `.env.prod` | Production secrets (DO NOT COMMIT) |
| `.env.example` | Template for .env.prod |
| `Dockerfile.backend-oidc` | Custom backend with OIDC endpoint |
| `Dockerfile.frontend-oidc` | Custom frontend with SSO button |
| `patches/` | OIDC source code patches |
| `integrations/plane-mattermost/` | Mattermost integration service |

## Environment Variables

### Required
- `SECRET_KEY` - Django secret key
- `POSTGRES_PASSWORD` - Database password
- `MINIO_ROOT_PASSWORD` - Object storage password
- `RABBITMQ_DEFAULT_PASS` - Message queue password

### OIDC Configuration
- `OIDC_AUTO=1` - Enable OIDC auto-discovery
- `OIDC_CLIENT_ID` - From Authentik OAuth provider
- `OIDC_CLIENT_SECRET` - From Authentik OAuth provider
- `OIDC_DISCOVERY` - Authentik discovery URL (e.g., https://auth.abcfood.app/application/o/plane-oauth/)
- `OIDC_PROVIDER_NAME` - Button text (e.g., "Authentik")

### Mattermost Integration
- `MM_SLASH_TOKEN` - From Mattermost slash command
- `MM_BOT_TOKEN` - From Mattermost bot account
- `MM_CHANNEL_ID` - Notifications channel
- `PLANE_API_KEY` - Created post-deployment
- `PLANE_WORKSPACE_SLUG` - Workspace identifier

## Authentik Configuration

Configure in Authentik (auth.abcfood.app):

- **Provider**: `plane-oauth` (OAuth2/OIDC)
- **Application**: `plane`
- **Client Type**: Confidential
- **Redirect URI**: `https://plane.abcfood.app/api/v1/oidc-auth/`
- **Scopes**: openid, email, profile

## Mattermost Configuration

Already configured in Mattermost (mm.abcfood.app):

- **Bot**: plane-bot
- **Slash Command**: `/plane`
- **Channel**: plane-notifications

## OIDC Endpoints

Custom endpoints added to Plane backend:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/oidc-auth/` | Initiates OIDC flow (redirects to Authentik) |
| `GET /api/v1/oidc-auth/?code=...` | Callback from Authentik (exchanges code, logs in user) |
| `GET /api/v1/oidc-config/` | Returns OIDC config for frontend |
| `GET /oidc/` | Static SSO redirect page |

## Services

| Container | Image | Health Check |
|-----------|-------|--------------|
| plane-db | postgres:17-alpine | pg_isready |
| plane-redis | valkey/valkey:7.2.5-alpine | valkey-cli ping |
| plane-mq | rabbitmq:3.13.6-management-alpine | rabbitmq-diagnostics ping |
| plane-minio | minio/minio:latest | mc ready local |
| api | Custom (Dockerfile.backend-oidc) | HTTP /api/v1/ |
| web | Custom (Dockerfile.frontend-oidc) | HTTP / |
| admin | makeplane/plane-admin:stable | HTTP / |
| space | makeplane/plane-space:stable | HTTP / |
| live | makeplane/plane-live:stable | HTTP / |
| proxy | makeplane/plane-proxy:stable | curl /api/v1/ |
| plane-mattermost | Custom (Node.js) | HTTP /health |

## Common Tasks

### Build custom images
```bash
docker compose build api web worker beat-worker migrator
```

### Restart services after config change
```bash
docker compose up -d
```

### Restart Mattermost integration
```bash
docker compose restart plane-mattermost
```

### Check all services
```bash
docker compose ps
```

### View logs
```bash
docker compose logs -f <service-name>
```

### Run migrations manually
```bash
docker compose run --rm migrator
```

### Test OIDC endpoint
```bash
curl -I https://plane.abcfood.app/api/v1/oidc-config/
```

## Troubleshooting

### OIDC not working
1. Verify OIDC_CLIENT_ID and OIDC_CLIENT_SECRET are set
2. Check OIDC_DISCOVERY URL is accessible: `curl https://auth.abcfood.app/application/o/plane-oauth/.well-known/openid-configuration`
3. Verify redirect URI in Authentik matches: `https://plane.abcfood.app/api/v1/oidc-auth/`
4. Check api container logs: `docker compose logs api`

### User not created on OIDC login
1. Check if instance allows signups (first user setup or signup enabled)
2. Verify email claim is returned from Authentik
3. Check api logs for specific errors

### Mattermost commands not working
1. Verify PLANE_API_KEY is set in .env.prod
2. Check plane-mattermost container logs
3. Verify slash command URL in Mattermost

### Services not starting
1. Check depends_on conditions
2. Verify all secrets are set in .env.prod
3. Check individual service logs

## Do NOT

- Remove OIDC environment variables
- Commit .env.prod to git
- Modify the patches/ directory without testing
- Use oauth2-proxy (deprecated - native OIDC is used)
