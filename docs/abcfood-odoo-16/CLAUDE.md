# CLAUDE.md - abcfood-odoo-16

Odoo 16 platform with OCA addons, Doodba-style setup, Docker deployment.

## Directories
- `src/odoo/` - Odoo source (OCA/OCB 16.0)
- `src/oca/` - OCA repositories (47 repos)
- `src/private/` - Custom modules
- `auto/addons/` - Symlinked OCA modules
- `bin/` - CLI scripts (10 unified tools)
- `install/` - Module bundle files for installation

## CLI Scripts Overview

Scripts in `bin/` work both locally and inside Docker containers (same commands).

```
bin/
├── ctl       # Server control (start, stop, restart, status, logs)
├── db        # Database operations (create, drop, reset, list)
├── mod       # Module operations (install, update, list)
├── shell     # Odoo interactive shell
├── test      # Run module tests
├── debug     # Debug mode
├── scaffold  # Create new module
├── tunnel    # Cloudflare tunnel management
├── aggregate # Git aggregator for OCA repos
└── deps      # Install Python dependencies from manifests
```

Note: `odoo` command (native) runs Odoo directly, `ctl` is our wrapper for server management.

---

## Development Usage

### Server Control (`./bin/ctl`)

```bash
# Start Odoo
./bin/ctl start              # Background (default)
./bin/ctl start --fg         # Foreground (interactive)
./bin/ctl start --tunnel     # With Cloudflare tunnel
./bin/ctl start --tunnel --quick  # With quick tunnel (temp URL)

# Stop/Restart
./bin/ctl stop               # Stop Odoo (and tunnel if running)
./bin/ctl restart            # Restart Odoo
./bin/ctl restart --tunnel   # Restart with tunnel

# Monitor
./bin/ctl status             # Quick status check
./bin/ctl status -v          # Detailed status (DB size, errors, env)
./bin/ctl logs               # Follow logs
./bin/ctl logs -n 100        # Show last 100 lines then follow
./bin/ctl logs -l ERROR      # Filter by log level
```

### Database Operations (`./bin/db`)

```bash
# Create
./bin/db create mydb                  # Create with base module
./bin/db create mydb sale,stock       # Create with specific modules
./bin/db create mydb -f install/private-sfa.yaml  # Create with bundle file

# Drop
./bin/db drop mydb                    # Drop with confirmation
./bin/db drop mydb -y                 # Drop without confirmation

# Reset (drop + create)
./bin/db reset mydb                   # Reset with base module
./bin/db reset mydb sale,stock        # Reset with specific modules
./bin/db reset mydb -y                # Reset without confirmation

# List
./bin/db list                         # List all databases with sizes
```

### Module Operations (`./bin/mod`)

```bash
# Install modules directly
./bin/mod install sale,stock
./bin/mod install sale,stock -d tln_db

# Install from YAML bundle files (recommended)
./bin/mod install -f install/private-sfa.yaml
./bin/mod install -f install/private-sfa.yaml -f install/private-lfa.yaml
./bin/mod install -f install/private-sfa.yaml -d tln_db

# Install specific groups from bundle
./bin/mod install -f install/private-sfa.yaml --groups core
./bin/mod install -f install/private-sfa.yaml --groups core,mobile

# Update modules
./bin/mod update sfa_management
./bin/mod update -f install/private-sfa.yaml
./bin/mod update all                  # Update all installed modules

# List modules
./bin/mod list                        # All modules in database
./bin/mod list --installed            # Only installed modules
./bin/mod list --available            # Available on filesystem
./bin/mod list -s sale                # Search for 'sale' modules
./bin/mod list --state 'to upgrade'   # Show pending upgrades
./bin/mod list --json                 # JSON output

# Output modules (for CI/CD)
./bin/mod modules install/private-sfa.yaml         # All default groups
./bin/mod modules install/private-sfa.yaml --groups core  # Specific groups

# List bundle groups
./bin/mod groups install/private-sfa.yaml          # Show available groups
```

### Module Bundle Files (YAML)

Bundle files use YAML format with group support for partial installation.
Located in `install/` directory with prefixes:
- `private-*.yaml` - Custom/private modules from `src/private/`
- `oca-*.yaml` - OCA community modules from `auto/addons/`

**YAML Bundle Format:**
```yaml
name: private-sfa
description: SFA - Sales Force Automation

groups:
  core:
    description: Core SFA modules (required)
    modules:
      - partner_information
      - sfa_management
  operating_unit:
    description: Multi-branch support
    depends: [core]
    modules:
      - sfa_management_operating_unit
  mobile:
    description: Mobile app
    depends: [core]
    modules:
      - sfa_mobile

default: [core, operating_unit, mobile]
```

