# CLAUDE.md - B2B Mobile Module

## Module Purpose

`b2b_mobile` provides a mobile-first B2B customer app for ordering, delivery tracking, and invoice viewing. It uses FastAPI REST endpoints and serves a React PWA frontend.

## Key Components

### Services (FastAPI Routers)

| Router | File | Endpoints |
|--------|------|-----------|
| `auth_router` | `services/auth_router.py` | Auth/me, logout |
| `catalog_router` | `services/catalog_router.py` | Products, categories, search |
| `cart_router` | `services/cart_router.py` | Cart CRUD operations |
| `order_router` | `services/order_router.py` | Orders, checkout, reorder |
| `delivery_router` | `services/delivery_router.py` | Delivery tracking with LFA |
| `invoice_router` | `services/invoice_router.py` | Invoices, outstanding, summary |
| `account_router` | `services/account_router.py` | Profile, addresses, payments |

### Models

| Model | File | Purpose |
|-------|------|---------|
| `b2b.app` | `models/b2b_app.py` | App configuration (extends mobile.app.mixin) |
| `res.partner` | `models/res_partner.py` | Customer B2B mobile access |
| `sale.order` | `models/sale_order.py` | Cart and order tracking |
| `stock.picking` | `models/stock_picking.py` | Delivery tracking for B2B |
| `fastapi.endpoint` | `models/fastapi_endpoint_b2b.py` | Register B2B API |

## API URL Structure

- **Base URL**: `/b2b/api`
- **Frontend config**: `api_base_url` = `/b2b/api`
- Registered via `fastapi.endpoint` with `app=b2b`

### API Response Format Convention

| Endpoint Type | Response Key | Example |
|---------------|--------------|---------|
| Paginated list | `items` | `{"success": true, "items": [...], "total": 100}` |
| Single object | `data` | `{"success": true, "data": {...}}` |
| Array (non-paginated) | `data` | `{"success": true, "data": [...]}` |

## Key Features

### Customer Access
- B2B customers are identified by `b2b_mobile_enabled=True` on `res.partner`
- Portal users linked to B2B-enabled partners get access
- Child contacts of B2B companies also get access

### Enabling B2B Access for a Partner
```sql
-- Enable B2B mobile access for a partner
UPDATE res_partner SET b2b_mobile_enabled = True WHERE id = <partner_id>;
```

### Cart Management
- Cart is a `sale.order` in draft state with `b2b_mobile_cart=True`
- One cart per customer (server-side persistence)
- Cart survives logout and device changes

### Order Flow
```
Cart (draft order) → Checkout → Confirmed Order → Delivery → Invoice
```

### Delivery Tracking (LFA Integration)
When `stock.picking` is linked to `lfa.delivery`:
- Real-time driver GPS location
- Delivery timeline with status updates
- Driver contact info (name, phone)
- ETA estimates

### Invoice & Payment
- View invoices with payment status
- Outstanding/overdue amounts
- Payment history (reconciled by admin)
- Credit limit and usage

## Common Tasks

### Adding a new endpoint

1. Create/edit router in `services/`:

```python
# services/my_router.py
from typing import Annotated
from fastapi import APIRouter, Depends
from odoo.api import Environment
from odoo.addons.fastapi.dependencies import odoo_env

my_router = APIRouter(prefix="/my-feature", tags=["b2b-my-feature"])

@my_router.get("/")
def list_items(env: Annotated[Environment, Depends(odoo_env)]):
    customer = get_b2b_customer(env)
    items = env["my.model"].search([("partner_id", "=", customer.id)])
    return {"success": True, "items": [i._to_dict() for i in items]}
```

2. Register in `services/__init__.py`:

```python
from .my_router import my_router
__all__ = [..., "my_router"]
```

3. Add to endpoint routers in `models/fastapi_endpoint_b2b.py`:

```python
def _get_fastapi_routers(self):
    if self.app == "b2b":
        from ..services import ..., my_router
        return [..., my_router]
```

### Getting Product Price from Pricelist

Use `_get_product_price` method (note the underscore prefix):

```python
# Correct usage in Odoo 16
pricelist = customer.property_product_pricelist
if pricelist:
    # Parameters: product, quantity, uom (NOT customer)
    price = pricelist._get_product_price(product, 1.0, product.uom_id)
else:
    price = product.list_price
```

### Mobile serialization

Add `_to_b2b_mobile_dict()` method to models:

```python
class MyModel(models.Model):
    _inherit = "my.model"

    def _to_b2b_mobile_dict(self):
        self.ensure_one()
        return {
            "id": self.id,
            "name": self.name,
            # ... other fields
        }
```

