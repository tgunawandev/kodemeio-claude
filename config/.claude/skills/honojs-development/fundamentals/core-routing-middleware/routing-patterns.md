# Hono.js Routing Patterns

## Overview

Hono.js provides a powerful and flexible routing system that supports various patterns from simple static routes to complex dynamic routing with parameter validation. This guide covers all routing patterns and best practices for building scalable APIs.

## Basic Routing

### Static Routes

```typescript
import { Hono } from 'hono'

const app = new Hono()

// Simple static routes
app.get('/', (c) => {
  return c.json({ message: 'Home page' })
})

app.get('/about', (c) => {
  return c.json({ message: 'About page' })
})

app.get('/contact', (c) => {
  return c.json({ message: 'Contact page' })
})

// Route chaining
app
  .get('/users', (c) => c.json({ action: 'list users' }))
  .post('/users', (c) => c.json({ action: 'create user' }))
  .put('/users', (c) => c.json({ action: 'update user' }))
  .delete('/users', (c) => c.json({ action: 'delete user' }))
```

### HTTP Methods

```typescript
// All HTTP methods supported
app.get('/resource', (c) => c.json({ method: 'GET' }))
app.post('/resource', (c) => c.json({ method: 'POST' }))
app.put('/resource', (c) => c.json({ method: 'PUT' }))
app.patch('/resource', (c) => c.json({ method: 'PATCH' }))
app.delete('/resource', (c) => c.json({ method: 'DELETE' }))
app.head('/resource', (c) => c.text('', 200))
app.options('/resource', (c) => c.text('', 200))

// Custom methods (if needed)
app.on('PURGE', '/cache', (c) => c.json({ action: 'cache cleared' }))
```

## Dynamic Routing

### Route Parameters

```typescript
// Basic parameter
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ userId: id })
})

// Multiple parameters
app.get('/users/:userId/posts/:postId', (c) => {
  const { userId, postId } = c.req.param()
  return c.json({ userId, postId })
})

// Parameter with type validation
app.get('/posts/:id', (c) => {
  const id = c.req.param('id')

  // Validate ID format
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return c.json({ error: 'Invalid ID format' }, 400)
  }

  return c.json({ postId: id })
})

// Optional parameters (not natively supported, use middleware)
app.get('/search/:query?', (c) => {
  const query = c.req.param('query')
  const category = c.req.query('category')

  return c.json({
    query: query || 'default',
    category
  })
})
```

### Route Parameter Validation

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

// Zod schema for parameter validation
const idSchema = z.object({
  id: z.string().uuid(),
})

const postSchema = z.object({
  userId: z.string().uuid(),
  postId: z.string().uuid(),
})

// Validate route parameters
app.get('/users/:id',
  zValidator('param', idSchema),
  (c) => {
    const { id } = c.req.valid('param')
    return c.json({ userId: id })
  }
)

app.get('/users/:userId/posts/:postId',
  zValidator('param', postSchema),
  (c) => {
    const { userId, postId } = c.req.valid('param')
    return c.json({ userId, postId })
  }
)
```

## Advanced Routing Patterns

### Wildcard Routes

```typescript
// Catch-all routes
app.get('/api/*', (c) => {
  const wildcard = c.req.param('*')
  return c.json({ endpoint: `/api/${wildcard}` })
})

// Nested wildcard
app.get('/docs/**', (c) => {
  const path = c.req.param('**')
  return c.json({ documentationPath: path })
})

// Multiple wildcard segments
app.get('/files/:category/**', (c) => {
  const { category } = c.req.param()
  const filepath = c.req.param('**')
  return c.json({ category, filepath })
})
```

### Conditional Routing

```typescript
// Route based on host
app.get('/', (c) => {
  const host = c.req.header('host')

  if (host?.startsWith('api.')) {
    return c.json({ type: 'api_response' })
  } else if (host?.startsWith('admin.')) {
    return c.json({ type: 'admin_response' })
  }

  return c.json({ type: 'default_response' })
})

// Route based on headers
app.get('/data', (c) => {
  const accept = c.req.header('accept')
  const contentType = c.req.header('content-type')

  if (accept?.includes('application/xml')) {
    c.header('content-type', 'application/xml')
    return c.text('<data>XML Response</data>')
  }

  return c.json({ type: 'json_response' })
})

// Route based on user agent
app.get('/download', (c) => {
  const userAgent = c.req.header('user-agent') || ''

  if (userAgent.includes('Mobile')) {
    return c.json({ platform: 'mobile', downloadUrl: '/mobile/app' })
  }

  return c.json({ platform: 'desktop', downloadUrl: '/desktop/app' })
})
```

### Named Routes and Route Groups

```typescript
// Route groups with common middleware
const apiRoutes = new Hono()

// Apply middleware to group
apiRoutes.use('*', async (c, next) => {
  c.header('X-API-Version', 'v1')
  await next()
})

