# Anjuman-e-Araian Faisalabad Web Platform

Production-oriented React, Express and PostgreSQL platform for the public website, member portal and administration workflows.

## Included modules

- Responsive public website with home, about, history, constitution and leadership pages
- News and events publishing workflow
- Passwordless Google/email-OTP login, auto-saved member registration, document upload and admin approval
- Private family information fields
- Business directory submissions and approval workflow
- Matrimonial inquiry submissions, payment status and privacy controls
- Media gallery, overseas chapters and contact messages
- Admin dashboard with role-aware access, site settings and revenue records
- PostgreSQL data model through Prisma
- Vercel-compatible API and Blob uploads

## Local setup

Requirements: Node.js 20.19 or later and PostgreSQL.

1. Copy `.env.example` to `.env` and set real values.
2. Install packages with `npm install`.
3. Create/update database tables with `npm run db:setup`.
4. Start the API with `npm run dev:backend`.
5. In a second terminal, start the frontend with `npm run dev:frontend`.

The frontend opens on `http://localhost:5173` and proxies `/api` to the backend on port 5000.

## Required environment variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: long random signing secret
- `ADMIN_USERNAME`: first administrator email/username
- `ADMIN_PASSWORD`: strong first administrator password
- `ALLOWED_ORIGINS`: comma-separated production origins
- `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`: Google Identity Services web client ID
- `GMAIL_USER` and `GMAIL_APP_PASSWORD`: sends OTP, submission and birthday emails
- `MASTER_EMAIL` and `INFO_EMAIL`: official notification and reply-to addresses
- `CRON_SECRET`: protects the daily birthday automation endpoint
- `BLOB_READ_WRITE_TOKEN`: optional Vercel Blob storage; PostgreSQL is used as a small-file fallback

Never commit a real `.env` file. Change the initial admin password after first login.

## Verification

Run `npm run check` to type-check frontend and backend and create a production build. The health endpoint is `/api/health` and returns setup status for database, authentication and storage.

## Production deployment

1. Import the repository into Vercel.
2. Add all required environment variables.
3. Connect Vercel Blob for persistent uploads.
4. Run `npm run db:setup` once against the production database from a secure local/CI environment.
5. Deploy and confirm `/api/health` returns `status: ok`.
6. Test admin login, member registration, uploads and approval workflows before announcing the site.

See `docs/DEPLOYMENT.md` and `FINAL-LAUNCH-CHECKLIST.md` for the detailed handoff.
