# JSON/JSONB Deep Dive: Document Database Patterns

Comprehensive guide to JSON and JSONB data types in PostgreSQL, covering document database patterns, optimization techniques, and hybrid relational-document architectures.

## JSON vs JSONB Comparison

### Key Differences

```sql
-- Storage and Performance Characteristics
CREATE TABLE json_comparison (
    id SERIAL PRIMARY KEY,
    json_data JSON,      -- Text-based, preserves formatting, exact input
    jsonb_data JSONB     -- Binary format, optimized for queries, indexed
);

-- Insert same data
INSERT INTO json_comparison (json_data, jsonb_data) VALUES
('{"name": "test", "value": 123}', '{"name": "test", "value": 123}'),
('{"name": "test", "value": 123, "extra": null}', '{"name": "test", "value": 123, "extra": null}');

-- Storage differences
SELECT
    pg_column_size(json_data) AS json_size,
    pg_column_size(jsonb_data) AS jsonb_size,
    json_data,
    jsonb_data
FROM json_comparison;

-- JSONB removes whitespace and optimizes storage
-- JSON preserves exact input including whitespace
```

### When to Use Each

```sql
-- Use JSON when:
-- 1. You need to preserve exact input formatting
-- 2. Data is rarely queried
-- 3. You need schema-less document storage with occasional access
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    request JSON,           -- Preserve exact API request
    response JSON,          -- Preserve exact API response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Use JSONB when:
-- 1. You need to query the JSON data frequently
-- 2. You need indexing on JSON properties
-- 3. Performance is critical
CREATE TABLE product_attributes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    attributes JSONB,         -- Queryable product attributes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_attributes ON product_attributes USING GIN (attributes);
```

## JSONB Operations and Functions

### Basic Operators

```sql
-- Create sample table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO documents (title, metadata) VALUES
('User Profile', '{
    "user_id": 12345,
    "preferences": {
        "theme": "dark",
        "notifications": true,
        "language": "en"
    },
    "stats": {
        "login_count": 42,
        "last_login": "2024-01-15T10:30:00Z",
        "sessions": [1, 2, 3]
    }
}'),
('Product Catalog', '{
    "product_id": "PROD-001",
    "name": "Premium Widget",
    "price": 299.99,
    "categories": ["electronics", "gadgets"],
    "variants": [
        {"color": "black", "sku": "BW-001", "stock": 50},
        {"color": "silver", "sku": "SV-001", "stock": 30}
    ]
}');

-- Basic JSONB operators
SELECT
    title,
    metadata -> 'user_id' AS user_id,           -- Get as JSONB
    metadata ->> 'user_id' AS user_id_text,      -- Get as TEXT
    metadata -> 'preferences' AS preferences,    -- Nested JSONB
    metadata ->> 'name' AS product_name          -- Nested TEXT
FROM documents;

-- Path operators
SELECT
    title,
    metadata #> '{preferences,theme}' AS theme,      -- Get nested value
    metadata #>> '{preferences,theme}' AS theme_text, -- Get nested as TEXT
    metadata #> '{stats,sessions,0}' AS first_session -- Array element
FROM documents;

-- Existence operators
SELECT
    title,
    metadata ? 'user_id' AS has_user_id,           -- Has key (any level)
    metadata ? 'preferences' AS has_preferences,   -- Has key
    metadata ?& 'notifications' AS has_notifications -- Has key (case-insensitive)
FROM documents;

-- Containment operators
SELECT
    title,
    metadata @> '{"user_id": 12345}' AS contains_user,      -- Contains JSON
    metadata <@ '{"user_id": 12345}' AS contained_by_user,  -- Contained by JSON
    metadata ?| array['theme', 'language'] AS has_keys      -- Has any key
FROM documents;
```

### Advanced JSONB Functions

