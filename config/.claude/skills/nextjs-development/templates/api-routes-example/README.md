# Next.js API Routes Example

Comprehensive examples of Next.js API routes with authentication, validation, error handling, and best practices.

## Features Demonstrated

- ✅ GET, POST, PUT, DELETE HTTP methods
- 🔐 Authentication and authorization
- ✅ Request validation with Zod
- 🛡️ Error handling and responses
- 📝 Request/response logging
- 🔒 Rate limiting
- 🏷️ CORS configuration
- 📊 API documentation patterns
- 🧪 API testing examples

## Examples Overview

### Basic CRUD API (`app/api/users/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  role: z.enum(['USER', 'ADMIN']).default('USER')
})

const updateUserSchema = createUserSchema.partial()

// GET /api/users - List users with pagination
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    await rateLimit(request, 'users-read')

    // Query parameters
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }
      })
    ])

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    await rateLimit(request, 'users-write')

    // Authentication (optional - allow public registration)
    const session = await auth()

    // Only admins can create users, or allow public registration
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create user
    const user = await prisma.user.create({
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Dynamic Route Handler (`app/api/users/[id]/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'

const updateUserSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).optional()
})

// GET /api/users/[id] - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await rateLimit(request, 'users-read')

    const { id } = await params
    const session = await auth()

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Users can only view their own profile unless they're admins
    if (session?.user?.id !== id && session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: user
    })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await rateLimit(request, 'users-write')

    const { id } = await params
    const session = await auth()

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Check permissions
    if (session?.user?.id !== id && session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await rateLimit(request, 'users-write')

    const { id } = await params
    const session = await auth()

    // Only admins can delete users
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Authentication Middleware (`lib/auth.ts`)
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from './auth-config'

export async function auth() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  // Get full user data from database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  })

  return user ? { ...session, user } : null
}
```

### Rate Limiting (`lib/rate-limit.ts`)
```typescript
import { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function rateLimit(
  request: NextRequest,
  identifier: string,
  limit: number = 100,
  window: number = 60 // seconds
) {
  const ip = request.ip || 'unknown'
  const key = `rate-limit:${identifier}:${ip}`

  const requests = await redis.incr(key)

  if (requests === 1) {
    await redis.expire(key, window)
  }

  if (requests > limit) {
    throw new Error('Rate limit exceeded')
  }
}
```

### Error Handling Middleware (`lib/api-error.ts`)
```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      ...(error.details && { details: error.details })
    }, { status: error.statusCode })
  }

  console.error('Unexpected API error:', error)
  return NextResponse.json({
    success: false,
    error: 'Internal server error'
  }, { status: 500 })
}
```

### API Testing (`tests/api.test.ts`)
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GET, POST } from '@/app/api/users/route'

describe('/api/users', () => {
  beforeEach(async () => {
    // Setup test database
  })

  afterEach(async () => {
    // Cleanup test database
  })

  it('should fetch users list', async () => {
    const request = new Request('http://localhost:3000/api/users')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('should create a new user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER'
    }

    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe(userData.name)
    expect(data.data.email).toBe(userData.email)
  })

  it('should validate input data', async () => {
    const invalidData = {
      name: 'A', // Too short
      email: 'invalid-email'
    }

    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })
})
```

## Usage Examples

### Client-side API Calls
```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl: string

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API request failed')
    }

    return response.json()
  }

  async getUsers(params?: {
    page?: number
    limit?: number
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)

    const endpoint = `/users${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.request(endpoint)
  }

  async createUser(userData: {
    name: string
    email: string
    role?: string
  }) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async updateUser(id: string, userData: Partial<{
    name: string
    email: string
    role: string
  }>) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()
```

### React Hook for API Data
```typescript
// hooks/use-users.ts
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

export function useUsers(params?: {
  page?: number
  limit?: number
  search?: string
}) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        const response = await apiClient.getUsers(params)
        setUsers(response.data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [JSON.stringify(params)])

  return { users, loading, error }
}
```

## Best Practices

1. **Always validate input** - Use Zod or similar for schema validation
2. **Implement rate limiting** - Prevent abuse and protect your APIs
3. **Use proper HTTP status codes** - Follow REST conventions
4. **Handle errors gracefully** - Provide clear error messages
5. **Log important events** - Monitor API usage and errors
6. **Use TypeScript** - Ensure type safety throughout your API
7. **Implement authentication** - Protect sensitive endpoints
8. **Write tests** - Ensure API reliability
9. **Document your APIs** - Make them easy to understand and use
10. **Monitor performance** - Track response times and optimize accordingly