# CLAUDE.md - abcfood-odoo-13

## Project Overview

This is **abcfood-odoo-13**, an Odoo 13 development environment for **abcfood** platform with custom HRIS modules. Uses **Odoo 16-style folder structure** for modern development practices while maintaining Odoo 13 compatibility.

## Key Directories (Odoo 16 Style)

| Path | Purpose |
|------|---------|
| `src/odoo/` | Odoo source code (OCA/OCB 13.0) - cloned during Docker build |
| `src/private/` | Private/custom modules (26 HRIS modules) |
| `src/repos.yaml` | Git aggregator config |
| `addons/` | Project-specific addons |
| `auto/addons/` | Symlinks to modules (created by entrypoint) |
| `bin/` | CLI scripts (11 tools) |
| `scripts/` | Production/deployment helper scripts |
| `scripts/lib/` | Shared bash libraries |
| `install/` | Module bundle YAML files (19 bundles) |
| `docker/` | Docker configuration files |
| `env/` | Environment-specific configs |

## Quick Start

```bash
# Docker Compose (primary development method)
docker compose up -d             # Start container
docker compose logs -f odoo      # Follow logs
docker compose down              # Stop

# Access Odoo at http://localhost:8013
```

## CLI Reference

### Consolidated Commands (Odoo 16 Style)

#### Server Control: `./bin/ctl`

```bash
./bin/ctl start              # Start in background
./bin/ctl start --fg         # Start in foreground
./bin/ctl start --tunnel     # Start with Cloudflare tunnel
./bin/ctl stop               # Stop server
./bin/ctl restart            # Restart server
./bin/ctl status             # Check status
./bin/ctl status -v          # Detailed status
./bin/ctl logs               # Follow logs
./bin/ctl logs -n 100        # Last 100 lines + follow
./bin/ctl logs -l ERROR      # Filter by level
```

#### Database Operations: `./bin/db`

```bash
./bin/db create mydb                 # Create with base module
./bin/db create mydb sale,stock      # Create with modules
./bin/db drop mydb                   # Drop with confirmation
./bin/db drop mydb -y                # Drop without confirmation
./bin/db reset mydb                  # Reset database
./bin/db reset mydb sale,stock       # Reset with modules
./bin/db list                        # List all databases
```

#### Module Operations: `./bin/mod`

```bash
./bin/mod install base               # Install modules
./bin/mod install -f install/bundle.yaml   # Install from bundle
./bin/mod install -f install/bundle.yaml -g core  # Install group
./bin/mod update base                # Update modules
./bin/mod update -f install/bundle.yaml    # Update from bundle
./bin/mod list                       # List all modules
./bin/mod list -i                    # List installed only
./bin/mod list -a                    # List available (filesystem)
./bin/mod groups install/bundle.yaml # Show bundle groups
./bin/mod modules install/bundle.yaml      # Output comma-separated (CI/CD)
```

### Other CLI Tools

| Command | Description |
|---------|-------------|
| `./bin/test <module> [db]` | Run module tests |
| `./bin/shell [db]` | Open Odoo interactive shell |
| `./bin/scaffold <name>` | Create new module from template |
| `./bin/debug` | Start with VS Code debugger (port 5678) |
| `./bin/tunnel` | Manage Cloudflare tunnel |
| `./bin/aggregate` | Run git-aggregator |
| `./bin/deps` | Extract Python dependencies from manifests |
| `./bin/compare-o16` | Compare O13 vs O16 project structure |

## Module Bundle Files

19 bundle YAML files in `install/` directory:

**OCA bundles** (17): `oca-accounting`, `oca-api`, `oca-auth`, `oca-crm`, `oca-helpdesk`, `oca-mandatory`, `oca-mrp`, `oca-product`, `oca-purchase`, `oca-queue`, `oca-report`, `oca-sale`, `oca-server`, `oca-shopfloor`, `oca-stock`, `oca-tier-validation`, `oca-web`

**Private bundles** (2): `private-hris`, `private-tier-validation`

Bundle format:
```yaml
name: my-bundle
description: My module bundle
groups:
  core:
    description: Core modules
    modules:
      - module_1
      - module_2
  optional:
    description: Optional features
    depends: [core]
    modules:
      - module_3
default: [core]
```