## JWT Authentication (Standalone Mode)

The B2B API supports two authentication modes:
- **Embedded Mode**: Uses Odoo session cookies (default when accessed through Odoo web)
- **Standalone Mode**: Uses JWT Bearer tokens (for mobile PWA or external clients)

### Security Features

| Feature | Implementation |
|---------|----------------|
| Algorithm | HS256 (HMAC-SHA256) |
| Token ID (jti) | Unique ID per token for revocation support |
| App Claim | `app: "b2b"` - prevents cross-app token usage |
| Login Rate Limit | 5 attempts/minute per IP |
| API Rate Limit | 120 requests/minute per user+IP |
| Audit Logging | All login attempts logged with IP, user, reason |

### Production Configuration

Set these Odoo system parameters for production:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `b2b.jwt_secret` | JWT signing secret (min 32 chars) | Insecure default (logs warning) |
| `b2b.jwt_expire_hours` | Token expiration in hours | 24 |

```sql
-- Set production JWT secret (REQUIRED for security)
INSERT INTO ir_config_parameter (key, value)
VALUES ('b2b.jwt_secret', 'your-secure-random-secret-at-least-32-characters')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Optional: Adjust token expiration
INSERT INTO ir_config_parameter (key, value)
VALUES ('b2b.jwt_expire_hours', '48')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Auth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/b2b/api/auth/login` | POST | Authenticate and get JWT token |
| `/b2b/api/auth/me` | GET | Get current user info |
| `/b2b/api/auth/logout` | POST | Logout (client discards token) |

### Login Request/Response

```bash
# Login
curl -X POST http://localhost:8069/b2b/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "customer@example.com", "password": "password"}'

# Response
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 10,
    "name": "Customer Name",
    "login": "customer@example.com",
    "email": "customer@example.com",
    "image_url": "/web/image/res.users/10/image_128"
  }
}
```

### Using JWT Token

```bash
# Get user info with token
curl -X GET http://localhost:8069/b2b/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Access protected endpoints
curl -X GET "http://localhost:8069/b2b/api/products?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### JWT Token Claims

```json
{
  "sub": "10",           // User ID
  "login": "customer@example.com",
  "jti": "abc123...",    // Unique token ID
  "app": "b2b",          // App identifier
  "type": "access",
  "partner_id": 15,      // B2B customer partner ID
  "iat": 1706000000,     // Issued at
  "exp": 1706086400      // Expires at
}
```

### Frontend Token Management

The API client handles token storage in localStorage:

```typescript
// api/client.ts
const TOKEN_KEY = "b2b_access_token"

class ApiClient {
  // Login and store token
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
    if (response.success && response.access_token) {
      localStorage.setItem(TOKEN_KEY, response.access_token)
    }
    return response
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY)
  }

  // Logout
  logout(): void {
    localStorage.removeItem(TOKEN_KEY)
  }

  // Auto-attach token to requests
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY)
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }
    // ...
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | No authentication provided |
| `AUTH_INVALID` | 401 | Invalid credentials or session expired |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `TOKEN_INVALID` | 401 | JWT token is malformed or invalid |
| `B2B_ACCESS_DENIED` | 403 | User not a B2B customer |
| `RATE_LIMITED` | 429 | Too many requests |

## Testing API

```bash
# Get JWT token first
TOKEN=$(curl -s -X POST http://localhost:8069/b2b/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "customer@example.com", "password": "password"}' | jq -r '.access_token')

# Test products endpoint with JWT
curl -X GET "http://localhost:8069/b2b/api/products?limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Test categories endpoint
curl -X GET "http://localhost:8069/b2b/api/products/categories" \
  -H "Authorization: Bearer $TOKEN"

# Test active deliveries
curl -X GET "http://localhost:8069/b2b/api/deliveries/active" \
  -H "Authorization: Bearer $TOKEN"

# Alternative: With authenticated session cookie (embedded mode)
curl -X GET "http://localhost:8069/b2b/api/products?limit=10" \
  -H "Content-Type: application/json" \
  --cookie "session_id=..."
```

## Error Handling

Routers return consistent error format:

```python
from fastapi import HTTPException

@my_router.get("/{item_id}")
def get_item(item_id: int, env: Annotated[Environment, Depends(odoo_env)]):
    customer = get_b2b_customer(env)  # Raises 403 if not B2B customer

    item = env["my.model"].browse(item_id)
    if not item.exists():
        raise HTTPException(status_code=404, detail="Item not found")

    return {"success": True, "data": item._to_dict()}
```

## Frontend Development

