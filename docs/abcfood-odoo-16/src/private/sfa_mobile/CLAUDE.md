# CLAUDE.md - SFA Mobile Module

## Module Purpose

`sfa_mobile` provides FastAPI REST endpoints for the SFA (Sales Force Automation) mobile PWA application.

## Key Components

### Services (FastAPI Routers)

| Router | File | Endpoints |
|--------|------|-----------|
| `visit_router` | `services/visit_router.py` | Visit CRUD, check-in/out |
| `customer_router` | `services/customer_router.py` | Customer search, details |
| `order_router` | `services/order_router.py` | Sales order creation |
| `stock_router` | `services/stock_router.py` | Stock opname |
| `session_router` | `services/session_router.py` | Call session management |
| `payment_router` | `services/payment_router.py` | Invoice & payment collection |
| `qr_scanner_router` | `services/qr_scanner_router.py` | Universal QR scanner |

### Models Extended

| Model | File | Purpose |
|-------|------|---------|
| `fastapi.endpoint` | `models/fastapi_endpoint_sfa.py` | Register SFA app |
| `sfa.visit` | `models/sfa_visit_mobile.py` | Mobile serialization |
| `res.partner` | `models/res_partner_mobile.py` | Customer API data |

### Schemas (Pydantic)

| Schema | File | Purpose |
|--------|------|---------|
| `CheckInRequest` | `schemas/visit_schemas.py` | Check-in payload |
| `CheckOutRequest` | `schemas/visit_schemas.py` | Check-out payload |
| `OrderCreateRequest` | `schemas/order_schemas.py` | Order creation |
| `StockOpnameRequest` | `schemas/stock_schemas.py` | Stock opname |

## API URL Structure

- Base URL: `/sfa/api/sfa`
- Registered via `fastapi.endpoint` with `app=sfa`

## Common Tasks

### Adding a new endpoint

1. Create/edit router in `services/`:

```python
# services/my_router.py
from fastapi import APIRouter, Depends
from odoo import api, SUPERUSER_ID
from odoo.addons.fastapi.dependencies import odoo_env

my_router = APIRouter(prefix="/my-feature", tags=["My Feature"])

@my_router.get("/")
def list_items(env = Depends(odoo_env)):
    items = env["my.model"].search([])
    return {"success": True, "items": [i._to_mobile_dict() for i in items]}
```

2. Register in `services/__init__.py`:

```python
from .my_router import my_router
__all__ = [..., "my_router"]
```

3. Add to endpoint routers in `models/fastapi_endpoint_sfa.py`:

```python
def _get_fastapi_routers(self):
    if self.app == "sfa":
        from ..services import visit_router, ..., my_router
        return [visit_router, ..., my_router]
```

### Mobile serialization

Add `_to_mobile_dict()` method to models:

```python
class SfaVisitMobile(models.Model):
    _inherit = "sfa.visit"

    def _to_mobile_dict(self):
        self.ensure_one()
        return {
            "id": self.id,
            "name": self.name,
            "state": self.state,
            # ... other fields
        }
```

## Visit Workflow

```
planned → check_in → in_progress → [actions] → check_out → completed
                                                         ↓
                                                    not_visited
```

### Check-in validates:
1. GPS accuracy within threshold
2. Location within geofence of customer
3. QR code matches customer (if required)
4. Visit in valid state

### Check-out requires:
1. Visit outcome selection
2. GPS coordinates
3. Optional: Order taken flag, amount

## GPS Validation Logic

```python
from odoo.addons.mobile_base.utils import calculate_distance

def validate_location(visit, gps):
    profile = get_user_profile(env)

    # Check accuracy
    if gps.accuracy > profile.gps_accuracy_threshold:
        raise ValidationError("GPS accuracy too low")

    # Check geofence
    distance = calculate_distance(
        gps.latitude, gps.longitude,
        visit.partner_id.partner_latitude,
        visit.partner_id.partner_longitude
    )

    if distance > visit.app_id.geofence_radius:
        raise ValidationError("Outside geofence")
```