```sql
-- JSONB manipulation functions
SELECT
    title,
    jsonb_typeof(metadata) AS jsonb_type,
    jsonb_array_length(metadata -> 'stats' -> 'sessions') AS session_count,
    jsonb_each(metadata) AS key_value_pairs,
    jsonb_object_keys(metadata) AS all_keys,
    jsonb_extract_path(metadata, '{preferences,theme}') AS theme_value
FROM documents;

-- JSONB aggregation
SELECT
    jsonb_agg(metadata) AS all_metadata,
    jsonb_build_object(
        'count', COUNT(*),
        'avg_session_length', AVG(jsonb_array_length(metadata -> 'stats' -> 'sessions'))
    ) AS stats
FROM documents;

-- JSONB path queries (PostgreSQL 12+)
SELECT
    title,
    metadata #>> '{stats,login_count}' AS login_count,
    metadata #>> '{preferences,theme}' AS theme
FROM documents
WHERE metadata #>> '{stats,login_count}'::INTEGER > 40;

-- JSONB array operations
SELECT
    title,
    metadata -> 'variants' AS variants,
    jsonb_array_elements(metadata -> 'variants') AS individual_variant,
    jsonb_array_length(metadata -> 'variants') AS variant_count
FROM documents
WHERE metadata ? 'variants';
```

## Document Database Patterns

### User Profile and Preferences

```sql
-- User profile with flexible attributes
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert user profile
INSERT INTO user_profiles (user_id, profile_data) VALUES
(1001, '{
    "personal": {
        "first_name": "Alice",
        "last_name": "Johnson",
        "email": "alice@example.com",
        "phone": "+1-555-0123",
        "birthdate": "1990-05-15",
        "avatar_url": "https://example.com/avatars/alice.jpg"
    },
    "preferences": {
        "theme": "dark",
        "language": "en",
        "timezone": "America/New_York",
        "notifications": {
            "email": true,
            "push": true,
            "sms": false
        },
        "privacy": {
            "profile_visible": true,
            "activity_visible": false
        }
    },
    "settings": {
        "items_per_page": 25,
        "auto_save": true,
        "keyboard_shortcuts": true
    },
    "metadata": {
        "registration_source": "web",
        "last_login_ip": "192.168.1.100",
        "device_info": {
            "type": "desktop",
            "browser": "Chrome",
            "os": "Windows"
        }
    }
}');

-- Query specific fields
SELECT
    user_id,
    profile_data ->> 'personal' ->> 'first_name' AS first_name,
    profile_data ->> 'personal' ->> 'email' AS email,
    profile_data -> 'preferences' -> 'notifications' ->> 'email' AS email_notifications
FROM user_profiles
WHERE user_id = 1001;

-- Update nested fields
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{preferences,theme}',
    '"light"'::jsonb
),
updated_at = NOW()
WHERE user_id = 1001;

-- Add new fields dynamically
UPDATE user_profiles
SET profile_data = jsonb_insert(
    profile_data,
    '{preferences,new_feature}',
    '{"enabled": true, "beta": true}'::jsonb
),
updated_at = NOW()
WHERE user_id = 1001;
```

### Product Catalog with Variants

