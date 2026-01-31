# CLAUDE.md - abcfood-sfa-sync

This file provides context and instructions for AI assistants working with this codebase.

## Project Overview

**abcfood-sfa-sync** is a Python CLI tool for bidirectional synchronization between Odoo ERP and SFA (Sales Force Automation) systems. It handles customers, products, sales orders, routes, and stock inventory data.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SFA Sync Pipeline                            │
│                                                                 │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │   Odoo ERP  │◀────▶│  sfa-sync   │◀────▶│  SFA API    │     │
│  │  (tln_db)   │      │    CLI      │      │ (Visibilis) │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│        │                     │                                  │
│        │                     ▼                                  │
│        │              ┌─────────────┐                           │
│        └─────────────▶│ PostgreSQL  │                           │
│                       │  (Direct)   │                           │
│                       └─────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Repository Structure

```
abcfood-sfa-sync/
├── .github/workflows/
│   └── build-push.yml          # CI/CD to GHCR
├── src/sfa_sync/
│   ├── __init__.py
│   ├── main.py                 # Typer CLI app
│   ├── config.py               # Pydantic settings
│   ├── clients.py              # API clients (Odoo RPC, SFA API)
│   ├── customers.py            # Customer sync logic
│   ├── products.py             # Product sync logic
│   ├── sales.py                # Sales order sync
│   ├── routes.py               # Route sync
│   ├── stocks.py               # Stock inventory sync
│   └── scheduler.py            # APScheduler with terminal dashboard
├── tests/
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── .env.example
├── CLAUDE.md
└── README.md
```

## Project Standards

| Aspect | Standard |
|--------|----------|
| **CLI Framework** | Typer with Rich |
| **Configuration** | Pydantic BaseSettings |
| **Package Config** | pyproject.toml (hatchling) |
| **Source Layout** | `src/sfa_sync/` |
| **Logging** | Rich console + structured |
| **Testing** | pytest |
| **Dockerfile** | Multi-stage, non-root user |

## CLI Commands

```bash
# Customer operations
sfa-sync customers etl --task create-sfa-customers
sfa-sync customers etl --task update-sfa-customers
sfa-sync customers etl --task get-sfa-customers

# Product operations
sfa-sync products etl --task create-sfa-products
sfa-sync products etl --task update-sfa-products

# Sales operations
sfa-sync sales etl --task sales-workflow

# Route operations
sfa-sync routes etl --task create-sfa-routes

# Stock operations
sfa-sync stocks etl --task create-sfa-stock-inventories

# Test connections
sfa-sync test-connection

# Init check (for init container)
sfa-sync init-check --retry 5 --retry-delay 10

# Scheduler (with terminal dashboard)
sfa-sync scheduler                              # Default: master at 1 AM, transactions every 15 min
sfa-sync scheduler -mh 2 -mm 30 -ti 10          # Master at 2:30 AM, transactions every 10 min
sfa-sync scheduler --run-master-now             # Run master sync immediately on start

# Check scheduler status
sfa-sync status                                 # Show job history (run via docker exec)

# List all commands
sfa-sync list
```

## Local Development

### 1. Install dependencies

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install in editable mode with dev dependencies
pip install -e ".[dev]"
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run commands

```bash
# Test connections
sfa-sync test-connection

# Sync customers
sfa-sync customers etl --task create-sfa-customers
```

## Docker Usage

### Build

```bash
docker build -t sfa-sync:dev .
```

### Run

```bash
docker run --rm --env-file .env sfa-sync:dev customers etl --task create-sfa-customers
```

### Docker Compose

```bash
# Development
docker compose up

# Production (with scheduler)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Production Stack

The production stack (`docker-compose.prod.yml`) includes:

| Service | Description |
|---------|-------------|
| `init` | Validates all connections before starting |
| `scheduler` | Runs scheduled sync jobs with terminal dashboard |

**Schedule Configuration:**
- Master data sync: Daily at 1:00 AM (configurable)
- Transaction sync: Every 15 minutes (configurable)

**View Terminal Dashboard:**
```bash
# Attach to see live dashboard
docker attach sfa-sync-scheduler
# Press Ctrl+P, Ctrl+Q to detach without stopping

# Or view logs
docker logs -f sfa-sync-scheduler
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SFA_ENVIRONMENT` | Environment (dev/prod) |
| `SFA_API_ID` | SFA API ID |
| `SFA_API_KEY` | SFA API key |
| `SFA_BASE_URL` | SFA API base URL |
| `SFA_ODOO_HOST` | Odoo RPC endpoint |
| `SFA_ODOO_DB` | Odoo database name |
| `SFA_ODOO_USER` | Odoo username |
| `SFA_ODOO_PASSWORD` | Odoo password |
| `SFA_DB_HOST` | PostgreSQL hostname |
| `SFA_DB_PORT` | PostgreSQL port |
| `SFA_DB_NAME` | Database name |
| `SFA_DB_USER` | Database username |
| `SFA_DB_PASSWORD` | Database password |
| `SFA_START_DATE` | Sync start date |
| `SFA_IS_SYNC_ALL` | Sync all records flag |
| `SFA_BATCH_SIZE` | Batch size for operations |
| `SFA_SCHEDULER_MASTER_HOUR` | Hour for master data sync (0-23, default: 1) |
| `SFA_SCHEDULER_MASTER_MINUTE` | Minute for master data sync (0-59, default: 0) |
| `SFA_SCHEDULER_TRANSACTION_INTERVAL` | Transaction sync interval in minutes (default: 15) |

## CI/CD

Docker images are automatically built and pushed to GHCR on push to main branch.

**Image:** `ghcr.io/tgunawandev/abcfood-sfa-sync:latest`

## Related Repositories

| Repository | Purpose |
|------------|---------|
| `abcfood-airflow-etl` | Airflow DAGs that orchestrate this tool |
| `abcfood-hris-sync` | HRIS fingerprint sync tool |
| `abcfood-clickhouse-sync` | CDC PostgreSQL to ClickHouse |
