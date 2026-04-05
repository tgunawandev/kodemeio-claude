---
name: odoo-fastapi-backend
description: >
  Odoo 18 + FastAPI backend development for Kodemeio mobile PWA apps. MUST use when working with FastAPI routers, Pydantic schemas, JWT auth, or API endpoints inside Odoo modules. Triggers on: "FastAPI router", "Pydantic schema", "API endpoint", "/api/", "BaseCRUDRouter", "FastAPITransactionCase", "OpenAPI", or any mobile app backend work (SFA, WMS, HRM, BIA, etc.).
version: 2.0.0
allowed-tools: [
  "mcp__context7__*",
  "Write", "Read", "Edit", "Glob", "Grep",
  "Task", "TodoWrite", "AskUserQuestion",
  "Bash", "WebFetch", "WebSearch"
]
examples:
  - "Create a new FastAPI router with CRUD endpoints for an Odoo model"
  - "Define Pydantic schemas with from_record() for an Odoo recordset"
  - "Add a new error code and message to an app's dependencies.py"
  - "Write FastAPITransactionCase tests for an endpoint"
  - "Register a new router in the FastAPI endpoint model"
  - "Add JWT-protected endpoints with authenticated_env"
  - "Create response envelope schemas (list, detail, action)"
  - "Handle M2O fields in Pydantic schemas"
  - "Add rate limiting and CORS configuration"
  - "Generate OpenAPI schema with response_model for codegen"
categories:
  - odoo
  - fastapi
  - python
  - api-development
  - testing
tags:
  - odoo-18
  - fastapi
  - pydantic
  - jwt
  - openapi
  - vitest
  - transaction-case
  - response-envelope
  - authenticated-env
  - rate-limiter
---

# Odoo 18 + FastAPI Backend Development

Build FastAPI-powered mobile app backends inside Odoo 18 addons. All 8 Kodemeio apps follow this pattern.

## Architecture Overview

```
kodemeio-odoo/src/private/
├── base_management/          # Shared: JWT, errors, rate limiter
├── sfa_management/           # SFA app backend
├── lfa_management/           # LFA app backend
├── shop_management/          # Shop app backend
├── wms_management/           # WMS app backend
├── bia_management/           # BIA app backend
├── asset_management/         # EAM app backend
├── mrp_management/           # MRP app backend
└── hrm_management/           # HRM app backend
```

Each addon structure:
```
{app}_management/
├── __manifest__.py
├── models/
│   ├── __init__.py
│   └── fastapi_endpoint_{app}.py    # Router registration
├── schemas/
│   ├── __init__.py
│   ├── common.py                     # Shared schema utilities
│   └── {resource}_schemas.py         # Pydantic models per resource
├── services/
│   ├── __init__.py                   # Export all routers
│   ├── dependencies.py               # ErrorCodes, JWT, auth dependency
│   ├── auth_router.py
│   └── {resource}_router.py          # One router per resource
├── security/
│   ├── ir.model.access.csv
│   └── {app}_security.xml
├── tests/
│   └── test_api_{resource}.py
└── data/
```

## Response Envelope Convention

ALL endpoints return this envelope. Never use entity-specific field names.

```python
# List response
{"success": True, "data": [...], "total": 42}

# Detail response
{"success": True, "data": {...}}

# Action response
{"success": True, "data": {...}, "message": "Item created"}

# Nullable response
{"success": True, "data": None, "message": "No active session"}

# Error response (raised via raise_api_error)
{"error_code": "CUSTOMER_NOT_FOUND", "message": "Customer not found"}
```

## Shared Infrastructure (base_management)

### JWT Auth Factory

```python
# base_management/services/auth.py
from odoo.addons.base_management.services.auth import (
    create_jwt_helpers,
    create_auth_dependency,
)

# In app's dependencies.py:
(
    _get_jwt_config,
    create_access_token,
    decode_token,
    _check_login_rate_limit,
    get_oidc_config,
    exchange_oidc_code,
    find_odoo_user_by_oidc,
) = create_jwt_helpers(
    app_id="sfa",                    # unique per app
    param_prefix="sfa",             # for ir.config_parameter keys
    error_codes=SFAErrorCode,
    error_messages=ERROR_MESSAGES,
)

get_authenticated_env, authenticated_env = create_auth_dependency(
    error_codes=SFAErrorCode,
    error_messages=ERROR_MESSAGES,
    decode_token_fn=decode_token,
    rate_limiter=RateLimiter(requests_per_minute=120, login_attempts_per_minute=5),
)
```