```sql
-- Product catalog with flexible attributes
CREATE TABLE product_catalog (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    product_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_product_catalog_sku ON product_catalog(sku);
CREATE INDEX idx_product_catalog_status ON product_catalog(status);
CREATE INDEX idx_product_catalog_data ON product_catalog USING GIN (product_data);
CREATE INDEX idx_product_catalog_category ON product_catalog USING GIN ((product_data -> 'categories'));

-- Insert product with variants
INSERT INTO product_catalog (sku, name, description, product_data) VALUES
('LAPTOP-PRO-15', 'Professional Laptop 15"', 'High-performance laptop for professionals', '{
    "base_info": {
        "brand": "TechCorp",
        "model": "Pro-15",
        "category": "Electronics",
        "subcategory": "Laptops",
        "weight": 2.5,
        "dimensions": {
            "length": 35.5,
            "width": 25.0,
            "height": 2.5
        }
    },
    "pricing": {
        "base_price": 1299.99,
        "currency": "USD",
        "discount_percentage": 10,
        "tax_included": false,
        "sale_price": 1169.99
    },
    "variants": [
        {
            "sku": "LAPTOP-PRO-15-SLV",
            "color": "Silver",
            "ram": "16GB",
            "storage": "512GB SSD",
            "processor": "Intel i7-12700H",
            "price_adjustment": 0,
            "stock": 25,
            "available": true
        },
        {
            "sku": "LAPTOP-PRO-15-BLK",
            "color": "Black",
            "ram": "32GB",
            "storage": "1TB SSD",
            "processor": "Intel i7-12700H",
            "price_adjustment": 300,
            "stock": 15,
            "available": true
        },
        {
            "sku": "LAPTOP-PRO-15-WHT",
            "color": "White",
            "ram": "16GB",
            "storage": "512GB SSD",
            "processor": "Intel i5-12450H",
            "price_adjustment": -100,
            "stock": 5,
            "available": false
        }
    ],
    "specifications": {
        "display": {
            "size": 15.6,
            "resolution": "1920x1080",
            "type": "IPS",
            "refresh_rate": 144
        },
        "connectivity": {
            "usb_ports": ["USB-C", "USB-A", "HDMI"],
            "wireless": ["Wi-Fi 6", "Bluetooth 5.0"],
            "ethernet": true
        },
        "battery": {
            "type": "Li-Ion",
            "capacity": "80Wh",
            "life_hours": 10
        }
    },
    "features": [
        "Backlit Keyboard",
        "Fingerprint Reader",
        "Thunderbolt 4",
        "Webcam 1080p",
        "Dolby Audio"
    ],
    "warranty": {
        "years": 2,
        "type": "manufacturer",
        "extended_available": true
    },
    "seo": {
        "title": "Professional Laptop 15 - High Performance",
        "description": "Best laptop for professionals with powerful specs",
        "keywords": ["laptop", "professional", "high-performance", "tech"],
        "meta_description": "Professional laptop with Intel i7, 16GB RAM, 512GB SSD"
    }
}');

-- Query products with specific variants
SELECT
    sku,
    name,
    variant.sku AS variant_sku,
    variant.color,
    variant.ram,
    variant.storage,
    variant.price_adjustment,
    (product_data ->> 'pricing' ->> 'base_price')::NUMERIC + variant.price_adjustment AS final_price
FROM product_catalog,
    jsonb_array_elements(product_data -> 'variants') AS variant
WHERE product_data ->> 'base_info' ->> 'category' = 'Electronics'
  AND variant.available = true;

-- Search within JSONB arrays
SELECT
    sku,
    name,
    product_data -> 'features' AS features
FROM product_catalog
WHERE product_data -> 'features' @> '["Backlit Keyboard"]'
  AND product_data -> 'specifications' -> 'display' ->> 'size'::NUMERIC >= 15;

-- Complex JSONB queries
SELECT
    sku,
    name,
    COUNT(variant) AS total_variants,
    SUM(CASE WHEN variant.available = true THEN 1 ELSE 0 END) AS available_variants,
    AVG((product_data ->> 'pricing' ->> 'base_price')::NUMERIC + variant.price_adjustment) AS avg_price
FROM product_catalog,
    jsonb_array_elements(product_data -> 'variants') AS variant
GROUP BY sku, name
ORDER BY total_variants DESC;
```

### Event Logging and Analytics

```sql
-- Flexible event logging system
CREATE TABLE event_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    event_data JSONB NOT NULL,
    user_id INTEGER,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time-based partitioning
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);
CREATE INDEX idx_event_logs_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_entity ON event_logs(entity_type, entity_id);
CREATE INDEX idx_event_logs_data ON event_logs USING GIN (event_data);

-- Log different event types
INSERT INTO event_logs (event_type, entity_type, entity_id, event_data, user_id) VALUES
('user.login', 'user', '1001', '{
    "success": true,
    "method": "password",
    "device_info": {
        "platform": "web",
        "browser": "Chrome 120.0",
        "os": "Windows 11"
    },
    "location": {
        "country": "US",
        "city": "New York",
        "timezone": "America/New_York"
    }
}', 1001),
('product.view', 'product', 'LAPTOP-PRO-15', '{
    "source": "search",
    "search_query": "professional laptop",
    "referrer": "google.com",
    "session_duration": 180,
    "pages_viewed": 5
}', 1001),
('order.created', 'order', 'ORD-2024-001', '{
    "total_amount": 1499.98,
    "currency": "USD",
    "items": [
        {
            "product_sku": "LAPTOP-PRO-15-SLV",
            "quantity": 1,
            "price": 1169.99
        },
        {
            "product_sku": "MOUSE-WRLS-001",
            "quantity": 1,
            "price": 79.99
        }
    ],
    "payment_method": "credit_card",
    "shipping_address": {
        "city": "New York",
        "state": "NY",
        "country": "US"
    }
}', 1001);

-- Analytics queries
SELECT
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users,
    AVG((event_data ->> 'session_duration')::NUMERIC) AS avg_session_duration
FROM event_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_type
ORDER BY event_count DESC;

-- Funnel analysis
SELECT
    step,
    COUNT(*) AS count,
    COUNT(*) * 100.0 / LAG(COUNT(*)) OVER (ORDER BY step) AS conversion_rate
FROM (
    SELECT
        CASE event_type
            WHEN 'user.register' THEN 'Registration'
            WHEN 'user.login' THEN 'Login'
            WHEN 'product.view' THEN 'Product View'
            WHEN 'cart.add' THEN 'Add to Cart'
            WHEN 'order.created' THEN 'Purchase'
        END AS step,
        user_id
    FROM event_logs
    WHERE event_type IN ('user.register', 'user.login', 'product.view', 'cart.add', 'order.created')
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
) AS funnel_events
GROUP BY step
ORDER BY
    CASE step
        WHEN 'Registration' THEN 1
        WHEN 'Login' THEN 2
        WHEN 'Product View' THEN 3
        WHEN 'Add to Cart' THEN 4
        WHEN 'Purchase' THEN 5
    END;
```