## JWT Authentication (Standalone Mode)

The SFA API supports two authentication modes:
- **Embedded Mode**: Uses Odoo session cookies (default when accessed through Odoo web)
- **Standalone Mode**: Uses JWT Bearer tokens (for mobile PWA)

### Security Features

| Feature | Implementation |
|---------|----------------|
| Algorithm | HS256 (HMAC-SHA256) |
| Token ID (jti) | Unique ID per token for revocation support |
| App Claim | `app: "sfa"` - prevents cross-app token usage |
| Login Rate Limit | 5 attempts/minute per IP |
| API Rate Limit | 120 requests/minute per user+IP |
| Audit Logging | All login attempts logged with IP, user, reason |

### Production Configuration

Set these Odoo system parameters for production:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sfa.jwt_secret` | JWT signing secret (min 32 chars) | Insecure default (logs warning) |
| `sfa.jwt_expire_hours` | Token expiration in hours | 24 |

```sql
-- Set production JWT secret (REQUIRED for security)
INSERT INTO ir_config_parameter (key, value)
VALUES ('sfa.jwt_secret', 'your-secure-random-secret-at-least-32-characters')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Optional: Adjust token expiration
INSERT INTO ir_config_parameter (key, value)
VALUES ('sfa.jwt_expire_hours', '48')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Auth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sfa/api/sfa/auth/login` | POST | Authenticate salesperson and get JWT token |
| `/sfa/api/sfa/auth/me` | GET | Get current user and salesperson info |
| `/sfa/api/sfa/auth/logout` | POST | Logout (client discards token) |

### Login Request/Response

```bash
# Login
curl -X POST http://localhost:8069/sfa/api/sfa/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "salesperson@example.com", "password": "password"}'

# Response
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 10,
    "name": "Salesperson Name",
    "login": "salesperson@example.com",
    "email": "salesperson@example.com",
    "image_url": "/web/image/res.users/10/image_128"
  }
}
```

### JWT Token Claims

```json
{
  "sub": "10",           // User ID
  "login": "salesperson@example.com",
  "jti": "abc123...",    // Unique token ID
  "app": "sfa",          // App identifier
  "type": "access",
  "team_id": 3,          // CRM team ID (if available)
  "iat": 1706000000,     // Issued at
  "exp": 1706086400      // Expires at
}
```

### Frontend Token Management

The API client handles token storage in localStorage:

```typescript
// api/client.ts
const TOKEN_KEY = "sfa_access_token"

class ApiClient {
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

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY)
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY)
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
| `SFA_ACCESS_DENIED` | 403 | User is not a salesperson |
| `SALESPERSON_NOT_FOUND` | 403 | No salesperson record for user |
| `RATE_LIMITED` | 429 | Too many requests |

## Testing API

```bash
# Get JWT token
TOKEN=$(curl -s -X POST http://localhost:8069/sfa/api/sfa/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "salesperson@example.com", "password": "password"}' | jq -r '.access_token')

# Get current user info
curl -X GET http://localhost:8069/sfa/api/sfa/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Get today's visits
curl -X GET http://localhost:8069/sfa/api/sfa/visits/today \
  -H "Authorization: Bearer $TOKEN"

# Check in
curl -X POST http://localhost:8069/sfa/api/sfa/visits/check-in \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visit_id": 1,
    "gps": {"latitude": -6.2088, "longitude": 106.8456, "accuracy": 10}
  }'
```

## Error Handling

Routers return consistent error format:

