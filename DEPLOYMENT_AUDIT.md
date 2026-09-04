# Anjuman-e-Araian Faisalabad - Clean Package Audit

## Changes applied
- Standardized backend Prisma on Prisma 5.22.
- Removed Prisma 7 adapter/config dependency conflicts.
- Removed root build dependency on backend prisma.config.ts.
- Backend Prisma client uses standard PrismaClient.
- Updated routes files included from latest fixes.

## Vercel
Frontend deployment: root directory.
Backend deployment: backend directory (recommended separate project).

## Required Environment Variables
DATABASE_URL
JWT_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
BLOB_READ_WRITE_TOKEN (if blob uploads are used)

