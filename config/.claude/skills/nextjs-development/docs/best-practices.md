# Next.js Best Practices

Comprehensive guide to Next.js best practices for building maintainable, performant, and scalable applications.

## Table of Contents

1. [Project Structure & Organization](#project-structure--organization)
2. [Performance Optimization](#performance-optimization)
3. [Security Best Practices](#security-best-practices)
4. [Code Quality & Standards](#code-quality--standards)
5. [SEO & Accessibility](#seo--accessibility)
6. [Development Workflow](#development-workflow)
7. [Testing Strategies](#testing-strategies)
8. [Deployment & Monitoring](#deployment--monitoring)
9. [TypeScript Best Practices](#typescript-best-practices)
10. [Scalability Patterns](#scalability-patterns)

## Project Structure & Organization

### Recommended Folder Structure
```
app/                    # App Router pages and layouts
├── (auth)/            # Route group for authentication pages
├── (dashboard)/       # Route group for dashboard
├── api/               # API routes
├── globals.css        # Global styles
├── layout.tsx         # Root layout
└── page.tsx           # Home page

components/            # Reusable components
├── ui/               # Base UI components
├── forms/            # Form components
├── layout/           # Layout components
└── features/         # Feature-specific components

lib/                  # Utility libraries
├── utils.ts          # General utilities
├── validations.ts    # Schema validations
├── constants.ts      # Application constants
├── types.ts          # TypeScript definitions
└── db.ts            # Database configuration

hooks/                # Custom React hooks
styles/               # Global styles and CSS
public/               # Static assets
tests/                # Test files
docs/                 # Documentation
```

### Feature-Based Organization
```
features/
├── auth/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── hooks/
├── dashboard/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── hooks/
└── posts/
    ├── components/
    ├── lib/
    ├── types/
    └── hooks/
```

### Naming Conventions
```typescript
// ✅ Good: Descriptive and consistent
components/ui/Button.tsx
components/forms/ContactForm.tsx
hooks/use-authentication.ts
lib/validations/auth-schema.ts

// ❌ Bad: Vague or inconsistent naming
components/btn.tsx
components/form.tsx
hooks/useHook.ts
lib/schema.ts
```

### File Naming Patterns
- **Components:** PascalCase (e.g., `UserProfile.tsx`)
- **Utilities:** camelCase (e.g., `formatDate.ts`)
- **Pages:** `page.tsx` (App Router) or descriptive name (Pages Router)
- **API Routes:** `route.ts` with method exports
- **Types:** `types.ts` or descriptive name (e.g., `user-types.ts`)

## Performance Optimization

### 1. Use Server Components by Default
```typescript
// ✅ Good: Server Component for static content
export default function PostList() {
  const posts = await getPosts()
  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  )
}

// ❌ Bad: Unnecessary client component
'use client'
export default function PostList() {
  const [posts, setPosts] = useState([])
  // Fetching client-side when not needed
}
```

### 2. Optimize Images
```typescript
// ✅ Good: Proper image optimization
import Image from 'next/image'

export default function HeroImage() {
  return (
    <Image
      src="/hero-image.jpg"
      alt="Hero section"
      width={1200}
      height={600}
      priority={true}          // Load important images first
      placeholder="blur"        // Better UX
      blurDataURL="data:image/jpeg;base64,..." // Minimal blur
    />
  )
}

// ❌ Bad: Unoptimized images
<img src="/hero-image.jpg" alt="Hero" width="1200" height="600" />
```

### 3. Implement Proper Caching
```typescript
// ✅ Good: Appropriate caching strategies
// Static data (rarely changes)
const staticData = await fetch('https://api.example.com/config', {
  cache: 'force-cache'
})

// Dynamic data (changes frequently)
const dynamicData = await fetch('https://api.example.com/live-data', {
  cache: 'no-store'
})

// Time-based revalidation
const timelyData = await fetch('https://api.example.com/posts', {
  next: { revalidate: 3600 } // Revalidate every hour
})

// Tag-based revalidation
const taggedData = await fetch('https://api.example.com/products', {
  next: { tags: ['products'] }
})
```

### 4. Dynamic Imports for Code Splitting
```typescript
// ✅ Good: Dynamic imports for heavy components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Client-only if needed
})

const AdminPanel = dynamic(() => import('./AdminPanel'), {
  loading: () => <div>Loading admin panel...</div>
})

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart />
      <AdminPanel />
    </div>
  )
}
```

### 5. Optimize Bundle Size
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lodash', 'date-fns', '@mui/icons-material']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false
      }
    }
    return config
  }
}

module.exports = nextConfig
```

## Security Best Practices

### 1. Environment Variable Management
```typescript
// ✅ Good: Secure environment variable handling
const config = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  publicApiUrl: process.env.NEXT_PUBLIC_API_URL, // Client-safe
  // Never expose sensitive data to client
}

// lib/env.ts
export function getEnv() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  return { databaseUrl }
}
```

### 2. Input Validation
```typescript
// ✅ Good: Comprehensive input validation
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(10).max(5000),
  published: z.boolean().default(false),
  tags: z.array(z.string()).max(5)
})

export async function createPost(data: unknown) {
  const validatedData = createPostSchema.parse(data)
  // Process validated data
}
```

### 3. Authentication & Authorization
```typescript
// ✅ Good: Proper middleware for route protection
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  return <div>{children}</div>
}
```

### 4. API Security
```typescript
// ✅ Good: Secure API routes
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { validateCsrfToken } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  // Rate limiting
  await rateLimit(request, 'api-endpoint')

  // CSRF protection
  if (!validateCsrfToken(request)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  // Validate input
  const body = await request.json()
  // ... validation logic

  return NextResponse.json({ success: true })
}
```

### 5. Content Security Policy
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
  }
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ]
  }
}
```

## Code Quality & Standards

### 1. TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### 2. ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 3. Component Design Patterns
```typescript
// ✅ Good: Clear component responsibilities
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-md transition-colors'
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  }
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}
```

### 4. Custom Hooks Best Practices
```typescript
// ✅ Good: Well-designed custom hook
import { useState, useEffect } from 'react'
import { User } from '@/types'

interface UseUserReturn {
  user: User | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUser(userId: string): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      const userData = await getUserById(userId)
      setUser(userData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchUser()
    }
  }, [userId])

  return { user, loading, error, refetch: fetchUser }
}
```

## SEO & Accessibility

### 1. Meta Tags and SEO
```typescript
// ✅ Good: Comprehensive SEO setup
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Awesome App | Home',
  description: 'Discover amazing features and services',
  keywords: ['app', 'service', 'features'],
  authors: [{ name: 'Your Name' }],
  openGraph: {
    title: 'My Awesome App',
    description: 'Discover amazing features and services',
    url: 'https://yourapp.com',
    siteName: 'My Awesome App',
    images: [
      {
        url: 'https://yourapp.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'My Awesome App preview'
      }
    ],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Awesome App',
    description: 'Discover amazing features and services',
    images: ['https://yourapp.com/twitter-image.jpg']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
}
```

### 2. Accessibility Best Practices
```typescript
// ✅ Good: Accessible component
export default function AccessibleButton({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
  ariaDescribedBy?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {children}
    </button>
  )
}

// ✅ Good: Semantic HTML structure
export default function BlogPost({ post }: { post: BlogPost }) {
  return (
    <article className="prose max-w-none">
      <header>
        <h1>{post.title}</h1>
        <time dateTime={post.publishedAt}>
          {new Date(post.publishedAt).toLocaleDateString()}
        </time>
      </header>
      <main dangerouslySetInnerHTML={{ __html: post.content }} />
      <footer>
        <p>Written by {post.author.name}</p>
      </footer>
    </article>
  )
}
```

### 3. Structured Data
```typescript
// ✅ Good: JSON-LD structured data
export function BlogPostStructuredData({ post }: { post: BlogPost }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    author: {
      '@type': 'Person',
      name: post.author.name
    },
    publisher: {
      '@type': 'Organization',
      name: 'Your Blog',
      logo: {
        '@type': 'ImageObject',
        url: 'https://yourblog.com/logo.png'
      }
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
```

## Development Workflow

### 1. Git Hooks
```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "pre-commit": "lint-staged"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss}": [
      "prettier --write"
    ]
  }
}
```

### 2. Development Scripts
```bash
# .env.local.development
NEXT_PUBLIC_API_URL=http://localhost:3001
DATABASE_URL=postgresql://localhost:5432/myapp_dev
NEXTAUTH_SECRET=dev-secret-not-for-production

# Development server with hot reload
npm run dev

# Type checking in watch mode
npm run type-check -- --watch

# Run tests with coverage
npm run test -- --coverage
```

### 3. Code Review Checklist
- [ ] TypeScript types are correct
- [ ] No console.log statements in production code
- [ ] Components have proper prop types
- [ ] Error handling is implemented
- [ ] Performance considerations are addressed
- [ ] Accessibility requirements are met
- [ ] Security best practices are followed
- [ ] Tests are included for new features
- [ ] Documentation is updated

## Testing Strategies

### 1. Unit Testing
```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import Button from '@/components/ui/Button'

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### 2. Integration Testing
```typescript
// __tests__/integration/auth.test.ts
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import LoginPage from '@/app/auth/signin/page'

describe('Authentication Flow', () => {
  it('allows user to sign in with valid credentials', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    )

    // Fill out form
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    // Wait for redirect or success message
    await waitFor(() => {
      expect(screen.getByText('Welcome back!')).toBeInTheDocument()
    })
  })
})
```

### 3. E2E Testing
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can sign in and access protected routes', async ({ page }) => {
    await page.goto('/auth/signin')

    // Fill login form
    await page.fill('[data-testid=email]', 'test@example.com')
    await page.fill('[data-testid=password]', 'password123')
    await page.click('[data-testid=signin-button]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')

    // Access protected route
    await page.goto('/profile')
    await expect(page.locator('[data-testid=profile-info]')).toBeVisible()
  })
})
```