## Performance Optimization

### Indexing Strategies

```sql
-- GIN indexes for JSONB
CREATE INDEX idx_documents_metadata_gin ON documents USING GIN (metadata);
CREATE INDEX idx_documents_metadata_path ON documents USING GIN (metadata jsonb_path_ops);

-- Expression indexes for specific paths
CREATE INDEX idx_documents_user_id ON documents USING BTREE ((metadata ->> 'user_id'));
CREATE INDEX idx_documents_theme ON documents USING BTREE ((metadata ->> 'preferences' ->> 'theme'));

-- Partial indexes for common queries
CREATE INDEX idx_active_products ON product_catalog (status)
WHERE status = 'active';

CREATE INDEX idx_products_with_variants ON product_catalog USING GIN (product_data)
WHERE product_data ? 'variants';

-- Composite indexes for JSONB
CREATE INDEX idx_user_profiles_preferences ON user_profiles USING GIN ((profile_data -> 'preferences'));
CREATE INDEX idx_product_categories ON product_catalog USING GIN ((product_data -> 'categories'));
```

### Query Optimization

```sql
-- Efficient JSONB queries
-- Good: Use specific path operators
SELECT id, title
FROM documents
WHERE metadata ->> 'user_id' = '12345'
  AND metadata -> 'preferences' ->> 'theme' = 'dark';

-- Bad: Generic JSONB contains (slow)
SELECT id, title
FROM documents
WHERE metadata ::text LIKE '%user_id%';

-- Use jsonb_path_query_array for array operations
SELECT title, variant
FROM product_catalog,
     jsonb_path_query_array(
         product_data,
         '$.variants[*] ? (@.available == true)'
     ) AS variant
WHERE product_data -> 'variants' @> '[{"available": true}]';

-- Optimized searches with prepared statements
PREPARE find_by_theme(TEXT) AS
SELECT id, title, metadata ->> 'preferences' ->> 'theme' AS theme
FROM documents
WHERE metadata ->> 'preferences' ->> 'theme' = $1;

EXECUTE find_by_theme('dark');

-- Use materialized views for complex JSONB queries
CREATE MATERIALIZED VIEW user_analytics AS
SELECT
    u.id,
    u.email,
    up.profile_data ->> 'personal' ->> 'first_name' AS first_name,
    COUNT(el.id) AS event_count,
    MAX(el.created_at) AS last_activity,
    jsonb_agg(
        jsonb_build_object(
            'type', el.event_type,
            'count', COUNT(*)
        ) ORDER BY el.event_type
    ) AS event_breakdown
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN event_logs el ON u.id = el.user_id
GROUP BY u.id, u.email, up.profile_data ->> 'personal' ->> 'first_name';

CREATE UNIQUE INDEX idx_user_analytics_id ON user_analytics(id);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW user_analytics;
```

### Storage Optimization

