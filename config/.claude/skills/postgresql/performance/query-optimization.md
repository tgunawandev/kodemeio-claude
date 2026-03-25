# PostgreSQL Performance Optimization

Comprehensive guide to PostgreSQL performance tuning, including query optimization, indexing strategies, configuration tuning, and monitoring for enterprise database applications.

## Understanding Query Execution Plans

### EXPLAIN ANALYZE Fundamentals

```sql
-- Basic execution plan analysis
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT p.id, p.title, u.username, COUNT(c.id) as comment_count
FROM posts p
JOIN users u ON p.author_id = u.id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.status = 'published'
  AND p.created_at >= '2024-01-01'
GROUP BY p.id, p.title, u.username
ORDER BY comment_count DESC
LIMIT 10;

-- Detailed plan analysis with timing
EXPLAIN (ANALYZE, VERBOSE, COSTS OFF, BUFFERS)
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.total > 1000
  AND o.created_at BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY o.total DESC;

-- Understanding key metrics from EXPLAIN ANALYZE
SELECT
    query,
    execution_time_ms,
    planning_time_ms,
    total_cost,
    actual_rows,
    loops
FROM (
    VALUES (
        'Sequential Scan',
        45.6,
        0.2,
        0.25,
        50000,
        1
    )
) AS plans(query, execution_time_ms, planning_time_ms, total_cost, actual_rows, loops);
```

### Common Performance Issues

```sql
-- Identify slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 100  -- queries taking more than 100ms on average
ORDER BY mean_time DESC
LIMIT 10;

-- Find tables with high I/O
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    heap_blks_read,
    idx_blks_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_scan DESC;

-- Identify missing indexes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE correlation < 0.1  -- Low correlation indicates potential for index
ORDER BY correlation;
```

## Indexing Strategies

### B-Tree Indexes

```sql
-- Basic B-tree indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_author_id ON posts(author_id);

-- Composite indexes for multi-column queries
CREATE INDEX idx_posts_author_status ON posts(author_id, status);
CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at DESC);

-- Partial indexes for frequently filtered subsets
CREATE INDEX idx_active_users ON users(id) WHERE is_active = true;
CREATE INDEX idx_published_posts ON posts(id) WHERE status = 'published';
CREATE INDEX idx_high_value_orders ON orders(id) WHERE total > 1000;

-- Expression indexes for computed values
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
CREATE INDEX idx_posts_title_search ON posts(LOWER(title));
CREATE INDEX idx_users_age_category ON users(
    EXTRACT(YEAR FROM birthdate),
    category
);

-- Covering indexes (include additional columns)
CREATE INDEX idx_posts_covering ON posts(author_id, status) INCLUDE (title, created_at);
CREATE INDEX idx_orders_customer_covering ON orders(customer_id, created_at)
INCLUDE (total, status);

-- Index usage analysis
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Specialized Index Types

```sql
-- GIN indexes for array and JSONB data
CREATE INDEX idx_post_tags ON posts USING GIN (tags);
CREATE INDEX idx_documents_metadata ON documents USING GIN (metadata);
CREATE INDEX idx_users_permissions ON users USING GIN (permissions);

-- GIN indexes with specific operators
CREATE INDEX idx_documents_metadata_path ON documents USING GIN (metadata jsonb_path_ops);

-- BRIN indexes for time-series or large sequential data
CREATE INDEX idx_measurements_timestamp ON measurements USING BRIN (timestamp);
CREATE INDEX idx_logs_created_at ON logs USING BRIN (created_at);

-- Hash indexes for equality comparisons (rarely used)
CREATE INDEX idx_sessions_token ON sessions USING HASH (token);

-- GiST indexes for geometric or full-text search
CREATE INDEX idx_products_location ON products USING GIST (location);
CREATE INDEX idx_articles_content ON articles USING GIST (to_tsvector('english', content));

-- SP-GiST indexes for partitioned indexes
CREATE INDEX idx_users_email_spgist ON users USING SP-GIST (email);
```

### Index Maintenance

```sql
-- Analyze table statistics
ANALYZE posts;
ANALYZE orders;

-- Rebuild indexes
REINDEX INDEX CONCURRENTLY idx_posts_author_id;
REINDEX TABLE CONCURRENTLY posts;

