# SQL and PL/pgSQL Mastery

Complete guide to advanced SQL operations, PL/pgSQL programming, stored procedures, triggers, and functions for enterprise database development.

## Advanced SQL Query Patterns

### Window Functions

```sql
-- Row numbering functions
SELECT
    id,
    title,
    view_count,
    ROW_NUMBER() OVER (ORDER BY view_count DESC) AS row_num,
    RANK() OVER (ORDER BY view_count DESC) AS rank_num,
    DENSE_RANK() OVER (ORDER BY view_count DESC) AS dense_rank,
    NTILE(4) OVER (ORDER BY view_count DESC) AS quartile
FROM app.posts
WHERE status = 'published';

-- Partitioned window functions
SELECT
    id,
    title,
    author_id,
    view_count,
    ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY view_count DESC) AS author_rank,
    LAG(view_count, 1) OVER (PARTITION BY author_id ORDER BY published_at) AS prev_views,
    LEAD(view_count, 1) OVER (PARTITION BY author_id ORDER BY published_at) AS next_views
FROM app.posts
WHERE status = 'published';

-- Moving averages and running totals
SELECT
    published_at,
    view_count,
    AVG(view_count) OVER (
        ORDER BY published_at
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7_days,
    SUM(view_count) OVER (
        ORDER BY published_at
        ROWS UNBOUNDED PRECEDING
    ) AS running_total
FROM app.posts
WHERE status = 'published'
ORDER BY published_at;

-- FIRST_VALUE and LAST_VALUE
SELECT DISTINCT
    author_id,
    FIRST_VALUE(title) OVER (
        PARTITION BY author_id
        ORDER BY view_count DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS most_popular_post,
    LAST_VALUE(title) OVER (
        PARTITION BY author_id
        ORDER BY view_count DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS least_popular_post
FROM app.posts
WHERE status = 'published';
```

### Common Table Expressions (CTEs)

```sql
-- Basic CTE for complex queries
WITH author_stats AS (
    SELECT
        author_id,
        COUNT(*) AS post_count,
        SUM(view_count) AS total_views,
        AVG(view_count) AS avg_views
    FROM app.posts
    WHERE status = 'published'
    GROUP BY author_id
),
author_info AS (
    SELECT
        u.id,
        u.username,
        u.email,
        s.post_count,
        s.total_views,
        s.avg_views
    FROM app.users u
    JOIN author_stats s ON u.id = s.author_id
)
SELECT
    username,
    post_count,
    total_views,
    CASE
        WHEN post_count >= 10 THEN 'Prolific'
        WHEN post_count >= 5 THEN 'Regular'
        ELSE 'Occasional'
    END AS author_level
FROM author_info
ORDER BY total_views DESC;

-- Recursive CTE for hierarchical data
CREATE TABLE app.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES app.categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO app.categories (name, parent_id) VALUES
('Technology', NULL),
('Databases', 1),
('PostgreSQL', 2),
('MySQL', 2),
('Programming', 1),
('JavaScript', 5),
('Python', 5);

-- Recursive CTE to build category hierarchy
WITH RECURSIVE category_hierarchy AS (
    -- Base case: root categories
    SELECT
        id,
        name,
        parent_id,
        0 AS level,
        ARRAY[name] AS path
    FROM app.categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: child categories
    SELECT
        c.id,
        c.name,
        c.parent_id,
        ch.level + 1,
        ch.path || c.name
    FROM app.categories c
    JOIN category_hierarchy ch ON c.parent_id = ch.id
)
SELECT
    id,
    name,
    level,
    path,
    ARRAY_TO_STRING(path, ' > ') AS full_path
FROM category_hierarchy
ORDER BY full_path;
```

### Advanced JOINs and Subqueries

