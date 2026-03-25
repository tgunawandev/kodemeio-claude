# Next.js Troubleshooting Guide

Comprehensive troubleshooting guide for common Next.js issues and their solutions.

## Table of Contents

1. [Build and Deployment Issues](#build-and-deployment-issues)
2. [Development Environment Issues](#development-environment-issues)
3. [Routing Issues](#routing-issues)
4. [Data Fetching Issues](#data-fetching-issues)
5. [Performance Issues](#performance-issues)
6. [Styling Issues](#styling-issues)
7. [TypeScript Issues](#typescript-issues)
8. [API Route Issues](#api-route-issues)
9. [Database and Environment Issues](#database-and-environment-issues)
10. [Migration Issues](#migration-issues)

## Build and Deployment Issues

### Error: "Build failed because of webpack errors"

**Common Causes:**
- Missing dependencies
- Syntax errors in code
- Import/export issues
- TypeScript configuration problems

**Solutions:**
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for specific build errors
npm run build 2>&1 | grep -A 10 -B 10 "error"
```

**Prevention:**
- Run `npm run lint` before building
- Use `npm run type-check` to verify TypeScript
- Test in development before deployment

### Error: "Module not found: Can't resolve 'fs'"

**Cause:** Using server-side modules in client components

**Solution:**
```typescript
// ❌ Wrong - Using fs in client component
'use client'
import fs from 'fs' // This will fail

// ✅ Correct - Move to server component
import fs from 'fs'
export default function ServerComponent() {
  // Use fs here
}
```

**Dynamic Import Solution:**
```typescript
'use client'
import dynamic from 'next/dynamic'

const ServerOnlyComponent = dynamic(
  () => import('./ServerOnlyComponent'),
  { ssr: false }
)
```

### Error: "ReferenceError: window is not defined"

**Cause:** Browser-specific code running on server

**Solutions:**
```typescript
// ✅ Use useEffect for client-side only code
'use client'
import { useEffect, useState } from 'react'

export default function Component() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null // Prevent SSR mismatch

  return <div>{window.innerWidth}</div>
}

// ✅ Use dynamic imports with ssr: false
const ClientOnlyComponent = dynamic(
  () => import('./ClientOnlyComponent'),
  { ssr: false }
)
```

## Development Environment Issues

### Error: "Port 3000 is already in use"

**Solutions:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Hot Module Replacement (HMR) not working

**Troubleshooting Steps:**
```bash
# Check if files are being watched
lsof -i :3000

# Clear Next.js cache
rm -rf .next

# Restart development server
npm run dev
```

**Common Fixes:**
- Ensure `next.config.js` doesn't disable HMR
- Check firewall settings
- Verify file permissions

### VS Code IntelliSense not working

**Solutions:**
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

**Install Recommended Extensions:**
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Prettier - Code formatter
- Tailwind CSS IntelliSense

## Routing Issues

### 404 errors on dynamic routes

**Common Causes:**
- Incorrect file structure
- Wrong parameter names
- Missing notFound() calls

**Debug Steps:**
```typescript
// app/posts/[slug]/page.tsx
export default async function PostPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  // Debug: Log the params
  const { slug } = await params
  console.log('Slug:', slug)

  const post = await getPost(slug)

  // Debug: Check if post exists
  if (!post) {
    console.log('Post not found for slug:', slug)
    notFound()
  }

  return <PostView post={post} />
}
```

### Route groups not working

**Issue:** Parentheses in folder names

**Solution:**
```
# ✅ Correct structure
app/
├── (marketing)/
│   ├── layout.tsx
│   └── page.tsx
└── (dashboard)/
    ├── layout.tsx
    └── page.tsx

# ❌ Incorrect structure
app/
├── marketing/        # Missing parentheses
│   ├── layout.tsx
│   └── page.tsx
```

### Layout issues and nesting

**Common Problems:**
- Multiple layouts conflicting
- Missing root layout
- Incorrect layout inheritance

**Debug Structure:**
```typescript
// app/layout.tsx - Root layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header>Global Header</header>
        <main>{children}</main>
        <footer>Global Footer</footer>
      </body>
    </html>
  )
}

// app/dashboard/layout.tsx - Nested layout
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dashboard">
      <aside>Sidebar</aside>
      <div className="content">{children}</div>
    </div>
  )
}
```

## Data Fetching Issues

### Error: "Failed to fetch" in Server Components

**Common Causes:**
- Network connectivity issues
- API endpoint changes
- CORS problems

**Debug Solutions:**
```typescript
// Add error handling and logging
async function getData() {
  try {
    const response = await fetch('https://api.example.com/data', {
      cache: 'no-store', // Disable caching for debugging
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Fetched data:', data)
    return data
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}
```

### Caching issues

**Symptoms:**
- Stale data being displayed
- Changes not reflecting immediately
- Inconsistent data between requests

**Solutions:**
```typescript
// Force revalidation
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store'
})

// Time-based revalidation
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 } // Revalidate every 60 seconds
})

// On-demand revalidation
const data = await fetch('https://api.example.com/data', {
  next: { tags: ['posts'] } // Can be revalidated by tag
})
```

### Sequential vs Parallel Data Fetching

**Performance Issue:**
```typescript
// ❌ Slow - Sequential fetching
export default async function SlowPage() {
  const user = await getUser()      // 1 second
  const posts = await getPosts()    // 1 second
  const stats = await getStats()    // 1 second
  // Total: 3 seconds
}
```

**Optimized Solution:**
```typescript
// ✅ Fast - Parallel fetching
export default async function FastPage() {
  const [user, posts, stats] = await Promise.all([
    getUser(),
    getPosts(),
    getStats()
  ])
  // Total: 1 second
}
```

## Performance Issues

### Slow initial page load

**Diagnostic Tools:**
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Check Core Web Vitals
npm install -g lighthouse
lighthouse http://localhost:3000
```

**Optimization Strategies:**
```typescript
// Dynamic imports for heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>Loading chart...</div>
})

// Image optimization
import Image from 'next/image'
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority={true} // Load important images first
  placeholder="blur"
/>
```

### Memory leaks

**Common Causes:**
- Event listeners not cleaned up
- Intervals/timeouts not cleared
- Subscriptions not unsubscribed

**Solutions:**
```typescript
'use client'
import { useEffect } from 'react'

export default function Component() {
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Interval running')
    }, 1000)

    const handleResize = () => {
      console.log('Window resized')
    }
    window.addEventListener('resize', handleResize)

    // Cleanup function
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
    }
  }, []) // Empty dependency array
}
```

## Styling Issues

### Tailwind CSS not working

**Troubleshooting Steps:**
```bash
# Check Tailwind configuration
npx tailwindcss --help

# Rebuild CSS
npm run build

# Check for conflicting styles
npm run dev
```

**Configuration Fix:**
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### CSS-in-JS hydration mismatch

**Error:** "Text content does not match server-rendered HTML"

**Solution:**
```typescript
'use client'
import { useState, useEffect } from 'react'

export default function Component() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Only render dynamic styles on client
  const style = isClient ? { color: 'red' } : {}

  return <div style={style}>Dynamic content</div>
}
```

## TypeScript Issues

### Type errors with Next.js APIs

**Common Error:** "Property 'params' does not exist on type"

**Solution:**
```typescript
// ✅ Correct typing
export default async function Page({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // ...
}

// ✅ Alternative with Awaited
export default async function Page({
  params
}: {
  params: Awaited<{ id: string }>
}) {
  const { id } = params
  // ...
}
```

### Module resolution issues

**Configuration Fix:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"]
    }
  }
}
```

**Next.js Configuration:**
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    return config
  }
}
```