-- Check index bloat
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size(indexrelid) - pg_relation_size(indrelid)) AS bloat_size
FROM pg_stat_user_indexes sui
JOIN pg_index pi ON sui.indexrelid = pi.indexrelid
JOIN pg_class pc ON pi.indrelid = pc.oid
WHERE pg_relation_size(indexrelid) > pg_relation_size(indrelid) * 1.2
ORDER BY (pg_relation_size(indexrelid) - pg_relation_size(indrelid)) DESC;

-- Index fragmentation analysis
SELECT
    schemaname,
    tablename,
    indexname,
    pg_stat_get_index_pages(indexrelid) AS pages,
    pg_stat_get_index_tuples(indexrelid) AS tuples,
    (pg_stat_get_index_tuples(indexrelid)::NUMERIC / pg_stat_get_index_pages(indexrelid)) AS tuples_per_page
FROM pg_stat_user_indexes;
```

## Query Optimization Techniques

### JOIN Optimization

```sql
-- Suboptimal query (cartesian product)
SELECT p.title, u.username, COUNT(c.id) as comment_count
FROM posts p, users u, comments c
WHERE p.author_id = u.id
  AND c.post_id = p.id
GROUP BY p.id, p.title, u.username;

-- Optimized with proper JOIN syntax
SELECT p.title, u.username, COUNT(c.id) as comment_count
FROM posts p
INNER JOIN users u ON p.author_id = u.id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.status = 'published'
GROUP BY p.id, p.title, u.username;

-- EXISTS vs IN optimization
-- Use EXISTS for subqueries with good selectivity
SELECT p.id, p.title
FROM posts p
WHERE EXISTS (
    SELECT 1 FROM comments c
    WHERE c.post_id = p.id
    AND c.created_at >= '2024-01-01'
);

-- Use IN for small result sets
SELECT p.id, p.title
FROM posts p
WHERE p.author_id IN (
    SELECT id FROM users WHERE role = 'admin'
);

-- LATERAL JOIN for correlated subqueries
SELECT
    u.id,
    u.username,
    latest_post.title,
    latest_post.created_at
FROM users u
LEFT JOIN LATERAL (
    SELECT p.title, p.created_at
    FROM posts p
    WHERE p.author_id = u.id
    ORDER BY p.created_at DESC
    LIMIT 1
) latest_post ON true;

-- CTE optimization with materialization
WITH RECURSIVE category_hierarchy AS (
    -- Base case
    SELECT id, name, parent_id, ARRAY[name] as path, 0 as level
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case
    SELECT
        c.id,
        c.name,
        c.parent_id,
        ch.path || c.name,
        ch.level + 1
    FROM categories c
    JOIN category_hierarchy ch ON c.parent_id = ch.id
)
SELECT * FROM category_hierarchy;

-- Optimized with materialized view
CREATE MATERIALIZED VIEW mv_category_hierarchy AS
WITH RECURSIVE category_hierarchy AS (
    SELECT id, name, parent_id, ARRAY[name] as path, 0 as level
    FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, c.parent_id, ch.path || c.name, ch.level + 1
    FROM categories c JOIN category_hierarchy ch ON c.parent_id = ch.id
)
SELECT * FROM category_hierarchy;

CREATE UNIQUE INDEX idx_mv_category_hierarchy_id ON mv_category_hierarchy(id);
```

### Window Function Optimization

```sql
-- Optimized ranking with proper indexing
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);

WITH ranked_posts AS (
    SELECT
        id,
        title,
        author_id,
        view_count,
        ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY view_count DESC) AS rank
    FROM posts
    WHERE status = 'published'
)
SELECT p.id, p.title, p.view_count, u.username
FROM ranked_posts p
JOIN users u ON p.author_id = u.id
WHERE p.rank <= 5;

-- Efficient sliding window calculations
CREATE INDEX idx_analytics_timestamp ON analytics(timestamp DESC);

