# Anjuman-e-Araian Faisalabad - Deployment Plan

## Architecture
- Frontend: React + Vite on Vercel
- API: Express exported as Vercel Functions under `/api`
- Database: PostgreSQL (existing Prisma/Neon-compatible schema)
- New file uploads: Vercel Blob
- Legacy uploaded files: copied into `public/uploads` for backward compatibility

## Vercel environment variables
Set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ALLOWED_ORIGINS` in Project Settings. Connect a Blob store so Vercel provides `BLOB_READ_WRITE_TOKEN`.

## Database deployment
1. Set `DATABASE_URL`.
2. Run `npm run prisma:generate`.
3. Review existing data before any schema migration.
4. Use `npm run prisma:push` only after taking a database backup.

## Security
The source ZIP originally contained a real `backend/.env`. The deployment package intentionally removes it. Rotate the database password, JWT secret and admin password before production deployment.
