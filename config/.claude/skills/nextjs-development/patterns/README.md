# Next.js Architectural Patterns

This directory contains common architectural patterns and best practices for building scalable Next.js applications.

## Available Patterns

### Data Fetching Patterns
- `server-component-data-fetching/` - Data fetching in Server Components
- `client-component-data-fetching/` - Client-side data fetching with SWR
- `parallel-data-fetching/` - Parallel data fetching with Suspense
- `streaming-data-fetching/` - Streaming and progressive rendering

### Authentication Patterns
- `auth-middleware/` - Middleware-based route protection
- `route-protection/` - Component-level authentication
- `role-based-access/` - RBAC implementation
- `session-management/` - Session handling strategies

### State Management Patterns
- `zustand-state/` - Client state with Zustand
- `server-state/` - Server state management
- `form-state/` - Form state and validation
- `global-state/` - Global application state

### Performance Patterns
- `image-optimization/` - Image handling and optimization
- `code-splitting/` - Dynamic imports and lazy loading
- `caching-strategies/` - Data caching and revalidation
- `bundle-optimization/` - Bundle size optimization

### Architecture Patterns
- `micro-frontends/` - Micro-frontend architecture
- `feature-slices/` - Feature-based folder structure
- `clean-architecture/` - Clean architecture principles
- `enterprise-patterns/` - Enterprise-level patterns

## Pattern Examples

### Server Component Data Fetching
```typescript
// patterns/server-component-data-fetching/page.tsx
import { Suspense } from 'react'
import { getUser, getUserPosts, getUserStats } from '@/lib/data'

// Parallel data fetching pattern
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId)
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}

async function UserPosts({ userId }: { userId: string }) {
  const posts = await getUserPosts(userId)
  return (
    <div>
      <h2>Posts</h2>
      {posts.map(post => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  )
}

async function UserStats({ userId }: { userId: string }) {
  const stats = await getUserStats(userId)
  return (
    <div>
      <h2>Statistics</h2>
      <p>Total posts: {stats.totalPosts}</p>
      <p>Total views: {stats.totalViews}</p>
    </div>
  )
}

export default function UserPage({ params }: {
  params: Promise<{ id: string }>
}) {
  const { id: userId } = React.use(params)

  return (
    <div>
      <Suspense fallback={<div>Loading profile...</div>}>
        <UserProfile userId={userId} />
      </Suspense>

      <div className="grid grid-cols-2 gap-4">
        <Suspense fallback={<div>Loading posts...</div>}>
          <UserPosts userId={userId} />
        </Suspense>

        <Suspense fallback={<div>Loading stats...</div>}>
          <UserStats userId={userId} />
        </Suspense>
      </div>
    </div>
  )
}
```

### Authentication Middleware Pattern
```typescript
// patterns/auth-middleware/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Redirect unauthenticated users from protected routes
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/auth/signin', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users from auth pages
  if (token && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based access control
  if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/auth/:path*',
    '/profile/:path*'
  ]
}
```

### Feature-Based Architecture Pattern
```
patterns/feature-slices/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── signin-form.tsx
│   │   │   └── signup-form.tsx
│   │   ├── lib/
│   │   │   ├── auth-config.ts
│   │   │   └── validations.ts
│   │   └── types/
│   │       └── auth.ts
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── dashboard-layout.tsx
│   │   │   └── stats-card.tsx
│   │   ├── lib/
│   │   │   └── dashboard-data.ts
│   │   └── types/
│   │       └── dashboard.ts
│   └── posts/
│       ├── components/
│       │   ├── post-list.tsx
│       │   └── post-card.tsx
│       ├── lib/
│       │   └── posts-api.ts
│       └── types/
│           └── posts.ts
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── lib/
│   │   ├── utils.ts
│   │   └── validations.ts
│   └── types/
│       └── common.ts
└── app/
    ├── auth/
    ├── dashboard/
    └── posts/
```

## Using Patterns

Each pattern includes:
- ✅ Complete implementation examples
- 📝 Detailed explanations and use cases
- 🧪 Testing strategies
- 📈 Performance considerations
- 🔧 Configuration requirements
- 🚀 Migration guides where applicable

### Selecting the Right Pattern

1. **Consider your requirements** - Scale, team size, complexity
2. **Evaluate trade-offs** - Performance vs. developer experience
3. **Plan for growth** - Choose patterns that scale with your application
4. **Follow conventions** - Stick to established patterns when possible
5. **Iterate and refine** - Adapt patterns to your specific needs

### Pattern Integration

Multiple patterns can be combined:
- Authentication + Role-based access control
- Server components + Streaming data fetching
- Feature-based architecture + Clean architecture
- Performance optimization + Caching strategies

### Customizing Patterns

All patterns are designed to be:
- ✅ Modular and composable
- 🔧 Easily configurable
- 📈 Performance-optimized
- 🧪 Well-tested
- 📚 Well-documented

Feel free to adapt these patterns to fit your specific use case and application requirements.