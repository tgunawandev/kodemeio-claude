# Odoo DevOps Tools and Modern Development Patterns

Comprehensive collection of DevOps tools, Docker configurations, CI/CD pipelines, and modern development patterns for Odoo applications.

## Table of Contents

1. [Docker Development Environment](#docker-development-environment)
2. [Doodba Integration](#doodba-integration)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [CI/CD Pipelines](#cicd-pipelines)
5. [Infrastructure as Code](#infrastructure-as-code)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Performance Optimization](#performance-optimization)
8. [Security and Compliance](#security-and-compliance)

## Docker Development Environment

### Dockerfile Template

```dockerfile
# Dockerfile
FROM python:3.10-slim

# Set environment variables
ENV ODOO_VERSION=18.0
ENV ODOO_USER=odoo
ENV ODOO_HOME=/opt/odoo
ENV ODOO_DATA=/var/lib/odoo

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libldap2-dev \
    libsasl2-dev \
    libxml2-dev \
    libxslt1-dev \
    libpq-dev \
    libjpeg-dev \
    libzip-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    libtiff5-dev \
    libopenjp2-7-dev \
    tk-dev \
    tcl-dev \
    wget \
    gnupg2 \
    sudo \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install wkhtmltopdf for PDF generation
RUN wget -O wkhtmltox.deb https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-2/wkhtmltox_0.12.6.1-2.bookworm_amd64.deb \
    && dpkg -i wkhtmltox.deb \
    && apt-get -f install -y \
    && rm wkhtmltox.deb

# Create odoo user
RUN useradd --system --home=$ODOO_HOME --shell=/bin/bash $ODOO_USER

# Install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt

# Create necessary directories
RUN mkdir -p $ODOO_DATA $ODOO_HOME/addons $ODOO_HOME/enterprise $ODOO_HOME/design-themes \
    && chown -R $ODOO_USER:$ODOO_USER $ODOO_HOME $ODOO_DATA

# Copy odoo source
COPY --chown=$ODOO_USER:$ODOO_USER . $ODOO_HOME/

# Copy entrypoint script
COPY --chown=$ODOO_USER:$ODOO_USER docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER $ODOO_USER
WORKDIR $ODOO_HOME

EXPOSE 8069 8071 8072

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["odoo"]
```

### Docker Compose Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: odoo
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: odoo123
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U odoo"]
      interval: 30s
      timeout: 10s
      retries: 3

  odoo:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      ODOO_RC: /etc/odoo/odoo.conf
      ODOO_VERSION: 18.0
      ODOO_DB_HOST: db
      ODOO_DB_PORT: 5432
      ODOO_DB_USER: odoo
      ODOO_DB_PASSWORD: odoo123
      ODOO_DB_NAME: odoo
      ODOO_ADMIN_PASSWD: admin
      ODOO_ADDONS_PATH: /mnt/extra-addons,/mnt/enterprise-addons,/mnt/design-themes
      ODOO_WORKERS: 4
      ODOO_MAX_CRON_THREADS: 2
      ODOO_LIMIT_TIME_CPU: 600
      ODOO_LIMIT_TIME_REAL: 1200
      ODOO_LIMIT_MEMORY_SOFT: 1073741824  # 1GB
      ODOO_LIMIT_MEMORY_HARD: 2147483648  # 2GB
    volumes:
      - odoo_data:/var/lib/odoo
      - ./config:/etc/odoo
      - ./addons:/mnt/extra-addons
      - ./enterprise:/mnt/enterprise-addons
      - ./design-themes:/mnt/design-themes
      - ./log:/var/log/odoo
    ports:
      - "8069:8069"
      - "8071:8071"
      - "8072:8072"
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    command: ["odoo", "--dev=reload,qweb,xml"]

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - odoo
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    restart: unless-stopped

volumes:
  postgres_data:
  odoo_data:
  redis_data:

networks:
  default:
    driver: bridge
```

### Docker Configuration Files

```ini
# config/odoo.conf
[options]
database = odoo
db_host = db
db_port = 5432
db_user = odoo
db_password = odoo123
db_maxconn = 64

admin_passwd = admin
list_db = True

addons_path = /mnt/extra-addons,/mnt/enterprise-addons,/mnt/design-themes
data_dir = /var/lib/odoo

workers = 4
max_cron_threads = 2
limit_time_cpu = 600
limit_time_real = 1200
limit_memory_soft = 1073741824
limit_memory_hard = 2147483648

server_wide_modules = base,web

log_level = info
log_handler = [":INFO"]
logfile = /var/log/odoo/odoo.log
logrotate = True

proxy_mode = True

# Email configuration for development (using MailHog)
smtp_server = mailhog
smtp_port = 1025
smtp_ssl = False

# Performance optimizations
unaccent = True
db_template = template0
```

```nginx
# nginx/default.conf
upstream odoo {
    server odoo:8069;
}

upstream odoo-imap {
    server odoo:8072;
}

upstream odoo-longpolling {
    server odoo:8071;
}

server {
    listen 80;
    server_name localhost;

    client_max_body_size 4G;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    gzip on;
    gzip_min_length 1k;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Main odoo
    location / {
        proxy_pass http://odoo;
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Long polling
    location /longpolling {
        proxy_pass http://odoo-longpolling;
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # IMAP proxy for mail
    location /web/dataset/call_kw/ir.mail_server/imap_test {
        proxy_pass http://odoo-imap;
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Doodba Integration

### Doodba Docker Compose

```yaml
# docker-compose.doodba.yml
version: '3.8'

services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: prod
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: odoopassword
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./scripts/odoo-backup.sh:/docker-entrypoint-initdb.d/odoo-backup.sh
    restart: unless-stopped

  odoo:
    image: ghcr.io/tecnativa/doodba:${ODOO_VERSION}-onbuild
    environment:
      ODOO_RC: /opt/odoo/auto/odoo.conf
      DB_MAXCONN: 64
      LIST_DB: False
      ADMIN_PASSWD: admin
      SMTP_SERVER: mailhog
      SMTP_PORT: 1025
      SMTP_SSL: False
      WITHOUT_DEMO: True
    depends_on:
      - db
    volumes:
      - odoo_data:/var/lib/odoo
      - ./addons:/opt/odoo/custom/src/odoo/addons
      - ./enterprise:/opt/odoo/custom/src/enterprise
      - ./odoo:/opt/odoo/custom/src/odoo
    ports:
      - "8069:8069"
      - "8072:8072"
    restart: unless-stopped

  backup:
    image: ghcr.io/tecnativa/doodba-dump:${ODOO_VERSION}
    environment:
      POSTGRES_DB: prod
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: odoopassword
      POSTGRES_HOST: db
      AWS_S3_BUCKET: your-backup-bucket
      AWS_ACCESS_KEY_ID: your-access-key
      AWS_SECRET_ACCESS_KEY: your-secret-key
    volumes:
      - ./backups:/backup
    depends_on:
      - db
    restart: unless-stopped

  smtp:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - odoo
    restart: unless-stopped

volumes:
  db_data:
  odoo_data:
```

### Doodba Configuration

```ini
# odoo.conf
[options]
database = prod
db_host = db
db_port = 5432
db_user = odoo
db_password = odoopassword
db_maxconn = 64
db_template = template0

admin_passwd = admin
list_db = False

addons_path = /opt/odoo/custom/src,/mnt/extra-addons,/mnt/enterprise-addons
data_dir = /var/lib/odoo

workers = 4
max_cron_threads = 2
limit_time_cpu = 600
limit_time_real = 1200
limit_memory_soft = 1073741824
limit_memory_hard = 2147483648

server_wide_modules = base,web
unaccent = True

log_level = info
log_handler = [":INFO"]
logfile = /var/log/odoo/odoo.log
logrotate = True

proxy_mode = True

# Email
smtp_server = smtp
smtp_port = 1025
smtp_ssl = False

# Backup configuration
backup_frequency = daily
backup_retention = 30
backup_location = s3://your-backup-bucket
```

### Backup Scripts

```bash
#!/bin/bash
# scripts/odoo-backup.sh
set -e

# Create backup directory
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="prod"

echo "Starting backup for database: $DB_NAME"

# Create database backup
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Create file backup
tar -czf $BACKUP_DIR/filestore_$DATE.tar.gz /var/lib/odoo/filestore

echo "Backup completed: $BACKUP_DIR/backup_$DATE.sql"
echo "Filestore backup: $BACKUP_DIR/filestore_$DATE.tar.gz"

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "filestore_*.tar.gz" -mtime +30 -delete

echo "Backup process completed successfully"
```

## Kubernetes Deployment

### Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: odoo
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: odoo-config
  namespace: odoo
data:
  odoo.conf: |
    [options]
    database = odoo
    db_host = postgres
    db_port = 5432
    db_user = odoo
    db_password = odoopassword
    db_maxconn = 64
    admin_passwd = admin
    list_db = False
    addons_path = /mnt/extra-addons,/mnt/enterprise-addons
    data_dir = /var/lib/odoo
    workers = 4
    max_cron_threads = 2
    limit_time_cpu = 600
    limit_time_real = 1200
    limit_memory_soft = 1073741824
    limit_memory_hard = 2147483648
    server_wide_modules = base,web
    unaccent = True
    log_level = info
    log_handler = [":INFO"]
    logfile = /var/log/odoo/odoo.log
    proxy_mode = True
    smtp_server = smtp
    smtp_port = 1025
    smtp_ssl = False
---
# k8s/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: odoo-data
  namespace: odoo
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: odoo
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: odoo-secrets
  namespace: odoo
type: Opaque
data:
  db-password: b2Rvb3Bhc3N3b3Jk  # Base64 encoded: odoopassword
  admin-password: YWRtaW4=        # Base64 encoded: admin
---
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: odoo
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:13
        env:
        - name: POSTGRES_DB
          value: odoo
        - name: POSTGRES_USER
          value: odoo
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: odoo-secrets
              key: db-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 20Gi
---
# k8s/odoo.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: odoo
  namespace: odoo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: odoo
  template:
    metadata:
      labels:
        app: odoo
    spec:
      containers:
      - name: odoo
        image: your-odoo-image:18.0
        ports:
        - containerPort: 8069
        - containerPort: 8071
        - containerPort: 8072
        env:
        - name: ODOO_RC
          value: /etc/odoo/odoo.conf
        - name: ADMIN_PASSWD
          valueFrom:
            secretKeyRef:
              name: odoo-secrets
              key: admin-password
        volumeMounts:
        - name: odoo-config
          mountPath: /etc/odoo
        - name: odoo-storage
          mountPath: /var/lib/odoo
        - name: addons-storage
          mountPath: /mnt/extra-addons
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /web/database/manager
            port: 8069
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /web/database/manager
            port: 8069
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: odoo-config
        configMap:
          name: odoo-config
      - name: odoo-storage
        persistentVolumeClaim:
          claimName: odoo-data
      - name: addons-storage
        emptyDir: {}
---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: odoo
  namespace: odoo
spec:
  selector:
    app: odoo
  ports:
  - name: http
    port: 80
    targetPort: 8069
  - name: longpolling
    port: 8071
    targetPort: 8071
  - name: imap
    port: 8072
    targetPort: 8072
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: odoo
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: odoo-ingress
  namespace: odoo
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "4g"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "75"
spec:
  tls:
  - hosts:
    - odoo.yourdomain.com
    secretName: odoo-tls
  rules:
  - host: odoo.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: odoo
            port:
              number: 80
```

### Kubernetes Deployment Scripts

```bash
#!/bin/bash
# scripts/deploy-k8s.sh
set -e

NAMESPACE="odoo"
ODOO_VERSION="18.0"
IMAGE_TAG="latest"

echo "Deploying Odoo to Kubernetes..."

# Create namespace
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Deploy configuration
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Deploy storage
kubectl apply -f k8s/pvc.yaml

# Deploy database
kubectl apply -f k8s/postgres.yaml

# Wait for database to be ready
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s

# Deploy Odoo
kubectl apply -f k8s/odoo.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for Odoo to be ready
echo "Waiting for Odoo to be ready..."
kubectl wait --for=condition=available deployment/odoo -n $NAMESPACE --timeout=600s

# Get ingress URL
INGRESS_URL=$(kubectl get ingress odoo-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')

echo "Deployment completed successfully!"
echo "Odoo is available at: https://$INGRESS_URL"
echo "Default admin password: admin"
```

## CI/CD Pipelines

### GitHub Actions Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  PYTHON_VERSION: '3.10'
  ODOO_VERSION: '18.0'
  POSTGRES_VERSION: '13'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}

    - name: Install dependencies
      run: |
        pip install flake8 isort pylint
        pip install -r requirements.txt

    - name: Lint with flake8
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

    - name: Check import order with isort
      run: isort --check-only --diff .

    - name: Pylint analysis
      run: pylint --exit-zero $(git ls-files '*.py')

  test:
    runs-on: ubuntu-latest
    needs: lint

    services:
      postgres:
        image: postgres:${{ env.POSTGRES_VERSION }}
        env:
          POSTGRES_PASSWORD: odoo
          POSTGRES_USER: odoo
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}

    - name: Cache pip dependencies
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
        restore-keys: |
          ${{ runner.os }}-pip-

    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r test-requirements.txt

    - name: Install wkhtmltopdf
      run: |
        wget -O wkhtmltox.deb https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-2/wkhtmltox_0.12.6.1-2-bookworm_amd64.deb
        sudo dpkg -i wkhtmltox.deb || sudo apt-get install -f -y

    - name: Run tests
      run: |
        pytest --cov=addons --cov-report=xml --cov-report=html tests/
      env:
        ODOO_TEST_DB: test
        ODOO_DB_HOST: localhost
        ODOO_DB_PORT: 5432
        ODOO_DB_USER: odoo
        ODOO_DB_PASSWORD: odoo

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml

  security:
    runs-on: ubuntu-latest
    needs: lint

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}

    - name: Install dependencies
      run: |
        pip install bandit safety
        pip install -r requirements.txt

    - name: Run security scan with bandit
      run: bandit -r . -f json -o bandit-report.json || true

    - name: Check dependencies for security vulnerabilities
      run: safety check --json --output safety-report.json || true

    - name: Upload security reports
      uses: actions/upload-artifact@v3
      with:
        name: security-reports
        path: |
          bandit-report.json
          safety-report.json

  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ghcr.io/${{ github.repository }}:latest
          ghcr.io/${{ github.repository }}:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
    - uses: actions/checkout@v3

    - name: Set up kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.24.0'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to Kubernetes
      run: |
        export KUBECONFIG=kubeconfig
        sed -i "s|ghcr.io/your-odoo-image:latest|ghcr.io/${{ github.repository }}:${{ github.sha }}|" k8s/odoo.yaml
        kubectl apply -f k8s/
        kubectl rollout status deployment/odoo -n odoo

    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        text: 'Odoo has been deployed to production!'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - test
  - security
  - build
  - deploy

variables:
  PYTHON_VERSION: '3.10'
  ODOO_VERSION: '18.0'
  POSTGRES_VERSION: '13'

cache:
  paths:
    - .cache/pip
    - node_modules/

# Validate stage
lint:
  stage: validate
  image: python:${PYTHON_VERSION}-slim
  before_script:
    - pip install flake8 isort pylint
    - pip install -r requirements.txt
  script:
    - flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
    - flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    - isort --check-only --diff .
    - pylint --exit-zero $(git ls-files '*.py')
  artifacts:
    reports:
      junit: lint-report.xml

# Test stage
test:
  stage: test
  image: python:${PYTHON_VERSION}-slim
  services:
    - name: postgres:${POSTGRES_VERSION}
      alias: postgres
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: odoo
    POSTGRES_PASSWORD: odoo
    POSTGRES_HOST_AUTH_METHOD: trust
  before_script:
    - apt-get update && apt-get install -y wget
    - pip install -r requirements.txt
    - pip install -r test-requirements.txt
    - wget -O wkhtmltox.deb https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-2/wkhtmltox_0.12.6.1-2-bookworm_amd64.deb
    - dpkg -i wkhtmltox.deb || apt-get install -f -y
  script:
    - pytest --cov=addons --cov-report=xml --cov-report=html --junitxml=test-report.xml tests/
  coverage: '/TOTAL.+?(\d+\%)$/'
  artifacts:
    reports:
      junit: test-report.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

# Security stage
security:
  stage: security
  image: python:${PYTHON_VERSION}-slim
  before_script:
    - pip install bandit safety
    - pip install -r requirements.txt
  script:
    - bandit -r . -f json -o bandit-report.json || true
    - safety check --json --output safety-report.json || true
  artifacts:
    paths:
      - bandit-report.json
      - safety-report.json

# Build stage
build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main
    - develop

# Deploy stage
deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  before_script:
    - kubectl config use-context $KUBE_CONTEXT
  script:
    - sed -i "s|ghcr.io/your-odoo-image:latest|$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA|" k8s/odoo.yaml
    - kubectl apply -f k8s/
    - kubectl rollout status deployment/odoo -n odoo
  environment:
    name: production
    url: https://odoo.yourdomain.com
  only:
    - main
```

## Infrastructure as Code

### Terraform Configuration

```hcl
# terraform/main.tf
provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "odoo_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "odoo-vpc"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "odoo_igw" {
  vpc_id = aws_vpc.odoo_vpc.id

  tags = {
    Name = "odoo-igw"
  }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.odoo_vpc.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name        = "odoo-public-subnet-${count.index + 1}"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.odoo_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "odoo-private-subnet-${count.index + 1}"
    Environment = var.environment
  }
}

# EKS Cluster
resource "aws_eks_cluster" "odoo_cluster" {
  name     = "odoo-cluster"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.24"

  vpc_config {
    subnet_ids = concat(
      aws_subnet.public[*].id,
      aws_subnet.private[*].id
    )
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]

  tags = {
    Name        = "odoo-eks-cluster"
    Environment = var.environment
  }
}

resource "aws_eks_node_group" "odoo_nodes" {
  cluster_name    = aws_eks_cluster.odoo_cluster.name
  node_group_name = "odoo-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = 3
    max_size     = 6
    min_size     = 2
  }

  instance_types = ["t3.medium"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = {
    Name        = "odoo-node-group"
    Environment = var.environment
  }
}

# RDS Database
resource "aws_db_instance" "odoo_db" {
  identifier = "odoo-rds"

  engine         = "postgres"
  engine_version = "13.7"
  instance_class = "db.t3.medium"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = "odoo"
  username = "odoo"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.odoo.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = false
  final_snapshot_identifier = "odoo-rds-final-snapshot"

  tags = {
    Name        = "odoo-rds"
    Environment = var.environment
  }
}

# S3 for backups
resource "aws_s3_bucket" "odoo_backups" {
  bucket = "odoo-backups-${var.environment}-${random_id.bucket_suffix.result}"

  tags = {
    Name        = "odoo-backups"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "odoo_backups" {
  bucket = aws_s3_bucket.odoo_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "odoo_backups" {
  bucket = aws_s3_bucket.odoo_backups.id

  rule {
    id     = "backup_lifecycle"
    status = "Enabled"

    filter {
      prefix = "backups/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# CloudFront CDN
resource "aws_cloudfront_distribution" "odoo_cdn" {
  origin {
    domain_name = aws_lb.odoo_alb.dns_name
    origin_id   = "odoo-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "web"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "odoo-alb"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "odoo-cdn"
    Environment = var.environment
  }
}
```

### Ansible Playbooks

```yaml
# ansible/playbooks/deploy-odoo.yml
---
- name: Deploy Odoo on servers
  hosts: odoo_servers
  become: yes
  vars_files:
    - vars/secrets.yml
    - vars/{{ environment }}.yml

  tasks:
    - name: Update system packages
      apt:
        update_cache: yes
        upgrade: dist
      when: ansible_os_family == "Debian"

    - name: Install required system packages
      apt:
        name:
          - python3
          - python3-pip
          - python3-dev
          - build-essential
          - libxml2-dev
          - libxslt1-dev
          - libldap2-dev
          - libsasl2-dev
          - libtiff5-dev
          - libjpeg-dev
          - libzip-dev
          - zlib1g-dev
          - libpq-dev
          - git
          - curl
          - wget
          - gnupg2
          - sudo
          - postgresql-client
          - nginx
        state: present

    - name: Create odoo user
      user:
        name: odoo
        system: yes
        shell: /bin/bash
        home: /opt/odoo
        create_home: yes

    - name: Create required directories
      file:
        path: "{{ item }}"
        state: directory
        owner: odoo
        group: odoo
        mode: '0755'
      loop:
        - /opt/odoo
        - /var/lib/odoo
        - /var/log/odoo
        - /etc/odoo

    - name: Install wkhtmltopdf
      apt:
        deb: https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-2/wkhtmltox_0.12.6.1-2-bookworm_amd64.deb

    - name: Clone Odoo repository
      git:
        repo: 'https://github.com/odoo/odoo.git'
        dest: /opt/odoo/odoo
        version: "{{ odoo_version }}"
        depth: 1
      become_user: odoo

    - name: Install Python dependencies
      pip:
        requirements: /opt/odoo/odoo/requirements.txt
        virtualenv: /opt/odoo/venv
        virtualenv_command: /usr/bin/python3 -m venv

    - name: Create odoo configuration file
      template:
        src: templates/odoo.conf.j2
        dest: /etc/odoo/odoo.conf
        owner: odoo
        group: odoo
        mode: '0640'

    - name: Create systemd service for Odoo
      template:
        src: templates/odoo.service.j2
        dest: /etc/systemd/system/odoo.service
        mode: '0644'
      notify:
        - restart odoo

    - name: Configure Nginx
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/sites-available/odoo
        mode: '0644'
      notify:
        - restart nginx

    - name: Enable nginx site
      file:
        src: /etc/nginx/sites-available/odoo
        dest: /etc/nginx/sites-enabled/odoo
        state: link
      notify:
        - restart nginx

    - name: Ensure services are running
      systemd:
        name: "{{ item }}"
        state: started
        enabled: yes
      loop:
        - odoo
        - nginx

  handlers:
    - name: restart odoo
      systemd:
        name: odoo
        state: restarted

    - name: restart nginx
      systemd:
        name: nginx
        state: restarted
```

## Monitoring and Logging

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "odoo_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'odoo'
    static_configs:
      - targets: ['odoo:8069']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "Odoo Performance Dashboard",
    "tags": ["odoo", "performance"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "odoo_active_users_total",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "displayMode": "list",
              "orientation": "horizontal"
            },
            "mappings": [],
            "thresholds": {
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            }
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "odoo_db_connections",
            "refId": "A"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 0
        }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### ELK Stack Configuration

```yaml
# logging/elasticsearch.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    restart: unless-stopped

  logstash:
    image: docker.elastic.co/logstash/logstash:7.17.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - ./logstash/config:/usr/share/logstash/config
      - ./log/odoo:/var/log/odoo
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:7.17.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch
    restart: unless-stopped

volumes:
  elasticsearch_data:
```

## Performance Optimization

### Database Optimization

```sql
-- Database optimization scripts
-- Create indexes for frequently queried fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_res_partner_active ON res_partner(active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_order_state ON sale_order(state) WHERE state IN ('draft', 'sent', 'sale');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_move_product_date ON stock_move(product_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_account_move_line_account_date ON account_move_line(account_id, date);

-- Partition large tables
CREATE TABLE account_move_line_partitioned (
    LIKE account_move_line INCLUDING ALL
) PARTITION BY RANGE (date);

CREATE TABLE account_move_line_2023 PARTITION OF account_move_line_partitioned
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE account_move_line_2024 PARTITION OF account_move_line_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Optimize PostgreSQL configuration
-- postgresql.conf optimizations
-- shared_buffers = 256MB (25% of RAM)
-- effective_cache_size = 1GB (75% of RAM)
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
```

### Odoo Performance Tuning

```ini
# odoo.conf performance optimizations
[options]
# Database optimization
db_maxconn = 64
db_template = template0

# Worker configuration
workers = 4
max_cron_threads = 2
limit_time_cpu = 600
limit_time_real = 1200
limit_memory_soft = 1073741824  # 1GB
limit_memory_hard = 2147483648  # 2GB

# Performance improvements
unaccent = True
proxy_mode = True
ir_attachment_location_prefix = web/content
log_db_max_level = warning

# Caching
cache_timeout = 3600

# Email optimization
smtp_send_limit = 20
```

This comprehensive DevOps guide provides modern development patterns and deployment strategies for Odoo applications, covering everything from local development to enterprise-scale Kubernetes deployments.