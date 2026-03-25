# PostgreSQL Essentials: Core Concepts and Data Types

Complete guide to PostgreSQL fundamentals, including architecture, data types, and basic operations that form the foundation for enterprise database development.

## PostgreSQL Architecture Overview

### Client-Server Model

```
┌─────────────────┐    TCP/IP     ┌─────────────────┐
│   Client App    │ ◄────────────► │ PostgreSQL Server│
│ (psql, driver) │   Connection   │   (Postmaster)   │
└─────────────────┘               └─────────┬───────┘
                                            │
                                  ┌─────────────▼─────────────┐
                                  │     PostgreSQL Processes  │
                                  │  ┌─────────┐ ┌─────────┐ │
                                  │  │ Backend │ │ Writer  │ │
                                  │  │ Process │ │ Process │ │
                                  │  └─────────┘ └─────────┘ │
                                  │  ┌─────────┐ ┌─────────┐ │
                                  │  │Checker  │ │ Walwriter│ │
                                  │  │ Process │ │ Process │ │
                                  │  └─────────┘ └─────────┘ │
                                  └─────────────────────────┘
```

### Key Components

**1. PostgreSQL Server (Postmaster)**
- Main server process managing connections
- Spawns dedicated backend processes for each client
- Handles authentication and connection management

**2. Backend Processes**
- Execute queries on behalf of clients
- One process per connection
- Isolated memory spaces for security

**3. Shared Memory**
- Shared buffers for data caching
- WAL (Write-Ahead Log) buffers
- Lock information and other shared data

## Data Types Deep Dive

### Numeric Types

```sql
-- Integer types
CREATE TABLE numeric_examples (
    smallint_col SMALLINT,      -- 2 bytes, -32,768 to 32,767
    integer_col INTEGER,        -- 4 bytes, -2,147,483,648 to 2,147,483,647
    bigint_col BIGINT,          -- 8 bytes, large integer values
    decimal_col DECIMAL(10,2), -- User-specified precision
    numeric_col NUMERIC(15,5),  -- Exact numeric with arbitrary precision
    real_col REAL,              -- 4 bytes, single precision floating-point
    double_col DOUBLE PRECISION -- 8 bytes, double precision floating-point
);

-- Auto-incrementing types
CREATE TABLE id_examples (
    id SERIAL PRIMARY KEY,       -- AUTO_INCREMENT equivalent
    big_id BIGSERIAL,           -- Large auto-incrementing ID
    uuid_col UUID DEFAULT gen_random_uuid() -- UUID generation
);

-- Monetary calculations (always use NUMERIC/DECIMAL)
CREATE TABLE financial_data (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(15,2) NOT NULL,
    tax_rate NUMERIC(5,4),
    total_amount NUMERIC(15,2) GENERATED ALWAYS AS (
        amount * (1 + COALESCE(tax_rate, 0)) STORED
    );
```

### Character Types

```sql
-- Character data types
CREATE TABLE text_examples (
    char_col CHAR(10),          -- Fixed-length, space-padded
    varchar_col VARCHAR(255),   -- Variable-length with limit
    text_col TEXT,              -- Variable-length without limit
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Text search capabilities
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || content)
    ) STORED
);

-- Create index for full-text search
CREATE INDEX documents_search_idx ON documents USING GIN (search_vector);
```

### Date/Time Types

```sql
-- Date and time types
CREATE TABLE temporal_examples (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    birth_date DATE,
    appointment_time TIME,
    duration INTERVAL,
    timezone_name VARCHAR(50)
);

-- Date/time functions and operations
INSERT INTO temporal_examples (created_at, birth_date, duration) VALUES
(NOW(), '1990-05-15', INTERVAL '2 hours 30 minutes'),
('2024-01-01 10:00:00 EST', '1985-12-25', INTERVAL '1 day');

-- Date arithmetic
SELECT
    created_at,
    created_at + INTERVAL '7 days' AS next_week,
    EXTRACT(YEAR FROM birth_date) AS birth_year,
    AGE(created_at, birth_date) AS age
FROM temporal_examples;
```

