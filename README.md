# Anjuman-e-Araian Pakistan — Web Platform

Official digital platform for Anjuman-e-Araian Pakistan. Provides member registration and management, business directory, matrimonial services, news & events, media gallery, and a full admin dashboard.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js + Express + Prisma ORM
- **Database:** PostgreSQL (Neon.tech)
- **Auth:** JWT (JSON Web Tokens) + bcrypt

## Project Structure

```
/                   → Frontend (React/Vite)
/backend/           → Backend API (Node.js/Express)
/backend/prisma/    → Database schema (Prisma)
/backend/routes/    → API route handlers
/src/app/pages/     → Frontend pages
/src/app/lib/       → API client stores
```

## Setup — Development

### Backend
```bash
cd backend
npm install
cp .env.example .env     # fill in your values
npm run dev
```

### Frontend
```bash
npm install
npm run dev
```

## Build — Production

### Frontend
```bash
npm run build            # outputs to /dist
```

### Backend
```bash
cd backend
npm run build            # outputs to /backend/dist
npm start
```

## Environment Variables (Backend)

See `backend/.env.example` for all required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — 64-character random string
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — initial admin credentials
- `ALLOWED_ORIGINS` — your frontend domain(s)
- `PORT` — server port (default: 5000)