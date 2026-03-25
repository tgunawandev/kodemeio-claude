# Odoo Troubleshooting Guide

Comprehensive troubleshooting guide for common Odoo issues, from development problems to production challenges.

## Table of Contents

1. [Installation and Setup Issues](#installation-and-setup-issues)
2. [Database Problems](#database-problems)
3. [Module Installation Issues](#module-installation-issues)
4. [Performance Issues](#performance-issues)
5. [Security and Access Problems](#security-and-access-problems)
6. [Email and Communication Issues](#email-and-communication-issues)
7. [Web Interface Issues](#web-interface-issues)
8. [API and Integration Problems](#api-and-integration-problems)
9. [Backup and Recovery Issues](#backup-and-recovery-issues)
10. [Development Debugging](#development-debugging)

## Installation and Setup Issues

### Common Installation Errors

#### Error: "ImportError: No module named 'odoo'"
```bash
# Problem: Python can't find Odoo module
# Solutions:

# 1. Install Odoo in development mode
cd /path/to/odoo
pip install -e .

# 2. Check Python path
python -c "import sys; print(sys.path)"

# 3. Use virtual environment
python -m venv odoo-env
source odoo-env/bin/activate
pip install -r requirements.txt

# 4. Check if you're in the right directory
ls -la  # Should show __init__.py, odoo-bin, etc.
```

#### Error: "FATAL: database "odoo" does not exist"
```bash
# Problem: Database doesn't exist
# Solutions:

# 1. Create database manually
createdb -U postgres odoo

# 2. Create database with specific encoding
createdb -U postgres -E UNICODE odoo

# 3. Check PostgreSQL connection
psql -U postgres -h localhost -l

# 4. Check Odoo configuration
grep -i database /etc/odoo/odoo.conf
```

#### Error: "Permission denied for database odoo"
```bash
# Problem: Incorrect database permissions
# Solutions:

# 1. Grant permissions to user
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE odoo TO odoo;
\q

# 2. Create user with permissions
sudo -u postgres createuser -s odoo

# 3. Check user exists
sudo -u postgres psql -c "\du"

# 4. Reset password
sudo -u postgres psql -c "ALTER USER odoo PASSWORD 'newpassword';"
```

### Python Dependencies Issues

#### Error: "Failed building wheel for psycopg2"
```bash
# Problem: Missing PostgreSQL development headers
# Solutions:

# Ubuntu/Debian:
sudo apt-get install libpq-dev python3-dev

# CentOS/RHEL:
sudo yum install postgresql-devel python3-devel

# Fedora:
sudo dnf install libpq-devel python3-devel

# Alternative: Use binary package
pip install psycopg2-binary
```

#### Error: "Could not find a version that satisfies the requirement"
```bash
# Problem: Package version conflicts
# Solutions:

# 1. Update pip
pip install --upgrade pip

# 2. Use specific version
pip install package==version

# 3. Clear pip cache
pip cache purge

# 4. Use virtual environment
python -m venv clean-env
source clean-env/bin/activate
pip install -r requirements.txt
```

## Database Problems

### Connection Issues

#### Error: "FATAL: password authentication failed for user 'odoo'"
```bash
# Problem: Incorrect database credentials
# Solutions:

# 1. Check pg_hba.conf
sudo nano /etc/postgresql/13/main/pg_hba.conf
# Should include: local   all   all   md5

# 2. Reset password
sudo -u postgres psql
ALTER USER odoo PASSWORD 'newpassword';
\q

# 3. Test connection
psql -U odoo -h localhost -d postgres -W

# 4. Check Odoo configuration
grep -i db_password /etc/odoo/odoo.conf
```

#### Error: "too many connections for role 'odoo'"
```bash
# Problem: Exceeded connection limit
# Solutions:

# 1. Check current connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Kill idle connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';"

# 3. Increase max_connections in postgresql.conf
sudo nano /etc/postgresql/13/main/postgresql.conf
# Set: max_connections = 200

# 4. Reduce Odoo db_maxconn
# In odoo.conf:
db_maxconn = 64
```

### Performance Issues

#### Slow Database Queries
```sql
-- Problem: Slow queries
-- Solutions:

-- 1. Identify slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 2. Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY schemaname, tablename, attname;

-- 3. Analyze table statistics
ANALYZE your_table_name;

-- 4. Rebuild indexes
REINDEX TABLE your_table_name;

-- 5. Check database size
SELECT pg_size_pretty(pg_database_size('odoo'));
```

#### Database Lock Issues
```sql
-- Problem: Database locks blocking operations
-- Solutions:

-- 1. Check active locks
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 2. Kill blocking session
SELECT pg_terminate_backend(pid);
```

## Module Installation Issues

### Module Loading Errors

#### Error: "Module not found: your_module"
```python
# Problem: Module not in addons path
# Solutions:

# 1. Check addons path
import os
addons_path = '/path/to/your/addons'
if addons_path not in os.sys.path:
    os.sys.path.append(addons_path)

# 2. Update addons_path in odoo.conf
addons_path = /opt/odoo/addons,/path/to/your/addons

# 3. Check module structure
your_module/
├── __init__.py
├── __manifest__.py
└── ...

# 4. Verify manifest file
python -c "import json; print(json.load(open('your_module/__manifest__.py')))"
```

#### Error: "ImportError: cannot import name 'fields'"
```python
# Problem: Incorrect import in module
# Solutions:

# 1. Check __init__.py
# your_module/__init__.py
from . import models
from . import views

# 2. Check imports in models
# models/__init__.py
from . import your_model

# 3. Verify import paths
from odoo import models, fields, api  # Correct
# NOT: from odoo.models import models  # Wrong

# 4. Check circular imports
# Make sure there are no circular import dependencies
```

### Dependency Issues

#### Error: "Unmet dependency: module_x"
```python
# Problem: Required module not installed
# Solutions:

# 1. Install missing dependency
git clone https://github.com/author/module_x.git
# Add to addons_path

# 2. Install from OCA
git clone https://github.com/OCA/server-tools.git
# Install specific addon

# 3. Check manifest dependencies
# In __manifest__.py:
'depends': [
    'base',
    'mail',
    'module_x',  # Make sure this is correct
],

# 4. Temporarily disable dependency (not recommended)
# In __manifest__.py:
# 'depends': ['base', 'mail'],  # Comment out module_x
```

#### Error: "Incompatible dependencies"
```python
# Problem: Version incompatibility
# Solutions:

# 1. Check Odoo version compatibility
# In __manifest__.py:
'version': '18.0.1.0.0',  # Must match Odoo version

# 2. Check dependency versions
# Review the __manifest__.py of dependencies

# 3. Use version constraints
# In __manifest__.py:
'external_dependencies': {
    'python': ['requests>=2.25.0'],
},

# 4. Fork and fix compatibility
git clone dependency_repo
# Fix compatibility issues
# Use your fork
```

## Performance Issues

### Slow Page Loading

#### Problem: Frontend performance issues
```javascript
// Solutions:

// 1. Enable debug mode for development
// In URL: ?debug=1,2

// 2. Check browser console for errors
// Open Developer Tools → Console

// 3. Optimize JavaScript bundles
// Check Network tab for large files

// 4. Enable caching
// In odoo.conf:
# ir_attachment_location_prefix = web/content
# cache_timeout = 3600

// 5. Use browser caching
// Add to nginx config:
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### Problem: Backend performance issues
```python
# Solutions:

# 1. Enable query logging
# In odoo.conf:
# log_level = debug
# log_handler = ["odoo.sql_db:INFO"]

# 2. Profile slow queries
import logging
import time
from functools import wraps

def profile_queries(func):
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        start_time = time.time()
        result = func(self, *args, **kwargs)
        end_time = time.time()
        if end_time - start_time > 1.0:  # Log if > 1 second
            logging.warning(f"Slow query in {func.__name__}: {end_time - start_time:.2f}s")
        return result
    return wrapper

# 3. Optimize database queries
# Use read() instead of browse() when possible
# Use search() with proper domains
# Add database indexes

# 4. Implement caching
from odoo.tools.cache import cache

@cache(timeout=3600)
def get_cached_data(self, arg1):
    # Cached computation
    pass
```

### Memory Issues

#### Error: "MemoryError" or "Out of memory"
```bash
# Problem: Insufficient memory
# Solutions:

# 1. Increase worker memory limits
# In odoo.conf:
limit_memory_soft = 1073741824  # 1GB
limit_memory_hard = 2147483648  # 2GB

# 2. Reduce number of workers
workers = 2  # Reduce from 4 to 2

# 3. Optimize memory usage
# In odoo.conf:
# ir_attachment_location_prefix = web/content

# 4. Monitor memory usage
htop  # Check system memory
ps aux --sort=-%mem  # Check process memory

# 5. Enable memory profiling
# In odoo.conf:
# limit_memory_real = 2147483648
```

#### Problem: Memory leaks
```python
# Solutions:

# 1. Check for unclosed cursors
# Ensure all database cursors are properly closed
with self.env.cr.execute(query, params):
    result = self.env.cr.fetchall()

# 2. Avoid global variables
# Bad: Global list that grows
global_cache = []  # Avoid this

# 3. Clear caches periodically
self.env.clear()

# 4. Monitor object references
import gc
gc.collect()  # Force garbage collection

# 5. Use generators for large datasets
def get_large_dataset(self):
    for record in self.search([]):
        yield record
```

## Security and Access Problems

### Authentication Issues

#### Error: "Access Denied" or "Invalid username or password"
```python
# Problem: Authentication failure
# Solutions:

# 1. Reset admin password
# In terminal:
cd /path/to/odoo
./odoo-bin -d your_database -u admin --stop-after-init --init=base
# Or use SQL:
UPDATE res_users SET password = crypt('new_password', gen_salt('bf')) WHERE login = 'admin';

# 2. Check user exists
psql -U odoo -d your_database
SELECT login, active FROM res_users WHERE login = 'admin';

# 3. Check user is active
UPDATE res_users SET active = true WHERE login = 'admin';

# 4. Verify database list
# In odoo.conf:
list_db = True  # Or set to False with specific db_name
```

### Access Rights Issues

#### Error: "Access Denied" for specific operations
```python
# Problem: Insufficient permissions
# Solutions:

# 1. Check user groups
# In Python:
user = self.env['res.users'].browse(self.env.uid)
print(user.groups_id)

# 2. Check access rights
model.has_access('read')
model.has_access('write')
model.has_access('create')
model.has_access('unlink')

# 3. Grant permissions
# In security/ir.model.access.csv:
access_model_user,model.user,model_your_model,group_your_user,1,1,1,0

# 4. Check record rules
# In security/security.xml:
<record id="rule_your_model_user" model="ir.rule">
    <field name="domain_force">[('user_id', '=', user.id)]</field>
    <field name="groups" eval="[(4, ref('group_your_user'))]"/>
</record>
```

### Multi-Company Issues

#### Problem: Data visibility in multi-company setup
```python
# Solutions:

# 1. Check company context
self.env.company_id  # Current company
self.env.companies  # Available companies

# 2. Set company context
self = self.with_context(company_id=company_id)

# 3. Check record rules for multi-company
<record id="rule_company" model="ir.rule">
    <field name="domain_force">['|', ('company_id', '=', user.company_id.id), ('company_id', '=', False)]</field>
</record>

# 4. Verify user company access
user.company_ids  # Companies user can access
user.company_id   # Default company
```

## Email and Communication Issues

### SMTP Configuration

#### Error: "SMTP authentication error"
```ini
# Problem: SMTP configuration issues
# Solutions:

# 1. Check SMTP settings in odoo.conf
smtp_server = smtp.gmail.com
smtp_port = 587
smtp_user = your_email@gmail.com
smtp_password = your_app_password
smtp_ssl = False
smtp_encryption = starttls

# 2. Test SMTP connection
# In Python:
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login('your_email@gmail.com', 'password')

# 3. Check firewall/ports
telnet smtp.gmail.com 587

# 4. Use test email
# In Odoo: Settings → Technical → Email → Templates
# Send test email
```

#### Error: "Connection refused" for email
```bash
# Problem: Email server connection issues
# Solutions:

# 1. Check if email server is running
systemctl status postfix
# or
systemctl status sendmail

# 2. Check port availability
netstat -tlnp | grep :25
netstat -tlnp | grep :587

# 3. Test email manually
telnet smtp.gmail.com 587

# 4. Check DNS resolution
nslookup smtp.gmail.com
dig smtp.gmail.com

# 5. Use alternative SMTP
# Try different server/port combinations
```

### Outgoing Email Issues

#### Problem: Emails not being sent
```python
# Solutions:

# 1. Check email queue
# In Python:
from odoo.addons.mail.models.mail_mail import mail_mail
emails = self.env['mail.mail'].search([('state', '=', 'outgoing')])
for email in emails:
    print(email.state, email.message_id, email.email_to)

# 2. Force email sending
# In Odoo: Settings → Technical → Email → Email Queue
# Click "Send Now"

# 3. Check email logs
# In odoo.log or system logs:
tail -f /var/log/odoo/odoo.log | grep -i email

# 4. Test email template
# In Python:
template = self.env.ref('your_email_template')
template.send_mail(record_id, force_send=True)
```

## Web Interface Issues

### UI Problems

#### Problem: CSS/JavaScript not loading
```bash
# Solutions:

# 1. Clear browser cache
# In browser: Ctrl+Shift+R (or Cmd+Shift+R)

# 2. Check static file paths
ls -la /opt/odoo/static/

# 3. Restart Odoo
systemctl restart odoo

# 4. Check nginx configuration
# In nginx.conf:
location /web/static/ {
    alias /opt/odoo/odoo/addons/web/static/;
    expires 1h;
}

# 5. Rebuild assets
./odoo-bin -d your_database --stop-after-init --init=web
```

#### Problem: White screen or page not loading
```javascript
// Solutions:

// 1. Check browser console for errors
// Open Developer Tools → Console

// 2. Check for JavaScript errors
// Look for red error messages

// 3. Check network requests
// Open Developer Tools → Network
// Look for failed requests (404, 500, etc.)

// 4. Enable debug mode
// Add ?debug=1 to URL

// 5. Check view definitions
// Ensure views are properly defined and inherit correctly
```

### Mobile Responsiveness

#### Problem: Mobile layout issues
```css
/* Solutions: */

/* 1. Add responsive CSS */
@media (max-width: 768px) {
    .o_form_view {
        padding: 10px;
    }
    .o_kanban_view {
        overflow-x: auto;
    }
}

/* 2. Check viewport meta tag */
/* In HTML: */
<meta name="viewport" content="width=device-width, initial-scale=1.0">

/* 3. Use flexible layouts */
/* In QWeb templates: */
<div class="container-fluid">
    <div class="row">
        <div class="col-12 col-md-6">...</div>
        <div class="col-12 col-md-6">...</div>
    </div>
</div>
```

## API and Integration Problems

### REST API Issues

#### Error: "401 Unauthorized" for API calls
```python
# Problem: API authentication failure
# Solutions:

# 1. Check authentication method
# In controller:
@http.route('/api/endpoint', type='json', auth='user')  # Requires login
@http.route('/api/endpoint', type='json', auth='public')  # No auth required

# 2. Check user permissions
# In Python:
user = self.env['res.users'].browse(session.uid)
if not user.has_group('your_module.group_api_user'):
    return {'error': 'Access denied'}

# 3. Use API keys
# In controller:
@api_key = request.httprequest.headers.get('X-API-Key')
if api_key != 'your-secret-key':
    return {'error': 'Invalid API key'}

# 4. Test with curl
curl -X GET http://localhost:8069/api/endpoint \
     -H "Authorization: Bearer your_token" \
     -H "Content-Type: application/json"
```

#### Error: "400 Bad Request" for API calls
```python
# Problem: Invalid request data
# Solutions:

# 1. Validate input data
# In controller:
try:
    data = request.json
    if not data.get('name'):
        return {'error': 'Name is required'}
except ValueError:
    return {'error': 'Invalid JSON'}

# 2. Check request method
# In controller:
if request.httprequest.method != 'POST':
    return {'error': 'Method not allowed'}

# 3. Check content type
# In controller:
if not request.httprequest.content_type.startswith('application/json'):
    return {'error': 'Content-Type must be application/json'}

# 4. Debug with curl
curl -X POST http://localhost:8069/api/endpoint \
     -H "Content-Type: application/json" \
     -d '{"name": "test"}' \
     -v  # Verbose output
```

### External System Integration

#### Problem: Connection timeouts to external APIs
```python
# Solutions:

# 1. Add timeout to requests
import requests
try:
    response = requests.post(
        url,
        json=data,
        timeout=30  # 30 seconds timeout
    )
except requests.Timeout:
    return {'error': 'Request timeout'}

# 2. Implement retry logic
import time
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def call_external_api(data):
    return requests.post(url, json=data)

# 3. Use async processing
# In controller:
threading.Thread(target=self.process_async, args=(data,)).start()

# 4. Add connection pooling
import urllib3
http = urllib3.PoolManager(num_pools=10, maxsize=10)
```

## Backup and Recovery Issues

### Database Backup Problems

#### Error: "Permission denied" during backup
```bash
# Problem: Insufficient permissions for backup
# Solutions:

# 1. Check file permissions
ls -la /backup/directory/
sudo chown -R odoo:odoo /backup/directory/

# 2. Check database permissions
sudo -u postgres psql -c "SELECT pg_has_role('odoo', 'CREATEDB');"
# If false:
sudo -u postgres ALTER USER odoo CREATEDB;

# 3. Use sudo for backup
sudo -u odoo pg_dump -U odoo odoo > backup.sql

# 4. Check disk space
df -h /backup/directory/

# 5. Create backup directory if needed
sudo mkdir -p /backup/directory
sudo chown odoo:odoo /backup/directory/
```

#### Problem: Corrupted backup files
```bash
# Solutions:

# 1. Validate backup file
pg_restore --list backup.dump  # Check if file is readable
file backup.sql              # Check file type

# 2. Test restore on test database
createdb test_restore
pg_restore -U odoo test_restore < backup.dump

# 3. Use different backup format
# Instead of SQL dump:
pg_dump -U odoo -Fc odoo > backup.dump  # Custom format

# 4. Use compression with verification
pg_dump -U odoo odoo | gzip > backup.sql.gz
gzip -t backup.sql.gz  # Test integrity

# 5. Create multiple backup copies
# Use rsync for incremental backups
rsync -av --delete /data/ /backup/
```

### Filestore Recovery

#### Problem: Lost or corrupted filestore files
```bash
# Solutions:

# 1. Check filestore location
# In odoo.conf:
data_dir = /var/lib/odoo
# Filestore location: /var/lib/odoo/filestore/

# 2. Restore from backup
sudo cp -r /backup/filestore/* /var/lib/odoo/filestore/

# 3. Check database for attachments
psql -U odoo -d your_database
SELECT id, name, store_fname FROM ir_attachment WHERE store_fname IS NOT NULL;

# 4. Rebuild missing files
# In Python:
from odoo import registry
registry['ir.attachment']._cron_check_missing_attachments()

# 5. Enable file verification
# In odoo.conf:
# ir_attachment_location_hash = sha256
```

## Development Debugging

### Python Debugging

#### Problem: Module not loading correctly
```python
# Solutions:

# 1. Enable debug mode
# In odoo.conf:
log_level = debug
log_handler = ["odoo:DEBUG"]

# 2. Use Python debugger
import pdb; pdb.set_trace()  # Add this code to debug

# 3. Check module loading
import importlib
try:
    import your_module
    print("Module loaded successfully")
except ImportError as e:
    print(f"Module loading failed: {e}")

# 4. Check dependencies
# In Python:
from odoo.modules import loading
loading.load_modules(['your_module'])

# 5. Use Odoo shell
./odoo-bin shell -d your_database
# Then:
from odoo import registry
registry['your.model'].search([])
```

#### Problem: Method not being called
```python
# Solutions:

# 1. Add logging
import logging
_logger = logging.getLogger(__name__)

def your_method(self):
    _logger.info("Method called")
    # Your code here

# 2. Use breakpoints
import ipdb; ipdb.set_trace()  # Better than pdb

# 3. Check method inheritance
# Make sure method is not being overridden incorrectly

# 4. Verify button/action configuration
# In XML view:
<button name="action_method" type="object"/>

# 5. Check record state
# Ensure record is in correct state for method to be called
if self.state == 'draft':
    self.action_confirm()
```

### JavaScript Debugging

#### Problem: Frontend JavaScript errors
```javascript
// Solutions:

// 1. Enable debug mode
// Add ?debug=1 to URL

// 2. Use browser console
// Open Developer Tools → Console

// 3. Add console.log statements
console.log('Debug: variable value', variable);

// 4. Use debugger statement
debugger; // Pauses execution if dev tools open

// 5. Check network requests
// Open Developer Tools → Network
// Look for failed requests

// 6. Use Odoo debug tools
// In debug mode, you have access to:
// - Session info
// - View fields
// - Action manager
// - RPC calls
```

This comprehensive troubleshooting guide covers the most common Odoo issues and their solutions, providing both quick fixes and detailed explanations for each problem type.