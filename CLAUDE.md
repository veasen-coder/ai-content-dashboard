# Flogen AI — Operations Dashboard

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + tailwindcss-animate |
| UI Components | shadcn/ui (Radix primitives) |
| Icons | lucide-react |
| Database/Auth | Supabase (Postgres + Auth + RLS) |
| State | Zustand (persisted sidebar state) |
| Data Fetching | TanStack Query (5min stale, no refetch on focus) |
| Charts | Recharts |
| DnD | @dnd-kit/core + sortable |
| Notifications | sonner |
| Markdown | react-markdown + remark-gfm |
| Package Manager | npm |

## Design System

Dark theme only — no light mode toggle. All CSS variables defined in `src/app/globals.css`.

| Token | Value |
|---|---|
| Background | #0A0A0A |
| Surface / Card | #111111 |
| Border | #1E1E1E |
| Accent (violet) | #7C3AED |
| Success (green) | #10B981 |
| Destructive (red) | #EF4444 |
| Text primary | #F5F5F5 |
| Text muted | #6B7280 |
| Font | Geist Sans + Geist Mono |

Card pattern: `bg-[#111111] border border-[#1E1E1E] rounded-xl`
Numbers/money use `font-mono`.

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (dark class, fonts, Providers)
│   ├── page.tsx                      # Redirect → /dashboard
│   ├── (auth)/login/page.tsx         # Login page (Supabase email/password)
│   ├── (dashboard)/                  # Route group — shared sidebar layout
│   │   ├── layout.tsx                # Dashboard shell: Sidebar + content area
│   │   ├── dashboard/page.tsx        # Overview
│   │   ├── tasks/page.tsx            # Tasks (ClickUp Kanban)
│   │   ├── clients/page.tsx          # Client Pipeline
│   │   ├── finance/page.tsx          # Finance
│   │   ├── social/page.tsx           # Social Media
│   │   ├── resources/page.tsx        # Resources
│   │   └── assistant/page.tsx        # AI Assistant
│   └── api/                          # API routes
│       ├── clickup/{tasks,create}    # ClickUp proxy
│       ├── google/sheets/append      # Google Sheets append
│       ├── instagram/metrics         # IG Graph API
│       ├── facebook/metrics          # FB Graph API
│       ├── claude/{chat,summarize}   # Anthropic API (streaming)
│       └── supabase/balances         # Account balances CRUD
├── components/
│   ├── providers.tsx                 # QueryClient + Toaster
│   ├── layout/                       # Sidebar, Topbar, PageWrapper
│   └── ui/                           # shadcn/ui components
├── lib/
│   ├── utils.ts                      # cn(), formatCurrency, formatDate, etc.
│   └── supabase/                     # client.ts, server.ts, middleware.ts, schema.sql
├── store/
│   └── sidebar-store.ts              # Zustand sidebar state
├── hooks/                            # Custom hooks (per module)
└── types/
    └── index.ts                      # All TypeScript types
```

## Routing

`(dashboard)` route group wraps all main sections. `(auth)` wraps login.

- `/` → redirects to `/dashboard`
- `/login` → auth page
- `/dashboard` → Overview
- `/tasks` → Task Kanban
- `/clients` → Client Pipeline
- `/finance` → Finance
- `/social` → Social Media
- `/resources` → Resources
- `/assistant` → AI Chat

## Auth

Supabase email/password. Middleware in `src/middleware.ts` checks auth on every request:
- Unauthenticated → redirect to `/login`
- Authenticated on `/login` → redirect to `/dashboard`
- API routes are excluded from auth redirect

## Key Decisions

1. **Single-user auth** — no roles/teams yet. RLS policies allow all authenticated users.
2. **API routes as proxies** — all third-party API keys stay server-side. Client calls `/api/*`.
3. **Zustand for UI state** — sidebar collapse persisted to localStorage.
4. **TanStack Query for server state** — 5min cache, no window refocus refetch.
5. **All monetary values in MYR** — `formatCurrency()` defaults to MYR.
6. **Date format: DD MMM YYYY** — `formatDate()` uses en-GB with short month.
7. **Streaming for Claude chat** — `/api/claude/chat` streams SSE from Anthropic API.

## Environment Variables

See `.env.local` for all required keys. Never commit this file.