### Boolean and Enum Types

```sql
-- Boolean type
CREATE TABLE status_examples (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true,
    has_permission BOOLEAN,
    is_verified BOOLEAN DEFAULT false
);

-- Custom enum types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE task_management (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status user_status DEFAULT 'pending',
    priority priority_level DEFAULT 'medium',
    completed BOOLEAN DEFAULT false,
    due_date TIMESTAMP WITH TIME ZONE
);
```

### Array Types

```sql
-- Array columns
CREATE TABLE array_examples (
    id SERIAL PRIMARY KEY,
    tags TEXT[],                    -- Array of text
    numbers INTEGER[],               -- Array of integers
    dates DATE[],                    -- Array of dates
    metadata JSONB[],               -- Array of JSON objects
    skill_levels INTEGER[] CHECK (
        array_length(skill_levels, 1) <= 10
    )
);

-- Array operations
INSERT INTO array_examples (tags, numbers, skill_levels) VALUES
(ARRAY['postgresql', 'database', 'sql'], ARRAY[1, 2, 3, 4, 5], ARRAY[3, 4, 5]),
(ARRAY['python', 'machine-learning'], ARRAY[10, 20, 30], ARRAY[8, 9]);

-- Array queries
SELECT
    title,
    tags,
    array_length(tags, 1) AS tag_count,
    unnest(tags) AS individual_tag
FROM array_examples;

-- Array functions
SELECT
    title,
    tags,
    array_position(tags, 'postgresql') AS pg_position,
    array_contains(tags, 'sql') AS has_sql,
    array_append(tags, 'new-tag') AS with_new_tag
FROM array_examples;
```

### JSON/JSONB Types

```sql
-- JSON vs JSONB
CREATE TABLE json_examples (
    id SERIAL PRIMARY KEY,
    config JSON,                    -- Text-based, preserves formatting
    data JSONB,                     -- Binary, indexed, faster operations
    metadata JSONB
);

-- JSONB operations
INSERT INTO json_examples (config, data, metadata) VALUES
('{"name": "test", "value": 123}',
 '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}',
 '{"version": "1.0", "settings": {"theme": "dark", "notifications": true}}');

-- JSONB queries
SELECT
    id,
    data->'users' AS users_array,
    data->>'version' AS version_text,
    data->'settings'->>'theme' AS theme,
    jsonb_typeof(data->'users') AS users_type
FROM json_examples;

-- JSONB functions and operators
SELECT
    id,
    metadata ? 'theme' AS has_theme_key,
    metadata @> '{"version": "1.0"}' AS contains_version,
    metadata #> '{settings,theme}' AS theme_value,
    jsonb_extract_path_text(metadata, 'version') AS version_text
FROM json_examples;

-- JSONB indexes
CREATE INDEX json_data_gin_idx ON json_examples USING GIN (data);
CREATE INDEX json_metadata_path_idx ON json_examples USING GIN (metadata jsonb_path_ops);
```

## Basic SQL Operations

### Creating Databases and Tables

```sql
-- Database creation
CREATE DATABASE myapp_prod
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Connect to database
\c myapp_prod

-- Schema creation
CREATE SCHEMA app;
CREATE SCHEMA analytics;
CREATE SCHEMA IF NOT EXISTS auth;

-- Table creation with constraints
CREATE TABLE app.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_username_check CHECK (LENGTH(username) >= 3)
);

-- Foreign key relationships
CREATE TABLE app.posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id INTEGER NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    published_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT posts_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

-- Composite primary keys
CREATE TABLE app.post_tags (
    post_id INTEGER REFERENCES app.posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES app.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_id, tag_id)
);
```

### Data Manipulation (CRUD)