```python
from fastapi import HTTPException

@visit_router.post("/check-in")
def check_in(request: CheckInRequest, env = Depends(odoo_env)):
    try:
        visit = env["sfa.visit"].browse(request.visit_id)
        if not visit.exists():
            raise HTTPException(status_code=404, detail="Visit not found")

        result = visit.action_check_in(request.gps, request.qr_data)
        return {"success": True, "visit": visit._to_mobile_dict()}

    except UserError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

## Related Models

- `sfa.visit`: Visit records (from `sfa_management`)
- `sfa.call.session`: Call sessions (from `sfa_management`)
- `res.partner`: Customers
- `sale.order`: Sales orders

## Frontend Integration

The SFA Mobile frontend is a React PWA located at:
`src/private/sfa_mobile/static/src/`

### Frontend Structure

```
static/src/
├── api/              # API client, hooks, types
│   ├── client.ts     # ApiClient singleton
│   ├── hooks.ts      # TanStack Query hooks
│   └── types.ts      # TypeScript types
├── components/
│   ├── camera/       # Camera capture component
│   ├── common/       # Shared components (LoadingSpinner, ErrorBoundary, EmptyState)
│   ├── invoice/      # Invoice components
│   ├── payment/      # Payment components
│   ├── qr/           # QR Scanner components
│   └── ui/           # shadcn/ui components
├── contexts/
│   ├── AppContext.tsx  # App state (user, profile, config)
│   └── GPSContext.tsx  # GPS location tracking
├── pages/
│   ├── customers/      # Customer list and details
│   ├── invoices/       # Invoice management
│   ├── payments/       # Payment collection
│   ├── scan/           # QR Scanner page
│   ├── session/        # Call session start/end
│   └── visits/         # Visit workflow pages
│       ├── VisitListPage.tsx
│       ├── VisitDetailPage.tsx
│       ├── CheckInPage.tsx
│       ├── CheckOutPage.tsx
│       ├── OrderCreatePage.tsx    # Sales order creation
│       ├── StockOpnamePage.tsx    # Stock recording
│       └── PhotoCapturePage.tsx   # Visit photo capture
├── App.tsx           # Main app with routes
└── main.tsx          # Entry point
```

### Building Frontend

```bash
cd src/private/sfa_mobile
npm install
npm run build      # Production build to static/dist/
npm run dev        # Development server with HMR
```

## Visit Workflow Pages

### OrderCreatePage

Create sales orders during an active visit.

**Features:**
- Product search by name or code
- Cart management with quantity controls
- Discount support per line item
- Order total calculation
- Notes field for order remarks

**Usage:**
```tsx
// Route: /visits/:id/order
import { OrderCreatePage } from "@/pages/visits"
```

**API Hooks:**
- `useVisit(id)` - Get visit details
- `useProducts(partnerId)` - Get available products
- `useSearchProducts(query, partnerId)` - Search products
- `useCreateOrder()` - Submit order

### StockOpnamePage

Record product stock levels at customer location.

**Features:**
- Product search and selection
- Previous stock history display
- Quantity input with +/- controls
- Notes field for stock condition

**Usage:**
```tsx
// Route: /visits/:id/stock
import { StockOpnamePage } from "@/pages/visits"
```

**API Hooks:**
- `useVisit(id)` - Get visit details
- `useProducts(partnerId)` - Get products
- `useCustomerStock(partnerId)` - Get stock history
- `useCreateStockOpname()` - Submit stock data

### PhotoCapturePage

Capture and upload photos during a visit.

**Features:**
- Camera capture with preview
- Photo categories (storefront, display, shelf, promo, competitor, general)
- Edit category and notes per photo
- Batch upload support
- View previously uploaded photos

**Photo Categories:**
| Category | Label | Use Case |
|----------|-------|----------|
| `storefront` | Storefront | Store exterior photo |
| `display` | Product Display | Product arrangement |
| `shelf` | Shelf/Rack | Shelf organization |
| `promo` | Promo Material | Promotional materials |
| `competitor` | Competitor | Competitor products |
| `general` | General | Other photos |

**Usage:**
```tsx
// Route: /visits/:id/photos
import { PhotoCapturePage } from "@/pages/visits"
```

**API Hooks:**
- `useVisit(id)` - Get visit details
- `useVisitPhotos(visitId)` - Get existing photos
- `useUploadPhoto()` - Upload photo

## Notifications

Uses **Sonner** for toast notifications:

```tsx
import { toast } from "sonner"

