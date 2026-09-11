# Version 5.1.0 — Governance & Operations Upgrade

- Added one Governance & Operations Center for organization structure, role assignments, meetings/minutes/attendance, overseas chapters and finance.
- Removed duplicate cabinet/committee assignment controls from the Member & Approval Center; it now links to the authoritative Operations Center.
- Added dynamic cabinets, committees, working groups, zones, areas and parent-child hierarchy with cycle protection.
- Role assignments link to approved Member IDs. Duplicate person records are not created.
- Added meeting lifecycle: announcement → attendance → held meeting → minutes/photos, with one synced public Content record.
- Added full ISO country selector for overseas chapters.
- Added permanent finance ledger with serial numbers, receipts/vouchers, Cash/C-in-book number, revenue, expenses, adjustments, voiding and audit logs.
- Existing RevenueRecord entries remain visible as legacy revenue and are not migrated destructively.
- Added PDF receipts/vouchers and automatic issuer resolution for linked Finance Secretary/Assistant Finance Secretary accounts.
- Added Super Admin creation/role management for scoped admin accounts, including finance roles; the last Super Admin cannot be demoted.
- Added additive PostgreSQL migration and migration lock. No existing tables/columns are dropped or renamed.
- Existing API paths and database connection strategy remain intact; new `/api/governance` and `/api/finance` endpoints are additive.
