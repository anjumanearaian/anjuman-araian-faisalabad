# Updated source package, 5 September 2026

This is a targeted source update, not a certified complete or production-tested release. Earlier completion reports in the archive are historical and are not verification of this release.

## Changes applied
- Super Admin-only middleware now requires the super_admin role.
- Content/welfare roles no longer inherit unrestricted admin mutation permissions.
- Google/email applicant sessions cannot edit another member or privileged fields.
- Password route rejects applicant and unrelated staff sessions.
- Member password login rejects suspended and deceased accounts.
- Member status API accepts deceased records.
- Email OTP uses cryptographic randomness and atomic one-time consumption.
- Birthday matching uses explicit month/day in Pakistan time.

## Start locally
1. Install Node.js meeting package.json requirements.
2. Copy .env.example to .env and supply your PostgreSQL DATABASE_URL, a strong random JWT_SECRET, ADMIN_USERNAME and ADMIN_PASSWORD. Never upload real secrets to GitHub.
3. Run npm install from the project root.
4. Back up your existing database. Review backend/prisma/schema.prisma before running npm run db:setup against your intended database. Do not accept destructive schema changes without reviewing them.
5. Run npm run check.
6. Install backend dependencies: cd backend, npm install, then return to the root.
7. Start npm run dev:backend and npm run dev:frontend in separate terminals.
8. Admin login uses ADMIN_USERNAME and ADMIN_PASSWORD to create a super_admin only when the Admin table is empty. Existing admins are not automatically promoted; an authorized database administrator must assign super_admin to the intended existing account.

## Service configuration
Google sign-in needs matching GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID and authorized website origins. Email needs GMAIL_USER and GMAIL_APP_PASSWORD. Scheduled birthday delivery needs CRON_SECRET and the configured Vercel cron. Configure ALLOWED_ORIGINS for the actual domain. These services were not live-tested in this session.

## Remaining verification and implementation
Registration, server drafts, login, homepage sections, matrimonial and birthday route code already existed in the supplied project. Their presence does not prove that they work against your deployment. Dynamic committees linked to one master member, staff role-specific screens, admin manual member entry, deceased-status UI, activity audit logs, full session revocation and birthday deduplication still require implementation or acceptance testing. Birthday processing currently caps each run at 100 matching members.

## Validation performed
Source changes and ZIP integrity checked. Dependency installation, TypeScript/build checks and live database, email, OAuth and browser tests were not completed in this rapid delivery. Do not treat this ZIP as a fully tested completion of all requested features.

Nested historical ZIPs, a duplicate nested project and local secret files are omitted to keep one clear project root. The frontend, backend, public assets, schema and setup templates are included.
