# SJSI Accreditation Portal

## Project overview

Web application for SJSI (Stowarzyszenie Jakości Systemów Informatycznych) replacing Google Forms for ISTQB® accreditation processes. **Single unified form** with dynamic sections based on what the client is applying for.

**One form, many paths**: Client picks what they're submitting (materials accreditation, training provider accreditation, or both) and entity type (natural person vs company). The form dynamically shows/hides sections, fields, and consent variants.

## Tech stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Fastify + TypeScript + Prisma ORM
- **Database**: PostgreSQL 16
- **Email**: Google Workspace Gmail API (OAuth2, NOT legacy SMTP)
- **Deployment**: Docker Compose, GitHub Container Registry
- **Language**: Polish-only UI

## Repository structure

```
sjsi-accreditation/
├── CLAUDE.md
├── docs/
│   ├── ARCHITECTURE.md      # Data model, system diagram, first-run setup
│   ├── FORMS.md             # Unified form: steps, conditional logic, consents
│   ├── API.md               # All API endpoints
│   ├── BACKOFFICE.md        # Admin panel features
│   ├── EMAIL.md             # Gmail API integration
│   └── DEPLOYMENT.md        # Docker, CI/CD, testing
├── .github/workflows/
│   ├── docker-build.yml
│   └── test.yml
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── .env.example
├── package.json
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── tests/routes/
│   └── frontend/
│       └── src/
│           ├── pages/client/    # Public form
│           ├── pages/admin/     # Backoffice
│           ├── components/forms/
│           ├── components/admin/
│           └── lib/
```

## Development workflow

### CRITICAL: Commit and push frequently
- Commit after EVERY meaningful change (new route, component, migration, config)
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- Push after every 2-3 commits minimum
- **Never accumulate more than 30 minutes of uncommitted work**

### Build order
1. Monorepo setup (package.json workspaces, tsconfigs)
2. Prisma schema → migration → seed
3. Backend routes one by one: health → setup → auth → form config → submit → admin
4. **Test each route immediately after implementing** — never batch
5. Frontend: routing → form wizard with conditional logic → admin pages
6. Docker + GitHub Actions
7. End-to-end smoke test

## Key design decisions

### Single unified form (NOT 4 separate forms)
One form that adapts via Step 0 selector. See docs/FORMS.md for conditional logic.

### Admin user — first-run setup (NO hardcoded credentials)
- Zero users in DB → setup mode → one-time `POST /api/setup` → creates ADMIN
- After that → `/api/setup` returns 403 forever
- No credentials in .env, code, seeds, or Docker images

### Multi-product submissions
One submission can include multiple ISTQB products. This aligns with real use cases (e.g. provider applying for CTFL + CTAL-TA at once). Products stored as JSON array in the answer.

### Email via Gmail API only
Google Workspace service account with domain-wide delegation. Never SMTP.

## Commands

```bash
npm install && npm run dev       # Dev
npm run db:migrate && npm run db:seed  # DB setup
npm test                         # Tests (must pass before push)
docker compose up -d             # Dev containers
docker compose -f docker-compose.prod.yml up -d  # Prod
```
