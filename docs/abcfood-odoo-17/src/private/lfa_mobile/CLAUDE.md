# CLAUDE.md - LFA Mobile Module

## Module Purpose

`lfa_mobile` provides FastAPI REST endpoints for the LFA (Logistic Force Automation) mobile PWA application.

## Key Components

### Services (FastAPI Routers)

| Router | File | Endpoints |
|--------|------|-----------|
| `delivery_router` | `services/delivery_router.py` | Delivery CRUD, start/complete |
| `session_router` | `services/session_router.py` | Driver session management |
| `pod_router` | `services/pod_router.py` | POD submission |
| `expense_router` | `services/expense_router.py` | Expense entry |

### Models Extended

| Model | File | Purpose |
|-------|------|---------|
| `fastapi.endpoint` | `models/fastapi_endpoint_lfa.py` | Register LFA app |
| `lfa.delivery` | `models/lfa_delivery_mobile.py` | Mobile serialization |
| `lfa.delivery.session` | `models/lfa_session_mobile.py` | Session API |

### Schemas (Pydantic)

| Schema | File | Purpose |
|--------|------|---------|
| `StartDeliveryRequest` | `schemas/delivery_schemas.py` | Start payload |
| `CompleteDeliveryRequest` | `schemas/delivery_schemas.py` | POD payload |
| `ExpenseCreateRequest` | `schemas/expense_schemas.py` | Expense creation |
| `SessionStartRequest` | `schemas/session_schemas.py` | Session start |

## API URL Structure

- Base URL: `/lfa/api/lfa`
- Registered via `fastapi.endpoint` with `app=lfa`

## Common Tasks

### Adding a new endpoint

1. Create/edit router in `services/`:

```python
# services/my_router.py
from fastapi import APIRouter, Depends
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

3. Add to endpoint routers in `models/fastapi_endpoint_lfa.py`:

```python
def _get_fastapi_routers(self):
    if self.app == "lfa":
        from ..services import delivery_router, ..., my_router
        return [delivery_router, ..., my_router]
```

### Mobile serialization

Add `_to_mobile_dict()` method to models:

```python
class LfaDeliveryMobile(models.Model):
    _inherit = "lfa.delivery"

    def _to_mobile_dict(self):
        self.ensure_one()
        return {
            "id": self.id,
            "name": self.name,
            "state": self.state,
            "partner_name": self.partner_id.name,
            "shipping_address": self.partner_shipping_id.contact_address,
            # ... other fields
        }
```

## Delivery Workflow

```
planned → start → in_transit → arrive → arrived → complete → delivered
                                                          ↓
                                                        fail → failed
```

### start: Driver departs
- GPS location captured
- State changes to `in_transit`

### arrive: Driver arrives at location
- GPS location captured
- State changes to `arrived`

### complete: Submit POD
- Signature required
- Photos optional (per profile)
- State changes to `delivered`

### fail: Delivery failed
- Reason required
- Notes optional
- State changes to `failed`

## POD Processing

```python
def complete_with_pod(delivery, pod_data):
    # Store signature
    if pod_data.signature_image:
        delivery.write({
            'signature_image': pod_data.signature_image,
            'signature_name': pod_data.signature_name,
            'has_signature': True,
        })

    # Store GPS
    delivery.write({
        'delivery_latitude': pod_data.gps.latitude,
        'delivery_longitude': pod_data.gps.longitude,
    })

    # Create POD photos
    for photo in pod_data.pod_photos:
        env['lfa.pod.photo'].create({
            'delivery_id': delivery.id,
            'photo_category': photo.category,
            'image': photo.image,
        })

    # Complete delivery
    delivery.action_complete()
```

## Session Management

Driver sessions group deliveries and track:
- Vehicle assignment
- Start/end times
- Odometer readings
- Total distance
- Expense association

```python
# Start session
session = env['lfa.delivery.session'].start_mobile_session(
    vehicle_id=vehicle_id,
    route_id=route_id,
    start_odometer=start_odometer,
    start_gps=gps_location,
)

# End session
session.end_mobile_session(
    end_odometer=end_odometer,
    end_gps=gps_location,
)
```

## Expense Entry

```python
def create_expense(env, data):
    expense = env['lfa.expense'].create({
        'category_id': data.category_id,
        'amount': data.amount,
        'description': data.description,
        'session_id': data.session_id,
        'delivery_id': data.delivery_id,
        'latitude': data.latitude,
        'longitude': data.longitude,
    })

    # Attach receipt photo
    if data.receipt_image:
        env['ir.attachment'].create({
            'name': f'receipt_{expense.id}.jpg',
            'res_model': 'lfa.expense',
            'res_id': expense.id,
            'datas': data.receipt_image.split(',')[1],  # Base64 data
            'type': 'binary',
        })

    return expense
