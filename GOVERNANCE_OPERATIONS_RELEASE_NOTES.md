# Governance & Operations Center – release notes

## Unified admin workflow
A new `/admin/operations` panel now brings together:
- approved members and role assignments;
- dynamic cabinets, committees, working groups, zones, areas and chapters;
- meetings from notice through minutes/photos;
- overseas chapters with ISO country selection;
- one-page finance ledger for revenue, expenses and +/- adjustments.

The main Admin sidebar now shows **Governance & Operations** as the primary route. Old leadership/overseas/revenue code is retained for compatibility but is no longer the main navigation path, reducing duplicate admin screens.

## Structure and hierarchy
Admin can create a new organization unit without code changes. A unit can optionally have a parent, for example:
`Anjuman Faisalabad → Samanabad Zone → Local Committee`.
The design intentionally stays shallow and optional so a simple committee does not require unnecessary hierarchy.

## Member identity
Role assignment only accepts an **approved existing member ID**. One person can hold several assignments while keeping one master member profile.

## Meetings and minutes
A meeting is created once. Before the date it stores notice/agenda; after the meeting the same record receives status, minutes and photographs. Attendance has a separate member-linked table.

## Finance controls
New finance rows have:
- permanent numeric ledger serial;
- transaction number;
- receipt number for credits / voucher number for debits;
- C-in-book / cash-book number;
- optional member link;
- category, amount, method, reference and description;
- issuing admin/finance officer identity;
- posted/void status plus audit log.

Existing membership/business/matrimonial revenue in `RevenueRecord` is displayed alongside new ledger records rather than copied into a second table.

## PDF receipt
The Finance Ledger can generate a lightweight official PDF receipt/voucher without adding a new PDF library dependency.
