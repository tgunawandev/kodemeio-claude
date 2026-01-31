# CLAUDE.md - abcfood-dbt-model

## Project Overview

This is **abcfood-dbt-model**, a **dbt data warehouse** for multi-company Odoo ERP analytics on the **abcfood** platform running on **ClickHouse**. The key design principle is:

**Accounting (General Ledger) = Source of Financial Truth**

All financial metrics MUST derive from `fct_general_ledger`. Operational modules (sales, inventory, manufacturing) provide context and detail.

## Database: ClickHouse

- **Host**: 116.203.191.172:8123
- **Adapter**: dbt-clickhouse
- **Performance**: Full ~68 model pipeline runs in ~24 seconds (all views)

### Source Databases
- `tln_db` - TLN company
- `tmi_db` - TMI company
- `ieg_db` - IEG company

Data is synced from Odoo PostgreSQL to ClickHouse via **Debezium CDC** (ReplacingMergeTree).
Sync config: `/home/tgunawan/project/00-new-projects/abcfood/abcfood-clickhouse-sync/`

## Architecture

```
Staging Layer (by module, not company) — 31 models
├── accounting/  → stg_account_move, stg_account_move_line, stg_account_account,
│                  stg_account_journal, stg_account_tax, stg_account_tax_group,
│                  stg_account_payment_term, stg_account_payment
├── sales/       → stg_sale_order, stg_sale_order_line
├── purchasing/  → stg_purchase_order, stg_purchase_order_line
├── inventory/   → stg_stock_move, stg_stock_location, stg_stock_picking,
│                  stg_stock_quant, stg_stock_valuation_layer,
│                  stg_stock_warehouse, stg_stock_picking_type
├── manufacturing/ → stg_mrp_production, stg_mrp_bom, stg_mrp_bom_line
└── master/      → stg_res_partner, stg_product_product, stg_product_template,
                   stg_res_company, stg_res_currency, stg_uom_uom,
                   stg_crm_team, stg_product_category, stg_operating_unit (TLN only)

Mart Layer — 37 models
├── finance/     → fct_general_ledger (SOURCE OF TRUTH), fct_trial_balance,
│                  fct_payments, dim_account, dim_journals, dim_payment_terms
├── sales/       → fct_sales_orders, fct_sales_order_lines, dim_customers,
│                  dim_sales_teams, bridge_sales_to_gl, bridge_sales_to_stock
├── purchasing/  → fct_purchase_orders, fct_purchase_order_lines,
│                  bridge_purchase_to_gl
├── inventory/   → fct_stock_movements, fct_inventory_valuation,
│                  dim_locations, dim_warehouses, dim_picking_types,
│                  bridge_stock_to_gl
├── manufacturing/ → fct_manufacturing_orders,
│                   bridge_manufacturing_to_gl, bridge_manufacturing_to_stock
├── master/      → dim_products, dim_product_categories, dim_company,
│                  dim_currencies, dim_suppliers, dim_uom,
│                  dim_operating_unit (TLN only), dim_date (generated)
└── reports/     → rpt_ar_outstanding, rpt_ap_outstanding, rpt_sales_orders,
                   rpt_sales_by_invoice, rpt_general_ledger, rpt_journal_ledger,
                   rpt_vat_report, rpt_inventory_summary, rpt_manufacturing_summary
```

## Key Design Decisions

1. **Module-based staging** - Organized by Odoo module, not company
2. **Union pattern** - Each staging model unions tln + tmi + ieg with `source_company` column
3. **Native IDs** - Use Odoo native `id` column directly (no surrogate keys)
4. **Bridge tables** - Link operational facts to GL for reconciliation
5. **ClickHouse-native functions** - `toStartOfMonth()`, `toYear()`, `now()` instead of PostgreSQL equivalents
6. **Single dwh schema** - All models output to `dwh` schema, partitioned by `source_company` column
7. **Explicit column aliases** - Always use `col AS col_name` to avoid ClickHouse column naming issues
8. **ALL views** - Every model (staging + marts) is materialized as `view` for real-time CDC
9. **FINAL keyword** - Required on all source reads (see CDC section below)
10. **Operating unit** - TLN-only dimension; TMI/IEG get NULL

## CRITICAL: FINAL Keyword for CDC Tables

The ClickHouse sync uses **Debezium CDC with ReplacingMergeTree**. Without `FINAL`, queries return:
- Duplicate rows (old + new versions of updated records)
- Deleted rows still visible

**ALL source references MUST use `FINAL`:**
```sql
-- In staging CTEs:
from {{ source('tln_db', 'account_move') }} FINAL
from {{ source('tmi_db', 'account_move') }} FINAL
from {{ source('ieg_db', 'account_move') }} FINAL
```

Every staging model already has `FINAL` on all source references. When adding new staging models, always include `FINAL`.

## Operating Unit Pattern

