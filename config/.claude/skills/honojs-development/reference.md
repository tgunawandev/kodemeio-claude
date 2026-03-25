# Hono.js Backend Development - Comprehensive Technical Reference

**The definitive guide to building ultra-fast backend services with Hono.js**

---

## 📚 Table of Contents

1. [Hono.js Architecture](#honojs-architecture)
2. [Project Setup and Configuration](#project-setup-and-configuration)
3. [Core Routing and Middleware](#core-routing-and-middleware)
4. [Request/Response Handling](#requestresponse-handling)
5. [Authentication and Security](#authentication-and-security)
6. [Database Integration](#database-integration)
7. [API Development Patterns](#api-development-patterns)
8. [Testing and Quality Assurance](#testing-and-quality-assurance)
9. [Performance Optimization](#performance-optimization)
10. [Deployment Strategies](#deployment-strategies)
11. [Monitoring and Observability](#monitoring-and-observability)
12. [Error Handling and Debugging](#error-handling-and-debugging)

---

## Hono.js Architecture

### Core Principles

Hono.js is built on Web Standards with these core principles:

```typescript
// Hono.js core architecture
import { Hono } from 'hono'

// The fundamental Hono application
const app = new Hono()

// Context-based request handling
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Multi-runtime support
export default {
  // Node.js
  fetch: app.fetch,

  // Cloudflare Workers
  fetch: app.fetch,

  // Deno/Bun (native)
  app
}
```

### Performance Characteristics

- **Ultra-Fast**: Built on Web Standards for maximum performance
- **Small Bundle Size**: ~13KB minified and gzipped
- **Zero Dependencies**: Core framework has no external dependencies
- **Smart Routing**: Trie-based routing for O(1) route matching
- **Middleware Chain**: Efficient middleware execution with early termination

### Multi-Runtime Support

```typescript
// Universal application that works everywhere
import { Hono } from 'hono'

const app = new Hono()

// Your application logic
app.get('/api/users', async (c) => {
  const users = await getUsers()
  return c.json(users)
})

// Export for different runtimes
export default app

// For Cloudflare Workers
// export default { fetch: app.fetch }

// For Deno Deploy
// export default app

// For Node.js with custom server
// import { serve } from '@hono/node-server'
// serve({ fetch: app.fetch, port: 3000 })
```

## Project Setup and Configuration

### Basic Project Initialization

```bash
# Create new project
npm create hono@latest my-backend
cd my-backend

# Or with specific template
npm create hono@latest my-backend --template ts

# Install dependencies
npm install

# Development server
npm run dev
```

### TypeScript Configuration

**tsconfig.json**
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
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**package.json Scripts**
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### Environment Configuration

**src/config/env.ts**
```typescript
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  REDIS_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
```

## Core Routing and Middleware

### Advanced Routing Patterns

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

// Static routing
app.get('/api/users', getUsersHandler)
app.post('/api/users', createUserHandler)

// Dynamic routing with parameters
app.get('/api/users/:id', getUserHandler)
app.put('/api/users/:id', updateUserHandler)

// Wildcard routing
app.get('/api/files/*', getFileHandler)

// Route groups with middleware
const apiRoutes = new Hono()
apiRoutes.use('*', authMiddleware())
apiRoutes.get('/users', getUsers)
apiRoutes.post('/users', createUser)

app.route('/api', apiRoutes)

// Parameter validation
const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18).optional(),
})

app.post('/api/users',
  zValidator('json', userSchema),
  async (c) => {
    const data = c.req.valid('json')
    // data is now validated and typed
    return c.json({ message: 'User created', data })
  }
)

// Custom validation middleware
const validateId = async (c: Context, next: Next) => {
  const id = c.req.param('id')

  if (!id || !/^[a-f0-9-]{36}$/.test(id)) {
    return c.json({ error: 'Invalid ID format' }, 400)
  }

  await next()
}

app.get('/api/users/:id', validateId, getUserHandler)
```

### Middleware Development

```typescript
import { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'

// Authentication middleware
export const authMiddleware = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const token = c.req.header('Authorization')

    if (!token) {
      return c.json({ error: 'No token provided' }, 401)
    }

    try {
      const user = await verifyToken(token.replace('Bearer ', ''))
      c.set('user', user)
      await next()
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401)
    }
  })
}

// CORS middleware
export const corsMiddleware = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    c.header('Access-Control-Allow-Origin', c.env.CORS_ORIGIN)
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (c.req.method === 'OPTIONS') {
      return c.text('', 200)
    }

    await next()
  })
}

// Rate limiting middleware
export const rateLimitMiddleware = (options: {
  requests: number
  window: number
}) => {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return createMiddleware(async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const windowStart = now - options.window

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < now) {
        requests.delete(key)
      }
    }

    const current = requests.get(ip)

    if (!current || current.resetTime < now) {
      requests.set(ip, { count: 1, resetTime: now + options.window })
      await next()
    } else if (current.count < options.requests) {
      current.count++
      await next()
    } else {
      return c.json({ error: 'Rate limit exceeded' }, 429)
    }
  })
}

// Logging middleware
export const loggingMiddleware = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const start = Date.now()
    const method = c.req.method
    const path = new URL(c.req.url).pathname

    console.log(`${method} ${path} - Start`)

    await next()

    const duration = Date.now() - start
    const status = c.res.status

    console.log(`${method} ${path} - ${status} (${duration}ms)`)
  })
}

// Error handling middleware
export const errorHandler = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    try {
      await next()
    } catch (error) {
      console.error('Error:', error)

      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400)
      } else if (error instanceof AuthenticationError) {
        return c.json({ error: error.message }, 401)
      } else if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404)
      } else {
        return c.json({ error: 'Internal server error' }, 500)
      }
    }
  })
}
```

## Request/Response Handling

### Type-Safe Request Handling

```typescript
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

// Request body validation with typing
const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user']).default('user'),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    notifications: z.boolean().default(true),
  }).optional(),
})

type CreateUserInput = z.infer<typeof CreateUserSchema>

app.post('/api/users',
  zValidator('json', CreateUserSchema),
  async (c: Context) => {
    const userData: CreateUserInput = c.req.valid('json')

    // userData is fully typed
    const user = await createUser(userData)

    return c.json({
      success: true,
      data: user,
    })
  }
)

// Query parameter validation
const QuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional(),
  sort: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
})

app.get('/api/users',
  zValidator('query', QuerySchema),
  async (c: Context) => {
    const query = c.req.valid('query')

    const users = await getUsers({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sort: query.sort,
    })

    return c.json(users)
  }
)

