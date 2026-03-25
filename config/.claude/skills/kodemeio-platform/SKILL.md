---
name: kodemeio-platform
description: >
  Cross-project architecture knowledge for the Kodemeio platform.
  Documents how the 5 main repos connect: kodemeio-react (11 PWA apps),
  kodemeio-odoo-18 (ERP backend), kodemeio-next (websites),
  kodemeio-hono (Node.js services), kodemeio-fastapi (Python services).
  Use when working across repos, adding end-to-end features, debugging
  cross-service issues, or deciding which project to work in.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

# Kodemeio Platform Architecture

## The 5 Repos

| Repo | Stack | Purpose | Location |
|---|---|---|---|
| **kodemeio-react** | React 19 + Vite + Turborepo | 11 mobile PWA apps | kodemeio-app/kodemeio-react |
| **kodemeio-odoo-18** | Odoo 18 + FastAPI addons | ERP backend for all mobile apps | kodemeio-app/kodemeio-odoo-18 |
| **kodemeio-next** | Next.js 16 + App Router | Marketing websites | kodemeio-app/kodemeio-next |
| **kodemeio-hono** | Hono 4.7 + Drizzle + BullMQ | Node.js API services | kodemeio-app/kodemeio-hono |
| **kodemeio-fastapi** | FastAPI + SQLAlchemy 2.0 async | Python services (webhooks, agents, ETL) | kodemeio-app/kodemeio-fastapi |

## How They Connect

```
                         Authentik SSO
                       auth.kodeme.io
                      (OIDC for all apps)
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │  React    │     │  Next.js  │     │   Hono    │
    │  11 PWAs  │     │  Websites │     │   svc1    │
    │  :4004+   │     │           │     │   :3010   │
    └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
          │                 │                  │
          │ REST API        │ REST API         │ Odoo RPC proxy
          │ /sfa/api/       │ /api/v1/         │ /odoo/*
          │ /wms/api/       │                  │
          │ /tpm/api/       │                  │
          │                 │                  │
    ┌─────▼─────────────────┼──────────────────▼─────┐
    │              Odoo 18 + FastAPI addons           │
    │              app.kodeme.io (:8069/:8869)        │
    │              53 modules, 12 with FastAPI         │
    └──────────────────────┬─────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌───▼──────┐
        │ FastAPI  │ │ Mailcow  │ │PostgreSQL│
        │ webhooks │ │ SMTP     │ │ 10.0.0.3 │
        │ events   │ │mail.io   │ │          │
        │ :8000+   │ └──────────┘ └──────────┘
        └──────────┘
```

## Data Flow: Mobile App Feature (End-to-End)

```
React PWA (kodemeio-react)
  ↓ HTTP REST (JWT in header)
Odoo FastAPI addon (kodemeio-odoo-18/src/private/<app>_management)
  ↓ Pydantic validation → Odoo ORM
PostgreSQL (kodemeio-postgres-16)
  ↓ Response envelope: { success, data, total, message }
React PWA (renders with TanStack Query)
```

**Type safety chain:**
```
Odoo FastAPI router → Pydantic schema → OpenAPI JSON → @hey-api/openapi-ts → TypeScript types → React hooks
```

## Which Repo for Each Task