Only TLN has operating units (55 records in `tln_db.operating_unit`). TMI and IEG do not have this table.

### In staging models:
```sql
-- TLN CTE: include real operating_unit_id
select ..., operating_unit_id, 'tln' as source_company
from {{ source('tln_db', 'account_move') }} FINAL

-- TMI CTE: NULL since no operating_unit
select ..., null as operating_unit_id, 'tmi' as source_company
from {{ source('tmi_db', 'account_move') }} FINAL

-- IEG CTE: NULL
select ..., null as operating_unit_id, 'ieg' as source_company
from {{ source('ieg_db', 'account_move') }} FINAL
```

### In mart models:
```sql
left join {{ ref('dim_operating_unit') }} ou
    on t.source_company = ou.source_company
    and t.operating_unit_id = ou.operating_unit_id
```

### stg_operating_unit is special:
```sql
-- Reads ONLY from tln_db (no union pattern)
select id as operating_unit_id, name, code, company_id, active as is_active,
       'tln' as source_company
from {{ source('tln_db', 'operating_unit') }} FINAL
where active = true
```

## ClickHouse SQL Patterns

### Primary Keys (Native IDs)
```sql
-- Native Odoo ID + source_company for uniqueness
id,
source_company,
```

### Date Functions
```sql
-- ClickHouse date functions (instead of PostgreSQL date_trunc/extract)
toStartOfMonth(posting_date) as posting_month
toStartOfQuarter(posting_date) as posting_quarter
toStartOfYear(posting_date) as posting_year
toYear(posting_date) as fiscal_year
```

### Current Timestamp
```sql
-- ClickHouse (instead of current_timestamp)
now() as loaded_at
```

### Explicit Column Aliases
```sql
-- IMPORTANT: Always use explicit aliases to avoid ClickHouse column naming issues
-- ClickHouse will use 't.column' as column name if you don't alias it
select
    t.id as id,                    -- Correct: creates column 'id'
    t.source_company as source_company,  -- Correct: creates column 'source_company'
    t.amount                       -- Wrong: creates column 't.amount'
from some_table t
```

### Duration Calculations
```sql
-- Use dateDiff for time calculations
dateDiff('hour', date_planned_start, date_finished) as duration_hours
```

### Generated Date Dimension
```sql
-- Generate date range using numbers() function
select toDate('2019-01-01') + toIntervalDay(number) as date_key
from numbers(4383)  -- 2019-01-01 to 2030-12-31
```

## Database Connection

```yaml
# ~/.dbt/profiles.yml
dbt_model:
  target: dev
  outputs:
    dev:
      type: clickhouse
      host: 116.203.191.172
      port: 8123
      user: clickhouse
      password: <from env>
      schema: dwh
      threads: 4
      secure: false
      verify: false
```

## Common Tasks

### Run models
```bash
dbt run                          # All models
dbt run --select staging         # Staging only
dbt run --select tag:mart        # Mart models
dbt run --select tag:manufacturing  # Manufacturing module
dbt run --select fct_general_ledger  # Specific model
```

### Run with scripts
```bash
./scripts/run-dbt.sh             # Run full dbt pipeline (compile + run + test)
./scripts/run-dbt.sh --skip-test # Run without tests
./scripts/sync-metabase.sh       # Sync dbt metadata to Metabase
```

### Add a new Odoo table
1. Add table to sync config (`abcfood-clickhouse-sync/config/tables/common.yml`)
2. Add to source YAML (e.g., `models/staging/inventory/_inventory_sources.yml`)
3. Create staging model with union pattern (tln + tmi + ieg) and `FINAL` keyword
4. Add `operating_unit_id` if the Odoo table has it (TLN=real, TMI/IEG=null)
5. Use native `id` column as primary key with `source_company`
6. Link to appropriate mart dimension/fact

### Check financial reconciliation
```sql
-- Sales vs Revenue (run in ClickHouse)
SELECT source_company,
       SUM(amount_total) as sales_total
FROM dwh.fct_sales_orders
GROUP BY source_company

SELECT source_company,
       SUM(credit - debit) as gl_revenue
FROM dwh.fct_general_ledger
WHERE financial_statement_section = 'Revenue'
GROUP BY source_company
```

### Drill from sales order to GL entries
```sql
SELECT * FROM dwh.bridge_sales_to_gl WHERE order_number = 'SO12345'
```

### Drill from manufacturing order to GL entries
```sql
SELECT * FROM dwh.bridge_manufacturing_to_gl WHERE production_name = 'MO/00123'
```

## Model Naming

- Staging: `stg_<table>.sql` (e.g., `stg_account_move.sql`)
- Facts: `fct_<entity>.sql` (e.g., `fct_general_ledger.sql`)
- Dimensions: `dim_<entity>.sql` (e.g., `dim_account.sql`)
- Bridges: `bridge_<from>_to_<to>.sql` (e.g., `bridge_sales_to_gl.sql`)
- Reports: `rpt_<report_name>.sql` (e.g., `rpt_ar_outstanding.sql`)