SELECT
    timestamp,
    value,
    AVG(value) OVER (
        ORDER BY timestamp
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7_days,
    SUM(value) OVER (
        ORDER BY timestamp
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS moving_sum_30_days
FROM analytics
ORDER BY timestamp DESC;
```

### JSONB Query Optimization

```sql
-- Optimize JSONB queries with proper indexing
CREATE INDEX idx_documents_metadata_gin ON documents USING GIN (metadata);
CREATE INDEX idx_documents_metadata_path ON documents USING GIN (metadata jsonb_path_ops);

-- Efficient JSONB path queries
SELECT id, title
FROM documents
WHERE metadata @> '{"type": "article", "status": "published"}'
  AND metadata ->> 'author' = 'John Doe';

-- Use jsonb_path_query for complex queries
SELECT id, title
FROM documents
WHERE jsonb_path_query_first(
    metadata,
    '$.tags[*] ? (@ == "database")'
) IS NOT NULL;

-- Partial JSONB indexes for specific paths
CREATE INDEX idx_documents_user_id ON documents USING BTREE ((metadata ->> 'user_id'));
CREATE INDEX idx_documents_created_at ON documents USING BTREE ((metadata ->> 'created_at'));

-- Optimize JSONB array queries
SELECT id, title
FROM products
WHERE product_data -> 'categories' @> '["electronics", "computers"]'
  AND product_data -> 'specifications' ->> 'warranty_years'::NUMERIC >= 2;
```

## Configuration Tuning

### Memory Configuration

```sql
-- Current configuration analysis
SELECT
    name,
    setting,
    unit,
    short_desc,
    CASE
        WHEN name LIKE '%mem%' OR name LIKE '%buffer%' THEN 'Memory'
        WHEN name LIKE '%connection%' OR name LIKE '%worker%' THEN 'Connection'
        WHEN name LIKE '%vacuum%' OR name LIKE '%autovacuum%' THEN 'Maintenance'
        WHEN name LIKE '%wal%' THEN 'WAL'
        ELSE 'General'
    END as category
FROM pg_settings
WHERE name IN (
    'shared_buffers',
    'work_mem',
    'maintenance_work_mem',
    'effective_cache_size',
    'random_page_cost',
    'seq_page_cost',
    'cpu_tuple_cost',
    'effective_io_concurrency',
    'max_connections',
    'superuser_reserved_connections',
    'autovacuum_max_workers',
    'autovacuum_naptime',
    'vacuum_cost_delay',
    'vacuum_cost_limit',
    'wal_buffers',
    'checkpoint_completion_target',
    'max_wal_size',
    'wal_writer_delay'
)
ORDER BY category, name;

-- Memory usage analysis
SELECT
    pg_size_pretty(shared_buffers * 8192) AS shared_buffers_size,
    pg_size_pretty(wal_buffers * 8192) AS wal_buffers_size,
    pg_size_pretty(work_mem * 1024) AS work_mem_per_connection,
    pg_size_pretty(maintenance_work_mem * 1024) AS maintenance_work_mem_size
FROM (
    SELECT setting::integer
    FROM pg_settings
    WHERE name = 'shared_buffers'
) sb,
(
    SELECT setting::integer
    FROM pg_settings
    WHERE name = 'wal_buffers'
) wb,
(
    SELECT setting::integer
    FROM pg_settings
    WHERE name = 'work_mem'
) wm,
(
    SELECT setting::integer
    FROM pg_settings
    WHERE name = 'maintenance_work_mem'
) mwm;
```

### Connection Management

```sql
-- Connection pool configuration
SELECT
    name,
    setting,
    short_desc
FROM pg_settings
WHERE name IN (
    'max_connections',
    'superuser_reserved_connections',
    'max_prepared_transactions',
    'lock_timeout',
    'idle_in_transaction_session_timeout',
    'statement_timeout',
    'tcp_keepalives_idle',
    'tcp_keepalives_interval',
    'tcp_keepalives_count'
);

-- Connection monitoring
SELECT
    datname AS database_name,
    count(*) AS active_connections,
    count(*) FILTER (WHERE state = 'active') AS active_queries,
    count(*) FILTER (WHERE state = 'idle') AS idle_connections
FROM pg_stat_activity
GROUP BY datname
ORDER BY active_connections DESC;

-- Long-running queries
SELECT
    pid,
    now() - query_start AS duration,
    query,
    state,
    wait_event_type,
    wait_event
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > INTERVAL '1 minute'
ORDER BY duration DESC;
```

### Vacuum and Autovacuum Tuning

```sql
-- Autovacuum configuration
SELECT
    name,
    setting,
    short_desc
FROM pg_settings
WHERE name LIKE '%autovacuum%'
   OR name LIKE '%vacuum%'
ORDER BY name;

-- Table bloat analysis
CREATE OR REPLACE FUNCTION table_bloat_percentage(table_name TEXT)
RETURNS TABLE (
    table_name TEXT,
    total_size BIGINT,
    table_size BIGINT,
    bloat_size BIGINT,
    bloat_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_size_bytes BIGINT;
    table_size_bytes BIGINT;
    bloat_size_bytes BIGINT;
BEGIN
    EXECUTE format('SELECT pg_total_relation_size(%L), pg_relation_size(%L)',
                   table_name, table_name)
    INTO total_size_bytes, table_size_bytes;

    bloat_size_bytes := total_size_bytes - table_size_bytes;

    RETURN QUERY
    SELECT
        table_name,
        total_size_bytes,
        table_size_bytes,
        bloat_size_bytes,
        CASE
            WHEN total_size_bytes > 0 THEN
                (bloat_size_bytes::NUMERIC / total_size_bytes) * 100
            ELSE 0
        END as bloat_percentage;
END;
$$;

-- Check table bloat
SELECT * FROM table_bloat_percentage('posts');
SELECT * FROM table_bloat_percentage('orders');

-- Vacuum monitoring
SELECT
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    vacuum_count,
    autovacuum_count,
    analyze_count,
    autoanalyze_count
FROM pg_stat_user_tables
ORDER BY last_autovacuum;
```

## Monitoring and Maintenance

### Performance Monitoring

```sql
-- Query performance statistics
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS cache_hit_rate
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Table access patterns
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- Lock monitoring
SELECT
    pid,
    relation::regclass AS table_name,
    mode,
    locktype,
    granted,
    query_start,
    age(now(), query_start) AS lock_duration,
    query
FROM pg_locks
JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
WHERE NOT granted
ORDER BY lock_duration DESC;
```

### Automated Maintenance Scripts

```sql
-- Function to analyze table bloat and suggest actions
CREATE OR REPLACE FUNCTION analyze_table_health(table_name_param TEXT)
RETURNS TABLE (
    table_name TEXT,
    total_size TEXT,
    bloat_percentage NUMERIC,
    dead_tuple_percentage NUMERIC,
    recommended_action TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_size_bytes BIGINT;
    dead_tuples BIGINT;
    live_tuples BIGINT;
    bloat_pct NUMERIC;
    dead_tuple_pct NUMERIC;
    action TEXT;
BEGIN
    -- Get table statistics
    SELECT pg_total_relation_size(table_name_param),
           n_dead_tup,
           n_live_tup
    INTO total_size_bytes, dead_tuples, live_tuples
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND tablename = table_name_param;

    -- Calculate percentages
    IF live_tuples + dead_tuples > 0 THEN
        dead_tuple_pct := (dead_tuples::NUMERIC / (live_tuples + dead_tuples)) * 100;
    ELSE
        dead_tuple_pct := 0;
    END IF;

    -- Estimate bloat (simplified)
    bloat_pct := CASE
        WHEN dead_tuple_pct > 20 THEN 30
        WHEN dead_tuple_pct > 10 THEN 15
        WHEN dead_tuple_pct > 5 THEN 8
        ELSE 5
    END;

    -- Determine recommended action
    IF dead_tuple_pct > 25 THEN
        action := 'VACUUM ANALYZE needed immediately';
    ELSIF dead_tuple_pct > 15 THEN
        action := 'Schedule VACUUM ANALYZE soon';
    ELSIF dead_tuple_pct > 5 THEN
        action := 'Monitor for future maintenance';
    ELSE
        action := 'No action needed';
    END IF;

    RETURN QUERY
    SELECT
        table_name_param,
        pg_size_pretty(total_size_bytes),
        bloat_pct,
        dead_tuple_pct,
        action;
END;
$$;

-- Usage
SELECT * FROM analyze_table_health('posts');
SELECT * FROM analyze_table_health('orders');
```

This performance optimization guide provides comprehensive techniques for monitoring, analyzing, and improving PostgreSQL database performance. Implement these strategies to ensure your database operates at peak efficiency for enterprise applications.