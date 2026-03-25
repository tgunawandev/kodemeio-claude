# Next.js Comprehensive Reference Documentation

This reference provides detailed coverage of Next.js patterns, APIs, and best practices for building modern full-stack applications.

## Table of Contents

1. [App Router vs Pages Router](#app-router-vs-pages-router)
2. [Server Components](#server-components)
3. [Data Fetching Patterns](#data-fetching-patterns)
4. [API Routes & Route Handlers](#api-routes--route-handlers)
5. [Routing & Navigation](#routing--navigation)
6. [Performance Optimization](#performance-optimization)
7. [Styling Solutions](#styling-solutions)
8. [Authentication & Security](#authentication--security)
9. [Deployment & Configuration](#deployment--configuration)
10. [Error Handling & Testing](#error-handling--testing)

## App Router vs Pages Router

### App Router (Recommended)
The modern routing system introduced in Next.js 13+ with React Server Components support.

**Key Features:**
- React Server Components by default
- Nested layouts and route groups
- Server Actions for form handling
- Streaming and Suspense support
- Improved performance and bundle size

### Pages Router (Legacy)
Traditional routing system with client-side rendering and data fetching methods.

**When to use:**
- Existing projects not ready to migrate
- Specific SSR patterns not yet supported in App Router
- Third-party library compatibility requirements

## Server Components

### Understanding Server Components
Server Components run exclusively on the server and have special capabilities:

```typescript
// app/page.tsx - Server Component (default)
export default async function Page() {
  // Can access database, files, environment variables
  const data = await fetch('https://api.example.com/data')
  const posts = await data.json()

  return (
    <div>
      <h1>Server Component</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Client Components
Components that need interactivity or browser APIs must be marked as client components:

```typescript
// app/components/interactive-button.tsx
'use client' // This directive makes it a Client Component

import { useState } from 'react'

export default function InteractiveButton() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Click count: {count}
    </button>
  )
}
```

### Best Practices
- Use Server Components by default
- Only mark components as client when necessary
- Push client state as far down the component tree as possible
- Use Server Components to fetch data and pass to Client Components

## Data Fetching Patterns

### Server Component Data Fetching

#### Static Data (Cached)
```typescript
// app/posts/page.tsx
async function getPosts() {
  // Data is cached indefinitely (similar to getStaticProps)
  const res = await fetch('https://api.example.com/posts')
  return res.json()
}

export default async function PostsPage() {
  const posts = await getPosts()

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  )
}
```

#### Dynamic Data (Revalidated)
```typescript
// app/dashboard/page.tsx
async function getDashboardData() {
  // Data is cached for 60 seconds (ISR-like)
  const res = await fetch('https://api.example.com/dashboard', {
    next: { revalidate: 60 }
  })
  return res.json()
}

export default async function Dashboard() {
  const data = await getDashboardData()
  return <DashboardView data={data} />
}
```

#### Real-time Data (No Cache)
```typescript
// app/live-stats/page.tsx
async function getLiveStats() {
  // Data is fetched on every request (similar to getServerSideProps)
  const res = await fetch('https://api.example.com/stats', {
    cache: 'no-store'
  })
  return res.json()
}

export default async function LiveStats() {
  const stats = await getLiveStats()
  return <StatsDisplay stats={stats} />
}
```

### Sequential Data Fetching
```typescript
// app/users/[id]/page.tsx
export default async function UserProfile({ params }: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch user data first
  const user = await getUser(id)

  // Then fetch user's posts using the user ID
  const posts = await getUserPosts(id)

  return (
    <div>
      <h1>{user.name}</h1>
      <Suspense fallback={<div>Loading posts...</div>}>
        <UserPosts posts={posts} />
      </Suspense>
    </div>
  )
}
```

### Parallel Data Fetching
```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default async function Dashboard() {
  // Fetch data in parallel using Promise.all
  const [user, posts, analytics] = await Promise.all([
    getUser(),
    getPosts(),
    getAnalytics()
  ])

  return (
    <div>
      <Suspense fallback={<UserSkeleton />}>
        <UserProfile user={user} />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts posts={posts} />
      </Suspense>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <Analytics analytics={analytics} />
      </Suspense>
    </div>
  )
}
```

### Database Integration
```typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })

// app/posts/page.tsx
import { db } from '@/lib/db'
import { posts } from '@/lib/schema'

export default async function PostsPage() {
  const allPosts = await db.select().from(posts)

  return (
    <div>
      {allPosts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  )
}
```

## API Routes & Route Handlers

### App Router Route Handlers
```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = searchParams.get('page') || '1'

  const users = await getUsers(page)

  return NextResponse.json({
    users,
    page: parseInt(page),
    total: users.length
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Validate input
  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: 'Name and email are required' },
      { status: 400 }
    )
  }

  try {
    const user = await createUser(body)
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
```

### Dynamic Route Handlers
```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await getUserById(id)

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(user)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const updatedUser = await updateUser(id, body)

  return NextResponse.json(updatedUser)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await deleteUser(id)

  return NextResponse.json({ message: 'User deleted successfully' })
}
```

### Pages Router API Routes
```typescript
// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const users = await getUsers()
      res.status(200).json(users)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' })
    }
  } else if (req.method === 'POST') {
    try {
      const user = await createUser(req.body)
      res.status(201).json(user)
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
```

## Routing & Navigation

### Dynamic Routes
```typescript
// app/posts/[slug]/page.tsx
export default async function PostPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return <PostView post={post} />
}
```

### Catch-all Routes
```typescript
// app/docs/[...slug]/page.tsx
export default async function DocPage({
  params
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const path = slug.join('/')
  const doc = await getDocByPath(path)

  return <DocView doc={doc} />
}
```

### Route Groups
```
app/
├── (marketing)/
│   ├── layout.tsx         # Marketing layout
│   ├── page.tsx           # Marketing home page
│   └── about/
│       └── page.tsx       # About page
├── (dashboard)/
│   ├── layout.tsx         # Dashboard layout
│   ├── page.tsx           # Dashboard home page
│   └── settings/
│       └── page.tsx       # Settings page
└── layout.tsx             # Root layout
```

### Navigation with Link Component
```typescript
// components/Navigation.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav>
      <Link
        href="/"
        className={pathname === '/' ? 'active' : ''}
      >
        Home
      </Link>
      <Link
        href="/about"
        className={pathname === '/about' ? 'active' : ''}
      >
        About
      </Link>
      <Link
        href="/dashboard"
        className={pathname.startsWith('/dashboard') ? 'active' : ''}
      >
        Dashboard
      </Link>
    </nav>
  )
}
```

## Performance Optimization

### Image Optimization
```typescript
// components/OptimizedImage.tsx
import Image from 'next/image'

export default function OptimizedImage({
  src,
  alt,
  width,
  height
}: {
  src: string
  alt: string
  width: number
  height: number
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={width > 600} // Prioritize above-the-fold images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  )
}
```

### Bundle Optimization
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lodash', 'date-fns']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}

module.exports = nextConfig
```

### Dynamic Imports
```typescript
// components/LazyComponent.tsx
import dynamic from 'next/dynamic'

// Heavy component that doesn't need to be loaded immediately
const HeavyChart = dynamic(
  () => import('./HeavyChart'),
  {
    loading: () => <div>Loading chart...</div>,
    ssr: false // Client-side only if needed
  }
)

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart />
    </div>
  )
}
```

### Font Optimization
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Improves performance
  variable: '--font-inter'
})

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

## Styling Solutions

### Tailwind CSS Integration
```typescript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a'
        }
      }
    }
  },
  plugins: []
}
```

### CSS Modules
```typescript
// components/Button.module.css
.button {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.primary {
  background-color: var(--primary-500);
  color: white;
}

.primary:hover {
  background-color: var(--primary-600);
}

// components/Button.tsx
import styles from './Button.module.css'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  children
}: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  )
}
```

## Authentication & Security

### NextAuth.js Integration
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await verifyUser(credentials.email, credentials.password)
        return user
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup'
  }
})

