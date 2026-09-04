# Anjuman-e-Araian Faisalabad — Preview Deployment Runbook

## Goal
Deploy and test the complete site on a Vercel preview URL first. Do not point the main domain until the preview is approved.

## 1. Create an isolated Vercel project
Project name: `anjuman-e-araian-faisalabad`

Do not reuse VetConnect or any existing project.

## 2. Required Environment Variables
Add these in Vercel Project > Settings > Environment Variables for Preview and Production:

- `DATABASE_URL` — PostgreSQL/Neon connection string
- `JWT_SECRET` — long random secret
- `ADMIN_USERNAME` — initial admin username, only used if the Admin table is empty
- `ADMIN_PASSWORD` — strong initial password, only used if the Admin table is empty
- `ALLOWED_ORIGINS` — `https://anjumanearaian.org,https://www.anjumanearaian.org`

Do not commit real values to the repository or ZIP.

## 3. Storage
Connect a Vercel Blob store to the project before testing new uploads.
Vercel will inject `BLOB_READ_WRITE_TOKEN` automatically.

Without Blob, the site can render but new membership/business/matrimonial file uploads will return a storage setup error in Vercel.

## 4. Database
Use the existing PostgreSQL/Neon database only after confirming it is the correct Anjuman database.
For a clean database, run from a trusted local terminal with the same DATABASE_URL:

`npm run prisma:push`

This creates/updates the current schema without exposing credentials.

## 5. Deploy
Import this project into Vercel or connect a Git repository containing this package.
Framework preset: Vite
Build command: configured in `vercel.json`
Output: `dist`

Expected preview URL:
`https://anjuman-e-araian-faisalabad.vercel.app`
(or a Vercel-generated preview URL until the production alias is assigned)

## 6. Health Check
Open:
`/api/health`

Expected when database is connected:
- status: `ok`
- database: `connected`
- storage: `configured` (after Blob is connected)

## 7. Acceptance Test Before Domain Switch
Test on desktop and mobile:

1. Homepage and hero slider
2. Navigation and all public pages
3. Admin login at `/admin`
4. Site Settings edit and save
5. New member registration with TEST/DUMMY documents only during preview
6. Profile photo and test upload flow; do not use real CNIC/payment proof until private document storage is enabled
7. Admin sees the new pending member
8. Admin approves member
9. Member login and portal
10. Business submission + file upload
11. Matrimonial submission + file upload
12. News/event creation
13. Leadership/Cabinet updates
14. Gallery/media updates
15. WhatsApp buttons and contact details

## 8. Main Domain — only after approval
Add these domains to Vercel Project > Settings > Domains:
- `anjumanearaian.org`
- `www.anjumanearaian.org`

Copy the exact DNS values shown by Vercel to the person who controls the domain.
Do not change MX/SPF/DKIM/DMARC records used for email.

## Security note
The original development ZIP contained a backend `.env`. This deployment package intentionally excludes it. Rotate database/admin/JWT credentials before the final public launch if those credentials have been shared outside the trusted development team.

The current preview upload path uses Vercel Blob URLs for compatibility. Do **not** collect real CNIC images, payment proofs or other sensitive identity documents on the public preview. Before the main-domain launch, sensitive member documents must be moved to a private Blob store and delivered only through authenticated admin/member endpoints.
