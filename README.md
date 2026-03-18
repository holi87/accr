# SJSI — Portal Akredytacji ISTQB®

Aplikacja webowa zastępująca Google Forms w procesach akredytacji ISTQB® dla Stowarzyszenia Jakości Systemów Informatycznych.

## Szybki start (dev)

```bash
# 1. Sklonuj repo
git clone git@github.com:holi87/accr.git && cd accr

# 2. Skopiuj env
cp .env.example .env

# 3. Uruchom Postgres (Docker)
docker compose up -d postgres

# 4. Zainstaluj zależności
npm install

# 5. Migracja + seed bazy
npm run db:migrate
npm run db:seed

# 6. Uruchom dev server
npm run dev
```

Aplikacja dostępna pod:

| Co | URL |
|----|-----|
| **Frontend (formularz)** | http://localhost:5173 |
| **Panel admina** | http://localhost:5173/admin |
| **API** | http://localhost:3000/api |

## Adresy i dostęp

### Formularz publiczny

- `/` — strona główna z opisem procesu
- `/form` — formularz akredytacyjny (5 kroków)
- `/confirmation/:id` — potwierdzenie złożenia wniosku

### Panel administracyjny (backoffice)

- `/admin/setup` — jednorazowa konfiguracja (tworzenie pierwszego admina)
- `/admin/login` — logowanie
- `/admin` — dashboard ze statystykami
- `/admin/submissions` — lista zgłoszeń (filtrowanie, wyszukiwanie)
- `/admin/submissions/:id` — szczegóły zgłoszenia, notatki, emaile
- `/admin/form-editor` — edytor formularza (sekcje, pytania, zgody)
- `/admin/settings` — ustawienia (logo, email, szablony)
- `/admin/users` — zarządzanie użytkownikami

**Pierwszy start:** Wejdź na `/admin` — system wykryje brak użytkowników i przekieruje na `/admin/setup`, gdzie utworzysz konto administratora. Żadne dane logowania nie są hardkodowane.

### Role

| Funkcja | ADMIN | OPERATOR |
|---------|-------|----------|
| Dashboard, zgłoszenia, notatki, emaile | ✅ | ✅ |
| Edytor formularza, zgody | ✅ | ❌ |
| Ustawienia, użytkownicy | ✅ | ❌ |

## Stack technologiczny

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Fastify + TypeScript + Prisma ORM
- **Baza danych:** PostgreSQL 16
- **Deployment:** Docker (multi-arch: amd64 + arm64), GitHub Container Registry

## Komendy

```bash
npm run dev          # Frontend + backend w trybie dev
npm run build        # Build produkcyjny
npm test             # Testy (vitest)
npm run db:migrate   # Migracja bazy
npm run db:seed      # Seed (struktura formularza, produkty ISTQB)
npm run db:generate  # Generowanie Prisma Client
```

## Deployment (produkcja)

### 1. Przygotuj `.env` na serwerze

```env
DB_USER=sjsi_prod
DB_PASSWORD=<losowe-haslo-64-znaki>
SESSION_SECRET=<inne-losowe-64-znaki>
UPLOAD_DIR=./uploads
APP_URL=https://twoja-domena.pl
NODE_ENV=production
PORT=3000
```

### 2. Uruchom

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 3. Aktualizacja

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Migracje bazy uruchamiają się automatycznie przy starcie kontenera. Pierwszy raz wejdź na `/admin` i utwórz konto admina.

## Testy

```bash
npm test
```

28 testów backendowych (vitest + Fastify inject):
- Health check, first-run setup, auth (login/logout/me)
- Formularz (config, submit z walidacją)
- Admin: submissions CRUD, stats, RBAC, settings, users

## CI/CD

- **test.yml** — testy na każdy push/PR do main (Postgres service container)
- **docker-build.yml** — build + push do GHCR (linux/amd64 + linux/arm64)

## Licencja

Projekt prywatny SJSI.