```sql
-- LATERAL JOIN for correlated subqueries
SELECT
    u.id,
    u.username,
    latest_posts.title,
    latest_posts.published_at
FROM app.users u
LEFT JOIN LATERAL (
    SELECT p.title, p.published_at
    FROM app.posts p
    WHERE p.author_id = u.id
      AND p.status = 'published'
    ORDER BY p.published_at DESC
    LIMIT 1
) latest_posts ON true;

-- Semi-joins and anti-joins
-- Users who have published posts (EXISTS)
SELECT DISTINCT u.id, u.username, u.email
FROM app.users u
WHERE EXISTS (
    SELECT 1 FROM app.posts p
    WHERE p.author_id = u.id AND p.status = 'published'
);

-- Users who have NOT published any posts (NOT EXISTS)
SELECT u.id, u.username, u.email
FROM app.users u
WHERE NOT EXISTS (
    SELECT 1 FROM app.posts p
    WHERE p.author_id = u.id
);

-- Advanced FILTER clause with aggregates
SELECT
    author_id,
    COUNT(*) AS total_posts,
    COUNT(*) FILTER (WHERE status = 'published') AS published_posts,
    COUNT(*) FILTER (WHERE status = 'draft') AS draft_posts,
    AVG(view_count) FILTER (WHERE status = 'published') AS avg_published_views,
    SUM(view_count) FILTER (WHERE status = 'published') AS total_published_views
FROM app.posts
GROUP BY author_id;
```

## PL/pgSQL Fundamentals

### Function Structure and Syntax

```sql
-- Basic function structure
CREATE OR REPLACE FUNCTION calculate_reading_time(content TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    word_count INTEGER;
    reading_time INTEGER;
BEGIN
    -- Count words by splitting on whitespace
    word_count := array_length(regexp_split_to_array(content, '\s+'), 1);

    -- Average reading speed: 200 words per minute
    reading_time := CEIL(word_count::NUMERIC / 200);

    RETURN reading_time;
END;
$$;

-- Function with parameters and default values
CREATE OR REPLACE FUNCTION format_user_full_name(
    first_name TEXT,
    last_name TEXT,
    middle_name TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    IF middle_name IS NOT NULL AND middle_name != '' THEN
        RETURN first_name || ' ' || middle_name || ' ' || last_name;
    ELSE
        RETURN first_name || ' ' || last_name;
    END IF;
END;
$$;

-- Function with OUT parameters
CREATE OR REPLACE FUNCTION get_post_statistics(post_id_param INTEGER)
RETURNS (
    view_count BIGINT,
    comment_count BIGINT,
    share_count BIGINT,
    engagement_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_interactions BIGINT;
BEGIN
    -- Get view count
    SELECT COALESCE(view_count, 0) INTO view_count
    FROM app.posts
    WHERE id = post_id_param;

    -- Get comment count
    SELECT COUNT(*) INTO comment_count
    FROM app.comments
    WHERE post_id = post_id_param;

    -- Get share count
    SELECT COALESCE(share_count, 0) INTO share_count
    FROM app.posts
    WHERE id = post_id_param;

    -- Calculate engagement rate
    total_interactions := comment_count + share_count;
    IF view_count > 0 THEN
        engagement_rate := (total_interactions::NUMERIC / view_count) * 100;
    ELSE
        engagement_rate := 0;
    END IF;

    RETURN;
END;
$$;

-- Set-returning function
CREATE OR REPLACE FUNCTION get_user_posts(user_id_param INTEGER)
RETURNS TABLE (
    post_id INTEGER,
    title TEXT,
    status TEXT,
    view_count BIGINT,
    published_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.title,
        p.status,
        p.view_count,
        p.published_at
    FROM app.posts p
    WHERE p.author_id = user_id_param
    ORDER BY p.published_at DESC;
END;
$$;
```

### Control Structures