### Error Handling

```python
# base_management/services/errors.py
from odoo.addons.base_management.services.errors import (
    BaseErrorCode,
    raise_api_error,
    create_raise_api_error,
    safe_handle_error,
)

# App-specific error codes extend BaseErrorCode:
class SFAErrorCode(BaseErrorCode):
    SFA_ACCESS_DENIED = "SFA_ACCESS_DENIED"
    SALESPERSON_NOT_FOUND = "SALESPERSON_NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    # ...

# Every code MUST have a message:
ERROR_MESSAGES = {
    SFAErrorCode.AUTH_REQUIRED: "Please log in to continue",
    SFAErrorCode.CUSTOMER_NOT_FOUND: "Customer not found",
    # ...
}

# App-specific shortcut:
raise_api_error = create_raise_api_error(ERROR_MESSAGES)
```

### Common Schema Utilities

```python
from odoo.addons.base_management.schemas.common import (
    dt_iso,           # DateTime -> ISO string
    m2o,              # Many2one -> {"id": int, "name": str}
    M2OField,         # Pydantic field for M2O
    GPSLocation,      # {"latitude": float, "longitude": float}
    PhotoData,        # Base64 image with metadata
    ErrorResponse,    # {"error_code": str, "message": str}
    SuccessResponse,  # {"success": bool}
)
```

## Router Pattern

```python
# services/{resource}_router.py
from fastapi import APIRouter, Query, status
from .dependencies import authenticated_env, SFAErrorCode, raise_api_error
from ..schemas.{resource}_schemas import (
    ItemResponse,
    ItemListResponse,
    ItemDetailResponse,
    ItemActionResponse,
    CreateItemRequest,
    UpdateItemRequest,
)

item_router = APIRouter(
    prefix="/items",
    tags=["sfa-items"],       # prefix with app name for OpenAPI grouping
)

# LIST — always response_model for OpenAPI codegen
@item_router.get("/", response_model=ItemListResponse)
def list_items(
    env: authenticated_env,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
):
    domain = []
    if search:
        domain.append(("name", "ilike", search))

    Item = env["app.item"]
    total = Item.search_count(domain)
    records = Item.search(domain, offset=(page - 1) * limit, limit=limit, order="name")

    return {
        "success": True,
        "data": [ItemResponse.from_record(r) for r in records],
        "total": total,
    }

# DETAIL
@item_router.get("/{item_id}", response_model=ItemDetailResponse)
def get_item(item_id: int, env: authenticated_env):
    item = env["app.item"].browse(item_id)
    if not item.exists():
        raise_api_error(SFAErrorCode.ITEM_NOT_FOUND, status_code=404)

    return {
        "success": True,
        "data": ItemResponse.from_record(item, include_details=True),
    }

# CREATE
@item_router.post("/", response_model=ItemActionResponse, status_code=status.HTTP_201_CREATED)
def create_item(data: CreateItemRequest, env: authenticated_env):
    try:
        item = env["app.item"].create(data.to_odoo_vals())
        return {
            "success": True,
            "data": ItemResponse.from_record(item),
            "message": "Item created",
        }
    except Exception as e:
        safe_handle_error(_logger, "SFA", "create item", e)

# UPDATE
@item_router.put("/{item_id}", response_model=ItemActionResponse)
def update_item(item_id: int, data: UpdateItemRequest, env: authenticated_env):
    item = env["app.item"].browse(item_id)
    if not item.exists():
        raise_api_error(SFAErrorCode.ITEM_NOT_FOUND, status_code=404)
    item.write(data.to_odoo_vals())
    return {
        "success": True,
        "data": ItemResponse.from_record(item),
        "message": "Item updated",
    }
```

**Critical rules:**
- Every endpoint MUST have `response_model=` for OpenAPI schema generation
- Always use `authenticated_env` dependency (not raw `odoo_env`)
- `env.user` is the authenticated user — use for row-level filtering
- Return `{"success": True, "data": ...}` — never entity-specific names
- Use `safe_handle_error()` for unexpected exceptions (logs without leaking internals)

## Pydantic Schema Pattern

