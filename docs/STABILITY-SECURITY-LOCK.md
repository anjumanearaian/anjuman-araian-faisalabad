# Production Stability & Security Lock

This project uses a **lock-as-you-complete** policy. Once a module or rule is accepted and production-verified, later work must preserve it unless a deliberate change request explicitly replaces it.

## Locked baseline

A rollback branch has been created from the last confirmed READY production deployment:

- Branch: `stable/production-2026-09-14`
- Baseline commit: `9f74db06972a26d0c3bedfa8df7d17aeb665ac9f`

This branch is a recovery reference. It is not a substitute for database/storage backups.

## Locked invariants

The following rules are production invariants and must not be weakened by unrelated work:

1. **Existing API contracts stay compatible.** Do not rename/remove working routes or change payload meaning casually. Prefer additive, backward-compatible changes.
2. **Database history is append-only.** Do not edit or delete historical Prisma migrations after they have been used. New schema changes require a new migration, review and a verified backup/recovery path.
3. **Member identity stays stable.** Member IDs, member numbers and record ownership must not be regenerated or silently reassigned.
4. **Payment approval gates stay enforced.** Member, business and matrimonial approval/payment verification controls must not be bypassed from the UI or API.
5. **Public privacy stays restrictive.** Anonymous users must not receive phone, WhatsApp, email, CNIC, address, uploaded documents or private family/admin fields from the member directory.
6. **Matrimonial privacy stays consent-based.** Names, contacts and private photos/documents remain protected by authenticated ownership/admin rules and the established match/consent release workflow.
7. **Private files stay no-store.** Protected matrimonial files require authenticated access and `private, no-store` responses. They must not be made directly public for convenience.
8. **Roles remain least-privilege.** Admin, Super Admin, finance, welfare/matrimonial manager and member permissions remain separated on the server. A hidden button is not an authorization control.
9. **Display symmetry stays centralized.** Person names, cities/locations and professional labels continue through the shared display formatter so Members, Member Portal, Governance and Matrimonial screens do not drift into inconsistent casing.
10. **Secrets stay outside the repository.** Real `.env` files, passwords, JWT secrets, database credentials and provider secrets must stay in the deployment/provider secret store, never in Git.

## Required change path for locked areas

For changes touching a locked area:

1. Work on a branch, not by experimenting directly on the production baseline.
2. Run `npm run verify:locked`.
3. Require the **Stability & Security Gate** to pass.
4. Review the Vercel preview before production deployment when the change affects UI, routing or runtime behavior.
5. Check privacy/authorization from both an allowed and a denied account state.
6. Merge only after the change is accepted.
7. Keep a known-good production deployment/commit available for rollback.

## High-risk changes

The following require extra review and must never be treated as routine UI edits:

- authentication or JWT logic
- role/permission changes
- database migrations, triggers or audit tables
- payment/finance approval logic
- member identity/member-number logic
- matrimonial contact/photo release rules
- private-file storage or download routes
- Vercel routing/runtime configuration
- bulk updates/deletes/imports
- changes that expose previously private data

## Recovery rule

If a new release damages a previously accepted feature, restore the known-good behavior first. Do not redesign an already accepted module as part of an emergency fix. Diagnose the regression, apply the smallest compatible fix, rerun the locked verification gate, then redeploy.
