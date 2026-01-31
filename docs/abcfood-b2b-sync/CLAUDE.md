# CLAUDE.md - abcfood-b2b-sync

This file provides context and instructions for AI assistants working with this codebase.

## Project Overview

**abcfood-b2b-sync** is a Python CLI service for bidirectional synchronization between B2B (b2b.abcfood.app) and TLN (odoo-tln.abcfood.app) Odoo instances.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    B2B Sync Pipeline                            │
│                                                                 │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │  B2B Odoo   │◀────▶│  b2b-sync   │◀────▶│  TLN Odoo   │     │
│  │  (b2b_db)   │      │    CLI      │      │  (tln_db)   │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│        │                     │                    │             │
│        │                     ▼                    │             │
│        │              ┌─────────────┐             │             │
│        └─────────────▶│ PostgreSQL  │◀────────────┘             │
│                       │  (Direct)   │                           │
│                       └─────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

- **Orders**: B2B → TLN (every 10 minutes)
- **Master Data**: TLN → B2B (daily at 2 AM)

## Repository Structure

```
abcfood-b2b-sync/
├── src/b2b_sync/
│   ├── __init__.py
│   ├── __main__.py
│   ├── main.py                 # Typer CLI app
│   ├── config.py               # Pydantic settings
│   ├── notifications.py        # Telegram notifications
│   ├── scheduler.py            # APScheduler
│   ├── clients/
│   │   ├── __init__.py
│   │   ├── odoo_rpc.py         # Dual OdooRPC clients (TLN + B2B)
│   │   └── postgres.py         # Dual PostgreSQL clients
│   ├── sync/
│   │   ├── __init__.py
│   │   ├── base.py             # Base syncer with idempotency
│   │   ├── orders.py           # B2B -> TLN order sync + repair
│   │   └── master.py           # TLN -> B2B master data
│   └── tracking/
│       ├── __init__.py
│       └── sync_state.py       # Watermark tracking
├── config/
│   └── sync_config.yaml        # Business configuration (filters, products)
├── scripts/
│   ├── sync-orders.sh          # Manual order sync
│   ├── sync-master.sh          # Manual master sync
│   ├── repair-orders.sh        # Manual repair
│   ├── check-status.sh         # Status check
│   ├── monitor.sh              # Monitoring
│   ├── container-init.sh       # Init container script
│   └── run-scheduler.sh        # Scheduler runner
├── Dockerfile
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
├── pyproject.toml
├── .env.example
├── .env.prod
├── README.md
└── CLAUDE.md
```

## Project Standards

| Aspect | Standard |
|--------|----------|
| **CLI Framework** | Typer with Rich |
| **Configuration** | Pydantic BaseSettings |
| **Package Config** | pyproject.toml (hatchling) |
| **Source Layout** | `src/b2b_sync/` |
| **Logging** | Rich console + structured |
| **Scheduler** | APScheduler |
| **Dockerfile** | Multi-stage, non-root user |

## Key Design Decisions

### Idempotency Strategy

All sync operations are idempotent:

1. **External IDs**: Each synced record gets `b2b_sync.{model}_{source_id}`
2. **Write Date Watermark**: Only sync records where `write_date > last_sync`
3. **Upsert Logic**: Check external ID first, also check `origin` field, update if exists, create if not
4. **Order Lines**: Match by external ID, delete orphans, add missing
5. **Auto-repair**: Integrated into order sync - detects and fixes orders with missing lines

### Duplicate Detection (Orders)

Orders are detected as existing by:
1. External ID: `b2b_sync.sale_order_{b2b_id}`
2. Fallback: `origin = 'B2B:{order_name}'`

### Master Data Filters

Filters are configured in `config/sync_config.yaml` (not hardcoded):
- `res.partner`: `name LIKE '%PIZZA%'`
- `product.product`: Specific product codes (in YAML)
- `product.pricelist`: `name LIKE '%PIZZA%' OR '%FG%' OR '%HERO%'`

### Configuration Separation

- `.env` files: Infrastructure credentials (DB hosts, passwords, tokens)
- `config/sync_config.yaml`: Business rules (product codes, filters, field mappings)

## CLI Commands

```bash
# Order sync (includes auto-repair)
b2b-sync orders sync              # Incremental
b2b-sync orders sync --full       # Full resync
b2b-sync orders sync --no-repair  # Skip repair
b2b-sync orders preview           # Preview

# Order repair (standalone)
b2b-sync orders repair            # Execute
b2b-sync orders repair --dry-run  # Preview

# Master data sync
b2b-sync master sync              # All entities
b2b-sync master sync --entity res.partner
b2b-sync master preview           # Preview counts

# Scheduler
b2b-sync scheduler                # Default: orders every 10 min
b2b-sync scheduler --interval 5   # Every 5 minutes
b2b-sync scheduler --run-orders-now  # Run immediately on start

# Utilities
b2b-sync test-connection
b2b-sync status
b2b-sync init-check --retry 5
```

## Local Development

### Setup

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install in editable mode
pip install -e .
```

### Run

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env

# Test connections
b2b-sync test-connection

# Run sync
b2b-sync orders sync
```

## Docker Usage

### Build & Run

```bash
# Build
docker build -t b2b-sync:latest .

# Run command
docker run --rm --env-file .env.prod b2b-sync:latest orders sync

# Start scheduler
docker run --rm --env-file .env.prod b2b-sync:latest scheduler
```

### Production Deployment

```bash
# Start with init validation
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# View logs
docker logs -f b2b-sync-scheduler

# Run manual sync
docker exec b2b-sync-scheduler b2b-sync orders sync
```

## Testing Changes

1. Test connections: `b2b-sync test-connection`
2. Preview changes: `b2b-sync orders preview`
3. Dry run repair: `b2b-sync orders repair --dry-run`
4. Run sync: `b2b-sync orders sync`
5. Check status: `b2b-sync status`

## Important Files

| File | Purpose |
|------|---------|
| `config/sync_config.yaml` | Business config (products, filters) |
| `src/b2b_sync/config.py` | Pydantic settings (credentials) |
| `src/b2b_sync/sync_config.py` | YAML config loader |
| `src/b2b_sync/clients/odoo_rpc.py` | Dual OdooRPC clients |
| `src/b2b_sync/clients/postgres.py` | Dual PostgreSQL clients |
| `src/b2b_sync/sync/orders.py` | Order sync + repair logic |
| `src/b2b_sync/sync/master.py` | Master data sync logic |
| `src/b2b_sync/tracking/sync_state.py` | Watermark tracking |
| `src/b2b_sync/main.py` | CLI entry point |
| `src/b2b_sync/scheduler.py` | APScheduler jobs |

## Related Projects

| Repository | Purpose |
|------------|---------|
| `abcfood-sfa-sync` | SFA integration (pattern reference) |
| `abcfood-airflow-etl` | Airflow DAGs |
