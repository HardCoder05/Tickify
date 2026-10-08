# Tickify

A full-stack web platform for event management and ticket sales, built as a software engineering course project at PUCP.

## Features

- **Event management** — organizers create and publish events with configurable ticket tiers, seat layouts, and pricing stages
- **Ticket purchase flow** — attendees browse events, select seats, and complete purchases with QR code generation per ticket
- **QR validation** — event staff scan and validate QR codes at the venue
- **User roles** — attendee, organizer, and admin roles with separate dashboards
- **Google OAuth** — sign in with Google in addition to email/password
- **Image uploads** — event cover images via Cloudinary

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| Backend | FastAPI, SQLAlchemy 2, PostgreSQL |
| Auth | JWT + Google OAuth 2.0 |
| Testing | Pytest (backend), Playwright (E2E) |
| CI | GitHub Actions |
| Containerization | Docker, Docker Compose |

## Project Structure

```
.
├── Backend/                  # FastAPI application
│   ├── app/                  # App factory and DB session
│   ├── events/               # Event, seat, and category modules
│   ├── compras/              # Purchase module
│   ├── tickets/              # Ticket and QR module
│   ├── users/                # User and auth module
│   ├── tarifa/               # Pricing and discount module
│   ├── pago/                 # Payment module
│   ├── admin/                # Admin module
│   ├── tests/                # Pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
├── Frontend/
│   └── tickify-frontend/     # React + Vite application
│       └── src/
├── Tests/
│   ├── E2E/                  # Playwright end-to-end tests
│   ├── Backend/              # Additional backend integration tests
│   ├── Frontend/             # Frontend-specific tests
│   └── playwright.config.ts
├── docker/
│   ├── docker-compose.yml
│   ├── .env.example          # Environment variable template
│   └── nginx/                # Nginx reverse proxy config
└── .github/
    └── workflows/            # CI/CD pipelines
```

## Getting Started

### With Docker (recommended)

```bash
# 1. Copy and fill in environment variables
cp docker/.env.example docker/.env

# 2. Build and start all services
cd docker
docker-compose up -d --build

# Backend:  http://localhost:8000
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/docs
```

### Local development

**Backend**

```bash
cd Backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.secrets.example .env   # fill in DB credentials
uvicorn main:app --reload
```

**Frontend**

```bash
cd Frontend/tickify-frontend
npm install
npm run dev
```

## Running Tests

**Backend (Pytest)**

```bash
cd Backend
pytest
```

Uses SQLite by default — no external DB required.

**E2E (Playwright)**

Requires both Backend and Frontend running locally.

```bash
cd Tests
npx playwright install
npx playwright test
```

## CI/CD

GitHub Actions runs automatically on push and pull request:

- **Backend tests** — Pytest against a PostgreSQL service container
- **Frontend smoke tests** — Playwright against a Vite dev server
- **Full E2E tests** — triggered only on pull requests, runs the complete Playwright suite

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for details.
