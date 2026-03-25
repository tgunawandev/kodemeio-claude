# Hono.js Project Initialization

## Overview

Setting up a Hono.js project correctly is crucial for building scalable, maintainable backend services. This guide covers project initialization across different runtimes, TypeScript configuration, and development environment setup.

## Quick Start

### Create New Project

```bash
# Using npm (recommended)
npm create hono@latest my-backend

# Using yarn
yarn create hono my-backend

# Using pnpm
pnpm create hono my-backend

# Navigate to project
cd my-backend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Templates

Hono.js provides several templates for different use cases:

```bash
# Basic TypeScript template
npm create hono@latest my-backend --template ts

# With authentication
npm create hono@latest my-backend --template ts-auth

# With database (Prisma)
npm create hono@latest my-backend --template ts-prisma

# With Cloudflare Workers
npm create hono@latest my-backend --template cloudflare-workers

# With serverless deployment
npm create hono@latest my-backend --template aws-lambda
```

## Multi-Runtime Setup

### Node.js Setup (Most Common)

**Project Structure:**
```
my-hono-app/
├── src/
│   ├── index.ts          # Application entry point
│   ├── routes/           # Route definitions
│   ├── middleware/       # Custom middleware
│   ├── services/         # Business logic
│   ├── lib/             # Utilities and helpers
│   └── types/           # TypeScript type definitions
├── tests/               # Test files
├── prisma/              # Database schema (if using Prisma)
├── docker/              # Docker configuration
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

**src/index.ts:**
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

// Create Hono application
const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger())
app.use('*', prettyJSON())

// Basic route
app.get('/', (c) => {
  return c.json({
    message: 'Hello from Hono.js!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  })
})

export default app
```

**package.json:**
```json
{
  "name": "my-hono-app",
  "version": "1.0.0",
  "description": "Hono.js backend application",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,json}\"",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.8.0",
    "zod": "^3.22.0",
    "@hono/zod-validator": "^0.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "tsc-alias": "^1.8.0",
    "@types/eslint": "^8.0.0"
  }
}
```

### Deno Setup

**deno.json:**
```json
{
  "compilerOptions": {
    "allowJs": true,
    "lib": ["deno.window"],
    "strict": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  },
  "fmt": {
    "files": {
      "include": ["src/", "deno.json"]
    }
  },
  "tasks": {
    "dev": "deno run --watch src/index.ts",
    "start": "deno run src/index.ts",
    "test": "deno test",
    "cache": "deno cache --reload src/deps.ts"
  },
  "imports": {
    "hono": "https://deno.land/x/hono@v4.0.0/mod.ts",
    "zod": "https://deno.land/x/zod@v3.22.0/mod.ts"
  }
}
```

**src/index.ts:**
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

app.use('*', cors())
app.use('*', logger())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono.js on Deno!' })
})

Deno.serve(app.fetch)
```

### Bun Setup

**bun.lockb** (auto-generated)

**src/index.ts:**
```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono.js on Bun!' })
})

const port = Number(process.env.PORT) || 3000
console.log(`Server running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
```

## TypeScript Configuration

### Basic TypeScript Setup

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,
    "noUncheckedIndexedAccess": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "paths": {
      "@/*": ["./src/*"],
      "@/routes/*": ["./src/routes/*"],
      "@/middleware/*": ["./src/middleware/*"],
      "@/services/*": ["./src/services/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  "ts-node": {
    "require": ["tsconfig-paths/register"]
  }
}
```

### Advanced TypeScript Configuration

**tsconfig.build.json:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "importHelpers": false
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
    "tests/**/*"
  ]
}
```

**tsconfig.test.json:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["vitest/globals", "node"]
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "dist"
  ]
}
```

## Environment Configuration

### Environment Variables

**src/config/env.ts:**
```typescript
import { z } from 'zod'

// Define environment schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_SIZE: z.string().transform(Number).default('10'),

  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // Redis (optional)
  REDIS_URL: z.string().url().optional(),
  REDIS_PREFIX: z.string().default('hono:'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.string().transform(Boolean).default('true'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),

  // File uploads
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  UPLOAD_DIR: z.string().default('./uploads'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  SESSION_SECRET: z.string().min(32),

  // External services
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Analytics
  SENTRY_DSN: z.string().url().optional(),
  GOOGLE_ANALYTICS_ID: z.string().optional(),
})

// Validate and export environment
export const env = envSchema.parse(process.env)

// Type inference
export type Env = z.infer<typeof envSchema>

// Runtime validation
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Invalid environment variables:')
    console.error(error.errors)
    process.exit(1)
  }
}
```