```sql
-- Monitor JSONB storage
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS data_size
FROM pg_tables
WHERE tablename LIKE '%json%'
   OR tablename LIKE '%document%';

-- Compression for large JSONB columns
CREATE TABLE compressed_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    compressed_data JSONB
) WITH (fillfactor = 100);  -- Optimize for inserts

-- Use TOAST compression automatically
ALTER TABLE documents ALTER COLUMN metadata SET STORAGE EXTERNAL;

-- JSONB size analysis
SELECT
    id,
    title,
    pg_column_size(metadata) AS metadata_size,
    pg_column_size(metadata::jsonb::text) AS json_text_size,
    CASE
        WHEN pg_column_size(metadata) > 10000 THEN 'Large'
        WHEN pg_column_size(metadata) > 5000 THEN 'Medium'
        ELSE 'Small'
    END AS size_category
FROM documents
ORDER BY pg_column_size(metadata) DESC;
```

## Hybrid Relational-Document Patterns

### EAV (Entity-Attribute-Value) Alternative

```sql
-- Traditional EAV approach (avoid)
CREATE TABLE entity_attributes (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER,
    attribute_name VARCHAR(100),
    attribute_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- JSONB alternative (better performance)
CREATE TABLE flexible_entities (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    attributes JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);

-- Create index for specific attribute queries
CREATE INDEX idx_flexible_entities_attributes ON flexible_entities USING GIN (attributes);

-- Sample data - Product specifications
INSERT INTO flexible_entities (entity_type, entity_id, attributes) VALUES
('product', 'ELECTRONICS-001', '{
    "brand": "Sony",
    "model": "WH-1000XM4",
    "category": "Audio",
    "specifications": {
        "type": "Over-ear",
        "wireless": true,
        "noise_cancelling": true,
        "battery_life": "30 hours",
        "frequency_response": "4Hz-40,000Hz",
        "impedance": "48 ohms"
    },
    "features": [
        "Adaptive Sound Control",
        "Speak-to-Chat",
        "Quick Attention",
        "Wearing Detection"
    ],
    "connectivity": {
        "bluetooth": "5.0",
        "nfc": true,
        "audio_jack": "3.5mm"
    }
}');

-- Query specific attributes efficiently
SELECT
    entity_id,
    attributes ->> 'brand' AS brand,
    attributes ->> 'model' AS model,
    attributes -> 'specifications' ->> 'battery_life' AS battery_life
FROM flexible_entities
WHERE entity_type = 'product'
  AND attributes ->> 'category' = 'Audio'
  AND attributes -> 'specifications' ->> 'wireless' = 'true';
```

### Dynamic Form Data Storage

```sql
-- Dynamic form submissions
CREATE TABLE form_submissions (
    id BIGSERIAL PRIMARY KEY,
    form_id VARCHAR(100) NOT NULL,
    form_version VARCHAR(20) DEFAULT '1.0',
    submission_data JSONB NOT NULL,
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for form analytics
CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_data ON form_submissions USING GIN (submission_data);

-- Sample submission data
INSERT INTO form_submissions (form_id, submission_data, user_id) VALUES
('contact_form_v2', '{
    "personal_info": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1-555-0123",
        "company": "Tech Corp"
    },
    "message_details": {
        "subject": "Product Inquiry",
        "category": "Sales",
        "priority": "medium",
        "message": "I am interested in your professional laptop line. Can you provide more information about bulk pricing?"
    },
    "preferences": {
        "contact_method": "email",
        "best_time_to_contact": "business_hours",
        "newsletter_subscription": true
    },
    "metadata": {
        "form_source": "website",
        "referral_page": "/products/laptops",
        "device_info": {
            "type": "desktop",
            "browser": "Chrome",
            "screen_resolution": "1920x1080"
        }
    }
}', 1001);

-- Dynamic form validation
CREATE OR REPLACE FUNCTION validate_form_submission(
    form_id_param TEXT,
    submission_data_param JSONB
)
RETURNS TABLE (
    is_valid BOOLEAN,
    errors JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    errors_array JSONB := '[]'::jsonb;
    is_valid_result BOOLEAN := TRUE;
BEGIN
    -- Validate based on form type
    IF form_id_param = 'contact_form_v2' THEN
        -- Check required fields
        IF NOT (submission_data_param -> 'personal_info' ->> 'first_name') IS NULL THEN
            errors_array := errors_array || '["First name is required"]'::jsonb;
        END IF;

        IF NOT (submission_data_param -> 'personal_info' ->> 'email') IS NULL THEN
            -- Validate email format
            IF submission_data_param ->> 'personal_info' ->> 'email' !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
                errors_array := errors_array || '["Invalid email format"]'::jsonb;
            END IF;
        END IF;

        -- Validate priority
        IF NOT (submission_data_param ->> 'message_details' ->> 'priority') IS NULL THEN
            IF NOT (submission_data_param ->> 'message_details' ->> 'priority') IN ('low', 'medium', 'high', 'urgent') THEN
                errors_array := errors_array || '["Invalid priority level"]'::jsonb;
            END IF;
        END IF;
    END IF;

    -- Set validation result
    IF jsonb_array_length(errors_array) > 0 THEN
        is_valid_result := FALSE;
    END IF;

    RETURN QUERY SELECT is_valid_result, errors_array;
END;
$$;

-- Query form submissions with validation
SELECT
    fs.id,
    fs.form_id,
    fs.submission_data ->> 'personal_info' ->> 'first_name' AS first_name,
    fs.submission_data ->> 'message_details' ->> 'subject' AS subject,
    validation.is_valid,
    validation.errors
FROM form_submissions fs,
    LATERAL validate_form_submission(fs.form_id, fs.submission_data) AS validation;
```

