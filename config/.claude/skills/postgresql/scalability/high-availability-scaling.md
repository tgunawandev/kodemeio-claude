# PostgreSQL High Availability and Scaling

Comprehensive guide to PostgreSQL high availability, replication, partitioning, sharding, and scaling strategies for enterprise applications.

## High Availability Architecture Overview

### HA Architecture Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                          │
│                    (HAProxy / DNS Round Robin)                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────▼─────────────┐
        │   Connection Pooling       │
        │     (PgBouncer)             │
        └─────────────┬─────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                                   │
┌───▼───┐                         ┌───▼───┐                         ┌───▼───┐
│Primary│───────Replication───────▶│Standby│───────Replication───────▶│Standby│
│Server│                       │Server│                       │Server│
│(Master│                       │(Sync) │                       │(Async) │
│Node)  │                       │Node   │                       │Node   │
└───────┘                       └───────┘                       └───────┘
```

## Replication Setup

### Streaming Replication

```sql
-- On primary server (master)
-- Enable replication in postgresql.conf
-- postgresql.conf
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
synchronous_commit = on
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'

-- pg_hba.conf (allow replication)
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    replication     replicator      10.0.0.0/0               md5

-- Create replication user
CREATE USER replicator WITH REPLICATION LOGIN ENCRYPTED PASSWORD 'strong_password';

-- Get base backup
SELECT pg_start_backup('backup_label');

-- Backup primary data directory
$ pg_basebackup -h localhost -D /var/lib/postgresql/data -U replicator -v -P -W -R

-- Stop backup
SELECT pg_stop_backup();
```

```bash
#!/bin/bash
# replica_setup.sh - Setup PostgreSQL replica

# Environment variables
PRIMARY_HOST="10.0.0.10"
REPLICA_USER="replicator"
REPLICA_PASSWORD="strong_password"
REPLICA_DATA_DIR="/var/lib/postgresql/data"

# Stop PostgreSQL service
sudo systemctl stop postgresql