```

## JWT Authentication (Standalone Mode)

The LFA API supports two authentication modes:
- **Embedded Mode**: Uses Odoo session cookies (default when accessed through Odoo web)
- **Standalone Mode**: Uses JWT Bearer tokens (for mobile PWA)

### Security Features

| Feature | Implementation |
|---------|----------------|
| Algorithm | HS256 (HMAC-SHA256) |
| Token ID (jti) | Unique ID per token for revocation support |
| App Claim | `app: "lfa"` - prevents cross-app token usage |
| Login Rate Limit | 5 attempts/minute per IP |
| API Rate Limit | 120 requests/minute per user+IP |
| Audit Logging | All login attempts logged with IP, user, reason |

### Production Configuration

Set these Odoo system parameters for production:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `lfa.jwt_secret` | JWT signing secret (min 32 chars) | Insecure default (logs warning) |
| `lfa.jwt_expire_hours` | Token expiration in hours | 24 |

```sql
-- Set production JWT secret (REQUIRED for security)
INSERT INTO ir_config_parameter (key, value)
VALUES ('lfa.jwt_secret', 'your-secure-random-secret-at-least-32-characters')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Optional: Adjust token expiration
INSERT INTO ir_config_parameter (key, value)
VALUES ('lfa.jwt_expire_hours', '48')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Auth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/lfa/api/lfa/auth/login` | POST | Authenticate driver and get JWT token |
| `/lfa/api/lfa/auth/me` | GET | Get current user and driver info |
| `/lfa/api/lfa/auth/logout` | POST | Logout (client discards token) |

### Login Request/Response

```bash
# Login
curl -X POST http://localhost:8069/lfa/api/lfa/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "driver@example.com", "password": "password"}'

# Response
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 10,
    "name": "Driver Name",
    "login": "driver@example.com",
    "email": "driver@example.com",
    "image_url": "/web/image/res.users/10/image_128"
  },
  "driver": {
    "id": 5,
    "name": "Driver Name",
    "license_number": "SIM-12345",
    "vehicle_id": 3,
    "vehicle_name": "Truck A - B 1234 CD"
  }
}
```

### JWT Token Claims

```json
{
  "sub": "10",           // User ID
  "login": "driver@example.com",
  "jti": "abc123...",    // Unique token ID
  "app": "lfa",          // App identifier
  "type": "access",
  "driver_id": 5,        // Driver record ID
  "iat": 1706000000,     // Issued at
  "exp": 1706086400      // Expires at
}
```

### Frontend Token Management

The API client handles token storage in localStorage:

```typescript
// api/client.ts
const TOKEN_KEY = "lfa_access_token"

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
| `LFA_ACCESS_DENIED` | 403 | User is not a driver |
| `DRIVER_NOT_FOUND` | 403 | No driver record for user |
| `DRIVER_INACTIVE` | 403 | Driver account is inactive |
| `RATE_LIMITED` | 429 | Too many requests |

## Testing API

```bash
# Get JWT token
TOKEN=$(curl -s -X POST http://localhost:8069/lfa/api/lfa/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "driver@example.com", "password": "password"}' | jq -r '.access_token')

# Get current user and driver info
curl -X GET http://localhost:8069/lfa/api/lfa/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Start session
curl -X POST http://localhost:8069/lfa/api/lfa/sessions/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": 1,
    "start_odometer": 45000
  }'

# Get today's deliveries
curl -X GET http://localhost:8069/lfa/api/lfa/deliveries/today \
  -H "Authorization: Bearer $TOKEN"

# Complete delivery
curl -X POST http://localhost:8069/lfa/api/lfa/deliveries/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery_id": 1,
    "gps": {"latitude": -6.2088, "longitude": 106.8456, "accuracy": 10},
    "signature_image": "data:image/png;base64,...",
    "signature_name": "Customer Name"
  }'
```

## Error Handling

Routers return consistent error format:

