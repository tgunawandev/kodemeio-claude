# CLAUDE.md - abcfood-hris-sync

This file provides context and instructions for AI assistants working with this codebase.

## Project Overview

**abcfood-hris-sync** is a Python CLI tool for synchronizing HRIS (Human Resource Information System) data, specifically fingerprint attendance records and schedules, between Solution Cloud, Odoo HRIS, and Google Sheets.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HRIS Sync Pipeline                           │
│                                                                 │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │  Solution   │─────▶│  hris-sync  │─────▶│ Odoo HRIS   │     │
│  │   Cloud     │      │    CLI      │      │  Database   │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│        │                     │                    │             │
│        │                     ▼                    │             │
│        │              ┌─────────────┐             │             │
│        └─────────────▶│   S3 Seed   │◀────────────┘             │
│                       │   Storage   │                           │
│                       └─────────────┘                           │
│                              │                                  │
│                              ▼                                  │
│                       ┌─────────────┐                           │
│                       │   Google    │                           │
│                       │   Sheets    │                           │
│                       └─────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Repository Structure

```
abcfood-hris-sync/
├── .github/workflows/
│   └── build-push.yml          # CI/CD to GHCR
├── src/hris_sync/
│   ├── __init__.py
│   ├── main.py                 # Typer CLI app
│   ├── cli/                    # Sub-commands
│   │   ├── fingerprint.py      # Fingerprint pipeline
│   │   ├── fingerprint_db.py   # Database operations
│   │   ├── schedules.py        # Schedule sync
│   │   ├── seed.py             # Seed data loading
│   │   └── utils.py            # Utility commands
│   ├── api/                    # External API clients
│   │   ├── odoo.py             # Odoo RPC client
│   │   └── solution.py         # Solution Cloud client
│   ├── core/                   # Business logic
│   │   ├── fingerprint.py      # Fingerprint processing
│   │   └── schedule.py         # Schedule processing
│   └── db/                     # Database operations
│       └── postgres.py         # PostgreSQL utilities
├── tests/
├── scripts/
│   ├── docker-dev.sh
│   └── docker-prod.sh
├── seed/                       # Seed data files
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
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
| **Source Layout** | `src/hris_sync/` |
| **Logging** | Rich console + structured |
| **Testing** | pytest |
| **Dockerfile** | Multi-stage, non-root user |

## CLI Commands

```bash
# Fingerprint pipeline (complete workflow)
hris-sync fingerprint pipeline --batch-size 1000

# Database operations
hris-sync fingerprint-db count
hris-sync fingerprint-db summary
hris-sync fingerprint-db clear-all --confirm --double-confirm

# Seed data operations
hris-sync seed analyze
hris-sync seed preview --file data.txt
hris-sync seed load --confirm

# Schedule operations
hris-sync schedules etl --task create-schedule-plan

# Utilities
hris-sync utils test-connection
hris-sync utils load-attendance

# List all commands
hris-sync list
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
hris-sync utils test-connection

# Run fingerprint pipeline
hris-sync fingerprint pipeline
```

## Docker Usage

### Build

```bash
docker build -t hris-sync:dev .
```

### Run

```bash
docker run --rm --env-file .env hris-sync:dev fingerprint pipeline
```

### Docker Compose

```bash
# Development
docker compose up

# Production
docker compose -f docker-compose.prod.yml up
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HRIS_ODOO_HOST` | Odoo HRIS server hostname |
| `HRIS_ODOO_PORT` | Odoo port (default: 8069) |
| `HRIS_ODOO_DB` | Odoo database name |
| `HRIS_ODOO_USER` | Odoo service account username |
| `HRIS_ODOO_PASSWORD` | Odoo service account password |
| `HRIS_DB_HOST` | PostgreSQL hostname |
| `HRIS_DB_PORT` | PostgreSQL port |
| `HRIS_DB_NAME` | Database name |
| `HRIS_DB_USER` | Database username |
| `HRIS_DB_PASSWORD` | Database password |
| `HRIS_SOLUTION_HOST` | Solution Cloud hostname |
| `HRIS_SOLUTION_USERNAME` | Solution Cloud username |
| `HRIS_SOLUTION_PASSWORD` | Solution Cloud password |
| `HRIS_HZS3_ACCESS_KEY` | S3 access key |
| `HRIS_HZS3_SECRET_KEY` | S3 secret key |
| `HRIS_HZS3_URL` | S3 endpoint URL |
| `HRIS_HZS3_BUCKET` | S3 bucket name |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google service account JSON |
| `GOOGLE_SPREADSHEET_ID` | Target spreadsheet ID |

## CI/CD

Docker images are automatically built and pushed to GHCR on push to main branch.

**Image:** `ghcr.io/tgunawandev/abcfood-hris-sync:latest`

## Related Repositories

| Repository | Purpose |
|------------|---------|
| `abcfood-airflow-etl` | Airflow DAGs that orchestrate this tool |
| `abcfood-sfa-sync` | SFA integration tool |
| `abcfood-clickhouse-sync` | CDC PostgreSQL to ClickHouse |