## Key Models

| Model | Purpose | Est. Rows |
|-------|---------|-----------|
| `fct_general_ledger` | **SOURCE OF TRUTH** for all financial reporting | 11.6M |
| `fct_stock_movements` | Inventory movements with warehouse/OU details | 5.7M |
| `fct_sales_orders` | Sales orders with invoice links | 315K |
| `fct_sales_order_lines` | Line-level sales with qty/price details | 2.2M |
| `fct_purchase_order_lines` | Line-level purchases with vendor details | 125K |
| `fct_manufacturing_orders` | Production orders with BOM/duration/OU | 226K |
| `fct_inventory_valuation` | Stock valuation layers with cost details | 2.6M |
| `fct_payments` | Account payments with partner/OU details | 747K |
| `fct_trial_balance` | Aggregated trial balance by account/period | - |
| `dim_account` | Chart of Accounts with financial statement classification | 1K |
| `dim_operating_unit` | Operating units (TLN only, 55 rows) | 55 |
| `dim_date` | Generated date dimension (2019-2030) | 4,383 |
| `bridge_sales_to_gl` | Sales -> Invoice -> GL entries | - |
| `bridge_stock_to_gl` | Stock movements -> GL entries | - |
| `bridge_manufacturing_to_gl` | Manufacturing -> Stock -> SVL -> GL entries | - |
| `bridge_manufacturing_to_stock` | Manufacturing -> Stock movements (output/consumption) | - |
| `bridge_sales_to_stock` | Sales -> Picking -> Stock movements | - |

## Output Schema

- `dwh` - All models (all views, no tables)
- Data is partitioned by `source_company` column (tln, tmi, ieg)

## Metabase Integration

- Metabase at `mb.abcfood.app` connects to the same ClickHouse instance
- All views in `dwh` schema are available as Metabase tables
- Use `dbt-metabase` to sync model descriptions and relationships:
  ```bash
  ./scripts/sync-metabase.sh
  ```

## Testing

```bash
dbt test                         # All tests
dbt test --select tag:core       # Core financial models
dbt test --select tag:reconciliation  # Reconciliation tests
dbt test --select tag:manufacturing   # Manufacturing tests
```

## Important Files

- `dbt_project.yml` - Project config, model settings (all views)
- `~/.dbt/profiles.yml` - ClickHouse connection
- `models/staging/**/_*_sources.yml` - Source definitions
- `models/staging/**/_*_models.yml` - Staging model documentation
- `models/marts/**/_*_models.yml` - Mart model documentation
- `tests/odoo/` - Odoo data quality tests
- `tests/reconciliation/` - Sales/Inventory vs GL checks
- `scripts/run-dbt.sh` - Full dbt pipeline runner
- `scripts/sync-metabase.sh` - dbt-metabase sync script

## Performance

| Operation | Time |
|-----------|------|
| Full pipeline (~68 models, all views) | ~24 seconds |
| fct_general_ledger (11.6M rows) | ~0.5 seconds |
| fct_stock_movements (5.7M rows) | ~0.8 seconds |
| Staging views | <1 second each |

## Related Projects

- **abcfood-clickhouse-sync** - Debezium CDC sync from Odoo PostgreSQL to ClickHouse
- **abcfood-metabase** - Metabase BI tool connecting to the same ClickHouse `dwh` schema

## Environment Variables Management (Vault)

This project uses **centralized encrypted credential management** via `vault` command with SOPS encryption.

- **Vault Location**: `~/Git/dotenvs/`
- **Encrypted Backup**: `abcfood-dbt-model.env.encrypt`
- **GPG Key**: `73E03F83D0E039D39A419375A4E468569E7232B1`
- **Encryption**: SOPS with GPG

### Quick Commands

```bash
# Backup .env to vault
vault encrypt
# Creates: ~/Git/dotenvs/abcfood-dbt-model.env.encrypt

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
- Multi-environment guide: `~/Git/dotenvs/MULTI-ENVIRONMENT.md`
- Backup guide: `~/Git/dotenvs/BACKUP-GUIDE.md`

### Multi-Environment Support

For staging/production environments:

```bash
# Backup staging
# 1. Temporarily rename
mv .env .env.backup
mv .env.staging .env
vault encrypt
# 2. Rename in vault
cd ~/Git/dotenvs
mv abcfood-dbt-model.env.encrypt abcfood-dbt-model.staging.env.encrypt
# 3. Restore original
cd -
mv .env .env.staging
mv .env.backup .env

# Decrypt staging
sops --decrypt --pgp 73E03F83D0E039D39A419375A4E468569E7232B1 \
  --input-type dotenv --output-type dotenv \
  ~/Git/dotenvs/abcfood-dbt-model.staging.env.encrypt > .env.staging
```