// File upload handling
app.post('/api/upload',
  async (c: Context) => {
    const body = await c.req.parseBody()
    const file = body.file as File

    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validate file
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return c.json({ error: 'File too large' }, 400)
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type' }, 400)
    }

    // Save file
    const url = await saveFile(file)

    return c.json({
      success: true,
      url,
      filename: file.name,
      size: file.size,
    })
  }
)
```

### Advanced Response Handling

```typescript
// Response helper utilities
class ResponseHelper {
  static success<T>(c: Context, data: T, meta?: any) {
    return c.json({
      success: true,
      data,
      meta,
    })
  }

  static error(c: Context, message: string, code: number = 400, details?: any) {
    return c.json({
      success: false,
      error: message,
      details,
    }, code)
  }

  static paginated<T>(c: Context, items: T[], page: number, limit: number, total: number) {
    return c.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  }

  static created<T>(c: Context, data: T, location?: string) {
    if (location) {
      c.header('Location', location)
    }
    return c.json({
      success: true,
      data,
    }, 201)
  }

  static noContent(c: Context) {
    return c.text('', 204)
  }
}

// Usage in handlers
app.get('/api/users', async (c: Context) => {
  const users = await getUsers()
  return ResponseHelper.success(c, users)
})

app.post('/api/users', async (c: Context) => {
  const userData = await c.req.json()
  const user = await createUser(userData)

  return ResponseHelper.created(
    c,
    user,
    `/api/users/${user.id}`
  )
})

app.delete('/api/users/:id', async (c: Context) => {
  await deleteUser(c.req.param('id'))
  return ResponseHelper.noContent(c)
})
```

## Authentication and Security

### JWT Authentication

```typescript
import jwt from 'jsonwebtoken'
import { sign, verify } from 'hono/jwt'

// JWT service
class JWTService {
  private secret: string

  constructor(secret: string) {
    this.secret = secret
  }

  async generateToken(payload: any, expiresIn: string = '1h'): Promise<string> {
    return sign(payload, this.secret, { expiresIn })
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return await verify(token, this.secret)
    } catch (error) {
      throw new AuthenticationError('Invalid token')
    }
  }

  async refreshToken(refreshToken: string): Promise<string> {
    const payload = await this.verifyToken(refreshToken)

    if (payload.type !== 'refresh') {
      throw new AuthenticationError('Invalid refresh token')
    }

    return this.generateToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    })
  }
}

// Authentication middleware
export const jwtAuth = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401)
    }

    const token = authHeader.substring(7)

    try {
      const jwtService = new JWTService(c.env.JWT_SECRET)
      const payload = await jwtService.verifyToken(token)

      c.set('user', {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      })

      await next()
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401)
    }
  })
}

// Login endpoint
app.post('/api/auth/login', async (c: Context) => {
  const { email, password } = await c.req.json()

  const user = await authenticateUser(email, password)
  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const jwtService = new JWTService(c.env.JWT_SECRET)

  const accessToken = await jwtService.generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  }, '15m')

  const refreshToken = await jwtService.generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  }, '7d')

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    },
  })
})

// Refresh token endpoint
app.post('/api/auth/refresh', async (c: Context) => {
  const { refreshToken } = await c.req.json()

  const jwtService = new JWTService(c.env.JWT_SECRET)

  try {
    const newAccessToken = await jwtService.refreshToken(refreshToken)

    return c.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    })
  } catch (error) {
    return c.json({ error: 'Invalid refresh token' }, 401)
  }
})
```

### OAuth 2.0 Integration

```typescript
// OAuth service for multiple providers
class OAuthService {
  private providers: Map<string, OAuthProvider> = new Map()

  constructor() {
    this.providers.set('google', new GoogleOAuthProvider())
    this.providers.set('github', new GitHubOAuthProvider())
    this.providers.set('discord', new DiscordOAuthProvider())
  }

  getAuthUrl(provider: string, redirectUri: string): string {
    const oauthProvider = this.providers.get(provider)
    if (!oauthProvider) {
      throw new Error(`Unknown OAuth provider: ${provider}`)
    }

    return oauthProvider.getAuthUrl(redirectUri)
  }

  async exchangeCodeForToken(provider: string, code: string): Promise<OAuthToken> {
    const oauthProvider = this.providers.get(provider)
    if (!oauthProvider) {
      throw new Error(`Unknown OAuth provider: ${provider}`)
    }

    return oauthProvider.exchangeCodeForToken(code)
  }

  async getUserInfo(provider: string, token: string): Promise<OAuthUser> {
    const oauthProvider = this.providers.get(provider)
    if (!oauthProvider) {
      throw new Error(`Unknown OAuth provider: ${provider}`)
    }

    return oauthProvider.getUserInfo(token)
  }
}

// OAuth routes
const oauthService = new OAuthService()

app.get('/api/auth/:provider', async (c: Context) => {
  const provider = c.req.param('provider')
  const redirectUri = `${c.req.url}/callback`

  const authUrl = oauthService.getAuthUrl(provider, redirectUri)

  return c.redirect(authUrl)
})

app.get('/api/auth/:provider/callback', async (c: Context) => {
  const provider = c.req.param('provider')
  const code = c.req.query('code')

  if (!code) {
    return c.json({ error: 'No authorization code provided' }, 400)
  }

  try {
    // Exchange code for token
    const token = await oauthService.exchangeCodeForToken(provider, code)

    // Get user info
    const userInfo = await oauthService.getUserInfo(provider, token.access_token)

    // Find or create user
    let user = await findUserByOAuth(provider, userInfo.id)

    if (!user) {
      user = await createUserFromOAuth(provider, userInfo)
    }

    // Generate JWT
    const jwtService = new JWTService(c.env.JWT_SECRET)
    const accessToken = await jwtService.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return c.json({
      success: true,
      data: {
        user,
        token: accessToken,
      },
    })
  } catch (error) {
    console.error('OAuth error:', error)
    return c.json({ error: 'OAuth authentication failed' }, 500)
  }
})
```

### Role-Based Access Control (RBAC)

```typescript
// Permission types
type Permission = string
type Role = string

interface User {
  id: string
  email: string
  roles: Role[]
}

interface RoleDefinition {
  name: Role
  permissions: Permission[]
}

// RBAC service
class RBACService {
  private roles: Map<Role, Permission[]> = new Map()
  private userRoles: Map<string, Role[]> = new Map()

  constructor() {
    this.initializeRoles()
  }

  private initializeRoles() {
    // Define role permissions
    this.roles.set('admin', [
      'users:read',
      'users:write',
      'users:delete',
      'posts:read',
      'posts:write',
      'posts:delete',
      'system:read',
      'system:write',
    ])

    this.roles.set('moderator', [
      'users:read',
      'posts:read',
      'posts:write',
      'posts:delete',
    ])

    this.roles.set('user', [
      'users:read:own',
      'posts:read',
      'posts:write:own',
    ])
  }