# Remove existing data directory (if any)
sudo rm -rf $REPLICA_DATA_DIR/*

# Take base backup from primary
pg_basebackup -h $PRIMARY_HOST -D $REPLICA_DATA_DIR -U $REPLICA_USER -v -P -W

# Create recovery.conf
cat > $REPLICA_DATA_DIR/recovery.conf << EOF
standby_mode = 'on'
primary_conninfo = 'host=$PRIMARY_HOST port=5432 user=$REPLICA_USER password=$REPLICA_PASSWORD'
recovery_target_timeline = 'latest'
EOF

# Set proper permissions
sudo chown -R postgres:postgres $REPLICA_DATA_DIR
sudo chmod 700 $REPLICA_DATA_DIR

# Start PostgreSQL replica
sudo systemctl start postgresql
```

### Logical Replication

```sql
-- On primary server
-- Enable logical replication
-- postgresql.conf
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
shared_preload_libraries = 'pglogical'

-- Create publication
CREATE PUBLICATION app_publication FOR ALL TABLES;

-- Create publication for specific tables
CREATE PUBLICATION users_publication FOR TABLE users, profiles, posts;

-- Create publication with row filtering
CREATE PUBLICATION active_users_publication
FOR TABLE users WHERE (is_active = true);
```

```sql
-- On replica server
-- Create subscription
CREATE SUBSCRIPTION app_subscription
CONNECTION 'host=primary-hostname dbname=appdb user=replicator password=password'
PUBLICATION app_publication;

-- Create subscription for specific publication
CREATE SUBSCRIPTION users_subscription
CONNECTION 'host=primary-hostname dbname=appdb user=replicator password=password'
PUBLICATION users_publication;

-- Create subscription with table list
CREATE SUBSCRIPTION selective_subscription
CONNECTION 'host=primary-hostname dbname=appdb user=replicator password=password'
PUBLICATION app_publication
WITH (publication_names = ARRAY['users', 'profiles']);
```

### Replication Monitoring

```sql
-- Check replication status
SELECT
    application_name,
    client_addr,
    state,
    sync_state,
    reply_time,
    write_lag
FROM pg_stat_replication;

-- Monitor replication slots
SELECT
    slot_name,
    plugin,
    slot_type,
    database,
    active,
    pg_size_pretty(pg_total_relation_size(slot_name::regclass)) AS slot_size
FROM pg_replication_slots;

-- WAL sender status
SELECT
    pid,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    write_lag,
    replay_lag,
    sync_priority
FROM pg_stat_replication;

-- Get replication lag information
SELECT
    EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS replay_lag_seconds,
    pg_last_xact_replay_timestamp,
    pg_is_in_recovery()
FROM pg_stat_database;
```

## Partitioning Strategies

### Range Partitioning

```sql
-- Create partitioned table
CREATE TABLE orders (
    id BIGSERIAL,
    customer_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (order_date);

-- Create partitions (yearly partitions)
CREATE TABLE orders_2022 PARTITION OF orders
    FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');

CREATE TABLE orders_2023 PARTITION OF orders
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE orders_2024 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Future partitions
CREATE TABLE orders_2025 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Create indexes on partitioned table
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_order_date ON orders (order_date);
CREATE INDEX idx_orders_status ON orders (status);
```

### List Partitioning

```sql
-- Create partitioned table for categories
CREATE TABLE products (
    id SERIAL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY LIST (category);

-- Create partitions for each category
CREATE TABLE products_electronics PARTITION OF products
    FOR VALUES IN ('Electronics');

CREATE TABLE products_clothing PARTITION OF products
    FOR VALUES IN ('Clothing');

CREATE TABLE products_books PARTITION OF products
    FOR VALUES IN ('Books');

CREATE TABLE products_home_garden PARTITION OF products
    FOR VALUES IN ('Electronics', 'Clothing', 'Books', 'Home & Garden');
```

### Hash Partitioning

```sql
-- Create hash partitioned table for high-cardinality data
CREATE TABLE user_sessions (
    id BIGSERIAL,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    session_data JSONB
) PARTITION BY HASH (user_id);

-- Create 8 hash partitions
CREATE TABLE user_sessions_part_0 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 0);

CREATE TABLE user_sessions_part_1 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 1);

CREATE TABLE user_sessions_part_2 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 2);

CREATE TABLE user_sessions_part_3 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 3);

CREATE TABLE user_sessions_part_4 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 4);

CREATE TABLE user_sessions_part_5 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 5);

CREATE TABLE user_sessions_part_6 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 6);

CREATE TABLE user_sessions_part_7 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 8, REMAINDER 7);
```

### Composite Partitioning

```sql
-- Multi-level partitioning (range + hash)
CREATE TABLE event_logs (
    id BIGSERIAL,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_data JSONB,
    metadata TEXT
) PARTITION BY RANGE (created_at);

-- Create yearly partitions
CREATE TABLE event_logs_2024 PARTITION OF event_logs
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01')
    PARTITION BY HASH (user_id);

-- Sub-partitions within yearly partition
CREATE TABLE event_logs_2024_part_0 PARTITION OF event_logs_2024
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE event_logs_2024_part_1 PARTITION OF event_logs_2024
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);

CREATE TABLE event_logs_2024_part_2 PARTITION OF event_logs_2024
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);

CREATE TABLE event_logs_2024_part_3 PARTITION OF event_logs_2024
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### Partition Management

```sql
-- Function to create new partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partitions(
    table_name TEXT,
    months_ahead INTEGER DEFAULT 12
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..months_ahead LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');

        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L);',
                       partition_name, table_name, start_date, end_date);

        RAISE NOTICE 'Created partition % for %', partition_name, start_date;
    END LOOP;
END;
$$;

-- Create monthly partitions for orders table
SELECT create_monthly_partitions('orders', 24);

-- Function to drop old partitions
CREATE OR REPLACE FUNCTION drop_old_partitions(
    table_name TEXT,
    months_to_keep INTEGER DEFAULT 12
)
RETURNS TABLE (
    partition_name TEXT,
    dropped BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    cutoff_date DATE;
    partition_name TEXT;
    drop_count INTEGER := 0;
BEGIN
    cutoff_date := date_trunc('month', CURRENT_DATE - (months_to_keep || ' months')::INTERVAL);

    RETURN QUERY
    WITH partitions_to_drop AS (
        SELECT schemaname || '.' || tablename AS partition_name
        FROM pg_tables
        WHERE tablename ~ '^' || table_name || '_\d{4}_\d{2}$'
          AND tablename < (table_name || '_' || to_char(cutoff_date, 'YYYY_MM'))
          AND schemaname = 'public'
    )
    SELECT
        pd.partition_name,
        false
    FROM partitions_to_drop pd;

    -- Note: Actual dropping should be done manually with proper backup
    -- FOR rec IN SELECT partition_name FROM partitions_to_drop LOOP
    --     EXECUTE 'DROP TABLE IF EXISTS ' || rec.partition_name;
    --     drop_count := drop_count + 1;
    -- END LOOP;
END;
$$;

-- Identify old partitions
SELECT * FROM drop_old_partitions('orders', 12);
```

## Sharding with Citus

### Citus Installation and Setup

```bash
# Install Citus on Ubuntu/Debian
wget https://github.com/citusdata/citus/releases/download/v12.1.1/citus-12.1.1-pgdg-pgdg.list
sudo mv citus-12.1.1-pgdg-pgdg.list /etc/apt/sources.list.d/
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y postgresql-12-citus

# Enable Citus on coordinator node
sudo -u postgres psql -c "CREATE EXTENSION citus;"

# Add worker nodes
sudo -u postgres psql -c "SELECT master_add_node('worker1-host', 5432);"
sudo -u postgres psql -c "SELECT master_add_node('worker2-host', 5432);"
```

### Distributed Tables

```sql
-- Enable Citus extension
CREATE EXTENSION citus;

-- Create distributed tables
SELECT create_distributed_table('orders', 'id');
SELECT create_distributed_table('users', 'id');
SELECT create_distributed_table('products', 'id');

-- Create reference tables (not distributed)
SELECT create_reference_table('categories');
SELECT create_reference_table('order_status');
```

### Shard Distribution

```sql
-- Shard users by ID
SELECT create_distributed_table('users', 'id', 'hash');

-- Shard orders by customer_id (colocated with users)
SELECT create_distributed_table('orders', 'customer_id', 'hash', 'users');

-- Shard time-series data by timestamp
SELECT create_distributed_table('analytics_events', 'created_at', 'range');

-- Create distributed table with specific distribution column
SELECT create_distributed_table('user_activity', 'user_id', 'hash', 'colocate_with', 'users');
```

### Citus Optimization

```sql
-- Configure shard count
SELECT set_default_shard_count(16);

-- Enable distributed joins optimization
SET citus.enable_repartition_joins = ON;

-- Configure co-location
SELECT create_distributed_table('orders', 'customer_id', 'hash', 'colocate_with', 'users');
SELECT create_distributed_table('order_items', 'order_id', 'hash', 'colocate_with', 'orders');

-- Monitor shard distribution
SELECT
    table_name,
    shard_name,
    size,
    table_size,
    pg_size_pretty(table_size)
FROM pg_dist_shard
ORDER BY table_size DESC;

-- Rebalance shards if needed
SELECT rebalance_table_shards('orders');
```

## Connection Pooling

### PgBouncer Configuration

```bash
# Install PgBouncer
sudo apt-get install pgbouncer

# PgBouncer configuration file (/etc/pgbouncer/pgbouncer.ini)
cat > /etc/pgbouncer/pgbouncer.ini << EOF
[databases]
# Connection string format
# host=127.0.0.1 port=5432 dbname=myapp
* = host=localhost port=5432

[pgbouncer]
# Connection settings
listen_port = 6432
listen_addr = 127.0.0.1
unix_socket_dir = /var/run/postgresql

# Pool settings
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5
max_db_connections = 50
max_user_connections = 50

# Server settings
server_reset_query = DISCARD ALL; SET SESSION AUTHORIZATION DEFAULT
server_check_delay = 30
server_check_query = select 1
server_lifetime = 3600
server_idle_timeout = 600

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60
EOF
```

### PgBouncer Users

```bash
# PgBouncer users file (/etc/pgbouncer/userlist.txt)
cat > /etc/pgbouncer/userlist.txt << EOF
"pgbouncer" "md5password"
"app_user" "md5password"
"readonly_user" "md5password"
EOF

# Generate MD5 passwords
echo "app_user" | md5sum
# Output will be like: md5password = md5('app_user'password')

# Add users to PgBouncer
echo '"app_user" "5f4dcc3b5aa765d61d8327deb882cf99"' >> /etc/pgbouncer/userlist.txt
```

### PgBouncer Monitoring

```sql
-- Show pool statistics
SHOW POOLS;

-- Show server connections
SHOW SERVERS;

-- Show client connections
SHOW CLIENTS;

-- Show lists
SHOW LISTS;

-- Detailed pool information
SELECT
    database,
    pool_mode,
    total_connections,
    active_connections,
    waiting_clients,
    total_requests,
    total_received,
    total_sent,
    total_query_time
FROM pg_stat_pools
ORDER BY total_query_time DESC;
```

## Load Balancing

### HAProxy Configuration

```bash
# HAProxy configuration for PostgreSQL
cat > /etc/haproxy/haproxy.cfg << EOF
global
    log /dev/log    local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    timeout http-request 10s
    timeout queue 1m
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

listen stats
    bind *:8080
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE

frontend pgbouncer_frontend
    bind *:5432
    default_backend pgbouncer_backend
    option httpchk GET /healthz
    timeout client 1h
    timeout server 1h

backend pgbouncer_backend
    balance roundrobin
    option httpchk GET /healthz
    server pgbouncer1 127.0.0.1:6432 check
    server pgbouncer2 127.0.0.1:6433 check

frontend postgres_frontend
    bind *:5434
    default_backend postgres_backend
    option httpchk GET /healthz
    timeout client 1h
    timeout server 1h

backend postgres_backend
    balance roundrobin
    option httpchk GET /healthz
    server primary 10.0.0.10:5432 check backup
    server replica1 10.0.0.11:5432 check
    server replica2 10.0.0.12:5432 check
EOF

# Start HAProxy
sudo systemctl start haproxy
sudo systemctl enable haproxy
```

### DNS Round Robin

```bash
# Configure DNS for multiple PostgreSQL instances
# /etc/bind/db.example.com.zone
$TTL 86400
@   IN  SOA  ns1.example.com. admin.example.com. (
        2024011501 7200 3600 1209600 86400
    )
    IN  NS  ns1.example.com.
    IN  NS  ns2.example.com.

; Round robin for PostgreSQL nodes
postgres IN  A  10.0.0.10
postgres IN  A 10.0.0.11
postgres IN  A 10.0.0.12

; Separate hostnames for master and replicas
primary   IN  A  10.0.0.10
replica1  IN  A 10.0.0.11
replica2  IN  A 10.0.0.12
```

## Disaster Recovery

### Backup Strategies

```bash
#!/bin/bash
# backup_postgres.sh - Comprehensive backup script

# Configuration
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
COMPRESSION="gzip"
ENCRYPTION_KEY="your-encryption-key"

# Create backup directory
mkdir -p $BACKUP_DIR

# Get timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql"

# Take consistent backup
pg_dumpall -U postgres -h localhost -p 5432 --clean --if-exists > $BACKUP_FILE

# Compress backup
if [ "$COMPRESSION" = "gzip" ]; then
    gzip $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE}.gz"
fi

# Encrypt backup
if [ -n "$ENCRYPTION_KEY" ]; then
    openssl enc -aes-256-cbc -salt -in $BACKUP_FILE -out "${BACKUP_FILE}.enc" -pass pass:$ENCRYPTION_KEY
    rm $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE}.enc"
fi

# Cleanup old backups
find $BACKUP_DIR -name "postgres_backup_*.sql*" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
```

### Point-in-Time Recovery (PITR)

```sql
-- Enable continuous archiving
-- postgresql.conf
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
archive_cleanup_command = '/usr/local/bin/cleanup_archive.sh %p %r'

-- Create restore point
SELECT pg_create_restore_point('before_major_update');

-- List restore points
SELECT * FROM pg_restorepoints;

-- Restore to specific point
-- Stop PostgreSQL service
sudo systemctl stop postgresql

# Copy necessary WAL files
cp /var/lib/postgresql/archive/00000001000000000000000.00000028.backup /var/lib/postgresql/pg_wal/

# Configure recovery.conf
cat > /var/lib/postgresql/recovery.conf << EOF
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_name = 'before_major_update'
recovery_target_time = '2024-01-15 10:30:00 UTC'
EOF

# Start PostgreSQL
sudo systemctl start postgresql
```

This high availability and scaling guide provides comprehensive strategies for building resilient PostgreSQL architectures that can handle enterprise-level workloads and provide continuous availability for critical applications.