```sql
-- INSERT with multiple values
INSERT INTO app.users (email, username, password_hash, first_name, last_name) VALUES
('alice@example.com', 'alice', '$2b$12$...', 'Alice', 'Smith'),
('bob@example.com', 'bob', '$2b$12$...', 'Bob', 'Johnson'),
('charlie@example.com', 'charlie', '$2b$12$...', 'Charlie', 'Brown');

-- INSERT with RETURNING clause
INSERT INTO app.posts (title, content, author_id, status)
VALUES ('My First Post', 'This is the content...', 1, 'published')
RETURNING id, created_at;

-- UPDATE with WHERE clause
UPDATE app.users
SET last_login = NOW(), is_active = true
WHERE id = 1;

-- UPDATE with RETURNING
UPDATE app.posts
SET view_count = view_count + 1, updated_at = NOW()
WHERE id = 1
RETURNING view_count;

-- DELETE with CASCADE
DELETE FROM app.posts WHERE author_id = 1;

-- DELETE with RETURNING
DELETE FROM app.users WHERE id = 1 RETURNING email;
```

### Basic Queries

```sql
-- Simple SELECT
SELECT id, email, username, created_at
FROM app.users
WHERE is_active = true;

-- SELECT with conditions
SELECT id, title, status, published_at
FROM app.posts
WHERE status = 'published'
  AND published_at >= '2024-01-01'
ORDER BY published_at DESC
LIMIT 10;

-- SELECT with calculated columns
SELECT
    id,
    title,
    LENGTH(content) AS content_length,
    EXTRACT(MONTH FROM published_at) AS publish_month,
    CASE
        WHEN view_count > 1000 THEN 'Popular'
        WHEN view_count > 100 THEN 'Moderate'
        ELSE 'Low'
    END AS popularity_level
FROM app.posts;

-- SELECT with aggregations
SELECT
    EXTRACT(MONTH FROM published_at) AS month,
    EXTRACT(YEAR FROM published_at) AS year,
    COUNT(*) AS post_count,
    AVG(view_count) AS avg_views,
    MAX(view_count) AS max_views
FROM app.posts
WHERE status = 'published'
GROUP BY month, year
ORDER BY year, month;
```

### Joins and Relationships

```sql
-- INNER JOIN
SELECT
    p.id,
    p.title,
    u.username AS author,
    u.email,
    p.view_count
FROM app.posts p
INNER JOIN app.users u ON p.author_id = u.id
WHERE p.status = 'published';

-- LEFT JOIN with counts
SELECT
    u.id,
    u.username,
    u.email,
    COUNT(p.id) AS post_count,
    COALESCE(SUM(p.view_count), 0) AS total_views
FROM app.users u
LEFT JOIN app.posts p ON u.id = p.author_id AND p.status = 'published'
GROUP BY u.id, u.username, u.email
ORDER BY post_count DESC;

-- Multiple joins
SELECT
    p.id,
    p.title,
    u.username AS author,
    COUNT(pt.tag_id) AS tag_count,
    ARRAY_AGG(t.name) AS tags
FROM app.posts p
INNER JOIN app.users u ON p.author_id = u.id
LEFT JOIN app.post_tags pt ON p.id = pt.post_id
LEFT JOIN app.tags t ON pt.tag_id = t.id
WHERE p.status = 'published'
GROUP BY p.id, p.title, u.username
ORDER BY p.published_at DESC;
```

## Indexing Fundamentals

### Creating Indexes

```sql
-- B-tree index (default, good for equality and range queries)
CREATE INDEX idx_users_email ON app.users(email);
CREATE INDEX idx_posts_published_at ON app.posts(published_at DESC);

-- Unique index
CREATE UNIQUE INDEX idx_users_username ON app.users(username);

-- Composite index
CREATE INDEX idx_posts_author_status ON app.posts(author_id, status);
CREATE INDEX idx_posts_status_published ON app.posts(status, published_at DESC);

-- Partial index (index only subset of rows)
CREATE INDEX idx_active_users ON app.users(id) WHERE is_active = true;
CREATE INDEX idx_published_posts ON app.posts(id, view_count)
WHERE status = 'published';

-- Expression index
CREATE INDEX idx_users_lower_email ON app.users(LOWER(email));
CREATE INDEX idx_posts_title_search ON app.posts(LOWER(title));

-- GIN index for array and JSONB
CREATE INDEX idx_post_tags ON app.posts USING GIN (tags);
CREATE INDEX idx_posts_metadata ON app.posts USING GIN (metadata);
```

