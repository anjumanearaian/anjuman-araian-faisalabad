# Governance & Operations Center — Preview QA Checklist

This release is designed as an additive upgrade. Do not run destructive database reset commands on production.

## 1. Database safety

1. Create/use a Vercel Preview deployment connected to a preview/staging PostgreSQL database.
2. Confirm `DATABASE_URL`, `JWT_SECRET`, Blob storage and email variables are present in Preview.
3. Run `npm run db:migrate:status`.
4. Run `npm run db:migrate:deploy` against Preview only.
5. Run `npm run prisma:generate` if your deployment process did not already run postinstall.
6. Never run `prisma migrate reset`, `prisma db push --force-reset`, or a manual DROP statement on the live database.

## 2. Governance structure

- Open **Admin → Governance & Operations**.
- Create a test Committee, Working Group, Zone and Area.
- Create a child Area under a Zone and confirm the hierarchy appears correctly.
- Attempt to make a parent point to its own child. The API must reject the circular hierarchy.
- Archive a linked unit and confirm its historical data remains.

## 3. Members and role assignments

- Confirm the Member & Approval Center still reads the existing Member table.
- Approve a test member.
- Assign the same approved Member ID to two different committees/roles.
- Try the same member + same unit + same role + same period twice. The existing assignment should be revived/updated, not duplicated.
- Run **Import Linked Legacy Roles** once and confirm no duplicate member/person rows are created.

## 4. Meeting lifecycle

- Create a meeting as **Announced / Upcoming** and publish it.
- Confirm one public Content record appears in the Updates & Events Hub.
- Add attendance against approved members and save.
- Change the same meeting to **Held / Completed**, add minutes and photos, then update it.
- Confirm the same public record is updated rather than a second meeting being created.
- Confirm a completed meeting with minutes appears under the public **Minutes** filter.

## 5. Overseas chapters

- Confirm the Country field is an ISO country list rather than free text.
- Add/edit/delete a test chapter with city/region, coordinator, phone, email and member count.

## 6. Finance ledger

- Existing `RevenueRecord` membership payments must appear as legacy revenue without being copied or deleted.
- Post a new Revenue transaction linked to an approved member.
- Confirm ledger Serial No., Receipt No. and Cash / C-in-book No. display correctly.
- Download the PDF receipt.
- Post an Expense and confirm a voucher number is generated.
- Post both a plus and minus Adjustment.
- Void a test transaction and confirm it remains visible with an audit trail rather than disappearing.
- Login with a `finance_secretary` or `assistant_finance_secretary` admin account and confirm only Finance Ledger access is exposed.
- If the finance login email matches an approved member who has an active Finance Secretary role assignment, confirm their name/role appears automatically on the PDF/ledger issuer fields.

## 7. Admin access

- As Super Admin, create a limited Finance Secretary account in **Admin Users**.
- Change a test account role and confirm access changes after re-login.
- Confirm the last Super Admin cannot be demoted.
- Confirm Content Manager and Welfare Manager remain restricted to their existing permitted areas.

## 8. Content, SEO and images

- Confirm News, Announcements, Activities, Meetings/Events and Minutes are handled in the unified Content Hub/public Updates Hub.
- Open an individual content URL and inspect title, meta description, canonical, Open Graph and structured data.
- Upload a large JPG/PNG to an event and confirm client-side optimization occurs before upload.
- Confirm event artwork uses the 16:9 website card presentation without destructive cropping.
- Check desktop and mobile layouts at 360px, 390px, 768px and desktop width.

## 9. Final production gate

Only promote to production after:

- `npm run check` passes in a normal dependency-installed environment.
- Preview login, member approval, governance, meetings, image upload, finance PDF and public content smoke tests pass.
- A current database backup/snapshot exists.
- Migration status is clean.