**Private Bundles (Custom Modules):**

| Bundle | Description | Groups |
|--------|-------------|--------|
| `private-sfa.yaml` | SFA - Sales Force Automation | core, operating_unit, mobile |
| `private-lfa.yaml` | LFA - Last Mile Field Automation | core, operating_unit, mobile |
| `private-scm.yaml` | SCM - Supply Chain Management | core |
| `private-b2b.yaml` | B2B Mobile Commerce | core, mobile |
| `private-accounting.yaml` | OM Suite + custom accounting | om_suite, enhancements |
| `private-operating-unit.yaml` | Multi-branch/OU support | core |
| `private-stock.yaml` | Stock/warehouse extensions | core |
| `private-sale.yaml` | Sale extensions | core |
| `private-report.yaml` | SQL export + reports | sql_export, mis_builder |
| `private-integration.yaml` | Metabase, Airflow, Mattermost | core |
| `private-payment.yaml` | Payment gateways | core |
| `private-tax.yaml` | Tax integration | core |
| `private-product.yaml` | Product extensions | core |
| `private-purchase.yaml` | Purchase extensions | core |
| `private-exception.yaml` | Exception handling | core |
| `private-mrp.yaml` | Manufacturing extensions | core |
| `private-server.yaml` | Server utilities | core |
| `private-shopfloor.yaml` | Shopfloor auth | core |

**OCA Bundles (Community Modules):**

| Bundle | Description | Groups |
|--------|-------------|--------|
| `oca-accounting.yaml` | OCA accounting addons | analytic, control, invoicing, payment, usability |
| `oca-stock.yaml` | Stock & warehouse | batch, picking, move, quant, storage, helpers |
| `oca-server.yaml` | Server utilities & infrastructure | base, auth, environment, tools, jsonify |
| `oca-web.yaml` | Web UI enhancements | ui, widgets, views, advanced |
| `oca-report.yaml` | MIS Builder & reporting | mis_builder, report |
| `oca-product.yaml` | Product enhancements | core |
| `oca-sale.yaml` | Sale enhancements | core |
| `oca-purchase.yaml` | Purchase enhancements | core |
| `oca-tier-validation.yaml` | Approval workflows | core |
| `oca-shopfloor.yaml` | Shopfloor mobile | core |
| `oca-queue.yaml` | Background job processing | core |
| `oca-helpdesk.yaml` | Helpdesk management | core |
| `oca-crm.yaml` | CRM extensions | core |
| `oca-mrp.yaml` | Manufacturing | core |

### Development Tools

```bash
./bin/shell                   # Odoo interactive shell
./bin/shell tln_db            # Shell for specific database
./bin/test sfa_management     # Run tests for a module
./bin/debug                   # Start Odoo in debug mode
./bin/scaffold mymod src/private/  # Create new module
./bin/deps                    # Install Python dependencies from manifests
./bin/aggregate               # Run git-aggregate for OCA repos
```

---

## Production Usage (Docker/CI)

### Docker Compose

```bash
docker compose up -d
docker build -f docker/Dockerfile -t odoo-16:latest .
```

Production image: `ghcr.io/tgunawandev/odoo-16` via Dokploy

### Docker Entrypoint Commands

```bash
# Start Odoo web server (default)
docker run -e PGDATABASE=tln_db ... odoo-16 odoo

# Run with module installation from YAML bundle
docker run -e ODOO_INSTALL_BUNDLE=private-sfa ... odoo-16 odoo

# Install specific groups from bundle
docker run -e ODOO_INSTALL_BUNDLE=private-sfa -e ODOO_INSTALL_BUNDLE_GROUPS=core ... odoo-16 odoo

# Run with multiple bundles
docker run -e ODOO_INSTALL_BUNDLE=private-sfa,private-lfa ... odoo-16 odoo

# Update modules from bundle
docker run -e ODOO_UPDATE_BUNDLE=private-sfa ... odoo-16 odoo

# Start cron/worker services
docker run ... odoo-16 cron
docker run ... odoo-16 worker

# Interactive shell
docker run -it ... odoo-16 shell
```

### Using bin/ Scripts Inside Container

The same `bin/` scripts work inside Docker (added to PATH):

```bash
# Using docker exec
docker exec -it <container> mod install -f /opt/odoo/install/private-sfa.yaml
docker exec -it <container> mod modules /opt/odoo/install/private-sfa.yaml
docker exec -it <container> mod groups /opt/odoo/install/private-sfa.yaml
docker exec -it <container> db list

# Native Odoo command (unchanged)
docker exec -it <container> odoo -d tln -u all --stop-after-init
```