### 4. API Testing
```typescript
// __tests__/api/users.test.ts
import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/users/route'

describe('/api/users', () => {
  it('returns a list of users', async () => {
    const { req } = createMocks({ method: 'GET' })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('creates a new user with valid data', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com'
    }

    const { req } = createMocks({
      method: 'POST',
      body: userData
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.name).toBe(userData.name)
  })
})
```

## Deployment & Monitoring

### 1. Environment Configuration
```typescript
// lib/config.ts
export const config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,

  // Feature flags
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  enableNewFeature: process.env.NEXT_PUBLIC_ENABLE_NEW_FEATURE === 'true'
}

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET']
const missingEnvVars = requiredEnvVars.filter(
  envVar => !process.env[envVar]
)

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
}
```

### 2. Error Tracking
```typescript
// lib/error-tracking.ts
import * as Sentry from '@sentry/nextjs'

export function initErrorTracking() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
    })
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('Application error:', error)

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: { custom: context }
    })
  }
}
```

### 3. Performance Monitoring
```typescript
// lib/performance.ts
export function reportWebVitals({
  id,
  name,
  label,
  value
}: {
  id: string
  name: string
  label: string
  value: number
}) {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
    // Send to analytics service
    window.gtag?.('event', name, {
      event_category:
        label === 'web-vital' ? 'Web Vitals' : 'Next.js custom metric',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true
    })
  }
}
```

