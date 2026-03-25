---
name: vite-react-pwa
description: Comprehensive Vite + React 19 + PWA development skill for building offline-capable single-page applications with TanStack Query, Tailwind v4, OpenAPI codegen, and service worker patterns. Covers Vite plugin configuration, React 19 patterns, PWA update flows, offline-first architecture, and modern SPA best practices.
version: 1.0.0
allowed-tools: [
  "mcp__context7__*",
  "mcp__shadcn__*",
  "mcp__chrome-devtools__*",
  "Write", "Read", "Edit", "Glob", "Grep",
  "Task", "TodoWrite", "AskUserQuestion",
  "Bash", "WebFetch", "WebSearch"
]
examples:
  - "Create a new Vite React PWA with offline support"
  - "Configure vite-plugin-pwa with prompt update strategy"
  - "Set up TanStack Query with optimistic mutations and offline queue"
  - "Generate API hooks from OpenAPI schema using @hey-api/openapi-ts"
  - "Configure Tailwind v4 with @tailwindcss/vite plugin"
  - "Implement lazy loading with React.lazy and code splitting"
  - "Set up Vitest with React Testing Library"
  - "Build an offline-first mutation queue with IndexedDB"
  - "Configure service worker caching strategies"
  - "Create a PWA update prompt with countdown auto-reload"
categories:
  - frontend-development
  - pwa
  - react
  - vite
  - typescript
  - offline-first
  - testing
tags:
  - vite
  - react-19
  - pwa
  - service-worker
  - tanstack-query
  - react-query
  - tailwindcss-v4
  - openapi-codegen
  - hey-api
  - vitest
  - react-testing-library
  - offline-first
  - indexeddb
  - workbox
  - vite-plugin-pwa
  - code-splitting
  - lazy-loading
  - react-hook-form
  - zod
  - sonner
  - lucide-react
  - i18next
  - echarts
  - react-leaflet
---

# Vite + React 19 + PWA Development Skill

Build production-ready, offline-capable single-page applications with Vite, React 19, and modern PWA patterns.

## Core Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite 6+ with `@tailwindcss/vite` plugin |
| UI Framework | React 19 (no RSC, no `"use client"`) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, no config file) |
| Data Fetching | TanStack Query v5 (React Query) |
| API Types | `@hey-api/openapi-ts` codegen from OpenAPI schema |
| Forms | react-hook-form + Zod (`@hookform/resolvers/zod`) |
| Routing | React Router v7 (BrowserRouter) |
| PWA | vite-plugin-pwa (Workbox under the hood) |
| Offline | IndexedDB queue + background sync |
| Testing | Vitest + React Testing Library |
| Toasts | sonner |
| Icons | lucide-react |
| i18n | react-i18next |
| Charts | ECharts (lazy-loaded via `manualChunks`) |
| Maps | React Leaflet |

## Vite Configuration

### Plugin Setup (Vite 6+ with Tailwind v4)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",  // NOT autoUpdate — user controls reload
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "App Name",
        short_name: "App",
        theme_color: "#ffffff",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": "/src" },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ["echarts", "echarts-for-react"],  // only if app uses charts
        },
      },
    },
  },
});
```

### Tailwind v4 (No Config File)

```css
/* src/index.css */
@import "tailwindcss";
@import "@kodemeio/tailwind-config/themes/app-name.css";