```sql
-- IF-THEN-ELSE statements
CREATE OR REPLACE FUNCTION categorize_post_performance(post_id_param INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    view_count BIGINT;
    comment_count BIGINT;
    engagement_score NUMERIC;
BEGIN
    -- Get post metrics
    SELECT COALESCE(p.view_count, 0), COALESCE(c.comment_count, 0)
    INTO view_count, comment_count
    FROM app.posts p
    LEFT JOIN (
        SELECT post_id, COUNT(*) as comment_count
        FROM app.comments
        GROUP BY post_id
    ) c ON p.id = c.post_id
    WHERE p.id = post_id_param;

    -- Calculate engagement score
    engagement_score := (view_count * 0.7) + (comment_count * 10);

    -- Categorize based on performance
    IF engagement_score >= 1000 THEN
        RETURN 'Excellent';
    ELSIF engagement_score >= 500 THEN
        RETURN 'Good';
    ELSIF engagement_score >= 100 THEN
        RETURN 'Average';
    ELSE
        RETURN 'Poor';
    END IF;
END;
$$;

-- CASE statement
CREATE OR REPLACE FUNCTION get_user_activity_level(user_id_param INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    post_count INTEGER;
    last_login TIMESTAMP WITH TIME ZONE;
    days_since_login INTEGER;
BEGIN
    -- Get user statistics
    SELECT COUNT(*), MAX(last_login)
    INTO post_count, last_login
    FROM app.users u
    LEFT JOIN app.posts p ON u.id = p.author_id
    WHERE u.id = user_id_param;

    -- Calculate days since last login
    days_since_login := CURRENT_DATE - DATE(last_login);

    -- Determine activity level
    RETURN CASE
        WHEN post_count >= 50 AND days_since_login <= 7 THEN 'Highly Active';
        WHEN post_count >= 10 AND days_since_login <= 30 THEN 'Active';
        WHEN post_count >= 1 AND days_since_login <= 90 THEN 'Moderately Active';
        WHEN days_since_login <= 365 THEN 'Inactive';
        ELSE 'Dormant';
    END;
END;
$$;

-- LOOP constructs
CREATE OR REPLACE FUNCTION process_batch_posts(
    batch_size INTEGER DEFAULT 100
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    processed_count INTEGER := 0;
    post_record RECORD;
    post_cursor CURSOR FOR
        SELECT id, title, view_count
        FROM app.posts
        WHERE status = 'published'
        ORDER BY view_count DESC;
BEGIN
    OPEN post_cursor;

    LOOP
        FETCH post_cursor INTO post_record;
        EXIT WHEN NOT FOUND OR processed_count >= batch_size;

        -- Process each post (example: update search vector)
        UPDATE app.posts
        SET search_vector = to_tsvector('english', title)
        WHERE id = post_record.id;

        processed_count := processed_count + 1;
    END LOOP;

    CLOSE post_cursor;

    RETURN processed_count;
END;
$$;

-- WHILE loop
CREATE OR REPLACE FUNCTION generate_sample_data(row_count INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    i INTEGER := 1;
    random_title TEXT;
    random_content TEXT;
BEGIN
    WHILE i <= row_count LOOP
        -- Generate random data
        random_title := 'Sample Post ' || i || ' - ' || md5(random()::TEXT);
        random_content := repeat('This is sample content for post ' || i || '. ', 50);

        -- Insert sample data
        INSERT INTO app.posts (title, content, author_id, status)
        VALUES (random_title, random_content, 1, 'draft');

        i := i + 1;

        -- Commit every 1000 rows to avoid long transactions
        IF i % 1000 = 0 THEN
            COMMIT;
        END IF;
    END LOOP;

    COMMIT;
END;
$$;
```

### Exception Handling

```sql
-- Function with exception handling
CREATE OR REPLACE FUNCTION safe_user_update(
    user_id_param INTEGER,
    email_param TEXT,
    username_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    duplicate_email BOOLEAN := FALSE;
    duplicate_username BOOLEAN := FALSE;
BEGIN
    -- Check for duplicate email
    PERFORM 1 FROM app.users
    WHERE email = email_param AND id != user_id_param;

    IF FOUND THEN
        duplicate_email := TRUE;
    END IF;

    -- Check for duplicate username
    PERFORM 1 FROM app.users
    WHERE username = username_param AND id != user_id_param;

    IF FOUND THEN
        duplicate_username := TRUE;
    END IF;

    -- Return early if duplicates found
    IF duplicate_email OR duplicate_username THEN
        RETURN FALSE;
    END IF;

    -- Update user
    UPDATE app.users
    SET email = email_param,
        username = username_param,
        updated_at = NOW()
    WHERE id = user_id_param;

    RETURN TRUE;

EXCEPTION
    WHEN unique_violation THEN
        -- Handle constraint violation
        RETURN FALSE;
    WHEN others THEN
        -- Log the error and re-raise
        RAISE NOTICE 'Error updating user %: %', user_id_param, SQLERRM;
        RAISE;
END;
$$;

-- Transaction management in functions
CREATE OR REPLACE FUNCTION transfer_post_ownership(
    from_user_id INTEGER,
    to_user_id INTEGER,
    post_ids INTEGER[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    post_record RECORD;
    transferred_count INTEGER := 0;
BEGIN
    -- Validate inputs
    IF from_user_id IS NULL OR to_user_id IS NULL THEN
        RAISE EXCEPTION 'Both user IDs must be provided';
    END IF;

    IF post_ids IS NULL OR array_length(post_ids, 1) = 0 THEN
        RAISE EXCEPTION 'Post IDs array cannot be empty';
    END IF;

    -- Start transaction
    BEGIN
        -- Transfer each post
        FOREACH post_record IN ARRAY
            SELECT id, title FROM app.posts WHERE id = ANY(post_ids)
        LOOP
            -- Update post ownership
            UPDATE app.posts
            SET author_id = to_user_id,
                updated_at = NOW()
            WHERE id = post_record.id;

            transferred_count := transferred_count + 1;

            -- Log the transfer
            INSERT INTO app.audit_logs (action, table_name, record_id, details)
            VALUES ('TRANSFER', 'posts', post_record.id,
                   format('Post %s transferred from user %s to user %s',
                          post_record.id, from_user_id, to_user_id));

        END LOOP;

        COMMIT;

        RAISE NOTICE 'Successfully transferred % posts', transferred_count;
        RETURN TRUE;

    EXCEPTION
        WHEN others THEN
            ROLLBACK;
            RAISE EXCEPTION 'Transfer failed: %', SQLERRM;
    END;
END;
$$;
```

