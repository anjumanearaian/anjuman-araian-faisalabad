# Safe database upgrade: Governance & Operations Center

This release intentionally **does not replace, reset or migrate away** the existing member/content/revenue database. The new schema is additive.

## Why the red “database columns are missing” banner appeared
The code contains newer fields such as `LeadershipProfile.memberId` and `LeadershipProfile.tier`, but the live PostgreSQL database can still be on an older schema. A successful front-end build does not update database tables.

## Preview-first upgrade
1. Create/confirm a Vercel Preview environment that points to a **preview/staging PostgreSQL database**, not production.
2. Back up the preview database.
3. Apply `backend/prisma/migrations/20260911_governance_operations_center/migration.sql` to the preview database, or run `npm run prisma:push` against that preview database after reviewing the Prisma diff.
4. Run `npm run prisma:generate`.
5. Deploy the preview build and test: admin login, member list, member edit/approval, Governance & Operations, create committee, assign a member, create/update a meeting, upload meeting photos, overseas chapter, finance credit, finance expense, PDF receipt, and existing Content Hub records.
6. Only after the preview passes, back up production and apply the same additive migration to production.

## Data-safety rules in this release
- No existing table is dropped.
- No existing column is dropped or renamed.
- Member records remain the single source of truth for people.
- Cabinet/committee roles reference `Member.id`; they do not create duplicate people.
- Existing `RevenueRecord` entries remain unchanged and are shown in the unified finance ledger as legacy revenue.
- Corrections to new finance entries use **void + audit log** instead of destructive deletion.
- A meeting remains one record from notice through minutes and photos, preventing announcement/minutes duplication.