```python
# schemas/{resource}_schemas.py
from pydantic import BaseModel, Field
from odoo.addons.base_management.schemas.common import dt_iso, m2o

# --- Request schemas ---

class CreateItemRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category_id: int | None = Field(None, description="Category ID")
    quantity: float = Field(0.0, ge=0)
    notes: str = ""

    def to_odoo_vals(self) -> dict:
        """Convert to Odoo create/write values dict."""
        vals = {"name": self.name, "notes": self.notes}
        if self.category_id:
            vals["category_id"] = self.category_id
        if self.quantity:
            vals["quantity"] = self.quantity
        return vals

class UpdateItemRequest(BaseModel):
    name: str | None = None
    category_id: int | None = None
    notes: str | None = None

    def to_odoo_vals(self) -> dict:
        vals = {}
        if self.name is not None:
            vals["name"] = self.name
        if self.category_id is not None:
            vals["category_id"] = self.category_id
        if self.notes is not None:
            vals["notes"] = self.notes
        return vals

# --- Response schemas ---

class ItemResponse(BaseModel):
    id: int
    name: str = ""
    category_id: int = 0
    category_name: str = ""          # M2O: always expose as {field}_name
    quantity: float = 0.0
    state: str = "draft"
    create_date: str | None = None

    @classmethod
    def from_record(cls, record, include_details: bool = False) -> "ItemResponse":
        """Build from Odoo recordset. Always call record.ensure_one()."""
        record.ensure_one()
        response = cls(
            id=record.id,
            name=record.name or "",
            category_id=record.category_id.id if record.category_id else 0,
            category_name=record.category_id.name if record.category_id else "",
            quantity=record.quantity or 0.0,
            state=record.state or "draft",
            create_date=dt_iso(record.create_date),
        )
        return response

# --- Envelope schemas (for response_model) ---

class ItemListResponse(BaseModel):
    success: bool = True
    data: list[ItemResponse]
    total: int

class ItemDetailResponse(BaseModel):
    success: bool = True
    data: ItemResponse | None = None
    message: str | None = None

class ItemActionResponse(BaseModel):
    success: bool = True
    data: ItemResponse
    message: str | None = None
```

**M2O field rules:**
- Backend returns `{"id": int, "name": str}` objects
- In schemas: expose as `category_id: int` + `category_name: str`
- In `from_record()`: `record.category_id.id`, `record.category_id.name`
- Frontend accesses via `field?.name` (not `field?.id`)

## Router Registration

```python
# models/fastapi_endpoint_{app}.py
from odoo import models, fields, api
from fastapi import APIRouter
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

class FastapiEndpointApp(models.Model):
    _inherit = "fastapi.endpoint"
    app = fields.Selection(
        selection_add=[("app_name", "App Display Name")],
        ondelete={"app_name": "cascade"},
    )

    def _get_fastapi_routers(self) -> list[APIRouter]:
        if self.app == "app_name":
            from ..services import (
                auth_router,
                item_router,
                # ... import all routers
            )
            return [auth_router, item_router]
        return super()._get_fastapi_routers()

    def _get_fastapi_app_middlewares(self) -> list[Middleware]:
        middlewares = super()._get_fastapi_app_middlewares()
        if self.app == "app_name":
            # CORS from app config
            app_config = self.env["app.config"].search([], limit=1)
            if app_config and app_config.cors_allowed_origins:
                origins = app_config._get_cors_origins()
                middlewares.append(
                    Middleware(CORSMiddleware, allow_origins=origins,
                              allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
                )
        return middlewares

    @api.model
    def _register_hook(self):
        """Auto-sync on startup."""
        res = super()._register_hook()
        endpoints = self.sudo().search([("active", "=", True), ("app", "=", "app_name")])
        if endpoints:
            endpoints.action_sync_registry()
        return res
```

## Testing Pattern