## Stored Procedures and Functions

### Data Processing Procedures

```sql
-- Procedure for data cleanup
CREATE OR REPLACE PROCEDURE cleanup_old_data(
    days_to_keep INTEGER DEFAULT 90
)
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_sessions INTEGER;
    deleted_logs INTEGER;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;

    -- Clean up old session data
    DELETE FROM app.user_sessions
    WHERE created_at < cutoff_date;

    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

    -- Clean up old audit logs
    DELETE FROM app.audit_logs
    WHERE created_at < cutoff_date;

    GET DIAGNOSTICS deleted_logs = ROW_COUNT;

    -- Log the cleanup
    INSERT INTO app.audit_logs (action, table_name, details)
    VALUES ('CLEANUP', 'system',
           format('Deleted % sessions and % audit logs older than % days',
                  deleted_sessions, deleted_logs, days_to_keep));

    COMMIT;

    RAISE NOTICE 'Cleanup completed: % sessions, % logs deleted',
                deleted_sessions, deleted_logs;
END;
$$;

-- Procedure for batch operations
CREATE OR REPLACE PROCEDURE batch_update_post_status(
    status_from TEXT,
    status_to TEXT,
    batch_size INTEGER DEFAULT 1000
)
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER := 0;
    total_updated INTEGER := 0;
    remaining_count INTEGER;
BEGIN
    -- Get initial count
    SELECT COUNT(*) INTO remaining_count
    FROM app.posts
    WHERE status = status_from;

    RAISE NOTICE 'Starting batch update: % posts to process', remaining_count;

    -- Process in batches
    WHILE remaining_count > 0 LOOP
        -- Update batch
        UPDATE app.posts
        SET status = status_to,
            updated_at = NOW()
        WHERE id IN (
            SELECT id
            FROM app.posts
            WHERE status = status_from
            LIMIT batch_size
        );

        GET DIAGNOSTICS updated_count = ROW_COUNT;
        total_updated := total_updated + updated_count;
        remaining_count := remaining_count - updated_count;

        COMMIT;

        RAISE NOTICE 'Batch completed: % posts updated, % remaining',
                    updated_count, remaining_count;

        -- Small delay to prevent overwhelming the system
        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Batch update completed: % total posts updated from % to %',
                total_updated, status_from, status_to;
END;
$$;
```

### Analytics Functions

