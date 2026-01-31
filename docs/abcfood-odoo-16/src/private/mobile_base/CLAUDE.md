# CLAUDE.md - Mobile Base Module

## Module Purpose

`mobile_base` provides the shared foundation for all mobile PWA modules (SFA, LFA, SCM) following OCA Shopfloor patterns.

## Key Components

### URL Converter (`models/ir_http.py`)

TechNameConverter enables clean URL routing by tech_name field:

```python
# In routes:
@http.route("/sfa/app/<tech_name(sfa.app):sfa_app>")
def load_app(self, sfa_app):
    # sfa_app is the resolved record, not a string
    return self._load_app(sfa_app)
```

### Abstract Mixin (`models/mobile_app_mixin.py`)

Provides shared fields for mobile app configuration:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | Char | - | Display name |
| `tech_name` | Char | - | Technical name for URLs |
| `short_name` | Char | - | PWA short name |
| `app_version` | Char | 1.0.0 | App version |
| `theme_color` | Char | #4a90d9 | PWA theme color |
| `background_color` | Char | #ffffff | PWA background |
| `display_mode` | Selection | standalone | PWA display mode |
| `api_base_url` | Char | - | API base path |
| `require_gps` | Boolean | True | GPS required |
| `geofence_radius` | Integer | 100 | Geofence meters |
| `gps_accuracy_threshold` | Integer | 50 | Max accuracy meters |
| `enable_offline` | Boolean | True | Offline mode |
| `sync_interval` | Integer | 300 | Sync seconds |
| `cors_allowed_origins` | Char | * | CORS origins |

Key methods:

```python
def _make_app_info(self, demo=False):
    """Generate app configuration dict for frontend."""
    return {
        "id": self.id,
        "name": self.name,
        "tech_name": self.tech_name,
        "api_base_url": self.api_base_url,
        "theme_color": self.theme_color,
        "features": {...},
    }

def _make_app_manifest(self, icons=None):
    """Generate PWA manifest.json data."""
    return {
        "name": self.name,
        "short_name": self.short_name or self.tech_name,
        "theme_color": self.theme_color,
        ...
    }

def _get_cors_origins(self):
    """Parse CORS origins for standalone deployment."""
    return [o.strip() for o in self.cors_allowed_origins.split(",")]
```

### Profile System (`models/mobile_profile.py`)

Role-based configuration overrides:

| Field | Description |
|-------|-------------|
| `gps_accuracy_threshold` | Override app default |
| `geofence_radius` | Override app default |
| `allow_offline` | Enable/disable offline |
| `allow_manual_location` | Allow manual GPS entry |
| `allow_skip_geofence` | Skip geofence check |
| `user_ids` | Assigned users |

### Controller Mixin (`controllers/main.py`)

Standardized controller pattern:

```python
from odoo.addons.mobile_base.controllers.main import MobileAppControllerMixin

class SfaMobileController(http.Controller, MobileAppControllerMixin):
    main_template = "sfa_mobile.app_main"
    app_model = "sfa.app"

    @http.route("/sfa/app/<tech_name(sfa.app):sfa_app>")
    def load_app(self, sfa_app, demo=False, **kw):
        return self._load_app(sfa_app, demo=demo == "demo")

    @http.route("/sfa/app/<tech_name(sfa.app):sfa_app>/manifest.json")
    def manifest(self, sfa_app, **kw):
        return self._get_manifest_response(sfa_app)

    @http.route("/sfa/app/<tech_name(sfa.app):sfa_app>/api/config")
    def config_api(self, sfa_app, **kw):
        return self._get_config_api_response(sfa_app)
```

## Usage: Creating a New Mobile App

### 1. Create App Model (in management module)

```python
# my_management/models/my_app.py
from odoo import fields, models

class MyApp(models.Model):
    _name = "my.app"
    _inherit = "mobile.app.mixin"
    _description = "My Mobile Application"

    # Override defaults
    api_base_url = fields.Char(default="/my/api")
    theme_color = fields.Char(default="#3498db")

    # Add module-specific fields
    require_feature_x = fields.Boolean(default=True)

    def _make_app_info(self, demo=False):
        info = super()._make_app_info(demo=demo)
        info["features"]["require_feature_x"] = self.require_feature_x
        return info
```

### 2. Create Mobile Controller (in mobile module)

```python
# my_mobile/controllers/main.py
import json
from odoo import http
from odoo.http import request
from odoo.addons.mobile_base.controllers.main import MobileAppControllerMixin

class MyMobileController(http.Controller, MobileAppControllerMixin):
    main_template = "my_mobile.app_main"
    app_model = "my.app"

    @http.route([
        "/my/app/<tech_name(my.app):my_app>",
        "/my/app/<tech_name(my.app):my_app>/<string:demo>",
    ], type="http", auth="public", website=False)
    def load_app(self, my_app, demo=False, **kw):
        if not my_app:
            return request.not_found()
        return self._load_app(my_app, demo=demo == "demo")

    @http.route("/my/app/<tech_name(my.app):my_app>/manifest.json",
                type="http", auth="public", website=False)
    def manifest(self, my_app, **kw):
        if not my_app:
            return request.not_found()
        return self._get_manifest_response(my_app)

    @http.route("/my/app/<tech_name(my.app):my_app>/api/config",
                type="json", auth="public", cors="*")
    def config_api(self, my_app, **kw):
        if not my_app:
            return {"error": "App not found"}
        return self._get_config_api_response(my_app)
```

### 3. Create Templates