  hasPermission(user: User, permission: Permission): boolean {
    for (const role of user.roles) {
      const rolePermissions = this.roles.get(role) || []
      if (rolePermissions.includes(permission)) {
        return true
      }
    }
    return false
  }

  hasAnyPermission(user: User, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission))
  }

  hasAllPermissions(user: User, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission))
  }
}

// Permission middleware factory
export const requirePermission = (permission: Permission) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const user = c.get('user')

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const rbac = new RBACService()

    if (!rbac.hasPermission(user, permission)) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    await next()
  })
}

// Usage
app.delete('/api/users/:id',
  jwtAuth(),
  requirePermission('users:delete'),
  async (c: Context) => {
    await deleteUser(c.req.param('id'))
    return c.json({ success: true })
  }
)

app.get('/api/posts/:id',
  jwtAuth(),
  requirePermission('posts:read'),
  async (c: Context) => {
    const post = await getPost(c.req.param('id'))
    return c.json({ success: true, data: post })
  }
)
```

## Database Integration

### Prisma Integration

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  posts     Post[]
  profiles  Profile[]

  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("posts")
}

enum Role {
  USER
  MODERATOR
  ADMIN
}
```

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

```typescript
// User service with Prisma
export class UserService {
  async create(userData: CreateUserInput): Promise<User> {
    const user = await prisma.user.create({
      data: userData,
      include: {
        posts: true,
        profiles: true,
      },
    })

    return user
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        posts: {
          where: { published: true },
          orderBy: { createdAt: 'desc' },
        },
        profiles: true,
      },
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  async findMany(options: {
    page?: number
    limit?: number
    search?: string
    role?: Role
  }): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 10, search, role } = options
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role) {
      where.role = role
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return { users, total }
  }

  async update(id: string, userData: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: userData,
      include: {
        posts: true,
        profiles: true,
      },
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    })
  }
}
```

### Drizzle ORM Integration

```typescript
// src/db/schema.ts
import { pgTable, serial, varchar, timestamp, boolean, text } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  authorId: serial('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
```

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString)
export const db = drizzle(client, { schema })
```

```typescript
// User service with Drizzle
export class DrizzleUserService {
  async create(userData: NewUser): Promise<User> {
    const [user] = await db
      .insert(schema.users)
      .values(userData)
      .returning()

    return user
  }

  async findById(id: number): Promise<User | null> {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1)

    return user || null
  }

  async findMany(options: {
    page?: number
    limit?: number
    search?: string
  }): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 10, search } = options
    const offset = (page - 1) * limit

    let whereCondition = undefined

    if (search) {
      whereCondition = or(
        ilike(schema.users.name, `%${search}%`),
        ilike(schema.users.email, `%${search}%`)
      )
    }

    const [users, [{ count }]] = await Promise.all([
      db
        .select()
        .from(schema.users)
        .where(whereCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.users.createdAt)),

      db
        .select({ count: count() })
        .from(schema.users)
        .where(whereCondition)
    ])

    return { users, total: count }
  }

  async update(id: number, userData: Partial<NewUser>): Promise<User> {
    const [user] = await db
      .update(schema.users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning()

    return user
  }

  async delete(id: number): Promise<void> {
    await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
  }
}
```

### Database Connection Management

```typescript
// Connection pool configuration
import { Pool } from 'pg'

class DatabaseService {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(text, params)
      return result.rows
    } finally {
      client.release()
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }

  healthCheck(): Promise<boolean> {
    return this.query('SELECT 1')
      .then(() => true)
      .catch(() => false)
  }
}

export const dbService = new DatabaseService()
```

## API Development Patterns

### REST API Design

```typescript
// Resource controller pattern
abstract class BaseController {
  protected service: any

  constructor(service: any) {
    this.service = service
  }

  // Standard CRUD operations
  async index(c: Context) {
    const query = c.req.valid('query')
    const result = await this.service.findMany(query)
    return ResponseHelper.paginated(
      c,
      result.items,
      query.page,
      query.limit,
      result.total
    )
  }

  async show(c: Context) {
    const id = c.req.param('id')
    const item = await this.service.findById(id)

    if (!item) {
      return c.json({ error: 'Resource not found' }, 404)
    }

    return ResponseHelper.success(c, item)
  }

  async create(c: Context) {
    const data = c.req.valid('json')
    const item = await this.service.create(data)

    return ResponseHelper.created(
      c,
      item,
      `/${this.getResourceName()}/${item.id}`
    )
  }

  async update(c: Context) {
    const id = c.req.param('id')
    const data = c.req.valid('json')

    const item = await this.service.update(id, data)

    if (!item) {
      return c.json({ error: 'Resource not found' }, 404)
    }

    return ResponseHelper.success(c, item)
  }

  async destroy(c: Context) {
    const id = c.req.param('id')
    const success = await this.service.delete(id)

    if (!success) {
      return c.json({ error: 'Resource not found' }, 404)
    }

    return ResponseHelper.noContent(c)
  }

  protected abstract getResourceName(): string
}

// User controller implementation
class UserController extends BaseController {
  constructor() {
    super(new UserService())
  }

  protected getResourceName(): string {
    return 'users'
  }

  // Custom actions
  async me(c: Context) {
    const user = c.get('user')
    const userData = await this.service.findById(user.id)
    return ResponseHelper.success(c, userData)
  }

  async updateProfile(c: Context) {
    const user = c.get('user')
    const data = c.req.valid('json')

    const updatedUser = await this.service.update(user.id, data)
    return ResponseHelper.success(c, updatedUser)
  }
}

// Route registration
const userController = new UserController()

const userRoutes = new Hono()
userRoutes.get('/', userController.index.bind(userController))
userRoutes.get('/:id', userController.show.bind(userController))
userRoutes.post('/', userController.create.bind(userController))
userRoutes.put('/:id', userController.update.bind(userController))
userRoutes.delete('/:id', userController.destroy.bind(userController))
userRoutes.get('/me', jwtAuth(), userController.me.bind(userController))
userRoutes.put('/me', jwtAuth(), userController.updateProfile.bind(userController))

app.route('/api/users', userRoutes)
```

### GraphQL Integration

```typescript
import { Hono } from 'hono'
import { graphql } from '@hono/graphql-server'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { resolvers } from './resolvers'
import { typeDefs } from './schema'

// GraphQL schema
export const typeDefs = `
  type User {
    id: ID!
    email: String!
    name: String!
    role: String!
    posts: [Post!]!
    createdAt: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User!
    createdAt: String!
  }

  type Query {
    users(page: Int, limit: Int): [User!]!
    user(id: ID!): User
    posts(page: Int, limit: Int): [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    createUser(name: String!, email: String!, role: String): User!
    updateUser(id: ID!, name: String, email: String, role: String): User!
    deleteUser(id: ID!): Boolean!
    createPost(title: String!, content: String!, authorId: ID!): Post!
    updatePost(id: ID!, title: String, content: String, published: Boolean): Post!
    deletePost(id: ID!): Boolean!
  }
`

