# Next.js App Router Starter

A minimal, production-ready Next.js 14+ starter template using the App Router with TypeScript and Tailwind CSS.

## Features

- 🚀 Next.js 14+ with App Router
- 🔷 TypeScript for type safety
- 🎨 Tailwind CSS for styling
- 📁 Optimized file structure
- ⚡ Performance optimizations
- 🔍 SEO best practices
- 🧪 Testing setup ready
- 📱 Responsive design
- ♿ Accessibility features

## Getting Started

1. Clone this template
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── (auth)/                # Route group for auth pages
│   ├── layout.tsx         # Auth layout
│   ├── signin/
│   │   └── page.tsx       # Sign in page
│   └── signup/
│       └── page.tsx       # Sign up page
├── (dashboard)/           # Route group for dashboard
│   ├── layout.tsx         # Dashboard layout with sidebar
│   ├── page.tsx           # Dashboard home
│   └── settings/
│       └── page.tsx       # Settings page
├── api/                   # API routes
│   └── hello/
│       └── route.ts       # Example API endpoint
├── globals.css            # Global styles
├── layout.tsx             # Root layout
├── page.tsx               # Home page
└── loading.tsx            # Loading state
components/
├── ui/                    # Reusable UI components
│   ├── button.tsx
│   ├── card.tsx
│   └── input.tsx
├── layout/                # Layout components
│   ├── header.tsx
│   ├── footer.tsx
│   └── sidebar.tsx
└── auth/                  # Auth components
    └── auth-form.tsx
lib/
├── utils.ts               # Utility functions
├── validations.ts         # Form validations
└── types.ts               # TypeScript types
public/
├── favicon.ico
└── vercel.svg
```

## Key Files

### Root Layout (`app/layout.tsx`)
```typescript
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Next.js App Router Starter',
  description: 'A minimal Next.js app with TypeScript and Tailwind CSS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  )
}
```

### Home Page (`app/page.tsx`)
```typescript
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center">
          Welcome to Next.js App Router
        </h1>
      </div>

      <div className="mt-8 text-center">
        <p className="text-lg mb-4">
          Get started by editing{' '}
          <code className="bg-gray-100 px-2 py-1 rounded">
            app/page.tsx
          </code>
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Dashboard
          </Link>
          <Link
            href="/auth/signin"
            className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
```

### Dashboard Layout (`app/(dashboard)/layout.tsx`)
```typescript
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### API Route Example (`app/api/hello/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name') || 'World'

  return NextResponse.json({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  return NextResponse.json({
    message: 'Data received successfully',
    data: body
  })
}
```

## Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

## Environment Variables

Create a `.env.local` file:

```env
# Example environment variables
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-here
```

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Deploy automatically

### Other Platforms
```bash
npm run build
npm start
```

## Next Steps

- Add authentication with NextAuth.js
- Integrate a database (Prisma, Drizzle)
- Add API routes for your backend
- Implement state management if needed
- Add testing with Jest and React Testing Library
- Set up CI/CD pipeline

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Contributing

This is a starter template. Feel free to customize it for your needs!