```xml
<!-- my_mobile/templates/main.xml -->
<template id="app_main" name="My Mobile App">
    <t t-call="web.frontend_layout">
        <t t-set="head">
            <link rel="manifest" t-attf-href="/my/app/#{app_info['tech_name']}/manifest.json"/>
            <meta name="theme-color" t-att-content="app_info['theme_color']"/>
        </t>
        <div id="root"></div>
        <script>
            window.__MY_APP_CONFIG__ = <t t-raw="app_info_json"/>;
        </script>
        <script type="module" src="/my_mobile/static/dist/assets/index.js"/>
    </t>
</template>
```

### 4. Add Dependencies to Manifest

```python
# my_management/__manifest__.py
{
    "depends": [..., "mobile_base"],
}

# my_mobile/__manifest__.py
{
    "depends": ["my_management", "mobile_base"],
}
```

## Dual Deployment Modes

### Embedded Mode (Default)
- PWA served via Odoo at `/my/app/<tech_name>`
- Config from `window.__MY_APP_CONFIG__`
- No CORS needed

### Standalone Mode
- Frontend deployed to Vercel/Netlify
- Config fetched from `/my/app/<tech_name>/api/config`
- CORS required (configured in app record)

Configure in Vite:

```typescript
// vite.config.ts
const isStandalone = env.VITE_STANDALONE === 'true';

export default {
    base: isStandalone ? '/' : '/my_mobile/static/dist/',
    define: {
        __STANDALONE__: isStandalone,
        __ODOO_URL__: JSON.stringify(env.VITE_ODOO_URL),
    },
}
```

## QR Code Registry (`models/qr_registry.py`)

Universal QR code parsing and type detection:

### QR Code Registry Model

```python
class QRCodeRegistry(models.Model):
    _name = "qr.code.registry"
    _description = "QR Code Registry"

    code = fields.Char("Type Code", required=True)  # e.g., "customer", "product"
    name = fields.Char("Type Name", required=True)
    model_id = fields.Many2one("ir.model", required=True)
    lookup_field = fields.Char(default="id")
    default_action = fields.Selection([
        ("view", "View Details"),
        ("checkin", "Check In"),
        ("checkout", "Check Out"),
        ("add_to_cart", "Add to Cart"),
        ("load", "Load"),
        ("unload", "Unload"),
        ("pay", "Pay"),
        ("confirm", "Confirm"),
    ])
    app_type = fields.Selection([
        ("all", "All Apps"),
        ("sfa", "SFA Only"),
        ("lfa", "LFA Only"),
        ("scm", "SCM Only"),
    ], default="all")
```

### QR Code Mixin

Add QR code generation to any model:

```python
class ResPartner(models.Model):
    _name = "res.partner"
    _inherit = ["res.partner", "qr.code.mixin"]

    qr_type = "customer"  # Registry type code

    def _get_qr_params(self):
        """Additional params for QR code."""
        return {"action": "checkin"}
```

### Supported QR Formats

1. **Standard Odoo format**: `odoo://{type}/{id}?app={app}&action={action}`
2. **JSON format**: `{"type":"customer","id":123,"action":"checkin"}`
3. **QRIS format**: Detected by Indonesian QR payment prefix
4. **Legacy formats**: Prefix-based (e.g., `CUST-123`)

### Parse QR Code

```python
# In your router
from odoo.addons.mobile_base.models.qr_registry import QRCodeRegistry

result = env["qr.code.registry"].parse_qr_code(
    qr_data="odoo://customer/123",
    app_type="sfa"
)
# Returns:
# {
#     "success": True,
#     "type": "customer",
#     "model": "res.partner",
#     "record_id": 123,
#     "record_name": "Customer Name",
#     "action": "checkin",
#     "data": {"phone": "...", "address": "..."},
#     "actions_available": ["view", "checkin", "call", "navigate"]
# }
```

### Scan History

```python
class QRScanHistory(models.Model):
    _name = "qr.scan.history"
    _description = "QR Scan History"

    scan_date = fields.Datetime(default=fields.Datetime.now)
    user_id = fields.Many2one("res.users")
    app_type = fields.Selection([...])
    qr_data = fields.Char()
    qr_type = fields.Char()
    model_name = fields.Char()
    record_id = fields.Integer()
    record_name = fields.Char()
    success = fields.Boolean()
    action_taken = fields.Char()
    gps_latitude = fields.Float()
    gps_longitude = fields.Float()

    @api.model
    def log_scan(self, qr_data, result, gps=None, app_type="sfa"):
        """Log a QR scan for audit/history."""
```

## Security

### Access Control

| Model | Group | Access |
|-------|-------|--------|
| `mobile.profile` | base.group_user | Read |
| `mobile.profile` | base.group_system | Full |
| `qr.code.registry` | base.group_user | Read |
| `qr.code.registry` | base.group_system | Full |
| `qr.scan.history` | base.group_user | Create, Read |
| `qr.scan.history` | base.group_system | Full |

### Security Groups

- `group_mobile_manager`: Manage all mobile configurations
- `group_mobile_user`: Access mobile apps

## Related Modules

- `sfa_management` / `sfa_mobile`: Sales Force Automation
- `lfa_management` / `lfa_mobile`: Logistic Force Automation
- `scm_management` / `scm_mobile`: Supply Chain Management

## Testing

```bash
# Install mobile_base
./bin/install mobile_base

# Verify TechNameConverter
curl http://localhost:8069/sfa/app/sfa/manifest.json

# Test config API
curl -X POST http://localhost:8069/sfa/app/sfa/api/config \
  -H "Content-Type: application/json" \
  -d '{}'
```