// GraphQL resolvers
export const resolvers = {
  Query: {
    users: async (_: any, { page = 1, limit = 10 }: any) => {
      const userService = new UserService()
      const result = await userService.findMany({ page, limit })
      return result.users
    },

    user: async (_: any, { id }: any) => {
      const userService = new UserService()
      return userService.findById(id)
    },

    posts: async (_: any, { page = 1, limit = 10 }: any) => {
      const postService = new PostService()
      const result = await postService.findMany({ page, limit })
      return result.posts
    },

    post: async (_: any, { id }: any) => {
      const postService = new PostService()
      return postService.findById(id)
    },
  },

  Mutation: {
    createUser: async (_: any, { name, email, role }: any) => {
      const userService = new UserService()
      return userService.create({ name, email, role })
    },

    updateUser: async (_: any, { id, ...data }: any) => {
      const userService = new UserService()
      return userService.update(id, data)
    },

    deleteUser: async (_: any, { id }: any) => {
      const userService = new UserService()
      await userService.delete(id)
      return true
    },

    createPost: async (_: any, { title, content, authorId }: any) => {
      const postService = new PostService()
      return postService.create({ title, content, authorId })
    },

    updatePost: async (_: any, { id, ...data }: any) => {
      const postService = new PostService()
      return postService.update(id, data)
    },

    deletePost: async (_: any, { id }: any) => {
      const postService = new PostService()
      await postService.delete(id)
      return true
    },
  },

  User: {
    posts: async (parent: any) => {
      const postService = new PostService()
      return postService.findByAuthorId(parent.id)
    },
  },

  Post: {
    author: async (parent: any) => {
      const userService = new UserService()
      return userService.findById(parent.authorId)
    },
  },
}

// GraphQL endpoint
const graphqlSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

app.use(
  '/graphql',
  graphql({
    schema: graphqlSchema,
    graphiql: process.env.NODE_ENV === 'development',
  })
)