**.env.example:**
```env
# Application
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hono_db"
DATABASE_POOL_SIZE=10

# Authentication
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET="your-super-secret-refresh-token-key-32-chars"
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis (optional)
REDIS_URL="redis://localhost:6379"
REDIS_PREFIX=hono:

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=pretty

# File uploads
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET="your-super-secret-session-key-32-characters-long"

# External services
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Analytics
SENTRY_DSN=https://your-sentry-dsn
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

## Development Server Setup

### Hot Reloting with tsx

**tsx.config.json:**
```json
{
  "watch": ["src"],
  "ignore": ["src/**/*.test.ts", "src/**/*.spec.ts"],
  "clearScreen": true,
  "tsconfig": "tsconfig.json"
}
```

**dev.ts (development entry point):**
```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import app from './index'

const port = env.PORT
const host = env.HOST

console.log(`🚀 Development server running at http://${host}:${port}`)
console.log(`📊 Health check: http://${host}:${port}/health`)
console.log(`📚 Environment: ${env.NODE_ENV}`)

serve({
  fetch: app.fetch,
  port,
  hostname: host,
})
```

### Custom Development Scripts

**scripts/dev.ts:**
```typescript
#!/usr/bin/env tsx

import { spawn } from 'child_process'
import { watch } from 'chokidar'
import { validateEnv } from '../src/config/env'

// Validate environment before starting
validateEnv()

console.log('🔧 Development environment validated')

// Watch for TypeScript files
const watcher = watch(['src/**/*.ts'], {
  ignored: ['**/*.test.ts', '**/*.spec.ts'],
  persistent: true,
})

let serverProcess: any = null

function startServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
  }

  console.log('🔄 Restarting development server...')

  serverProcess = spawn('tsx', ['watch', 'src/index.ts'], {
    stdio: 'inherit',
    env: process.env,
  })

  serverProcess.on('error', (error) => {
    console.error('❌ Server error:', error)
  })

  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Server process exited with code ${code}`)
    }
  })
}

// Initial server start
startServer()

// Restart on file changes
watcher.on('change', (path) => {
  console.log(`📝 File changed: ${path}`)
  startServer()
})

console.log('👀 Watching for file changes...')
console.log('Press Ctrl+C to stop development server')

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...')
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
  }
  watcher.close()
  process.exit(0)
})
```

## Code Quality Setup

### ESLint Configuration

**.eslintrc.json:**
```json
{
  "env": {
    "es2022": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error"
  },
  "ignorePatterns": [
    "dist/",
    "node_modules/",
    "*.js"
  ]
}
```

### Prettier Configuration

**.prettierrc:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "bracketSameLine": false,
  "proseWrap": "preserve"
}
```

**.prettierignore:**
```
node_modules/
dist/
build/
coverage/
*.log
.env*
```

### Git Hooks with Husky

**package.json scripts:**
```json
{
  "scripts": {
    "prepare": "husky install",
    "pre-commit": "lint-staged",
    "pre-push": "npm run type-check && npm run test:coverage"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write",
      "git add"
    ]
  },
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

## VS Code Configuration

### Recommended Extensions

**.vscode/extensions.json:**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-docker",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-thunder-client"
  ]
}
```

### Workspace Settings

**.vscode/settings.json:**
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true,
    "**/.DS_Store": true,
    "**/Thumbs.db": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  },
  "files.associations": {
    "*.env.*": "dotenv"
  },
  "emmet.includeLanguages": {
    "typescript": "html"
  }
}
```

### Debug Configuration

**.vscode/launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Hono App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/tsx/dist/cli.mjs",
      "args": ["watch", "src/index.ts"],
      "cwd": "${workspaceFolder}",
      "runtimeArgs": ["--inspect"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "restart": true,
      "protocol": "inspector"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/dist/cli.mjs",
      "args": ["run", "--reporter=verbose"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Testing Setup

### Vitest Configuration

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,js}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts'
      ],
    },
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/routes': resolve(__dirname, './src/routes'),
      '@/middleware': resolve(__dirname, './src/middleware'),
      '@/services': resolve(__dirname, './src/services'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },
})
```

**tests/setup.ts:**
```typescript
import { vi } from 'vitest'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-32-characters-long'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'

