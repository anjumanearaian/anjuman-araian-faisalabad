# Supabase Data API Access Audit — 27 Sep 2026

## Finding

The connected Supabase project is being used as PostgreSQL storage for the Anjuman-e-Araian application. The application code uses Express + Prisma through `DATABASE_URL`. Repository search found no use of `supabase-js`, PostgREST, GraphQL, anon keys, authenticated Supabase roles, or service-role keys in the client application.

The connected database currently has 39 public-schema tables. RLS is enabled on all 39 tables and there are currently no RLS policies. Supabase Security Advisor reports this as `rls_enabled_no_policy` informational findings. In this architecture that means direct Data API access by anon/authenticated is intentionally blocked at the row layer, while Prisma continues to use the database connection role.

Existing tables currently still carry the broad legacy Supabase grants for `anon`, `authenticated`, and `service_role`. Because RLS is enabled and no policies exist, browser roles still cannot read rows. However, retaining unnecessary grants is weaker than explicitly making the schema server-only.

## Classification

### Strictly server-only / sensitive
- Admin
- AuthUser
- EmailOtp
- FormDraft
- StoredFile
- Member
- FamilyInfo
- MemberChild
- FinanceTransaction
- FinanceAuditLog
- FinanceHead
- RevenueRecord
- PaymentSubmission
- PaymentSubmissionAuditLog
- MemberAuditLog
- BusinessAuditLog
- Matrimonial
- MatrimonialMatchRequest
- MatrimonialAuditLog
- MatrimonialManagerSetting
- MatrimonialMatchAlert
- MatrimonialConnection
- GovernanceAuditLog
- GovernanceMeeting
- MeetingAttendance
- MeetingAgendaItem
- MeetingApproval
- MeetingAssignment

These should never receive direct `anon` access.

### Public-facing data, but still served through the application API
- Content
- Media
- OverseasChapter
- LeadershipProfile
- LeadershipMessage
- SiteSettings
- OrganizationUnit
- OrganizationAssignment
- GovernanceRoleMaster
- Business

Although some of these records are displayed publicly, the current application already publishes them through its own backend API. They do not need direct Supabase Data API grants.

## October 30 impact

Supabase's October 30 change affects only new tables that need Data API access. For this application, new tables should default to server-only, so the new Supabase behavior is aligned with the architecture.

If a future feature deliberately uses Supabase Data API:
1. enable RLS on the new table;
2. grant only the minimum required operations;
3. create narrow RLS policies;
4. never place service-role credentials in browser/client code;
5. keep finance, payment, audit, OTP, private member, and matrimonial data server-only.

## Prepared migration

Migration:
`backend/prisma/migrations/20260927_supabase_data_api_server_only/migration.sql`

It:
- revokes all table/sequence privileges from `anon` and `authenticated`;
- grants table/sequence privileges to `service_role` for trusted server-side Supabase use;
- sets equivalent default privileges for future objects created by the migration role;
- does not change application data;
- does not create any public RLS policy.

## Deployment caution

This migration intentionally changes existing Data API privileges. Repository code shows no direct Data API dependency, so it should be compatible with the current application architecture. Before applying to production, verify that no external dashboard, mobile client, automation, or unpublished integration is using the Supabase anon/authenticated API directly.