// GraphQL playground
app.get('/graphiql', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>GraphiQL</title>
        <style>
          body { height: 100vh; margin: 0; width: 100%; overflow: hidden; }
          #graphiql { height: 100vh; }
        </style>
        <script crossorigin src="https://unpkg.com/react@17/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
      </head>
      <body>
        <div id="graphiql">Loading...</div>
        <script src="https://unpkg.com/graphiql/graphiql.min.js" type="application/javascript"></script>
        <script>
          const graphQLFetcher = (graphQLParams) =>
            fetch('/graphql', {
              method: 'post',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(graphQLParams),
            })
            .then(response => response.json());

          ReactDOM.render(
            React.createElement(GraphiQL, { fetcher: graphQLFetcher }),
            document.getElementById('graphiql'),
          );
        </script>
      </body>
    </html>
  `)
})
```

### WebSocket Implementation

```typescript
import { createWebSocketStream } from 'hono/websocket'
import { WebSocket } from 'bun'

// WebSocket service
class WebSocketService {
  private connections: Map<string, WebSocket> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  addConnection(userId: string, ws: WebSocket): void {
    this.connections.set(userId, ws)

    ws.on('message', (message) => {
      this.handleMessage(userId, message)
    })

    ws.on('close', () => {
      this.removeConnection(userId)
    })
  }

  removeConnection(userId: string): void {
    const ws = this.connections.get(userId)
    if (ws) {
      ws.close()
      this.connections.delete(userId)
    }

    // Remove from all rooms
    for (const [roomName, members] of this.rooms) {
      members.delete(userId)
      if (members.size === 0) {
        this.rooms.delete(roomName)
      }
    }
  }

  joinRoom(userId: string, roomName: string): void {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set())
    }
    this.rooms.get(roomName)!.add(userId)
  }

  leaveRoom(userId: string, roomName: string): void {
    const room = this.rooms.get(roomName)
    if (room) {
      room.delete(userId)
      if (room.size === 0) {
        this.rooms.delete(roomName)
      }
    }
  }

  sendToUser(userId: string, message: any): boolean {
    const ws = this.connections.get(userId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
      return true
    }
    return false
  }

  sendToRoom(roomName: string, message: any, excludeUserId?: string): void {
    const room = this.rooms.get(roomName)
    if (room) {
      for (const userId of room) {
        if (userId !== excludeUserId) {
          this.sendToUser(userId, message)
        }
      }
    }
  }

  broadcast(message: any): void {
    for (const [userId] of this.connections) {
      this.sendToUser(userId, message)
    }
  }

  private handleMessage(userId: string, message: string | Buffer): void {
    try {
      const data = JSON.parse(message.toString())

      switch (data.type) {
        case 'join_room':
          this.joinRoom(userId, data.roomName)
          this.sendToUser(userId, { type: 'joined_room', roomName: data.roomName })
          break

        case 'leave_room':
          this.leaveRoom(userId, data.roomName)
          this.sendToUser(userId, { type: 'left_room', roomName: data.roomName })
          break

        case 'room_message':
          this.sendToRoom(data.roomName, {
            type: 'room_message',
            roomName: data.roomName,
            userId,
            message: data.message,
            timestamp: new Date().toISOString(),
          }, userId)
          break

        case 'ping':
          this.sendToUser(userId, { type: 'pong' })
          break
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
    }
  }

  getConnectionCount(): number {
    return this.connections.size
  }

  getRoomCount(): number {
    return this.rooms.size
  }
}

// WebSocket routes
const wsService = new WebSocketService()

app.get('/ws', async (c) => {
  if (c.req.header('upgrade') !== 'websocket') {
    return c.text('Expected websocket connection', 400)
  }

  const userId = c.req.query('userId') || c.req.header('x-user-id')
  if (!userId) {
    return c.text('User ID required', 400)
  }

  return createWebSocketStream(async (stream) => {
    const ws = await stream.upgrade()
    wsService.addConnection(userId, ws)
  })
})

// Real-time chat API endpoints
app.post('/api/chat/rooms', jwtAuth(), async (c: Context) => {
  const { name, description } = await c.req.json()
  const user = c.get('user')

  const room = await createChatRoom({
    name,
    description,
    createdBy: user.id,
  })

  wsService.broadcast({
    type: 'room_created',
    room,
  })

  return ResponseHelper.created(c, room)
})

app.post('/api/chat/rooms/:roomId/messages', jwtAuth(), async (c: Context) => {
  const roomId = c.req.param('roomId')
  const { content } = await c.req.json()
  const user = c.get('user')

  const message = await createChatMessage({
    roomId,
    userId: user.id,
    content,
  })

  wsService.sendToRoom(roomId, {
    type: 'new_message',
    message: {
      ...message,
      user: {
        id: user.id,
        name: user.name,
      },
    },
  })

  return ResponseHelper.created(c, message)
})

// Online status endpoints
app.get('/api/online-users', async (c: Context) => {
  const onlineCount = wsService.getConnectionCount()
  const activeRooms = wsService.getRoomCount()

  return ResponseHelper.success(c, {
    onlineUsers: onlineCount,
    activeRooms,
  })
})
```

## Testing and Quality Assurance

### Unit Testing with Vitest

```typescript
// tests/services/user.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserService } from '../../src/services/UserService'
import { prisma } from '../../src/lib/prisma'

// Mock Prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('UserService', () => {
  let userService: UserService

  beforeEach(() => {
    userService = new UserService()
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
      }

      const expectedUser = {
        id: '1',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        posts: [],
        profiles: [],
      }

      vi.mocked(prisma.user.create).mockResolvedValue(expectedUser)

      const result = await userService.create(userData)

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: userData,
        include: {
          posts: true,
          profiles: true,
        },
      })
      expect(result).toEqual(expectedUser)
    })

    it('should handle duplicate email error', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
      }

      vi.mocked(prisma.user.create).mockRejectedValue(
        new Error('Unique constraint failed')
      )

      await expect(userService.create(userData)).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      const userId = '1'
      const expectedUser = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
        posts: [],
        profiles: [],
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(expectedUser)

      const result = await userService.findById(userId)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          posts: {
            where: { published: true },
            orderBy: { createdAt: 'desc' },
          },
          profiles: true,
        },
      })
      expect(result).toEqual(expectedUser)
    })

    it('should return null when user not found', async () => {
      const userId = '999'

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await userService.findById(userId)

      expect(result).toBeNull()
    })
  })
})
```

### Integration Testing

```typescript
// tests/integration/users.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { testClient } from 'hono/testing'
import { app } from '../../src/index'
import { prisma } from '../../src/lib/prisma'

describe('Users API Integration Tests', () => {
  const client = testClient(app)

  beforeAll(async () => {
    // Setup test database
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    // Cleanup test database
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up before each test
    await prisma.user.deleteMany()
  })

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
      }

      const response = await client.users.$post({
        json: userData,
      })

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.name).toBe(userData.name)
      expect(data.data.email).toBe(userData.email)
      expect(data.data.id).toBeDefined()
    })

    it('should return validation error for invalid email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        role: 'USER',
      }

      const response = await client.users.$post({
        json: userData,
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('email')
    })
  })

  describe('GET /api/users', () => {
    beforeEach(async () => {
      // Create test data
      await prisma.user.createMany({
        data: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            role: 'USER',
          },
          {
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'ADMIN',
          },
        ],
      })
    })

    it('should return paginated users', async () => {
      const response = await client.users.$get({
        query: { page: '1', limit: '10' },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('should filter users by search term', async () => {
      const response = await client.users.$get({
        query: { search: 'john' },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].name).toBe('John Doe')
    })
  })

  describe('GET /api/users/:id', () => {
    it('should return user by ID', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'USER',
        },
      })

      const response = await client.users[':id'].$get({
        param: { id: user.id },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(user.id)
      expect(data.data.name).toBe(user.name)
    })

    it('should return 404 for non-existent user', async () => {
      const response = await client.users[':id'].$get({
        param: { id: 'non-existent-id' },
      })

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Resource not found')
    })
  })
})
```

### API Testing with Type Safety

```typescript
// tests/api/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { testClient } from 'hono/testing'
import { app } from '../../src/index'
import { prisma } from '../../src/lib/prisma'

describe('Authentication API Tests', () => {
  const client = testClient(app)

  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user with known password
      const hashedPassword = await hashPassword('password123')
      await prisma.user.create({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: hashedPassword,
          role: 'USER',
        },
      })
    })

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'password123',
      }

      const response = await client.auth['login'].$post({
        json: loginData,
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(loginData.email)
      expect(data.data.tokens.accessToken).toBeDefined()
      expect(data.data.tokens.refreshToken).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'wrongpassword',
      }

      const response = await client.auth['login'].$post({
        json: loginData,
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid credentials')
    })
  })

  describe('GET /api/auth/me', () => {
    let authHeaders: Record<string, string>

    beforeEach(async () => {
      // Login to get auth token
      const user = await prisma.user.create({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: await hashPassword('password123'),
          role: 'USER',
        },
      })

      const loginResponse = await client.auth['login'].$post({
        json: {
          email: 'john@example.com',
          password: 'password123',
        },
      })

      const loginData = await loginResponse.json()
      authHeaders = {
        Authorization: `Bearer ${loginData.data.tokens.accessToken}`,
      }
    })

    it('should return current user with valid token', async () => {
      const response = await client.auth['me'].$get({}, {
        headers: authHeaders,
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.email).toBe('john@example.com')
    })

    it('should reject request without token', async () => {
      const response = await client.auth['me'].$get()

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('No token provided')
    })

    it('should reject request with invalid token', async () => {
      const response = await client.auth['me'].$get({}, {
        headers: { Authorization: 'Bearer invalid-token' },
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })
  })
})
```

### Performance Testing

```typescript
// tests/performance/load.test.ts
import { describe, it, expect } from 'vitest'
import { testClient } from 'hono/testing'
import { app } from '../../src/index'

describe('Performance Tests', () => {
  const client = testClient(app)

  describe('API Response Times', () => {
    it('should respond to health check within 50ms', async () => {
      const startTime = Date.now()

      const response = await client.health.$get()

      const responseTime = Date.now() - startTime
      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(50)
    })

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 100
      const startTime = Date.now()

      const promises = Array.from({ length: concurrentRequests }, () =>
        client.health.$get()
      )

      const responses = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      expect(responses.every(r => r.status === 200)).toBe(true)
      expect(totalTime / concurrentRequests).toBeLessThan(10) // Average per request
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Make many requests
      for (let i = 0; i < 1000; i++) {
        await client.health.$get()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })
})
```

## Performance Optimization

### Caching Strategies

```typescript
// Multi-level caching system
interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }

    this.cache.set(key, entry)
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Redis caching for distributed systems
import Redis from 'ioredis'

class RedisCacheService {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key)
    return value ? JSON.parse(value) : null
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value))
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async clear(): Promise<void> {
    await this.redis.flushdb()
  }

  // Pattern-based deletion
  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}

// Caching middleware
export const cacheMiddleware = (options: {
  keyGenerator?: (c: Context) => string
  ttl?: number
  condition?: (c: Context) => boolean
}) => {
  const cacheService = new CacheService()

  return createMiddleware(async (c: Context, next: Next) => {
    // Skip cache for non-GET requests
    if (c.req.method !== 'GET') {
      await next()
      return
    }

    // Check condition
    if (options.condition && !options.condition(c)) {
      await next()
      return
    }

    // Generate cache key
    const cacheKey = options.keyGenerator
      ? options.keyGenerator(c)
      : `${c.req.method}:${c.req.path}:${JSON.stringify(c.req.query())}`

    // Try to get from cache
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      c.header('X-Cache', 'HIT')
      return c.json(cached)
    }

    // Execute request
    c.header('X-Cache', 'MISS')
    await next()

    // Cache response if successful
    if (c.res.status === 200) {
      const response = await c.req.json()
      await cacheService.set(cacheKey, response, options.ttl)
    }
  })
}

// Usage
app.get('/api/users',
  cacheMiddleware({
    ttl: 60000, // 1 minute
    keyGenerator: (c) => `users:${JSON.stringify(c.req.query())}`,
  }),
  async (c: Context) => {
    const users = await getUsers(c.req.query())
    return c.json(users)
  }
)
```

### Performance Monitoring

```typescript
// Server timing middleware
export const serverTimingMiddleware = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const timings: Record<string, number> = {}
    const start = Date.now()

    // Add timing information
    c.set('addTiming', (name: string, duration: number) => {
      timings[name] = duration
    })

    await next()

    const totalTime = Date.now() - start
    timings['total'] = totalTime

    // Set Server-Timing header
    const timingEntries = Object.entries(timings)
      .map(([name, duration]) => `${name};dur=${duration}`)
      .join(',')

    c.header('Server-Timing', timingEntries)
    c.header('X-Response-Time', `${totalTime}ms`)
  })
}

// Database query timing
export const dbTimingMiddleware = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const originalQuery = prisma.$queryRaw

    prisma.$queryRaw = async (...args: any[]) => {
      const start = Date.now()
      try {
        const result = await originalQuery.apply(prisma, args)
        const duration = Date.now() - start
        c.get('addTiming')?.(`db-query`, duration)
        return result
      } catch (error) {
        const duration = Date.now() - start
        c.get('addTiming')?.(`db-query-error`, duration)
        throw error
      }
    }

    await next()

    // Restore original method
    prisma.$queryRaw = originalQuery
  })
}

// Performance metrics collector
class PerformanceMetrics {
  private metrics = {
    requestCount: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    errorCount: 0,
    slowRequests: 0,
  }

  recordRequest(duration: number, isError: boolean = false): void {
    this.metrics.requestCount++
    this.metrics.totalResponseTime += duration
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount

    if (isError) {
      this.metrics.errorCount++
    }

    if (duration > 1000) { // Slow requests over 1 second
      this.metrics.slowRequests++
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.metrics.requestCount > 0
        ? this.metrics.errorCount / this.metrics.requestCount
        : 0,
      slowRequestRate: this.metrics.requestCount > 0
        ? this.metrics.slowRequests / this.metrics.requestCount
        : 0,
    }
  }

  reset(): void {
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      errorCount: 0,
      slowRequests: 0,
    }
  }
}

// Performance monitoring endpoint
const performanceMetrics = new PerformanceMetrics()

app.use('*', async (c: Context, next: Next) => {
  const start = Date.now()
  let isError = false

  try {
    await next()
  } catch (error) {
    isError = true
    throw error
  } finally {
    const duration = Date.now() - start
    performanceMetrics.recordRequest(duration, isError)
  }
})

app.get('/api/metrics/performance', async (c: Context) => {
  const metrics = performanceMetrics.getMetrics()
  return ResponseHelper.success(c, metrics)
})
```

### Bundle Optimization

```typescript
// Code splitting for better performance
import { Hono } from 'hono'

// Separate routes into modules
const apiRoutes = new Hono()
const adminRoutes = new Hono()
const publicRoutes = new Hono()

// Load routes dynamically based on environment
async function loadRoutes() {
  if (process.env.NODE_ENV === 'production') {
    // In production, load all routes at startup
    const { userRoutes } = await import('./routes/users')
    const { postRoutes } = await import('./routes/posts')
    const { authRoutes } = await import('./routes/auth')

    apiRoutes.route('/users', userRoutes)
    apiRoutes.route('/posts', postRoutes)
    apiRoutes.route('/auth', authRoutes)

    const { adminUserRoutes } = await import('./routes/admin/users')
    adminRoutes.route('/users', adminUserRoutes)
  } else {
    // In development, load routes dynamically
    apiRoutes.get('/routes', (c) => {
      return c.json({
        available: [
          '/users',
          '/posts',
          '/auth',
          '/admin/users',
        ]
      })
    })
  }
}

// Lazy loading for admin routes
app.use('/admin/*', async (c: Context, next: Next) => {
  // Only load admin routes when accessed
  if (!adminRoutes.routes.length) {
    const { adminUserRoutes } = await import('./routes/admin/users')
    const { adminPostRoutes } = await import('./routes/admin/posts')

    adminRoutes.route('/users', adminUserRoutes)
    adminRoutes.route('/posts', adminPostRoutes)
  }

  await next()
})

// Tree shaking optimization
export const createOptimizedApp = () => {
  const app = new Hono()

  // Only include middleware in production
  if (process.env.NODE_ENV === 'production') {
    app.use('*', compressionMiddleware())
    app.use('*', securityHeadersMiddleware())
  }

  // Always include essential middleware
  app.use('*', corsMiddleware())
  app.use('*', loggerMiddleware())

  return app
}

// Route optimization with conditional loading
app.get('/api/status', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  })
})

// Conditional feature loading
app.use('/api/experimental/*', async (c: Context, next: Next) => {
  if (process.env.ENABLE_EXPERIMENTAL !== 'true') {
    return c.json({ error: 'Experimental features disabled' }, 404)
  }

  // Load experimental features only when enabled
  const { experimentalRoutes } = await import('./routes/experimental')
  return experimentalRoutes.fetch(c.req, c.executionCtx)
})
```

## Deployment Strategies

### Docker Deployment

**Dockerfile**
```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

# Copy built application
WORKDIR /app
COPY --from=builder --chown=hono:nodejs /app/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hono:nodejs /app/package.json ./package.json

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

# Security settings
USER hono
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start application
CMD ["node", "dist/index.js"]
```

**docker-compose.yml**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/hono_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "dist/health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hono_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d hono_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**nginx.conf**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name api.example.com;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 5s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
        }

        # Health check endpoint
        location /health {
            proxy_pass http://app;
            access_log off;
        }

        # Static files (if any)
        location /static/ {
            root /var/www;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Serverless Deployment

**AWS Lambda Deployment**

```typescript
// src/lambda-handler.ts
import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'

const app = new Hono()

// Lambda-specific configuration
app.use('*', async (c: Context, next: Next) => {
  // Set CORS headers for API Gateway
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (c.req.method === 'OPTIONS') {
    return c.text('', 200)
  }

  await next()
})

// Lambda environment configuration
app.get('/api/config', (c: Context) => {
  return c.json({
    region: process.env.AWS_REGION,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
    memoryLimit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
  })
})

// Export Lambda handler
export const handler = handle(app)
```

**serverless.yml**
```yaml
service: hono-backend

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  environment:
    NODE_ENV: ${self:provider.stage}
    DATABASE_URL: ${ssm:/my-app/${self:provider.stage}/database-url}
    JWT_SECRET: ${ssm:/my-app/${self:provider.stage}/jwt-secret}

  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - ssm:GetParameter
            - ssm:GetParameters
          Resource: arn:aws:ssm:${self:provider.region}:${aws:accountId}:parameter/my-app/${self:provider.stage}/*

functions:
  api:
    handler: dist/lambda-handler.handler
    timeout: 30
    memorySize: 512
    events:
      - httpApi:
          path: /{proxy+}
          method: ANY

plugins:
  - serverless-offline
  - serverless-dotenv-plugin

custom:
  serverless-offline:
    httpPort: 3000
    websocketPort: 3001

package:
  patterns:
    - '!node_modules/**'
    - '!src/**'
    - 'dist/**'
    - 'node_modules/@hono/**'
    - 'package.json'
```

**Vercel Deployment**

```typescript
// vercel.json
{
  "functions": {
    "api/*.ts": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

```typescript
// api/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

// Vercel-specific middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', logger())

// Health check for Vercel
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    vercel: true,
  })
})

