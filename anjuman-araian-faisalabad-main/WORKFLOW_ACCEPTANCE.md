# Functional Workflow — Anjuman-e-Araian Faisalabad

## Visitor → Membership
Visitor > Become a Member > multi-step form > uploads documents/payment proof > submit > pending application.

## Admin → Member Approval
Admin > Members > Pending > review profile/documents/payment proof > approve/reject > member can log in after approval.

## Member Portal
Approved member > Member Login > profile > personal/family details > privacy controls > profile/photo updates.

## Governance
Admin > Leadership/Cabinet > update current office bearers and display order. Term-based governance is the next database upgrade after the first preview is stable.

## Business Directory
Applicant > Submit Business > details/logo/payment proof > pending > Admin review > approve > public directory.

## Matrimonial
Applicant > Matrimonial form > privacy-sensitive details/photos/payment proof > pending > Admin review > publish only when approved and explicitly enabled.

## Content
Admin > News/Events/Media > create/update > public website/homepage reflects approved content.

## Communications
Office WhatsApp/contact number is controlled from Site Settings. Current phase uses WhatsApp deep links, not a paid WhatsApp API.

## Data architecture for first live preview
Current Prisma schema is retained for compatibility so the site can be tested quickly. Phase 2 will add relational Payment, Governance Term, Position, Committee, Election and Audit Log tables after the first stable preview.