```python
from fastapi import HTTPException

@delivery_router.post("/complete")
def complete_delivery(request: CompleteDeliveryRequest, env = Depends(odoo_env)):
    try:
        delivery = env["lfa.delivery"].browse(request.delivery_id)
        if not delivery.exists():
            raise HTTPException(status_code=404, detail="Delivery not found")

        if delivery.state != "arrived":
            raise HTTPException(status_code=400, detail="Invalid delivery state")

        delivery.complete_with_pod(request)
        return {"success": True, "delivery": delivery._to_mobile_dict()}

    except UserError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

## Related Models

- `lfa.delivery`: Delivery records (from `lfa_management`)
- `lfa.delivery.session`: Driver sessions (from `lfa_management`)
- `lfa.expense`: Expense records
- `lfa.pod.photo`: POD photos
- `res.partner`: Customers
- `fleet.vehicle`: Vehicles

## Frontend Integration

The LFA Mobile frontend is a React PWA located at:
`src/private/lfa_mobile/static/src/`

### Frontend Structure

```
static/src/
├── api/              # API client, hooks, types
│   ├── client.ts     # ApiClient singleton
│   ├── hooks.ts      # TanStack Query hooks
│   ├── types.ts      # TypeScript types
│   └── index.ts      # Exports
├── components/
│   ├── camera/       # Camera capture component
│   ├── common/       # Shared components (LoadingSpinner, ErrorBoundary, etc.)
│   ├── gps/          # GPS components (GeofenceStatus, GPSAccuracyIndicator)
│   ├── layout/       # Layout components (MobileLayout, TopHeader, BottomNavigation)
│   ├── qr/           # QR Scanner components
│   ├── signature/    # Signature canvas component
│   └── ui/           # shadcn/ui components
├── contexts/
│   ├── AppContext.tsx  # App state (user, profile, config)
│   └── GPSContext.tsx  # GPS location tracking
├── pages/
│   ├── deliveries/   # Delivery workflow pages
│   ├── expenses/     # Expense entry pages
│   ├── profile/      # Driver profile page
│   ├── scan/         # QR Scanner page
│   ├── session/      # Session start/end pages
│   └── HomePage.tsx  # Dashboard
├── App.tsx           # Main app with routes
└── main.tsx          # Entry point
```

### Building Frontend

```bash
cd src/private/lfa_mobile
npm install
npm run build      # Production build to static/dist/
npm run dev        # Development server with HMR
```

## QR Scanner Feature

The QR Scanner allows drivers to quickly find deliveries by scanning package QR codes.

### Supported QR Formats

| Format | Example | Description |
|--------|---------|-------------|
| Odoo URL | `odoo://delivery/123` | Standard Odoo QR format |
| JSON | `{"type":"delivery","id":123}` | JSON with type and id |
| Numeric ID | `123` | Direct delivery ID |
| Delivery Code | `DEL/2024/001` | Delivery reference code |
| Package Code | `PKG-12345` | Package tracking code |

### QR Scanner Components

| Component | File | Purpose |
|-----------|------|---------|
| `QRScanner` | `components/qr/QRScanner.tsx` | Camera-based QR code scanner |
| `ScanPage` | `pages/scan/ScanPage.tsx` | Full scan page with search and results |

### QR Scanner Features

- **Real-time scanning** using html5-qrcode library
- **Camera controls**: Torch toggle, camera switch (front/back)
- **Manual entry**: Enter codes manually when scanning fails
- **Local search**: Search today's deliveries by name, customer, address
- **API lookup**: Server-side lookup for codes not found locally
- **Result sheet**: Shows delivery details with action buttons

### QR Scanner API Endpoints

```bash
# Lookup delivery by QR code
POST /lfa/api/lfa/deliveries/lookup
{
  "qr_data": "odoo://delivery/123"
}

# Search deliveries
GET /lfa/api/lfa/deliveries/search?q=DEL-001
```

### Frontend Usage

```tsx
import { QRScanner } from "@/components/qr"
import { useLookupDeliveryByQR, useTodayDeliveries } from "@/api/hooks"

function ScanPage() {
  const lookupDelivery = useLookupDeliveryByQR()
  const { data: deliveries } = useTodayDeliveries()

  const handleScan = async (qrData: string) => {
    // First check local deliveries
    const local = deliveries?.data?.find(d => d.name === qrData)
    if (local) {
      // Found locally
      return local
    }

    // API lookup
    const result = await lookupDelivery.mutateAsync(qrData)
    return result.data
  }

  return <QRScanner onScan={handleScan} scanning={true} />
}
```

### API Hooks

| Hook | Purpose |
|------|---------|
| `useTodayDeliveries()` | Get today's delivery list |
| `useDelivery(id)` | Get single delivery details |
| `useLookupDeliveryByQR()` | Lookup delivery by QR code |
| `useSearchDeliveries(query)` | Search deliveries by text |
| `useStartDelivery()` | Start delivery workflow |
| `useMarkArrival()` | Mark arrival at destination |
| `useCompleteDelivery()` | Complete with POD |
| `useFailDelivery()` | Mark delivery as failed |

## Notifications

Uses **Sonner** for toast notifications:

```tsx
import { toast } from "sonner"

// Success notification
toast.success("Delivery Completed", {
  description: "Package delivered successfully"
})

// Error notification
toast.error("Scan Failed", {
  description: "Could not read QR code"
})

// Info notification
toast.info("Scanning...", {
  description: "Point camera at QR code"
})
```