// Define routes in group
apiRoutes.get('/users', (c) => c.json({ users: [] }))
apiRoutes.post('/users', (c) => c.json({ created: true }))
apiRoutes.get('/posts', (c) => c.json({ posts: [] }))

// Mount group with prefix
app.route('/api/v1', apiRoutes)

// Multiple route groups
const adminRoutes = new Hono()
const publicRoutes = new Hono()

adminRoutes.use('*', authMiddleware())
adminRoutes.get('/users', getUsers)
adminRoutes.delete('/users/:id', deleteUser)

publicRoutes.get('/health', healthCheck)
publicRoutes.get('/status', statusCheck)

// Mount different groups
app.route('/admin', adminRoutes)
app.route('/public', publicRoutes)
```

## Route Organization

### File-based Route Organization

```typescript
// routes/index.ts
import { Hono } from 'hono'
import { userRoutes } from './users'
import { postRoutes } from './posts'
import { authRoutes } from './auth'
import { adminRoutes } from './admin'

const app = new Hono()

// API versioning with route groups
const v1Routes = new Hono()
v1Routes.route('/users', userRoutes)
v1Routes.route('/posts', postRoutes)
v1Routes.route('/auth', authRoutes)

const v2Routes = new Hono()
// v2 routes would go here

app.route('/api/v1', v1Routes)
app.route('/api/v2', v2Routes)
app.route('/admin', adminRoutes)

export default app
```

### Modular Route Definition

```typescript
// routes/users.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { UserService } from '../services/UserService'

const userRoutes = new Hono()
const userService = new UserService()

// Route validation schemas
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['user', 'admin']).default('user'),
})

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin']).optional(),
})

// Define all user routes
userRoutes.get('/', async (c) => {
  const query = c.req.query()
  const users = await userService.findMany(query)
  return c.json(users)
})

userRoutes.get('/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const user = await userService.findById(id)

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json(user)
  }
)

userRoutes.post('/',
  zValidator('json', createUserSchema),
  async (c) => {
    const userData = c.req.valid('json')
    const user = await userService.create(userData)
    return c.json(user, 201)
  }
)

userRoutes.put('/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', updateUserSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const updateData = c.req.valid('json')

    const user = await userService.update(id, updateData)
    return c.json(user)
  }
)

userRoutes.delete('/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    await userService.delete(id)
    return c.text('', 204)
  }
)

export { userRoutes }
```

## Route Versioning

### URI-based Versioning

```typescript
// API v1 routes
const v1Routes = new Hono()
v1Routes.get('/users', getUsersV1)
v1Routes.post('/users', createUserV1)

// API v2 routes
const v2Routes = new Hono()
v2Routes.get('/users', getUsersV2)
v2Routes.post('/users', createUserV2)

app.route('/api/v1', v1Routes)
app.route('/api/v2', v2Routes)
```

### Header-based Versioning

```typescript
// Version detection middleware
const versionMiddleware = () => {
  return createMiddleware(async (c, next) => {
    const version = c.req.header('api-version') || 'v1'
    c.set('apiVersion', version)
    await next()
  })
}

app.use('/api/*', versionMiddleware())

// Route handlers
app.get('/api/users', async (c) => {
  const version = c.get('apiVersion')

  switch (version) {
    case 'v1':
      return getUsersV1(c)
    case 'v2':
      return getUsersV2(c)
    default:
      return c.json({ error: 'Unsupported API version' }, 400)
  }
})
```

### Query Parameter Versioning

```typescript
app.get('/api/users', async (c) => {
  const version = c.req.query('version') || 'v1'

  switch (version) {
    case 'v1':
      return getUsersV1(c)
    case 'v2':
      return getUsersV2(c)
    default:
      return c.json({ error: 'Unsupported version' }, 400)
  }
})
```

## Route Middleware Chain

### Route-specific Middleware

```typescript
// Apply middleware to specific route
app.get('/admin/users',
  authMiddleware(),
  adminMiddleware(),
  loggingMiddleware(),
  async (c) => {
    const users = await getAdminUsers()
    return c.json(users)
  }
)

// Multiple middleware with different conditions
app.get('/api/data',
  corsMiddleware(),
  rateLimitMiddleware({ max: 100 }),
  cacheMiddleware({ ttl: 300 }),
  async (c) => {
    const data = await getData()
    return c.json(data)
  }
)
```

### Conditional Middleware

```typescript
// Conditional middleware based on route
const conditionalAuth = () => {
  return createMiddleware(async (c, next) => {
    const route = c.req.routePath
    const publicRoutes = ['/health', '/status', '/login']

    if (!publicRoutes.includes(route)) {
      await authMiddleware()(c, next)
    } else {
      await next()
    }
  })
}