```sql
-- Function for time-series analytics
CREATE OR REPLACE FUNCTION get_post_analytics(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE,
    interval_type TEXT DEFAULT 'day'
)
RETURNS TABLE (
    period TIMESTAMP WITH TIME ZONE,
    posts_created BIGINT,
    posts_published BIGINT,
    total_views BIGINT,
    unique_authors BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate interval type
    IF interval_type NOT IN ('day', 'week', 'month') THEN
        RAISE EXCEPTION 'Invalid interval_type. Use day, week, or month';
    END IF;

    -- Return query based on interval type
    IF interval_type = 'day' THEN
        RETURN QUERY
        SELECT
            date_trunc('day', created_at)::TIMESTAMP WITH TIME ZONE AS period,
            COUNT(*) FILTER (WHERE 1=1) AS posts_created,
            COUNT(*) FILTER (WHERE status = 'published') AS posts_published,
            COALESCE(SUM(view_count), 0) AS total_views,
            COUNT(DISTINCT author_id) AS unique_authors
        FROM app.posts
        WHERE DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY date_trunc('day', created_at)
        ORDER BY period;

    ELSIF interval_type = 'week' THEN
        RETURN QUERY
        SELECT
            date_trunc('week', created_at)::TIMESTAMP WITH TIME ZONE AS period,
            COUNT(*) FILTER (WHERE 1=1) AS posts_created,
            COUNT(*) FILTER (WHERE status = 'published') AS posts_published,
            COALESCE(SUM(view_count), 0) AS total_views,
            COUNT(DISTINCT author_id) AS unique_authors
        FROM app.posts
        WHERE DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY date_trunc('week', created_at)
        ORDER BY period;

    ELSE -- month
        RETURN QUERY
        SELECT
            date_trunc('month', created_at)::TIMESTAMP WITH TIME ZONE AS period,
            COUNT(*) FILTER (WHERE 1=1) AS posts_created,
            COUNT(*) FILTER (WHERE status = 'published') AS posts_published,
            COALESCE(SUM(view_count), 0) AS total_views,
            COUNT(DISTINCT author_id) AS unique_authors
        FROM app.posts
        WHERE DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY date_trunc('month', created_at)
        ORDER BY period;
    END IF;
END;
$$;

-- Function for user engagement analytics
CREATE OR REPLACE FUNCTION calculate_user_engagement(
    user_id_param INTEGER,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    metric_rank TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_posts INTEGER;
    published_posts INTEGER;
    total_views BIGINT;
    total_comments INTEGER;
    avg_views_per_post NUMERIC;
    engagement_score NUMERIC;
BEGIN
    -- Get user statistics
    SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'published') AS published,
        COALESCE(SUM(view_count), 0) AS views
    INTO total_posts, published_posts, total_views
    FROM app.posts
    WHERE author_id = user_id_param
      AND created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL;

    -- Get comment count
    SELECT COUNT(*) INTO total_comments
    FROM app.comments c
    JOIN app.posts p ON c.post_id = p.id
    WHERE p.author_id = user_id_param
      AND c.created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL;

    -- Calculate averages
    IF published_posts > 0 THEN
        avg_views_per_post := total_views::NUMERIC / published_posts;
    ELSE
        avg_views_per_post := 0;
    END IF;

    -- Calculate engagement score (custom formula)
    engagement_score := (published_posts * 10) +
                        (total_views * 0.01) +
                        (total_comments * 5);

    -- Return metrics
    RETURN QUERY
    SELECT 'Total Posts'::TEXT, total_posts::NUMERIC,
           CASE WHEN total_posts >= 10 THEN 'High'
                WHEN total_posts >= 5 THEN 'Medium'
                ELSE 'Low' END
    UNION ALL
    SELECT 'Published Posts'::TEXT, published_posts::NUMERIC,
           CASE WHEN published_posts >= total_posts THEN 'Excellent'
                WHEN published_posts >= total_posts * 0.8 THEN 'Good'
                ELSE 'Needs Improvement' END
    UNION ALL
    SELECT 'Total Views'::TEXT, total_views::NUMERIC,
           CASE WHEN total_views >= 1000 THEN 'High'
                WHEN total_views >= 100 THEN 'Medium'
                ELSE 'Low' END
    UNION ALL
    SELECT 'Comments Received'::TEXT, total_comments::NUMERIC,
           CASE WHEN total_comments >= 50 THEN 'High'
                WHEN total_comments >= 10 THEN 'Medium'
                ELSE 'Low' END
    UNION ALL
    SELECT 'Avg Views per Post'::TEXT, avg_views_per_post,
           CASE WHEN avg_views_per_post >= 100 THEN 'Excellent'
                WHEN avg_views_per_post >= 50 THEN 'Good'
                ELSE 'Average' END
    UNION ALL
    SELECT 'Engagement Score'::TEXT, engagement_score,
           CASE WHEN engagement_score >= 200 THEN 'Outstanding'
                WHEN engagement_score >= 100 THEN 'Very Good'
                WHEN engagement_score >= 50 THEN 'Good'
                ELSE 'Fair' END;
END;
$$;
```