Usage:
```bash
./bin/mod install -f install/my-bundle.yaml
./bin/mod install -f install/my-bundle.yaml -g core,optional
```

## Docker Architecture

### Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development (host PostgreSQL) |
| `docker-compose.prod.yml` | Production (init + web + cron services) |
| `docker-compose.nfs.yml` | NFS volume overlay |
| `docker-compose.test.yml` | Staging DB testing |

### Multi-stage Dockerfile
```
Stage 1: builder      - Python venv, pip install requirements, clone Odoo
Stage 2: runtime      - Minimal production image
```

### Docker Files

| File | Purpose |
|------|---------|
| `docker/Dockerfile` | Multi-stage build |
| `docker/entrypoint.sh` | Container entrypoint (config generation, pre-migration, startup) |
| `docker/odoo.conf.template` | Config template (envsubst) |
| `docker/wait-for-postgres.sh` | PostgreSQL readiness check |
| `docker/extract-deps.py` | Extract Python deps from module manifests |
| `docker/validate-deps.py` | Validate Python dependencies |

### Pre-migration Scripts

Scripts in `docker/pre-migration.d/` run automatically at container startup:

| Script | Purpose |
|--------|---------|
| `001-fix-fiscal-country.sh` | Fix fiscal country data |
| `002-fix-duplicate-oauth-provider.sh` | Deduplicate OAuth providers |
| `010-setup-oauth-provider.sh` | Configure OAuth/OIDC provider |

### Container Paths
```
/opt/odoo/                         # Application root
├── src/odoo/                      # Odoo source
├── src/private/                   # Private modules
├── addons/                        # Project addons
└── auto/addons/                   # Module symlinks
/var/lib/odoo/                     # Filestore (volume)
/etc/odoo/odoo.conf                # Generated config
```

### Port Mapping

| Host Port | Container Port | Service |
|-----------|---------------|---------|
| 8013 | 8069 | HTTP (web) |
| 8014 | 8072 | Longpolling |

Access Odoo at **http://localhost:8013** for local development.

## Scripts Directory

### Shared Libraries (`scripts/lib/`)

| File | Purpose |
|------|---------|
| `colors.sh` | Terminal color constants |
| `common.sh` | Shared utility functions |
| `config.sh` | Configuration helpers |
| `deploy.sh` | Deployment utilities |
| `dokploy.sh` | Dokploy integration |
| `health.sh` | Health check functions |
| `notify.sh` | Notification helpers |

### Helper Scripts (`scripts/`)

Production and operations scripts: `check-bundles.sh`, `cleanup.sh`, `config.sh`, `dashboard.sh`, `health.sh`, `jobs.sh`, `mail.sh`, `migrate-to-s3.sh`, `modules.sh`, `odoo-logs.sh`, `performance.sh`, `security.sh`, `sessions.sh`, `storage.sh`, `test-websocket.sh`, `troubleshoot.sh`, `update-modules.sh`, `workers.sh`

## Configuration Files

| File | Purpose |
|------|---------|
| `odoo.conf` | Local Odoo server configuration |
| `.env` | Environment variables |
| `.editorconfig` | Editor settings |
| `.pylintrc-odoo` | Pylint-odoo config |
| `requirements-oca.txt` | Python dependencies |
| `src/repos.yaml` | Git aggregator config |

## Environment Variables (Local Dev)

### Database Connection
```bash
PGHOST=localhost
PGPORT=5432
PGUSER=odoo
PGPASSWORD=odoo
PGDATABASE=hris_db
```

### Odoo Configuration
```bash
ODOO_HTTP_PORT=8013          # Host port mapped to container 8069
ODOO_LONGPOLLING_PORT=8014   # Host port mapped to container 8072
ODOO_LOG_LEVEL=info
ODOO_VERSION=13.0
ODOO_SERVER_WIDE_MODULES=base,web,bus
```

## Private Modules