app.use('*', conditionalAuth())
```

### Middleware Order and Execution

```typescript
// Middleware execution order
app.use('/api/*',
  // 1. First executed
  loggingMiddleware(),

  // 2. Second executed
  corsMiddleware(),

  // 3. Third executed
  rateLimitMiddleware(),

  // 4. Fourth executed (may stop chain)
  authMiddleware()
)

app.get('/api/users', async (c) => {
  // Route handler executed after all middleware
  return c.json({ users: [] })
})
```

## Route Handlers

### Async Route Handlers

```typescript
// Simple async handler
app.get('/async-data', async (c) => {
  const data = await fetchData()
  return c.json(data)
})

// Async handler with error handling
app.get('/users/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const user = await userService.findById(id)

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})
```

### Route Handler Composition

```typescript
// Composable handler functions
const withValidation = (schema: z.ZodSchema) => {
  return (handler: (c: Context, data: any) => Promise<Response>) => {
    return async (c: Context) => {
      const data = await c.req.json()
      const validated = schema.parse(data)
      return handler(c, validated)
    }
  }
}

const withAuth = (handler: (c: Context) => Promise<Response>) => {
  return async (c: Context) => {
    const token = c.req.header('authorization')

    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const user = await verifyToken(token)
    c.set('user', user)

    return handler(c)
  }
}

// Usage
app.post('/users',
  withAuth(
    withValidation(createUserSchema)(async (c, userData) => {
      const user = await userService.create(userData)
      return c.json(user, 201)
    })
  )
)
```

## Route Performance Optimization

### Route Caching

```typescript
// Cache middleware for specific routes
const routeCache = (options: { ttl: number }) => {
  const cache = new Map<string, { data: any; timestamp: number }>()

  return createMiddleware(async (c, next) => {
    const key = `${c.req.method}:${c.req.path}:${JSON.stringify(c.req.query())}`
    const cached = cache.get(key)

    if (cached && Date.now() - cached.timestamp < options.ttl) {
      return c.json(cached.data)
    }

    await next()

    // Cache successful responses
    if (c.res.status === 200) {
      cache.set(key, {
        data: await c.req.json(),
        timestamp: Date.now(),
      })
    }
  })
}

// Apply to specific routes
app.get('/api/products', routeCache({ ttl: 60000 }), getProducts)
app.get('/api/categories', routeCache({ ttl: 300000 }), getCategories)
```

### Route Preloading

```typescript
// Preload commonly accessed data
const preloadMiddleware = () => {
  return createMiddleware(async (c, next) => {
    // Preload data based on route pattern
    if (c.req.path.startsWith('/api/users')) {
      const userRoles = await getUserRoles()
      c.set('userRoles', userRoles)
    }

    if (c.req.path.startsWith('/api/posts')) {
      const categories = await getCategories()
      c.set('categories', categories)
    }

    await next()
  })
}

app.use('/api/*', preloadMiddleware())
```

## Route Testing

### Route Testing Patterns

```typescript
// tests/routes/users.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { testClient } from 'hono/testing'
import app from '../../src'
import { prisma } from '../../src/lib/prisma'

describe('User Routes', () => {
  const client = testClient(app)

  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  describe('GET /users', () => {
    it('should return empty list when no users exist', async () => {
      const response = await client.users.$get()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual([])
    })

    it('should return users with pagination', async () => {
      // Create test users
      await prisma.user.createMany({
        data: [
          { name: 'User 1', email: 'user1@example.com' },
          { name: 'User 2', email: 'user2@example.com' },
        ],
      })

      const response = await client.users.$get({
        query: { page: '1', limit: '10' }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveLength(2)
    })
  })

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      }

      const response = await client.users.$post({
        json: userData,
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.name).toBe(userData.name)
      expect(data.email).toBe(userData.email)
    })

    it('should validate user data', async () => {
      const invalidData = {
        name: '', // Invalid: too short
        email: 'invalid-email', // Invalid: not an email
      }

      const response = await client.users.$post({
        json: invalidData,
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })
})
```

## Best Practices

### Route Organization

1. **Group related routes** using Hono instances
2. **Use consistent naming** conventions for routes
3. **Implement proper HTTP methods** for each route
4. **Validate all inputs** using Zod schemas
5. **Handle errors gracefully** with appropriate status codes
6. **Document routes** with clear parameter and response schemas

### Route Performance

1. **Use route-specific middleware** instead of global when possible
2. **Implement caching** for frequently accessed data
3. **Optimize database queries** in route handlers
4. **Use pagination** for list endpoints
5. **Minimize middleware chain** for high-traffic routes

### Route Security

1. **Validate all inputs** including parameters and body
2. **Implement rate limiting** on public endpoints
3. **Use authentication** on protected routes
4. **Sanitize outputs** to prevent data leaks
5. **Implement CORS** properly for cross-origin requests

This comprehensive guide to Hono.js routing patterns provides the foundation for building well-structured, maintainable APIs with proper validation, middleware, and organization.