export { handler as GET, handler as POST }
```

### Middleware for Route Protection
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isDashboardPage && !token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/auth/:path*', '/dashboard/:path*']
}
```

## Deployment & Configuration

### Environment Variables
```typescript
// .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### Production Configuration
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
```

## Error Handling & Testing

### Error Boundaries
```typescript
// app/error.tsx
'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>
        Try again
      </button>
    </div>
  )
}
```

### Not Found Pages
```typescript
// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div>
      <h2>Page Not Found</h2>
      <p>Sorry, we couldn't find the page you're looking for.</p>
      <Link href="/">Return Home</Link>
    </div>
  )
}
```

### Loading States
```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div>
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  )
}
```

## Best Practices Checklist

### Performance
- [ ] Use Server Components by default
- [ ] Implement proper caching strategies
- [ ] Optimize images with next/image
- [ ] Use dynamic imports for heavy components
- [ ] Implement loading states with Suspense

### Security
- [ ] Validate all user inputs
- [ ] Use HTTPS in production
- [ ] Implement proper authentication
- [ ] Set security headers
- [ ] Sanitize database queries

### Code Quality
- [ ] Use TypeScript for type safety
- [ ] Implement error boundaries
- [ ] Write tests for critical paths
- [ ] Use ESLint and Prettier
- [ ] Document API endpoints

### SEO
- [ ] Use semantic HTML
- [ ] Implement proper meta tags
- [ ] Create sitemaps
- [ ] Use structured data
- [ ] Optimize Core Web Vitals

This comprehensive reference provides the foundation for building robust, scalable Next.js applications. Each pattern includes production-ready examples and follows current best practices.