### Analyzing Index Usage

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE SELECT * FROM app.users WHERE email = 'alice@example.com';

-- View index statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'app';

-- Unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'app'
  AND idx_scan = 0;
```

## Basic Performance Optimization

### Query Analysis

```sql
-- Explain query execution plan
EXPLAIN SELECT * FROM app.posts WHERE status = 'published';

-- Detailed analysis with actual execution
EXPLAIN ANALYZE SELECT * FROM app.posts WHERE status = 'published';

-- Format for better readability
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT p.*, u.username
FROM app.posts p
JOIN app.users u ON p.author_id = u.id
WHERE p.status = 'published';
```

### Common Performance Issues

```sql
-- Sequential scan problems
EXPLAIN ANALYZE SELECT * FROM large_table WHERE unindexed_column = 'value';

-- Function calls in WHERE clause (prevents index usage)
-- Bad: WHERE LOWER(email) = 'test@example.com'
-- Good: WHERE email = 'Test@Example.com' COLLATE "C"

-- Type conversion issues
-- Bad: WHERE numeric_column = '123'  -- string to number conversion
-- Good: WHERE numeric_column = 123

-- LIKE patterns
-- Bad: WHERE column LIKE '%pattern%'  -- prevents index usage
-- Good: WHERE column LIKE 'pattern%'   -- can use index
```

## Transaction Basics

### Transaction Control

```sql
-- Begin transaction
BEGIN;

-- Multiple operations
INSERT INTO app.posts (title, content, author_id)
VALUES ('New Post', 'Content here...', 1);

UPDATE app.users
SET last_login = NOW()
WHERE id = 1;

-- Commit or rollback
COMMIT;  -- or ROLLBACK;

-- Transaction with savepoints
BEGIN;
UPDATE app.posts SET view_count = view_count + 1 WHERE id = 1;
SAVEPOINT sp1;
UPDATE app.posts SET title = 'Updated Title' WHERE id = 1;
-- Rollback to savepoint if needed
ROLLBACK TO sp1;
COMMIT;
```

### Isolation Levels

```sql
-- Set transaction isolation level
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Transaction block with specific isolation
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT * FROM app.posts WHERE id = 1;
-- Other transaction can't modify this row until COMMIT
COMMIT;
```

## Connection and Configuration Basics

### Connection Parameters

```sql
-- Check current connection settings
SELECT
    current_database(),
    current_user,
    inet_server_addr(),
    inet_server_port(),
    version();

-- View configuration parameters
SHOW ALL;
SHOW shared_buffers;
SHOW work_mem;

-- Set session parameters
SET work_mem = '64MB';
SET enable_seqscan = off;
```

### Basic Configuration

```sql
-- Important configuration parameters
-- shared_buffers: 25% of RAM (for dedicated database server)
-- work_mem: Memory for sorting and hash operations
-- maintenance_work_mem: Memory for maintenance operations (VACUUM, CREATE INDEX)
-- effective_cache_size: Estimate of system cache size
-- random_page_cost: Cost of non-sequential disk page fetch
-- checkpoint_completion_target: Percentage of checkpoint time to spread writes

-- View current settings
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name IN (
    'shared_buffers', 'work_mem', 'maintenance_work_mem',
    'effective_cache_size', 'random_page_cost'
);
```

This PostgreSQL essentials guide provides the foundation for understanding PostgreSQL's architecture, data types, and basic operations. Master these concepts before moving to advanced topics like performance optimization, high availability, and complex application integration patterns.