### 4. Health Checks
```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await db.query('SELECT 1')

    // Check external services
    const externalServiceCheck = await fetch('https://api.external.com/health')

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        external: externalServiceCheck.ok ? 'healthy' : 'unhealthy'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}
```

## TypeScript Best Practices

### 1. Strict Type Definitions
```typescript
// ✅ Good: Specific and strict types
interface User {
  readonly id: string
  name: string
  email: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

type UserRole = 'USER' | 'ADMIN' | 'MODERATOR'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

// ❌ Bad: Vague or loose types
interface User {
  id: any
  name: any
  email: any
}
```

### 2. Generic Utility Types
```typescript
// lib/types.ts
export type PaginatedResponse<T> = {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type SearchParams = {
  page?: string
  limit?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Usage
async function getUsers(params: SearchParams): Promise<PaginatedResponse<User>> {
  // Implementation
}
```

### 3. Component Props Typing
```typescript
// components/ui/DataTable.tsx
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  pagination?: PaginationConfig
  onRowClick?: (row: T) => void
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  onRowClick,
  className
}: DataTableProps<T>) {
  // Implementation
}
```

## Scalability Patterns

### 1. Micro-Frontend Architecture
```typescript
// app/(apps)/dashboard/layout.tsx
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dashboard-layout">
      <Header />
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}

// app/(apps)/analytics/layout.tsx
export default function AnalyticsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="analytics-layout">
      <AnalyticsHeader />
      <main>{children}</main>
    </div>
  )
}
```