## Triggers and Constraints

### Creating Triggers

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- Apply trigger to tables
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON app.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON app.posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for post view counting
CREATE OR REPLACE FUNCTION increment_post_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Increment view count
    UPDATE app.posts
    SET view_count = COALESCE(view_count, 0) + 1,
        last_viewed_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER post_view_increment
    AFTER UPDATE ON app.posts
    FOR EACH ROW
    WHEN (OLD.view_count IS DISTINCT FROM NEW.view_count)
    EXECUTE FUNCTION increment_post_view_count();

-- Trigger for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    operation TEXT;
    record_id INTEGER;
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Determine operation type
    IF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        record_id := OLD.id;
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        record_id := NEW.id;
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
        record_id := NEW.id;
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;

    -- Insert audit record
    INSERT INTO app.audit_logs (
        operation,
        table_name,
        record_id,
        old_data,
        new_data,
        user_id,
        created_at
    ) VALUES (
        operation,
        TG_TABLE_NAME,
        record_id,
        old_data,
        new_data,
        current_setting('app.current_user_id', true)::INTEGER,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON app.users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER posts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON app.posts
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();
```

### Advanced Constraints

```sql
-- Complex check constraints
ALTER TABLE app.posts
ADD CONSTRAINT valid_publish_date
    CHECK (
        status != 'published' OR
        published_at IS NOT NULL
    );

-- Multi-column constraints
ALTER TABLE app.posts
ADD CONSTRAINT valid_view_count
    CHECK (view_count >= 0);

-- Conditional constraints
ALTER TABLE app.users
ADD CONSTRAINT valid_social_links
    CHECK (
        (twitter IS NULL OR twitter ~* '^@') AND
        (linkedin IS NULL OR linkedin ~* '^https?://')
    );

-- Deferred constraints for complex operations
ALTER TABLE app.posts
ADD CONSTRAINT valid_content_length
    CHECK (LENGTH(TRIM(content)) > 10)
    DEFERRABLE INITIALLY DEFERRED;
```

## Best Practices and Performance

### Function Optimization

```sql
-- Use appropriate volatility labels
CREATE OR REPLACE FUNCTION get_user_by_email(email_param TEXT)
RETURNS app.users
LANGUAGE sql
STABLE  -- Function depends on database state but doesn't modify it
AS $$
    SELECT * FROM app.users WHERE email = email_param;
$$;

-- Use IMMUTABLE for pure functions
CREATE OR REPLACE FUNCTION format_phone_number(phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE  -- Always returns same result for same input
AS $$
    SELECT REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
$$;

-- Set search_path for security
CREATE OR REPLACE FUNCTION analytics.calculate_user_metrics(user_id INTEGER)
RETURNS TABLE (metric_name TEXT, value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER  -- Execute with function owner privileges
SET search_path = analytics, public
AS $$
BEGIN
    -- Function implementation
END;
$$;
```

### Performance Considerations

```sql
-- Use appropriate data types in functions
CREATE OR REPLACE FUNCTION calculate_revenue(order_ids BIGINT[])
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    total_revenue NUMERIC := 0;
    order_record RECORD;
BEGIN
    -- Use appropriate types for calculations
    FOREACH order_record IN ARRAY
        SELECT id, total_amount FROM orders WHERE id = ANY(order_ids)
    LOOP
        total_revenue := total_revenue + COALESCE(order_record.total_amount, 0);
    END LOOP;

    RETURN total_revenue;
END;
$$;

-- Avoid unnecessary type conversions
CREATE OR REPLACE FUNCTION get_posts_by_date_range(
    start_date_param TIMESTAMP WITH TIME ZONE,
    end_date_param TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF app.posts
LANGUAGE sql
AS $$
    -- Parameters already have correct types
    SELECT * FROM app.posts
    WHERE published_at BETWEEN start_date_param AND end_date_param
    ORDER BY published_at DESC;
$$;
```

This SQL and PL/pgSQL mastery guide provides comprehensive coverage of advanced database programming techniques. Master these patterns to build efficient, maintainable, and scalable database applications with PostgreSQL.