## API Route Issues

### CORS errors

**Solution:**
```typescript
// app/api/users/route.ts
export async function GET(request: Request) {
  // Handle CORS
  const origin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3000', 'https://yourdomain.com']

  if (allowedOrigins.includes(origin || '')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const data = await getUsers()

  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': origin || '',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}
```

### Request body parsing errors

**Solution:**
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate body structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Process data...
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse request body' },
      { status: 400 }
    )
  }
}
```

## Database and Environment Issues

### Environment variables not loading

**Debug Steps:**
```typescript
// Debug environment variables
console.log('Database URL:', process.env.DATABASE_URL)
console.log('NextAuth Secret:', process.env.NEXTAUTH_SECRET)
```

**Common Issues:**
- Missing `.env.local` file
- Incorrect variable names (NEXT_PUBLIC_ for client-side)
- Variables not prefixed correctly

**Fix:**
```bash
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-here"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### Database connection issues

**Debug Solution:**
```typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

let client: postgres.Sql
let db: ReturnType<typeof drizzle>

try {
  client = postgres(process.env.DATABASE_URL!, {
    max: 1, // Limit connections for debugging
  })
  db = drizzle(client)

  // Test connection
  await client`SELECT 1`
  console.log('Database connected successfully')
} catch (error) {
  console.error('Database connection failed:', error)
  throw error
}

export { db }
```

