# Redmine Next.js

A modern web-based reconstruction of [Redmine 3.4.5](https://www.redmine.org/) built with Next.js 16 and connected to an existing Redmine MySQL database. This project provides a contemporary UI for project management, issue tracking, and time logging while maintaining full data compatibility with the legacy Redmine schema.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 |
| Database | MySQL (Redmine 3.4.5 schema, 46 tables) |
| ORM | [Prisma 5.22](https://www.prisma.io/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) with HSL design tokens |
| UI Components | Custom (Card, Button, Input) with Lucide icons |
| I18n | Custom solution (EN, VI, JA, ZH) |
| Auth | Custom session-based (cookie + DB tokens) |
| State | [TanStack Query v5](https://tanstack.com/query) |

## Features

### ✅ Implemented
- **Authentication** — Login/logout with support for login and email, session cookies (7-day TTL)
- **Dashboard** — Home page with project stats overview
- **Project Management** — List, create, view projects with nested set tree, configurable modules and trackers
- **Project Overview** — Project details with description and metadata
- **Project Activity** — Activity feed with daily grouping
- **Project Roadmap** — Milestone tracking with version sorting
- **Issue Tracking** — Issue list with multi-select filtering (status, tracker, priority, assignee, version)
- **Time Entries (Spent Time)** — Time tracking with relative date range filtering and composite sorting
- **User Account** — Profile editing, password change, language preference
- **Internationalization** — 4 languages (English, Vietnamese, Japanese, Chinese)

### 🚧 Not Yet Implemented
- Issue CRUD (create, edit, delete)
- Admin panel (users, roles, trackers, settings)
- Wiki, files, documents modules
- Role-based access control (RBAC) enforcement
- Global issue list, cross-project search

> See [docs/rules.md](docs/rules.md) for the full permission implementation status matrix.

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm
- Access to a Redmine 3.4.5 MySQL database

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and BETTER_AUTH_SECRET

# Generate Prisma client
pnpm exec prisma generate

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string to Redmine database |
| `BETTER_AUTH_SECRET` | Secret key for session token generation |
| `BETTER_AUTH_URL` | Application base URL |

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (main)/                # Authenticated layout (sidebar + header)
│   │   ├── projects/          # Project CRUD & sub-pages
│   │   │   └── [identifier]/  # Activity, issues, roadmap, time entries
│   │   └── my/                # Account & password management
│   └── api/auth/              # Auth API route
├── components/
│   ├── layout/                # Sidebar, Header
│   ├── providers/             # I18n context provider
│   └── ui/                    # Card, Button, Input
├── lib/
│   ├── auth/                  # Session, login/logout, password, profile
│   ├── db/                    # Prisma client singleton
│   ├── i18n/                  # Translation loader + locale files
│   ├── projects/              # Server actions for project CRUD
│   └── utils/                 # cn() utility
prisma/
└── schema.prisma              # 46 Redmine tables mapped to Prisma models
docs/
├── rules.md                   # Permission implementation status
├── project-overview-pdr.md    # Product Development Requirements
├── codebase-summary.md        # Codebase summary
├── code-standards.md          # Code standards & conventions
├── system-architecture.md     # System architecture
└── project-roadmap.md         # Development roadmap
```

## Documentation

All project documentation is in the `docs/` directory:

- [Project Overview & PDR](docs/project-overview-pdr.md) — Requirements, scope, and acceptance criteria
- [Codebase Summary](docs/codebase-summary.md) — File inventory and module breakdown
- [Code Standards](docs/code-standards.md) — Conventions, patterns, and guidelines
- [System Architecture](docs/system-architecture.md) — Architecture decisions and data flow
- [Project Roadmap](docs/project-roadmap.md) — Feature timeline and priorities
- [Permission Rules](docs/rules.md) — RBAC implementation status tracking

## License

Private project — not licensed for distribution.