```python
# tests/test_api_{resource}.py
from odoo.tests import tagged
from odoo.addons.fastapi.context import odoo_env_ctx
from odoo.addons.fastapi.tests.common import FastAPITransactionCase

from ..services.{resource}_router import item_router
from ..services.dependencies import get_authenticated_env

def _mock_authenticated_env():
    """Return test environment — bypasses JWT validation."""
    return odoo_env_ctx.get()

@tagged("post_install", "-at_install", "app_name")
class TestApiItem(FastAPITransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.default_fastapi_router = item_router
        cls.default_fastapi_dependency_overrides = {
            get_authenticated_env: _mock_authenticated_env,
        }

        # Create test user with required groups
        cls.test_user = cls.env["res.users"].with_context(no_reset_password=True).create({
            "name": "Test User",
            "login": "test_api_item@example.com",
            "groups_id": [(6, 0, [
                cls.env.ref("base.group_user").id,
                cls.env.ref("app_management.group_app_user").id,
            ])],
        })
        cls.default_fastapi_running_user = cls.test_user

        # Create test data
        cls.item_a = cls.env["app.item"].create({
            "name": "Test Item A",
            "state": "active",
        })

    def test_list_returns_200(self):
        with self._create_test_client() as client:
            resp = client.get("/items/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("data", data)
        self.assertIn("total", data)

    def test_list_contains_test_item(self):
        with self._create_test_client() as client:
            resp = client.get("/items/")
        ids = [item["id"] for item in resp.json()["data"]]
        self.assertIn(self.item_a.id, ids)

    def test_get_detail_returns_item(self):
        with self._create_test_client() as client:
            resp = client.get(f"/items/{self.item_a.id}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["data"]["name"], "Test Item A")

    def test_get_nonexistent_returns_404(self):
        with self._create_test_client() as client:
            resp = client.get("/items/999999")
        self.assertEqual(resp.status_code, 404)
        self.assertIn("error_code", resp.json()["detail"])

    def test_create_item(self):
        with self._create_test_client() as client:
            resp = client.post("/items/", json={"name": "New Item"})
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["data"]["name"], "New Item")
```

**Test setup essentials:**
- Extend `FastAPITransactionCase` (from OCA `fastapi` module)
- Override `get_authenticated_env` with `_mock_authenticated_env` (uses `odoo_env_ctx.get()`)
- Set `default_fastapi_running_user` — tests run as this user
- Use `self._create_test_client()` context manager
- Tag with `@tagged("post_install", "-at_install", "app_name")`
- Assert on envelope structure: `data`, `total`, `success`

## System Parameters

Each app uses `ir.config_parameter` with app prefix:

```
{app}.jwt_secret         # JWT signing secret (min 32 chars)
{app}.jwt_expire_hours   # Token TTL (default: 24)
{app}.oidc_enabled       # "True" / "False"
{app}.oidc_authority      # https://auth.kodeme.io
{app}.oidc_client_id     # Authentik client ID
{app}.oidc_client_secret # Authentik client secret
{app}.dev_mode           # "True" for dev endpoints
```

## Manifest Pattern

```python
# __manifest__.py
{
    "name": "App Management",
    "version": "18.0.1.0.0",
    "category": "Services",
    "license": "LGPL-3",
    "depends": [
        "base",
        "fastapi",           # OCA fastapi module (required)
        "base_management",   # Shared JWT/errors/rate-limiter
        # ... app-specific Odoo modules
    ],
    "data": [
        "security/ir.model.access.csv",
        "security/app_security.xml",
        "data/app_data.xml",
    ],
    "external_dependencies": {
        "python": [],        # e.g. ["qrcode", "pillow"] if needed
    },
    "installable": True,
    "application": True,
}
```

## OpenAPI Schema Generation

For frontend codegen (`@hey-api/openapi-ts`) to work:
- Every endpoint MUST have `response_model=EnvelopeSchema`
- Envelope schemas must define all fields (success, data, total, message)
- Pydantic models must have complete type annotations
- Use `list[ItemResponse]` not `List` (Python 3.10+ syntax)
- The OpenAPI JSON is served at `/api/{app}/openapi.json`

## Anti-Patterns to Avoid

1. **No JSON-RPC** — all endpoints are FastAPI routes, not Odoo controllers
2. **No entity-specific response fields** — always `data`, never `customers` or `orders`
3. **No raw exception messages** — use `safe_handle_error()` or `raise_api_error()`
4. **No missing response_model** — breaks OpenAPI codegen for frontend
5. **No hardcoded JWT secrets** — always from `ir.config_parameter`
6. **No skipping `record.ensure_one()`** — always call in `from_record()`
7. **No direct `env` without auth** — always use `authenticated_env` dependency
8. **No missing error messages** — every error code MUST have an entry in ERROR_MESSAGES