// Import routes
import { userRoutes } from './routes/users'
import { postRoutes } from './routes/posts'
import { authRoutes } from './routes/auth'

app.route('/users', userRoutes)
app.route('/posts', postRoutes)
app.route('/auth', authRoutes)

// Export for Vercel
export default app
```

### Cloudflare Workers Deployment

```typescript
// src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

const app = new Hono()

// Cloudflare Workers specific middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', logger())
app.use('*', prettyJSON())

// Use Cloudflare KV for storage
app.get('/api/kv/:key', async (c: Context) => {
  const key = c.req.param('key')
  const value = await c.env.KV_NAMESPACE.get(key)

  if (value === null) {
    return c.json({ error: 'Key not found' }, 404)
  }

  return c.json({ key, value })
})

app.post('/api/kv/:key', async (c: Context) => {
  const key = c.req.param('key')
  const { value, ttl } = await c.req.json()

  await c.env.KV_NAMESPACE.put(key, value, {
    expirationTtl: ttl,
  })

  return c.json({ success: true, key })
})

// Use Cloudflare D1 database
app.get('/api/users', async (c: Context) => {
  const { results } = await c.env.D1_DATABASE.prepare('SELECT * FROM users').all()
  return c.json({ users: results })
})

app.post('/api/users', async (c: Context) => {
  const { name, email } = await c.req.json()

  const { success } = await c.env.D1_DATABASE
    .prepare('INSERT INTO users (name, email) VALUES (?, ?)')
    .bind(name, email)
    .run()

  return c.json({ success }, success ? 201 : 400)
})

