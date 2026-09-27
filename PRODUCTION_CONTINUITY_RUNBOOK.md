# Anjuman-e-Araian Production Continuity Runbook

Last reviewed: 27 September 2026

## Goal

Keep the Anjuman-e-Araian website and management platform available and recoverable even if a deployment, database migration, Supabase policy change, email provider, storage service, or configuration change fails.

## Current architecture

- Frontend: Vite/React deployed on Vercel
- Backend: Express API deployed with the same Vercel project
- Database: PostgreSQL hosted on Supabase
- ORM/database access: Prisma via DATABASE_URL
- File storage: Vercel Blob when configured, PostgreSQL StoredFile fallback otherwise
- Email: Nodemailer over configured SMTP
- Authentication: application-managed JWT/auth tables, not Supabase Auth/Data API
- Direct browser Supabase Data API: not used by the repository as of this review

## Non-negotiable production rules

1. Never make a destructive database change directly in production without a migration and a rollback/recovery plan.
2. Never expose service-role/database credentials in browser code.
3. Never grant anon access to finance, payment, audit, OTP, private member, matrimonial, authentication, or stored-file tables.
4. Do not delete finance/audit history to correct a mistake. Archive/void/correct through audited workflows.
5. Every schema change must be committed to Git before production deployment.
6. Production environment variables must be stored in the hosting provider, never committed to Git.
7. Before changing database grants/RLS, verify whether any external client is using Supabase REST/PostgREST/GraphQL.
8. Keep the main branch deployable. Test changes in a preview deployment first.
9. Before a large migration, confirm a current database backup/restore point in Supabase.
10. After every production migration, check application health, login, member forms, payment queue, finance ledger, file upload, and email delivery.

## Supabase October 30 policy

The application is server/API driven. New public-schema tables should default to server-only.

For ordinary new tables:
- enable RLS;
- do not grant anon/authenticated Data API access;
- access them through Express + Prisma.

Only if a future feature intentionally uses Supabase Data API:
- grant the minimum operation needed;
- add explicit RLS policies;
- test with the intended role;
- document why direct Data API access is required.

## Preflight before applying Data API hardening

Do all of the following:

- [ ] Repository still contains no supabase-js client or REST/GraphQL direct calls.
- [ ] No unpublished mobile app, dashboard, Zapier/Make automation, external script, or partner integration uses the Supabase anon/authenticated API.
- [ ] Review recent Supabase PostgREST logs for real API traffic.
- [ ] Confirm a current Supabase database backup/restore point.
- [ ] Confirm latest production Vercel deployment is healthy.
- [ ] Confirm ADMIN login works.
- [ ] Confirm a member can sign in and load a form.
- [ ] Confirm Finance ledger and Payment Verification Queue load.
- [ ] Confirm file upload works.
- [ ] Confirm SMTP is configured and a test email succeeds.

Only then apply:
backend/prisma/migrations/20260927_supabase_data_api_server_only/migration.sql

## Post-migration verification

Immediately test:
1. /api/health
2. Admin login
3. Member/applicant email authentication
4. Membership form read/save/submit
5. Business form submit
6. Matrimonial form read/save/submit
7. Admin member list
8. Payment Verification Queue
9. Payment approve/reject
10. Finance credit/debit ledger
11. Receipt PDF generation
12. Confirmation email delivery
13. File upload and retrieval
14. Public website content/pages

If any critical path fails, do not continue unrelated changes. Restore the previous database privileges or restore the database to the verified pre-change point.

## Recovery priorities

### Website deployment problem
- Roll back to the last known-good Vercel production deployment.
- Do not run a new database migration merely to fix a frontend build issue.

### Database migration problem
- Stop further migrations.
- Identify whether the failure is schema, data, permissions, trigger, or connection related.
- Use the latest known-good backup/restore point when rollback SQL is unsafe.

### Supabase outage or database connectivity issue
- Preserve current Vercel deployment.
- Do not redeploy repeatedly.
- Check /api/health and provider status.
- Avoid schema changes until connectivity is stable.

### Email outage
- Finance/accounting approval must remain valid even if email fails.
- Keep delivery failure in audit history and resend later.
- Never roll back a verified financial transaction because SMTP failed.

### File storage outage
- Preserve database records and URLs.
- Do not delete records because a file provider is temporarily unavailable.

## Sensitive table classes

Always server-only:
Admin, AuthUser, EmailOtp, FormDraft, StoredFile, Member, FamilyInfo, MemberChild,
FinanceTransaction, FinanceAuditLog, FinanceHead, RevenueRecord, PaymentSubmission,
PaymentSubmissionAuditLog, MemberAuditLog, BusinessAuditLog, Matrimonial,
MatrimonialMatchRequest, MatrimonialAuditLog, MatrimonialManagerSetting,
MatrimonialMatchAlert, MatrimonialConnection, GovernanceAuditLog, GovernanceMeeting,
MeetingAttendance, MeetingAgendaItem, MeetingApproval, MeetingAssignment.

Public-facing content is still served through the application API:
Content, Media, OverseasChapter, LeadershipProfile, LeadershipMessage, SiteSettings,
OrganizationUnit, OrganizationAssignment, GovernanceRoleMaster, Business.

## Monthly continuity review

Once per month:
- verify a successful production deployment;
- confirm database backup status;
- review Supabase security advisors;
- review failed application/email logs;
- confirm production environment variables still exist;
- test admin login and one critical member/payment workflow;
- review new migrations for grants/RLS;
- update this runbook when architecture changes.

## Change log

2026-09-27:
- Supabase October 30 Data API grant change reviewed.
- Repository confirmed to use Express + Prisma rather than direct Supabase Data API.
- All public tables observed with RLS enabled.
- No RLS policies observed.
- Server-only grants migration prepared but intentionally not auto-applied before external-integration preflight.