## Migration Issues

### Pages Router to App Router migration errors

**Common Issues:**
- `getStaticProps` not working
- `useRouter` import errors
- Layout conflicts

**Solutions:**
```typescript
// Replace getStaticProps
// Before: getStaticProps
export async function getStaticProps() {
  const posts = await getPosts()
  return { props: { posts } }
}

// After: Direct data fetching
export default async function Page() {
  const posts = await getPosts()
  return <PostList posts={posts} />
}

// Fix useRouter import
// Before: import { useRouter } from 'next/router'
// After: import { useRouter } from 'next/navigation'
```

### Type definition conflicts

**Solution:**
```bash
# Update Next.js types
npm install @types/react@latest @types/react-dom@latest

# Clear TypeScript cache
rm -rf .next/types
npm run build
```

## General Debugging Tips

### Enable verbose logging
```bash
# Verbose Next.js output
DEBUG=* npm run dev

# Webpack build analysis
ANALYZE=true npm run build
```

### Use Next.js debugging tools
```typescript
// Add debug information to layouts
export default function Layout({ children }: { children: React.ReactNode }) {
  console.log('Layout rendering:', new Date().toISOString())
  return <div>{children}</div>
}

// Check route params
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  console.log('Page params:', params)
  return <div>Page content</div>
}
```

### Performance monitoring
```typescript
// Add performance marks
export default async function Page() {
  console.time('data-fetching')
  const data = await fetchData()
  console.timeEnd('data-fetching')

  return <div>{data}</div>
}
```

### Common Environment Setup Issues

**Node.js Version:**
```bash
# Check Node.js version
node --version  # Should be 18.17+ or 20+

# Update if needed
nvm install 20
nvm use 20
```

**Package Manager:**
```bash
# Clear npm cache
npm cache clean --force

# Use yarn if npm issues persist
yarn install
yarn dev
```

## Getting Help

When you're stuck:

1. **Check Next.js Docs:** [https://nextjs.org/docs](https://nextjs.org/docs)
2. **Search GitHub Issues:** [https://github.com/vercel/next.js/issues](https://github.com/vercel/next.js/issues)
3. **Join Discord:** [https://discord.gg/nextjs](https://discord.gg/nextjs)
4. **Stack Overflow:** Use `next.js` tag
5. **Vercel Support:** For enterprise customers

## Quick Reference Commands

```bash
# Clear all caches
rm -rf .next node_modules package-lock.json
npm install

# Development with debugging
DEBUG=* npm run dev

# Build analysis
ANALYZE=true npm run build

# Type checking
npx tsc --noEmit

# Linting
npm run lint -- --fix

# Environment check
npm run build | grep -i "error\|warning"
```

Remember: Most issues are configuration-related. Start with the basics and work your way up systematically.