/* Custom utilities use @utility, not @layer */
@utility container-narrow {
  max-width: 48rem;
  margin-inline: auto;
  padding-inline: 1rem;
}
```

**Key differences from Tailwind v3:**
- No `tailwind.config.js` — configuration via CSS `@theme` directive
- Use `@import "tailwindcss"` instead of `@tailwind base/components/utilities`
- Use `@tailwindcss/vite` plugin instead of PostCSS
- Custom values via `@theme { --color-brand: #xxx; }` in CSS

## React 19 Patterns

### No Server Components

This is a Vite SPA, not Next.js. Never use:
- `"use client"` or `"use server"` directives
- Server Components or Server Actions
- `next/image`, `next/link`, or any Next.js imports

### Lazy Loading

```typescript
// Always use .then(m => ({ default: m.ComponentName })) for named exports
const DashboardPage = React.lazy(() =>
  import("@/pages/Dashboard").then((m) => ({ default: m.DashboardPage }))
);

// In router
<Suspense fallback={<LoadingSpinner />}>
  <DashboardPage />
</Suspense>
```

### Provider Stack Order

```tsx
// main.tsx — order matters
<ErrorBoundary>
  <PwaUpdatePrompt>      {/* SW update prompt */}
    <QueryClientProvider>
      <BrowserRouter>
        <AuthProvider>
          <GPSProvider>       {/* omit for MRP */}
            <OfflineProvider>
              <App />
            </OfflineProvider>
          </GPSProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </PwaUpdatePrompt>
</ErrorBoundary>
```

## PWA Update Flow

```typescript
// PwaUpdatePrompt.tsx
import { useRegisterSW } from "virtual:pwa-register/react";
import { UpdatePrompt } from "@kodemeio/ui/common";

export function PwaUpdatePrompt({ children }: { children: React.ReactNode }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_, registration) {
      // Poll for updates every 60 minutes
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  return (
    <>
      {children}
      {needRefresh && (
        <UpdatePrompt
          countdownSeconds={60}    // auto-reload after 60s
          onUpdate={() => updateServiceWorker(true)}
          onDismiss={() => {}}     // "Later" button
        />
      )}
    </>
  );
}
```

## TanStack Query Patterns

### Query with API Client

```typescript
// api/useItems.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";

// All responses use { success, data, total?, message? } envelope
// ApiClient returns the parsed body directly

export function useItems(params?: { page?: number; search?: string }) {
  return useQuery({
    queryKey: ["items", params],
    queryFn: () => client.get("/items", { params }),
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateItemInput) => client.post("/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success(t("items.created"));
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
```

### Offline Mutations

```typescript
import { useOfflineMutation } from "@kodemeio/offline";

export function useCreateItemOffline() {
  return useOfflineMutation({
    mutationFn: (data) => client.post("/items", data),
    offlineKey: "create-item",
    invalidateKeys: [["items"]],  // synced via SYNC_INVALIDATION_MAP
  });
}
```

## OpenAPI Codegen

### Setup

```typescript
// openapi-ts.config.ts
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  client: "@hey-api/client-fetch",
  input: `${process.env.VITE_API_URL || "http://localhost:8069"}/api/app/openapi.json`,
  output: { path: "src/generated", format: "prettier" },
  types: { enums: "typescript" },
});
```

```bash
pnpm generate:api  # runs automatically on pnpm dev / pnpm build
```

### Using Generated Types

```typescript
// types/api.ts — re-export from generated for convenience
export type {
  ItemListResponse,
  ItemDetailResponse,
  CreateItemRequest,
} from "@/generated/types.gen";

// In hooks — use full envelope types
import type { ItemListResponse } from "@/types/api";

export function useItems() {
  return useQuery<ItemListResponse>({
    queryKey: ["items"],
    queryFn: () => client.get("/items"),
  });
}
```

**Rules:**
- Backend routers MUST have `response_model=` for types to appear in schema
- Response types are full envelopes (`{ success, data, total?, message? }`)
- Never create manual type files for endpoints that have codegen
- M2O fields from backend are `{ id, name }` objects — access via `field?.name`

## Testing Patterns

### Setup

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### Test Pattern

```typescript
import { renderPage, createWrapper } from "@kodemeio/testing";
import { screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

// Mock API client, offline module, and toast
vi.mock("@/api/client");
vi.mock("@kodemeio/offline");
vi.mock("sonner");

describe("ItemsPage", () => {
  it("renders items list", async () => {
    const { client } = await import("@/api/client");
    vi.mocked(client.get).mockResolvedValue({
      success: true,
      data: [{ id: 1, name: "Item 1" }],
      total: 1,
    });

    renderPage(<ItemsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });
  });
});
```

## i18n Pattern

Always add keys to BOTH translation files:

```json
// src/i18n/en.json
{ "items": { "title": "Items", "create": "Create Item" } }

// src/i18n/id.json
{ "items": { "title": "Barang", "create": "Buat Barang" } }
```

```typescript
import { createI18n } from "@kodemeio/core/i18n";
import en from "@/i18n/en.json";
import id from "@/i18n/id.json";

export const i18n = createI18n({ en, id });
```

## Form Pattern

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, t("validation.required")),
  email: z.string().email(t("validation.email")),
});

type FormData = z.infer<typeof schema>;

function ItemForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  // ...
}
```

## Error Handling

```typescript
import { getErrorMessage } from "@kodemeio/core/errors";

// In mutations
onError: (err) => {
  toast.error(getErrorMessage(err));  // never raw .message
},

// In components
try { /* ... */ } catch (err) {
  toast.error(getErrorMessage(err));
}
```

## Deep Linking

```typescript
import { useDeepLink } from "@kodemeio/core/hooks";

// Store config in useRef to avoid infinite re-render loops
const configRef = useRef({
  routes: { "item": "/items/:id" },
  onMatch: (route, params) => navigate(`/items/${params.id}`),
});

useDeepLink(configRef.current);
```

## Key Anti-Patterns to Avoid

1. **No `"use client"` / `"use server"`** — this is Vite, not Next.js
2. **No `tailwind.config.js`** — Tailwind v4 uses CSS-based config
3. **No raw `.message` on errors** — always `getErrorMessage(err)`
4. **No entity-specific response field names** — always `data` in envelope
5. **No `autoUpdate` for PWA** — use `registerType: "prompt"` for user control
6. **No `IconLeft`/`IconRight` in react-day-picker v9** — use `Chevron` component
7. **No manual types for codegen endpoints** — use `@/generated/types.gen`
8. **No `GPSProvider` in MRP** — shop-floor app, GPS not needed