The React frontend is in `static/src/`:

```bash
cd src/private/b2b_mobile
pnpm install
pnpm dev      # Development server with HMR
pnpm build    # Production build to static/dist/
```

### Config Access
Frontend gets config from `window.__B2B_APP_CONFIG__`:

```typescript
const config = window.__B2B_APP_CONFIG__;
const apiBase = config.api_base_url;  // /b2b/api
```

### Key Frontend Files
```
static/src/
├── main.tsx              # Entry point
├── App.tsx               # Routes and providers
├── index.css             # Tailwind CSS + theme variables
├── api/
│   ├── client.ts         # Fetch wrapper (base URL from config)
│   ├── hooks.ts          # TanStack Query hooks
│   └── types.ts          # TypeScript interfaces
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # MobileLayout, BottomNav
│   └── common/           # ErrorBoundary, EmptyState
├── contexts/
│   ├── AppContext.tsx    # App config, customer info
│   └── CartContext.tsx   # Cart state
└── pages/
    ├── HomePage.tsx
    ├── catalog/          # ProductCatalogPage, ProductDetailPage
    ├── cart/             # CartPage, CheckoutPage
    ├── orders/           # OrderListPage, OrderDetailPage
    ├── deliveries/       # DeliveryListPage, DeliveryDetailPage
    ├── invoices/         # InvoiceListPage, InvoiceDetailPage
    └── account/          # AccountPage, PaymentHistoryPage
```

### UI Components (shadcn/ui)

The app uses shadcn/ui components. Add new components:

```bash
cd src/private/b2b_mobile
pnpm dlx shadcn@latest add button card tabs badge skeleton input
```

Available components in `components/ui/`:
- `button.tsx` - Button variants
- `card.tsx` - Card, CardContent, CardHeader
- `tabs.tsx` - Tabs, TabsList, TabsTrigger, TabsContent
- `badge.tsx` - Status badges
- `skeleton.tsx` - Loading placeholders
- `input.tsx` - Form inputs

### Theme Colors

The app uses a purple primary color (`#7C3AED`). CSS variables are in `index.css`:

```css
:root {
  --primary: 262 83% 58%;      /* Purple */
  --primary-foreground: 210 40% 98%;
  --accent: 262 83% 95%;
  /* ... */
}
```

## Troubleshooting

### Products not loading (500 error)

1. **Check pricelist method**: Ensure using `_get_product_price` (with underscore)
2. **Check B2B access**: Partner must have `b2b_mobile_enabled = True`
3. **Check logs**: `tail -f logs/odoo.log | grep -i b2b`

### Categories 500 error

The `product.category` model doesn't have a `sequence` field. Use `order="name"` instead.

### 403 Forbidden

User's partner is not B2B-enabled:
```sql
UPDATE res_partner SET b2b_mobile_enabled = True WHERE id = (
  SELECT partner_id FROM res_users WHERE id = <user_id>
);
```

### Cart 500 Error - Operating Unit

If you get "Configuration error. The Operating Unit of the sales team must match":

The cart creation handles this by:
1. Finding a sales team that matches the user's operating unit
2. Setting the warehouse that matches the operating unit
3. Falling back to minimal cart creation if constraints fail

### Cart 500 Error - Missing Column

If you see `column res_company.xxx does not exist`:

The database schema is out of sync. Update the module:
```bash
./bin/update lfa_management <database_name>
# or update all modules:
./bin/update all <database_name>
```

### Pricelist Pricing

The cart uses the customer's pricelist (`property_product_pricelist`) for pricing:
- Price is calculated using `_get_product_price(product, quantity, uom, date=today)`
- The pricelist is set on the cart order when created
- Odoo's standard sale order pricing rules apply

### Frontend not updating

Rebuild the frontend:
```bash
cd src/private/b2b_mobile
pnpm build
```

Then refresh browser with cache clear (Ctrl+Shift+R).

## Dependencies

### Odoo Modules
- `sale_management`: Sales orders
- `stock`: Deliveries
- `account`: Invoicing
- `mobile_base`: PWA infrastructure
- `fastapi`: REST API
- `lfa_management`: Delivery tracking

### NPM Packages
- React 18 + TypeScript
- TanStack Query v5
- Tailwind CSS 3.4
- shadcn/ui (Radix UI primitives)
- Leaflet (maps)
- lucide-react (icons)

## Related Modules

- `mobile_base`: Shared PWA infrastructure
- `sfa_mobile`: Sales Force Automation (employees)
- `lfa_mobile`: Logistics Force Automation (drivers)
- `lfa_management`: LFA backend (delivery tracking source)