| Command | Description |
|---------|-------------|
| `odoo` | Native Odoo (odoo-bin) |
| `mod` | Module operations (install, update, list, modules, groups) |
| `db` | Database operations (create, drop, reset, list) |
| `ctl` | Server control (local dev only - start, stop, status, logs) |

### Docker Environment Variables

```bash
# Database connection
PGHOST=db
PGPORT=5432
PGUSER=odoo
PGPASSWORD=odoo
PGDATABASE=tln_db

# Module installation (YAML bundle system with groups)
ODOO_INSTALL_BUNDLE=private-sfa              # Install from bundle (all default groups)
ODOO_INSTALL_BUNDLE=private-sfa,private-lfa  # Multiple bundles
ODOO_INSTALL_BUNDLE_GROUPS=core,mobile       # Specific groups for YAML bundles
ODOO_INSTALL_MODULES=mod1,mod2               # Direct module list
ODOO_UPDATE_BUNDLE=private-sfa               # Update from bundle
ODOO_UPDATE_BUNDLE_GROUPS=core               # Specific groups for update
ODOO_UPDATE_MODULES=mod1,mod2                # Direct module update
ODOO_FORCE_INSTALL=true                      # Force reinstall even if installed

# Database initialization
ODOO_INIT_DB=true                 # Auto-create database
ODOO_INIT_MODULES=base            # Modules for new DB

# Server configuration
ODOO_WORKERS=4
ODOO_MAX_CRON_THREADS=1
ODOO_HTTP_PORT=8069
ODOO_GEVENT_PORT=8072
```

### CI/CD Module Installation

Use `mod modules` to get comma-separated module list for scripting:

```bash
# Get modules for CI/CD (all default groups)
MODULES=$(./bin/mod modules install/private-sfa.yaml)
# Output: partner_information,sfa_management,sfa_management_operating_unit,sfa_mobile

# Get specific groups only
MODULES=$(./bin/mod modules install/private-sfa.yaml --groups core)
# Output: partner_information,sfa_management

# Use in Docker or CI
odoo-bin -d $DB -i $MODULES --stop-after-init

# Multiple bundles
MODULES=$(./bin/mod modules install/private-sfa.yaml),$(./bin/mod modules install/private-lfa.yaml)

# List available groups in a bundle
./bin/mod groups install/private-sfa.yaml
```

### Local Development Environment

```bash
# Database (from .env)
PGHOST=localhost
PGPORT=5436
PGUSER=odoo
PGPASSWORD=odoo
PGDATABASE=tln_db

# Odoo ports
ODOO_HTTP_PORT=8069
ODOO_LONGPOLLING_PORT=8072
```

---

## Private Modules

### sfa_management
Sales Force Automation - visit management, GPS check-in, route scheduling, payment collection.
Models: `sfa.visit`, `sfa.call.session`, `sfa.payment`, `partner.route`

### lfa_management
Delivery management - QR tracking, routes, expenses, POD, shipments.
Models: `lfa.delivery`, `lfa.delivery.route`, `lfa.driver`, `lfa.expense`

### scm_management
Supply chain tracker - SO→MO→DO→INV→PY flow, handover system.
Models: `scm.tracker`, `scm.handover`

### account_credit_note_type
CN type selection (Price/Tax/CN-DN/Delivery Return) in reversal wizard.

### metabase_integration
Embed Metabase dashboards via JWT. Models: `metabase.config`, `metabase.dashboard`

### Mobile Apps
- `sfa_mobile` - SFA PWA (React/Vite/Tailwind)
- `lfa_mobile` - LFA FastAPI endpoints
- `sfa_management_operating_unit` - Multi-branch support

## File Patterns
- Models: `models/*.py`
- Views: `views/*.xml`
- Security: `security/ir.model.access.csv`
- Manifest: `__manifest__.py`

## Environment
- DB: `localhost:5436` (see `.env`)
- Odoo: port 8069, longpolling 8072
- Python 3.12, venv: `venv/`
- Dev mode enabled

## Troubleshooting

```bash
# Check module state
psql -h localhost -p 5436 -U odoo -d tln_db \
  -c "SELECT name,state FROM ir_module_module WHERE name='mod';"

# Reset stuck modules
psql ... -c "UPDATE ir_module_module SET state='installed' WHERE state='to upgrade';"

# Clear assets
psql ... -c "DELETE FROM ir_attachment WHERE name LIKE '%assets%';"

# Check server status
./bin/ctl status -v

# View recent errors
./bin/ctl logs -l ERROR
```

## Vault (.env management)

```bash
vault encrypt   # Backup .env
vault decrypt   # Restore .env
env-safe list   # List vars (safe)
```