// Global test utilities
global.createTestContext = () => ({
  request: {
    method: 'GET',
    url: '/',
    headers: new Headers(),
  },
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-32-characters-long',
  },
})
```

## Docker Development Setup

### Docker Compose for Development

**docker-compose.dev.yml:**
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://dev:dev@postgres:5432/hono_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hono_dev
      - POSTGRES_USER=dev
      - POSTGRES_PASSWORD=dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d hono_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data

volumes:
  postgres_dev_data:
  redis_dev_data:
```

**Dockerfile.dev:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

## Common Setup Patterns

### Multi-Environment Configuration

**src/config/index.ts:**
```typescript
import { env } from './env'

export const config = {
  app: {
    name: 'Hono.js Backend',
    version: process.env.npm_package_version || '1.0.0',
    env: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
  },
  database: {
    url: env.DATABASE_URL,
    poolSize: env.DATABASE_POOL_SIZE,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    refreshTokenSecret: env.REFRESH_TOKEN_SECRET,
    refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
    bcryptRounds: env.BCRYPT_ROUNDS,
  },
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: env.CORS_CREDENTIALS,
  },
  redis: {
    url: env.REDIS_URL,
    prefix: env.REDIS_PREFIX,
  },
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    uploadDir: env.UPLOAD_DIR,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  services: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    sentry: {
      dsn: env.SENTRY_DSN,
    },
    analytics: {
      googleId: env.GOOGLE_ANALYTICS_ID,
    },
  },
}
```

### Application Factory Pattern

**src/app.ts:**
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { config } from './config'
import { errorHandler } from './middleware/error-handler'
import { notFoundHandler } from './middleware/not-found'

// Import routes
import userRoutes from './routes/users'
import authRoutes from './routes/auth'

export function createApp(): Hono {
  const app = new Hono()

  // Global middleware
  app.use('*', cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  }))

  app.use('*', logger({
    logFn: (message, ...rest) => {
      if (config.app.env === 'development') {
        console.log(message, ...rest)
      }
    },
  }))

  if (config.app.env === 'development') {
    app.use('*', prettyJSON())
  }

  // Health check
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      app: config.app.name,
      version: config.app.version,
      env: config.app.env,
      timestamp: new Date().toISOString(),
    })
  })

  // API routes
  app.route('/auth', authRoutes)
  app.route('/users', userRoutes)

  // Error handling
  app.use('*', errorHandler)
  app.notFound(notFoundHandler)

  return app
}
```

**src/index.ts:**
```typescript
import { createApp } from './app'
import { serve } from '@hono/node-server'

const app = createApp()

const port = config.app.port
const host = config.app.host

if (config.app.env === 'development') {
  console.log(`🚀 Development server: http://${host}:${port}`)
  console.log(`📊 Health check: http://${host}:${port}/health`)
}

serve({
  fetch: app.fetch,
  port,
  hostname: host,
})
```

## Troubleshooting

### Common Issues

1. **Module Resolution Issues**
   ```bash
   # Clear module cache
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **TypeScript Path Aliases Not Working**
   ```bash
   # Install tsconfig-paths
   npm install -D tsconfig-paths
   ```

3. **Hot Reloading Not Working**
   ```bash
   # Check if tsx is installed correctly
   npm list tsx
   npm install -D tsx@latest
   ```

4. **Environment Variables Not Loading**
   ```bash
   # Install dotenv
   npm install dotenv
   # Create .env file from .env.example
   cp .env.example .env
   ```

5. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3000
   # Kill process
   kill -9 <PID>
   ```

### Development Tips

- Use **VS Code** with recommended extensions for best experience
- Enable **hot module replacement** for faster development
- Use **environment variables** for configuration management
- Set up **linting and formatting** for code consistency
- Use **Git hooks** to enforce code quality
- Set up **debugging** configuration for easier troubleshooting
- Use **Docker** for consistent development environments

This comprehensive setup provides a solid foundation for building production-ready Hono.js applications with proper TypeScript support, development tools, and best practices.