// Export for Cloudflare Workers
export default app
```

**wrangler.toml**
```toml
name = "hono-backend"
main = "src/index.ts"
compatibility_date = "2023-12-01"

[env.production]
name = "hono-backend-prod"

[env.staging]
name = "hono-backend-staging"

# KV Storage
[[kv_namespaces]]
binding = "KV_NAMESPACE"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

# D1 Database
[[d1_databases]]
binding = "D1_DATABASE"
database_name = "hono-db"
database_id = "your-database-id"

# Environment variables
[vars]
NODE_ENV = "production"
JWT_SECRET = "your-jwt-secret"

[env.staging.vars]
NODE_ENV = "staging"
```

## Monitoring and Observability

### Structured Logging

```typescript
// Logger service
class LoggerService {
  private context: Record<string, any> = {}

  constructor(context?: Record<string, any>) {
    this.context = context || {}
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...(meta || {}),
    }

    return JSON.stringify(logEntry)
  }

  debug(message: string, meta?: any): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(this.formatMessage('debug', message, meta))
    }
  }

  info(message: string, meta?: any): void {
    console.info(this.formatMessage('info', message, meta))
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta))
  }

  error(message: string, error?: Error, meta?: any): void {
    console.error(this.formatMessage('error', message, {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    }))
  }

  child(context: Record<string, any>): LoggerService {
    return new LoggerService({ ...this.context, ...context })
  }
}

// Request logging middleware
export const loggingMiddleware = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const requestId = crypto.randomUUID()
    const logger = new LoggerService({
      requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('x-forwarded-for') || 'unknown',
    })

    c.set('logger', logger)

    const start = Date.now()
    logger.info('Request started')

    try {
      await next()

      const duration = Date.now() - start
      const status = c.res.status

      logger.info('Request completed', {
        status,
        duration,
        contentLength: c.res.headers.get('content-length'),
      })
    } catch (error) {
      const duration = Date.now() - start

      logger.error('Request failed', error as Error, {
        duration,
      })

      throw error
    }
  })
}
```

### Metrics Collection

```typescript
// Prometheus metrics
import { register, Counter, Histogram, Gauge } from 'prom-client'

// Create metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
})

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
})

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
})

const databaseConnections = new Gauge({
  name: 'database_connections',
  help: 'Number of active database connections',
})

// Metrics middleware
export const metricsMiddleware = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const start = Date.now()
    const method = c.req.method
    const route = c.req.routePath || c.req.path

    activeConnections.inc()

    try {
      await next()

      const duration = (Date.now() - start) / 1000
      const statusCode = c.res.status.toString()

      httpRequestsTotal.inc({ method, route, status_code: statusCode })
      httpRequestDuration.observe({ method, route, status_code: statusCode }, duration)
    } catch (error) {
      const duration = (Date.now() - start) / 1000
      const statusCode = '500'

      httpRequestsTotal.inc({ method, route, status_code: statusCode })
      httpRequestDuration.observe({ method, route, status_code: statusCode }, duration)

      throw error
    } finally {
      activeConnections.dec()
    }
  })
}

// Metrics endpoint
app.get('/metrics', async (c: Context) => {
  const metrics = await register.metrics()
  return c.text(metrics, 200, {
    'Content-Type': register.contentType,
  })
})

// Custom metrics
class CustomMetrics {
  private userRegistrations = new Counter({
    name: 'user_registrations_total',
    help: 'Total number of user registrations',
  })

  private loginAttempts = new Counter({
    name: 'login_attempts_total',
    help: 'Total number of login attempts',
    labelNames: ['success'],
  })

  private activeUsers = new Gauge({
    name: 'active_users',
    help: 'Number of active users',
  })