// Success notification
toast.success("Order Created", {
  description: "Order total: Rp 1,500,000"
})

// Error notification
toast.error("Upload Failed", {
  description: "Some photos failed to upload"
})

// Info notification
toast.info("Check-in Required", {
  description: "Please check in before taking orders"
})
```

## QR Scanner Feature

The Universal QR Scanner supports multiple QR code types with auto-detection.

### Supported QR Types

| Type | Model | Default Action | Use Case |
|------|-------|----------------|----------|
| `customer` | `res.partner` | `checkin` | Start visit by scanning customer QR |
| `product` | `product.product` | `add_to_cart` | Add product to order |
| `visit` | `sfa.visit` | `checkin` | Check in/out of visit |
| `invoice` | `account.move` | `pay` | Collect payment |
| `package` | `lfa.package` | `load` | Load/unload package |
| `delivery` | `lfa.delivery` | `confirm` | Confirm delivery |
| `payment` | `payment.transaction` | `check_status` | Check payment status |
| `qris_payment` | - | `pay` | Process QRIS payment |

### QR Code Format

```
# Standard format
odoo://{type}/{id}?app={app}&action={action}

# Examples
odoo://customer/123?app=sfa&action=checkin
odoo://product/456?app=sfa&action=add_to_cart
odoo://invoice/789?app=sfa&action=pay

# JSON format (for complex data)
{"type":"customer","id":123,"action":"checkin"}

# QRIS format (auto-detected by prefix)
000201010...
```

### QR Scanner API Endpoints

```bash
# Get supported QR types
GET /sfa/api/sfa/qr/registry?app_type=sfa

# Parse QR code
POST /sfa/api/sfa/qr/parse
{
  "qr_data": "odoo://customer/123",
  "app_type": "sfa",
  "gps": {"latitude": -6.2, "longitude": 106.8, "accuracy": 10}
}

# Execute QR action
POST /sfa/api/sfa/qr/execute
{
  "qr_type": "customer",
  "record_id": 123,
  "action": "checkin",
  "gps": {...}
}

# Get scan history
GET /sfa/api/sfa/qr/history?limit=50
```

### Frontend Usage

```tsx
import { QRScanner, ScanResultSheet } from "@/components/qr"
import { useParseQRCode } from "@/api/hooks"

function ScanPage() {
  const parseQR = useParseQRCode()
  const [result, setResult] = useState(null)

  const handleScan = async (data: string) => {
    const result = await parseQR.mutateAsync({
      qr_data: data,
      app_type: "sfa",
      gps: position
    })
    setResult(result)
  }

  return (
    <>
      <QRScanner onScan={handleScan} />
      <ScanResultSheet result={result} />
    </>
  )
}
```

## Payment Collection

### Supported Payment Methods

| Method | Code | Description |
|--------|------|-------------|
| QRIS | `qris` | Universal QR (recommended for field) |
| E-wallet | `ewallet` | OVO, GoPay, DANA, ShopeePay |
| Bank Transfer | `bank_transfer` | Virtual Account |
| Card | `card` | Credit/Debit card |

### Payment Flow

1. View customer outstanding invoices
2. Select invoice to collect
3. Choose payment method (QRIS recommended)
4. Customer scans QR code with their app
5. Payment status updates via webhook
6. Invoice marked as paid

### Payment API Endpoints

```bash
# List outstanding invoices
GET /sfa/api/sfa/payments/invoices?partner_id=123

# Get invoice details
GET /sfa/api/sfa/payments/invoices/789

# Create payment
POST /sfa/api/sfa/payments/create
{
  "invoice_id": 789,
  "amount": 1500000,
  "payment_method": "qris"
}

# Check payment status
GET /sfa/api/sfa/payments/123/status
```