### 2. Feature Flags
```typescript
// lib/feature-flags.ts
interface FeatureFlags {
  newDashboard: boolean
  betaFeatures: boolean
  advancedAnalytics: boolean
}

export function getFeatureFlags(): FeatureFlags {
  return {
    newDashboard: process.env.NEXT_PUBLIC_FLAG_NEW_DASHBOARD === 'true',
    betaFeatures: process.env.NEXT_PUBLIC_FLAG_BETA === 'true',
    advancedAnalytics: process.env.NEXT_PUBLIC_FLAG_ANALYTICS === 'true'
  }
}

// hooks/use-feature-flags.ts
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags())

  useEffect(() => {
    // Update flags when environment changes
    setFlags(getFeatureFlags())
  }, [])

  return flags
}
```

### 3. Caching Strategies
```typescript
// lib/cache.ts
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  posts: (page: number) => `posts:page:${page}`,
  products: (category: string) => `products:category:${category}`
} as const

export const cacheTags = {
  users: 'users',
  posts: 'posts',
  products: 'products'
} as const

// Usage in API routes
export async function GET() {
  const data = await fetchData()

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Cache-Tag': cacheTags.posts
    }
  })
}
```

### 4. Database Optimization
```typescript
// lib/db-queries.ts
// Efficient queries with proper indexing
export async function getUserWithPosts(userId: string) {
  return await db.user.findUnique({
    where: { id: userId },
    include: {
      posts: {
        select: {
          id: true,
          title: true,
          publishedAt: true,
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { publishedAt: 'desc' },
        take: 10
      }
    }
  })
}

// Batch operations
export async function updatePostViewCounts(postIds: string[]) {
  return await db.post.updateMany({
    where: { id: { in: postIds } },
    data: {
      viewCount: { increment: 1 }
    }
  })
}
```

## Quick Reference Checklist

### Before Deploying
- [ ] Run `npm run build` successfully
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compilation succeeds (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Environment variables are configured
- [ ] Security headers are implemented
- [ ] Performance budget is met
- [ ] SEO meta tags are complete
- [ ] Error tracking is configured
- [ ] Monitoring is set up

### Code Review Checklist
- [ ] Code follows naming conventions
- [ ] Components are properly typed
- [ ] Error handling is implemented
- [ ] Accessibility requirements are met
- [ ] Performance optimizations are applied
- [ ] Security best practices are followed
- [ ] Tests are included and comprehensive
- [ ] Documentation is updated

### Performance Checklist
- [ ] Images are optimized with next/image
- [ ] Bundle size is within budget
- [ ] Loading states are implemented
- [ ] Code splitting is used appropriately
- [ ] Caching strategies are implemented
- [ ] Core Web Vitals are optimized

Following these best practices will help you build Next.js applications that are maintainable, performant, secure, and scalable.