  recordUserRegistration(): void {
    this.userRegistrations.inc()
  }

  recordLoginAttempt(success: boolean): void {
    this.loginAttempts.inc({ success: success.toString() })
  }

  setActiveUsers(count: number): void {
    this.activeUsers.set(count)
  }
}

export const customMetrics = new CustomMetrics()
```

### Health Checks

```typescript
// Health check service
class HealthCheckService {
  private checks: Map<string, HealthCheck> = new Map()

  addCheck(name: string, check: HealthCheck): void {
    this.checks.set(name, check)
  }

  async runChecks(): Promise<HealthCheckResult> {
    const results: Record<string, any> = {}
    let overallHealthy = true

    for (const [name, check] of this.checks) {
      try {
        const startTime = Date.now()
        const result = await check.check()
        const duration = Date.now() - startTime

        results[name] = {
          status: 'healthy',
          duration,
          ...result,
        }
      } catch (error) {
        overallHealthy = false
        results[name] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: results,
    }
  }
}

interface HealthCheck {
  check(): Promise<any>
}

// Database health check
const databaseHealthCheck: HealthCheck = {
  async check() {
    await prisma.$queryRaw`SELECT 1`
    return { message: 'Database connection successful' }
  },
}

// Redis health check
const redisHealthCheck: HealthCheck = {
  async check() {
    const redis = new Redis(process.env.REDIS_URL)
    await redis.ping()
    await redis.quit()
    return { message: 'Redis connection successful' }
  },
}

// External API health check
const externalAPIHealthCheck: HealthCheck = {
  async check() {
    const response = await fetch('https://api.example.com/health')
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`)
    }
    return { status: response.status }
  },
}

// Initialize health check service
const healthCheckService = new HealthCheckService()
healthCheckService.addCheck('database', databaseHealthCheck)
healthCheckService.addCheck('redis', redisHealthCheck)
healthCheckService.addCheck('external_api', externalAPIHealthCheck)

// Health check endpoints
app.get('/health', async (c: Context) => {
  const result = await healthCheckService.runChecks()

  const statusCode = result.status === 'healthy' ? 200 : 503
  return c.json(result, statusCode)
})

app.get('/health/ready', async (c: Context) => {
  const result = await healthCheckService.runChecks()

  if (result.status === 'healthy') {
    return c.json({ status: 'ready' }, 200)
  } else {
    return c.json({ status: 'not ready', checks: result.checks }, 503)
  }
})

app.get('/health/live', async (c: Context) => {
  // Basic liveness check - just check if the server is running
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  })
})
```

## Error Handling and Debugging

### Comprehensive Error Handling

```typescript
// Custom error classes
class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400)
  }
}

class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401)
  }
}

class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403)
  }
}

class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404)
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}

class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429)
  }
}

// Global error handler
export const errorHandler = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    try {
      await next()
    } catch (error) {
      const logger = c.get('logger') || new LoggerService()

      if (error instanceof AppError) {
        // Handle known application errors
        logger.warn('Application error', {
          error: error.message,
          statusCode: error.statusCode,
          stack: error.stack,
        })

        return c.json({
          success: false,
          error: error.message,
          ...(error.details && { details: error.details }),
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        }, error.statusCode)
      } else if (error instanceof ZodError) {
        // Handle validation errors
        logger.warn('Validation error', {
          error: error.message,
          issues: error.issues,
        })

        return c.json({
          success: false,
          error: 'Validation failed',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        }, 400)
      } else {
        // Handle unexpected errors
        logger.error('Unexpected error', error as Error)

        return c.json({
          success: false,
          error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message,
          ...(process.env.NODE_ENV === 'development' && {
            stack: (error as Error).stack
          }),
        }, 500)
      }
    }
  })
}

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Route not found',
    route: c.req.path,
    method: c.req.method,
  }, 404)
})
```

### Debugging Tools

```typescript
// Debug middleware
export const debugMiddleware = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    if (process.env.NODE_ENV === 'development') {
      // Add debug headers
      c.header('X-Debug-Mode', 'enabled')
      c.header('X-Request-ID', crypto.randomUUID())

      // Debug endpoint
      if (c.req.path === '/debug') {
        return c.json({
          request: {
            method: c.req.method,
            url: c.req.url,
            path: new URL(c.req.url).pathname,
            query: Object.fromEntries(c.req.queries()),
            headers: Object.fromEntries(c.req.header()),
          },
          environment: {
            nodeEnv: process.env.NODE_ENV,
            version: process.env.npm_package_version,
            platform: process.platform,
            arch: process.arch,
          },
          memory: process.memoryUsage(),
          uptime: process.uptime(),
        })
      }
    }

    await next()
  })
}

// Request inspector middleware
export const requestInspector = () => {
  return createMiddleware(async (c: Context, next: Next) => {
    const start = Date.now()

    // Store request details for debugging
    c.set('requestDetails', {
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      query: c.req.query(),
      headers: c.req.header(),
      startTime: start,
    })

    await next()

    // Store response details
    c.set('responseDetails', {
      status: c.res.status,
      headers: c.res.headers,
      duration: Date.now() - start,
    })
  })
}

// Debug endpoint for inspecting last request
let lastRequestDetails: any = null

app.get('/debug/last-request', (c: Context) => {
  if (process.env.NODE_ENV !== 'development') {
    return c.json({ error: 'Debug mode not enabled' }, 404)
  }

  return c.json(lastRequestDetails || { message: 'No requests yet' })
})

// Development error page
app.use('*', async (c: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Debug Error</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              .error { color: #d32f2f; }
              .stack { background: #f5f5f5; padding: 10px; margin: 10px 0; }
              .request { background: #e3f2fd; padding: 10px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1 class="error">Error: ${error.message}</h1>
            <div class="stack">
              <h3>Stack Trace:</h3>
              <pre>${(error as Error).stack}</pre>
            </div>
            <div class="request">
              <h3>Request Details:</h3>
              <pre>${JSON.stringify(c.get('requestDetails'), null, 2)}</pre>
            </div>
          </body>
        </html>
      `
      return c.html(html, 500)
    }
    throw error
  }
})
```

This comprehensive technical reference provides the foundation for building production-ready backend services with Hono.js. The patterns and examples cover all aspects of development from basic setup to advanced deployment scenarios, with emphasis on type safety, performance optimization, security, and maintainability.

---

**Key Takeaways:**
- **Type Safety First**: Leverage TypeScript throughout the application
- **Performance Optimized**: Built-in caching, monitoring, and optimization
- **Security Compliant**: Comprehensive authentication and security patterns
- **Production Ready**: Docker, serverless, and edge deployment strategies
- **Maintainable**: Clear architecture with comprehensive testing and debugging

This reference serves as the foundation for the complete Hono.js Backend Service Development skill.