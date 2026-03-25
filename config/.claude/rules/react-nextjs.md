---
description: React 19 and Next.js development standards
globs: "**/*.tsx,**/*.ts,**/*.jsx,**/next.config.*,**/vite.config.*,**/tailwind.config.*"
---

# React / Next.js / Vite Rules

- Use App Router (not Pages Router) for new Next.js projects
- Use server components by default; add `'use client'` only when needed
- Use shadcn/ui for component library — check registry before building custom
- Always use TypeScript strict mode (`strict: true` in tsconfig)
- Use TanStack Query for server state management in React apps
- Use Tailwind CSS v4 for styling — no CSS modules or styled-components
- Prefer React Server Actions over API routes for mutations in Next.js
- PWA apps (kodemeio-react): use vite-plugin-pwa with service worker patterns
- Forms: use react-hook-form + zod for validation
- API clients: generate from OpenAPI spec, never write manually