| Task | Work In | Files to Touch |
|---|---|---|
| **Add mobile app feature** | kodemeio-odoo-18 (backend) + kodemeio-react (frontend) | Odoo: models/, services/, schemas/ + React: api/, pages/ |
| **Add new mobile app** | kodemeio-odoo-18 (new addon) + kodemeio-react (new app) | New <app>_management module + new apps/<app>/ |
| **Add website page** | kodemeio-next | apps/<site>/app/[locale]/<path>/page.tsx |
| **Add website API backend** | kodemeio-hono | apps/svc1/src/routes/<name>.ts |
| **Add integration/webhook** | kodemeio-fastapi (or kodemeio-hono) | FastAPI: apps/webhook-* or apps/*-mm |
| **Add background job** | kodemeio-fastapi (ARQ) or kodemeio-hono (BullMQ) | workers/ directory |
| **Add AI agent** | kodemeio-fastapi | apps/agent-main/ |
| **Add ETL pipeline** | kodemeio-fastapi | apps/etl-main/ |
| **Manage users/SSO** | kctl-ak CLI | `kctl-ak users`, `kctl-ak groups`, etc. |
| **Add Odoo model** | kodemeio-odoo-18 | models/, views/, security/, tests/ |
| **Add Mattermost integration** | kodemeio-fastapi (odoo-mm or plane-mm) | webhook + events worker |

## Adding a Feature End-to-End (Example: New WMS Feature)

### Step 1: Backend (kodemeio-odoo-18)

```bash
cd kodemeio-app/kodemeio-odoo-18

# 1. Add/modify Odoo model
# src/private/wms_management/models/wms_new_feature.py

# 2. Add FastAPI router
# src/private/wms_management/services/new_feature_router.py

# 3. Add Pydantic schemas
# src/private/wms_management/schemas/new_feature_schemas.py

# 4. Register router in fastapi_endpoint model
# src/private/wms_management/models/fastapi_endpoint_wms.py

# 5. Add security rules
# src/private/wms_management/security/ir.model.access.csv

# 6. Add tests
# src/private/wms_management/tests/test_api_new_feature.py
```

### Step 2: Regenerate Types (kodemeio-react)

```bash
cd kodemeio-app/kodemeio-react

# Fetch updated OpenAPI schema and regenerate TypeScript types
pnpm --filter @kodemeio/wms fetch:schema
pnpm --filter @kodemeio/wms codegen

# Types appear in apps/wms/src/generated/types.gen.ts
# Re-export in apps/wms/src/types/api.ts
```

### Step 3: Frontend (kodemeio-react)

```bash
# 1. Add API hook
# apps/wms/src/api/useNewFeature.ts (useQuery/useMutation + queryKey)

# 2. Add page component
# apps/wms/src/pages/NewFeaturePage.tsx (MobileLayout + useTranslation)

# 3. Add route to App.tsx
# Lazy import + Route entry

# 4. Add i18n keys
# apps/wms/src/i18n/en.json + id.json

# 5. Add tests
# apps/wms/src/__tests__/pages/NewFeaturePage.test.tsx
```

## React ↔ Odoo App Mapping

| React App | Port | Odoo Addon | API Base Path |
|---|---|---|---|
| sfa | 4004 | sfa_management | /sfa/api/ |
| lfa | 4005 | lfa_management | /lfa/api/ |
| shop | 4006 | shop_management | /shop/api/ |
| wms | 4007 | wms_management | /wms/api/ |
| bia | 4008 | bia_management | /bia/api/ |
| eam | 4009 | asset_management | /asset/api/ |
| mrp | 4010 | mrp_management | /mrp/api/ |
| hrm | 4011 | hrm_management | /hrm/api/ |
| tpm | 4012 | tpm_management | /tpm/api/ |
| dms | 4013 | dms_management | /dms/api/ |
| saas | 4014 | saas_management | /saas/api/ |

## Next.js ↔ Hono Mapping

| Next.js App | Domain | Backend |
|---|---|---|
| portfolio | trigunawan.com | kodemeio-hono svc1 (svc1.kodeme.io:3010) |
| corporate | kodeme.io | kodemeio-hono svc1 |
| consulting | consulting.kodeme.io | kodemeio-hono svc1 |

## Service Ports

| Service | Port | Repo |
|---|---|---|
| React SFA | 4004 | kodemeio-react |
| React LFA | 4005 | kodemeio-react |
| React Shop | 4006 | kodemeio-react |
| React WMS | 4007 | kodemeio-react |
| React BIA | 4008 | kodemeio-react |
| React EAM | 4009 | kodemeio-react |
| React MRP | 4010 | kodemeio-react |
| React HRM | 4011 | kodemeio-react |
| React TPM | 4012 | kodemeio-react |
| React DMS | 4013 | kodemeio-react |
| React SaaS | 4014 | kodemeio-react |
| Hono svc1 | 3010 | kodemeio-hono |
| Hono svc2 | 3020 | kodemeio-hono |
| FastAPI api-main | 8000 | kodemeio-fastapi |
| FastAPI stream | 8002 | kodemeio-fastapi |
| FastAPI odoo-mm | 8003 | kodemeio-fastapi |
| FastAPI plane-mm | 8004 | kodemeio-fastapi |
| FastAPI webhook-github | 8005 | kodemeio-fastapi |
| FastAPI webhook-chatwoot | 8006 | kodemeio-fastapi |
| Odoo web | 8069 | kodemeio-odoo-18 |
| Odoo FastAPI | 8869 | kodemeio-odoo-18 |

## Shared Infrastructure

| Service | Domain | Purpose |
|---|---|---|
| **Authentik** | auth.kodeme.io | SSO/OIDC for all apps. Managed via `kctl-ak` CLI |
| **PostgreSQL** | kodemeio-postgres-16 (Hetzner private network) | Shared database server for Odoo, Hono, FastAPI |
| **Mailcow** | mail.kodeme.io | Email (SMTP) for all services |
| **Dokploy** | dokploy.kodeme.io | Deployment platform |
| **Traefik** | (reverse proxy) | HTTPS termination, Let's Encrypt, routing |
| **Hetzner Cloud** | (hosting) | All servers |
| **Hetzner S3** | Object Storage | File uploads, media, exports |
| **Mattermost** | chat.kodeme.io | Team chat + webhook integrations |

## Authentication Flows

### Mobile PWA (React) → Odoo

```
1. User opens app (e.g., SFA)
2. VITE_AUTH_MODE determines flow:
   - "oidc": redirect to auth.kodeme.io → PKCE → token → stored in localStorage
   - "native": username/password → POST /sfa/api/auth/login → JWT → localStorage
3. All API calls include: Authorization: Bearer <jwt>
4. Odoo FastAPI validates JWT via base_management
```

### Website (Next.js) → Hono

```
1. User visits website (e.g., trigunawan.com)
2. Optional login: Better Auth (local) or Authentik OIDC
3. API calls to svc1.kodeme.io with JWT in Authorization header
4. Hono validates via Better Auth session or JWT
```

### Cross-Service (Hono → Odoo, FastAPI → Mattermost)

```
Hono → Odoo:     /odoo/* proxy routes with API key auth
FastAPI → Odoo:   OdooClient (JSON-RPC) with API key
Odoo → FastAPI:   base_webhook module → HTTP POST with HMAC
FastAPI → MM:     Mattermost incoming webhook URL
```

## Response Envelope Convention

All Odoo FastAPI addons return:
```json
// List
{ "success": true, "data": [...], "total": 100 }

// Detail
{ "success": true, "data": {...} }

// Action
{ "success": true, "data": {...}, "message": "Created" }

// Error
{ "success": false, "message": "Validation error", "errors": [...] }
```

Hono and FastAPI use:
```json
// Success (varies by endpoint)
{ "data": [...], "total": N, "page": 1, "per_page": 20 }

// Error
{ "error": "message" }
```

## Key Conventions Across All Projects

| Convention | Details |
|---|---|
| **Auth provider** | Authentik (auth.kodeme.io) for all apps |
| **Auth protocol** | OIDC PKCE (browser), JWT Bearer (API) |
| **Database** | PostgreSQL for everything |
| **Deployment** | Docker + Dokploy + Traefik |
| **TLS** | Let's Encrypt via Traefik |
| **Domain pattern** | `<service>.kodeme.io` or `<service>.abcfood.app` |
| **Soft deletes** | `is_deleted` + `deleted_at` (Hono, FastAPI, Odoo) |
| **i18n** | English + Indonesian (en, id) |
| **Testing** | Vitest (React, Next, Hono), pytest (FastAPI), Odoo TestCase (Odoo) |
| **Monorepo** | Turborepo + pnpm (JS) or uv workspaces (Python) |
| **Commit style** | Conventional Commits |

## Troubleshooting Cross-Service Issues

### React app can't reach Odoo API
1. Check `VITE_ODOO_URL` in React app's `.env`
2. Check Vite proxy config adds `X-Odoo-dbfilter` header
3. Check Odoo FastAPI addon is registered (endpoint exists in Odoo admin)
4. Check CORS settings on Odoo side

### Next.js can't reach Hono
1. Check `NEXT_PUBLIC_API_URL` points to svc1.kodeme.io
2. Check Hono svc1 is running and healthy: `curl svc1.kodeme.io/health`
3. Check CORS_ORIGINS includes the Next.js domain

### Webhook not arriving at FastAPI
1. Check Odoo `base_webhook` configuration
2. Check FastAPI webhook service is running
3. Check HMAC secret matches on both sides
4. Check Redis Streams consumer (events-sync) is running

### User can't log in
1. `kctl-ak users get <email>` — check user exists and is active
2. `kctl-ak users groups <email>` — check group membership
3. `kctl-ak audit logins --failed` — check for auth failures
4. Check OIDC client_id matches between app and Authentik
