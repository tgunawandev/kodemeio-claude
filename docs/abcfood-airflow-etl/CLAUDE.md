# CLAUDE.md - abcfood-airflow-etl

This file provides context and instructions for AI assistants working with this codebase.

## Project Overview

This is **abcfood-airflow-etl**, a repository containing **Apache Airflow 3** DAG definitions for orchestrating ETL workflows. This repo contains DAGs that schedule and trigger Docker-based ETL tools from separate repositories.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   LOCAL DEVELOPMENT                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Airflow Standalone (Local)                  │   │
│  │              http://localhost:8080                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │  Webserver  │  │  Scheduler  │  │  SQLite DB  │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      dags/                               │   │
│  │  sfa_sync.py              (Odoo ↔ SFA integration)      │   │
│  │  hris_fingerprint_sync.py (HRIS fingerprint sync)       │   │
│  │  frappe_odoo_sync.py      (Frappe ↔ Odoo sync)          │   │
│  │  dbt_run.py               (dbt model runs)              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Airflow 3.1.5 (Dokploy)                          │   │
│  │         https://airflow.abcfood.app                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               DockerOperator                             │   │
│  │  ghcr.io/tgunawandev/abcfood-sfa-sync:latest            │   │
│  │  ghcr.io/tgunawandev/abcfood-hris-sync:latest           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
              │               │               │
              ▼               ▼               ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │ PostgreSQL  │ │ ClickHouse  │ │    S3       │
      │ (Odoo DBs)  │ │ (Warehouse) │ │   (Logs)    │
      └─────────────┘ └─────────────┘ └─────────────┘
```

## Repository Structure

```
abcfood-airflow-etl/
├── dags/                              # Airflow DAG files
│   ├── sfa_sync.py                    # Odoo ↔ SFA integration
│   ├── hris_fingerprint_sync.py       # HRIS fingerprint sync
│   ├── frappe_odoo_sync.py            # Frappe ↔ Odoo sync
│   └── dbt_run.py                     # dbt model runs
├── scripts/                           # Deployment scripts
├── config/                            # Configuration files
├── .env                               # Local development secrets
├── .env.example                       # Template
├── CLAUDE.md                          # This file
└── README.md
```

## Local Development Setup

### 1. Install Airflow Standalone

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Airflow 3.1.5
pip install "apache-airflow==3.1.5" \
    --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-3.1.5/constraints-3.12.txt"

# Install providers
pip install apache-airflow-providers-docker apache-airflow-providers-amazon
```

### 2. Configure Environment

Create `.env` file:
```bash
# Airflow home
export AIRFLOW_HOME=$(pwd)

# Database secrets (passed to DockerOperator)
export AIRFLOW_VAR_PG_HOST=116.203.191.172
export AIRFLOW_VAR_PG_PORT=5432
export AIRFLOW_VAR_PG_USER=postgres
export AIRFLOW_VAR_PG_PASSWORD=<secret>
```

### 3. Initialize and Start

```bash
# Load environment
source .env

# Initialize database
airflow db migrate

# Create admin user
airflow users create \
    --username admin \
    --password admin \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@example.com

# Start standalone (webserver + scheduler)
airflow standalone
```

### 4. Access UI

Open http://localhost:8080 with credentials from step 3.

## DAGs

### sfa_sync.py

Orchestrates Odoo ↔ SFA integration using `ghcr.io/tgunawandev/abcfood-sfa-sync`:
- Customer sync
- Product sync
- Sales order sync
- Route sync
- Stock inventory sync

### hris_fingerprint_sync.py

Orchestrates HRIS fingerprint sync using `ghcr.io/tgunawandev/abcfood-hris-sync`:
- Fingerprint data pipeline
- Schedule synchronization
- Attendance loading

### frappe_odoo_sync.py

Orchestrates Frappe ↔ Odoo data sync.

### dbt_run.py

Runs dbt models for data transformation in ClickHouse.

## Quick Commands

### Airflow

```bash
# Start standalone
airflow standalone

# List DAGs
airflow dags list

# Trigger DAG
airflow dags trigger sfa_sync

# Test task
airflow tasks test sfa_sync sync_customers 2026-01-01

# View DAG structure
airflow dags show sfa_sync
```

## Related Repositories

| Repository | Purpose | Docker Image |
|------------|---------|--------------|
| `abcfood-hris-sync` | HRIS fingerprint & schedule sync | `ghcr.io/tgunawandev/abcfood-hris-sync` |
| `abcfood-sfa-sync` | Odoo ↔ SFA integration | `ghcr.io/tgunawandev/abcfood-sfa-sync` |
| `abcfood-clickhouse-sync` | CDC PostgreSQL → ClickHouse | `ghcr.io/tgunawandev/abcfood-clickhouse-sync` |
| `kodemeio-platform-ops/apps/airflow/` | Production Airflow deployment | - |

## Production Deployment

### Airflow URL
https://airflow.abcfood.app

### Deploy DAG
```bash
# Copy DAG to production repo
cp dags/sfa_sync.py \
   ~/projects/kodemeio-platform-ops/apps/airflow/dags/

# Commit and push
cd ~/projects/kodemeio-platform-ops
git add apps/airflow/dags/
git commit -m "Update sfa_sync DAG"
git push
```

### Redeploy Airflow
```bash
cd ~/projects/kodemeio-platform-ops/apps/airflow
./scripts/drop.sh && ./scripts/deploy.sh
```

## Database Connections

### PostgreSQL (Odoo)
- Host: `116.203.191.172`
- Port: `5432`
- User: `postgres`
- Databases: `tln_db`, `ieg_db`, `tmi_db`

### ClickHouse
- Host: `138.199.213.219`
- Port: `8123`
- User: `clickhouse`

## Important Notes for AI Assistants

1. **DAGs Only** - This repo contains only Airflow DAG definitions
2. **ETL Tools** - Python ETL tools are in separate repos (`abcfood-hris-sync`, `abcfood-sfa-sync`)
3. **Local Development** - Use Airflow standalone mode
4. **Secrets** - Never commit `.env` with real credentials
5. **Production DAGs** - Copy to `kodemeio-platform-ops/apps/airflow/dags/`
6. **Variables** - Use `AIRFLOW_VAR_*` pattern for secrets

## Environment Variables Management (Vault)

This project uses **centralized encrypted credential management** via `vault` command with SOPS encryption.

- **Vault Location**: `~/Git/dotenvs/`
- **Encrypted Backup**: `abcfood-airflow-etl.env.encrypt`
- **GPG Key**: `73E03F83D0E039D39A419375A4E468569E7232B1`
- **Encryption**: SOPS with GPG

### Quick Commands

```bash
# Backup .env to vault
vault encrypt
# Creates: ~/Git/dotenvs/abcfood-airflow-etl.env.encrypt

# Restore .env from vault
vault decrypt
# Restores: .env from vault

# Check sync status
vault status

# Smart sync (auto-detect direction)
vault sync

# Safe inspection (without exposing secrets)
env-safe list                  # List variable names only
env-safe list --status         # Show defined/empty status
env-safe check API_KEY         # Check if key exists
env-safe validate              # Validate .env syntax
```

### Important Notes

- Always run `vault encrypt` after modifying .env
- Claude cannot read .env directly (safety hooks block access)
- Use `env-safe` commands to inspect .env without exposing values
- Vault repository: `~/Git/dotenvs/` (git-versioned, encrypted)
- Full documentation: `~/Git/dotenvs/README.md`