26 private HRIS modules:
- **Employee**: hr_employee_custom_info, hr_employee_information, hr_employee_state, hr_employee_updation
- **Contract**: hr_contract_custom_info, hr_contract_information
- **Attendance**: hr_attendance_geofence, hr_fingerprint_log
- **Payroll**: hr_payroll_summary
- **Benefits/Loans**: hr_benefit, hr_loan, hr_custody, hr_schedule
- **Tier Validation**: hr_*_tier_validation, hr_benefit_tier_validation, hr_loan_tier_validation, hr_schedule_tier_validation
- **Utilities**: company_custom_info, res_company_information, jaspersoft_report, odoo_backup_sh, odoo_web_login, oi_action_file, oi_pdf_viewer

## Module Development

### Create new module
```bash
./bin/scaffold my_module
```

### Install module
```bash
./bin/mod install my_module
```

### Update after changes
```bash
./bin/mod update my_module
```

### Run tests
```bash
./bin/test my_module
```

## Important Notes

1. **NEVER modify OCA/OCB source**: Files under `src/oca/` and `src/odoo/` are **read-only**. They are cloned during Docker build from upstream repos and are gitignored. Any fix or override must go in `src/private/` (as a new module or by patching via model inheritance). Never edit OCA/OCB files directly.

2. **Odoo 16 Structure**: Uses flat folder structure like abcfood-odoo-16 with `src/`, `addons/`, `auto/`.

3. **Docker-first**: Development runs inside Docker. The container connects to host PostgreSQL via `host.docker.internal`.

4. **Consolidated CLI**: Use `./bin/ctl`, `./bin/db`, `./bin/mod` for Odoo 16-style commands.

5. **Symlinks**: Module symlinks to `auto/addons/` are created by the Docker entrypoint.

6. **Odoo Source**: Cloned during Docker build from OCA/OCB 13.0 branch to `src/odoo/`.

7. **Ports**: Host ports 8013 (HTTP) and 8014 (longpolling), mapped to container ports 8069/8072.

8. **Database Connection**: **O13 MUST use direct PostgreSQL (port 5432), NOT PgBouncer (port 6432)**. See Database section below.

## Database Configuration (CRITICAL)

### Direct PostgreSQL Required

**Odoo 13 does NOT support PgBouncer connection pooling.** Always use direct PostgreSQL:

| Setting | Value | Description |
|---------|-------|-------------|
| `PGPORT` | 5432 | Direct PostgreSQL (REQUIRED) |
| `PGPORT_POOL` | 6432 | PgBouncer (DO NOT USE for O13) |

**Why O13 cannot use PgBouncer:**
- LISTEN/NOTIFY for longpolling doesn't work through connection poolers
- Transaction isolation issues with session pooling mode
- Cursor handling incompatibilities

### Docker Production Services

All three services use `PGPORT=5432` (direct PostgreSQL):

```yaml
# docker-compose.prod.yml
services:
  odoo-init:   PGPORT: ${PGPORT:-5432}  # Direct PostgreSQL
  odoo-web:    PGPORT: ${PGPORT:-5432}  # Direct PostgreSQL (NOT PGPORT_POOL!)
  odoo-cron:   PGPORT: ${PGPORT:-5432}  # Direct PostgreSQL
```

**Important**: `PGPORT` must always be `5432` in all environment files.

## File Patterns

- Odoo models: `models/*.py`
- Views: `views/*.xml`
- Security: `security/ir.model.access.csv`
- Data: `data/*.xml`
- Manifest: `__manifest__.py` or `__openerp__.py`
- Static assets: `static/src/`
- Tests: `tests/test_*.py`

## Environment Variables Management (Vault)

This project uses **centralized encrypted credential management** via `vault` command with SOPS encryption.

- **Vault Location**: `~/Git/dotenvs/`
- **Encrypted Backup**: `abcfood-odoo-13.env.encrypt`
- **GPG Key**: `73E03F83D0E039D39A419375A4E468569E7232B1`
- **Encryption**: SOPS with GPG

### Quick Commands

```bash
# Backup .env to vault
vault encrypt

# Restore .env from vault
vault decrypt

# Check sync status
vault status

# Safe inspection (without exposing secrets)
env-safe list                  # List variable names only
env-safe check API_KEY         # Check if key exists
env-safe validate              # Validate .env syntax
```
