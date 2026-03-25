# Next.js Migration Guides

Comprehensive guides for migrating to Next.js and between Next.js versions.

## Available Migration Guides

### Framework Migrations
- `react-to-nextjs/` - Migrating from Create React App to Next.js
- `vue-to-nextjs/` - Migrating from Vue.js to Next.js
- `angular-to-nextjs/` - Migrating from Angular to Next.js
- `express-to-nextjs/` - Migrating from Express.js to Next.js API routes

### Next.js Version Migrations
- `next-12-to-13/` - Upgrading from Next.js 12 to 13
- `next-13-to-14/` - Upgrading from Next.js 13 to 14
- `next-14-to-15/` - Upgrading from Next.js 14 to 15

### Router Migration
- `pages-to-app-router/` - Migrating from Pages Router to App Router
- `app-router-best-practices/` - App Router migration best practices

### Database Migrations
- `rest-to-prisma/` - Migrating REST APIs to Prisma
- `sql-to-orm/` - Migrating raw SQL to ORMs

## Key Migration Guides

### Pages Router to App Router Migration

This is the most significant migration in Next.js history. Here's a comprehensive guide:

#### 1. File Structure Changes
```
// Before (Pages Router)
pages/
├── _app.tsx
├── _document.tsx
├── index.tsx
├── about.tsx
├── blog/
│   ├── [slug].tsx
│   └── index.tsx
└── api/
    └── users.ts

// After (App Router)
app/
├── layout.tsx        # Replaces _app.tsx and _document.tsx
├── page.tsx          # Replaces index.tsx
├── about/
│   └── page.tsx      # Replaces about.tsx
├── blog/
│   ├── page.tsx      # Replaces blog/index.tsx
│   └── [slug]/
│       └── page.tsx  # Replaces blog/[slug].tsx
└── api/
    └── users/
        └── route.ts  # Replaces pages/api/users.ts
```

#### 2. Data Fetching Migration

**Before (Pages Router):**
```typescript
// pages/posts/[id].tsx
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const post = await getPost(params?.id as string)

  if (!post) {
    return { notFound: true }
  }

  return {
    props: {
      post
    }
  }
}

export default function PostPage({ post }: { post: Post }) {
  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </div>
  )
}
```

**After (App Router):**
```typescript
// app/posts/[id]/page.tsx
export default async function PostPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPost(id)

  if (!post) {
    notFound()
  }

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </div>
  )
}
```

#### 3. API Routes Migration

**Before (Pages Router):**
```typescript
// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const users = await getUsers()
    res.status(200).json(users)
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
```

**After (App Router):**
```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const users = await getUsers()
  return NextResponse.json(users)
}
```

#### 4. Layout Migration

**Before (Pages Router):**
```typescript
// pages/_app.tsx
import type { AppProps } from 'next/app'
import Layout from '@/components/Layout'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}
```

**After (App Router):**
```typescript
// app/layout.tsx
import Layout from '@/components/Layout'

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  )
}
```

#### 5. Navigation Migration

**Before (Pages Router):**
```typescript
import { useRouter } from 'next/router'

export default function Component() {
  const router = useRouter()

  const handleClick = () => {
    router.push('/about')
  }

  return <button onClick={handleClick}>Go to About</button>
}
```

**After (App Router):**
```typescript
import { useRouter } from 'next/navigation'

export default function Component() {
  const router = useRouter()

  const handleClick = () => {
    router.push('/about')
  }

  return <button onClick={handleClick}>Go to About</button>
}
```

### Create React App to Next.js Migration

#### 1. Installation and Setup
```bash
# Create new Next.js project
npx create-next-app@latest my-app --typescript --tailwind --eslint

# Install dependencies from CRA project
npm install @types/node @types/react @types/react-dom

# Copy source files
cp -r src/ app/
```

#### 2. Route Migration

**CRA Structure:**
```
src/
├── App.tsx
├── components/
├── pages/
│   ├── Home.tsx
│   ├── About.tsx
│   └── Contact.tsx
└── index.tsx
```

**Next.js Structure:**
```
app/
├── layout.tsx      # Converted from App.tsx
├── page.tsx        # Converted from pages/Home.tsx
├── about/
│   └── page.tsx    # Converted from pages/About.tsx
└── contact/
    └── page.tsx    # Converted from pages/Contact.tsx
```

#### 3. Routing Conversion

**CRA (React Router):**
```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**Next.js:**
```typescript
// app/page.tsx
export default function Home() {
  return <HomeComponent />
}

// app/about/page.tsx
export default function About() {
  return <AboutComponent />
}
```

#### 4. Data Fetching Migration

**CRA (useEffect):**
```typescript
import { useState, useEffect } from 'react'

export default function PostList() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading...</div>
  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  )
}
```

**Next.js (Server Component):**
```typescript
async function getPosts() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts`)
  return res.json()
}

export default async function PostList() {
  const posts = await getPosts()

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  )
}
```

## Migration Best Practices

### 1. Incremental Migration
- Start with non-critical pages
- Use Next.js rewrites to maintain compatibility
- Test thoroughly before full migration

### 2. SEO Considerations
- Ensure proper metadata migration
- Implement redirects for changed URLs
- Verify structured data is preserved

### 3. Performance Testing
- Monitor Core Web Vitals
- Compare bundle sizes
- Test with real user data

### 4. Testing Strategy
- Write migration tests
- Use parallel testing environments
- Implement feature flags for gradual rollout

### 5. Common Pitfalls to Avoid

**Don't:**
- ❌ Migrate everything at once
- ❌ Skip testing critical paths
- ❌ Ignore SEO implications
- ❌ Forget environment variables

**Do:**
- ✅ Plan migration in phases
- ✅ Test thoroughly at each step
- ✅ Monitor performance metrics
- ✅ Document migration decisions

## Migration Checklist

### Pre-Migration
- [ ] Audit current application
- [ ] Identify breaking changes
- [ ] Plan migration timeline
- [ ] Set up testing environment
- [ ] Backup current codebase

### Migration Process
- [ ] Install Next.js and dependencies
- [ ] Migrate file structure
- [ ] Convert routing
- [ ] Migrate data fetching
- [ ] Update API routes
- [ ] Convert layouts
- [ ] Update navigation
- [ ] Migrate styles
- [ ] Update environment variables
- [ ] Add error handling

### Post-Migration
- [ ] Test all functionality
- [ ] Verify SEO elements
- [ ] Monitor performance
- [ ] Update documentation
- [ ] Train team on new patterns
- [ ] Plan ongoing maintenance

## Tools and Resources

### Migration Tools
- `@next/codemod` - Automated code transformations
- `next-migrate` - Migration assistance tool
- `vercel cli` - Deployment and testing

### Testing Tools
- `@testing-library/react` - Component testing
- `playwright` - End-to-end testing
- `lighthouse` - Performance testing

### Performance Monitoring
- Vercel Analytics
- Next.js Bundle Analyzer
- Core Web Vitals monitoring

## Getting Help

- [Next.js Discord](https://discord.gg/nextjs) - Community support
- [Next.js GitHub](https://github.com/vercel/next.js) - Issue tracking
- [Next.js Documentation](https://nextjs.org/docs) - Official docs
- [Vercel Support](https://vercel.com/support) - Enterprise support

Remember: Migration is a journey, not a destination. Take your time, test thoroughly, and don't hesitate to ask for help when needed.