### Configuration Management

```sql
-- Application configuration storage
CREATE TABLE app_configurations (
    id SERIAL PRIMARY KEY,
    app_name VARCHAR(100) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    version VARCHAR(20) NOT NULL,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_name, environment, version)
);

-- Sample configuration data
INSERT INTO app_configurations (app_name, environment, version, config_data, is_active) VALUES
('web_app', 'production', '2.1.0', '{
    "database": {
        "host": "prod-db.example.com",
        "port": 5432,
        "name": "webapp_prod",
        "pool_size": 20,
        "timeout": 30000
    },
    "cache": {
        "redis": {
            "host": "prod-redis.example.com",
            "port": 6379,
            "db": 0,
            "ttl": 3600
        },
        "local_cache": {
            "max_size": "100MB",
            "ttl": 300
        }
    },
    "features": {
        "user_registration": true,
        "social_login": true,
        "email_notifications": true,
        "analytics": true,
        "beta_features": false
    },
    "limits": {
        "max_file_size": "10MB",
        "max_requests_per_minute": 1000,
        "session_timeout": 3600
    },
    "security": {
        "jwt_secret": "encrypted_value",
        "encryption_key": "encrypted_value",
        "password_policy": {
            "min_length": 8,
            "require_uppercase": true,
            "require_lowercase": true,
            "require_numbers": true,
            "require_special_chars": true
        }
    },
    "third_party": {
        "email": {
            "provider": "sendgrid",
            "api_key": "encrypted_value"
        },
        "analytics": {
            "provider": "google_analytics",
            "tracking_id": "GA-XXXXXXXX"
        },
        "storage": {
            "provider": "aws_s3",
            "bucket": "app-prod-storage",
            "region": "us-east-1"
        }
    }
}', true);

-- Configuration retrieval function
CREATE OR REPLACE FUNCTION get_config(
    app_name_param TEXT,
    environment_param TEXT DEFAULT 'production',
    config_path TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN config_path IS NULL THEN config_data
        ELSE jsonb_extract_path(config_data, config_path)
    END
FROM app_configurations
WHERE app_name = app_name_param
  AND environment = environment_param
  AND is_active = true;
$$;

-- Usage examples
SELECT get_config('web_app', 'production', '{database,host}') AS db_host;
SELECT get_config('web_app', 'production') AS full_config;

-- Update specific configuration values
CREATE OR REPLACE FUNCTION update_config(
    app_name_param TEXT,
    environment_param TEXT,
    update_path TEXT,
    new_value JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE app_configurations
    SET config_data = jsonb_set(config_data, update_path, new_value),
        updated_at = NOW()
    WHERE app_name = app_name_param
      AND environment = environment_param
      AND is_active = true;

    RETURN FOUND;
END;
$$;
```

This JSON/JSONB deep dive provides comprehensive coverage of document database patterns in PostgreSQL. Master these techniques to build flexible, performant applications that leverage PostgreSQL's powerful JSON capabilities while maintaining the benefits of relational databases.