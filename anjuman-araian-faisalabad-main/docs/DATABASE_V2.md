# Management Database V2 - Planned Extension

The current database already covers members, family information, content, media, leadership, overseas chapters, messages, settings, businesses, matrimonial profiles and revenue.

The next safe migration should add these normalized modules without deleting existing records:

## Governance
- GovernanceTerm: id, title, startDate, endDate, status
- GovernancePosition: id, title, group, level, sortOrder
- MemberPosition: memberId, termId, positionId, startDate, endDate, status

This replaces the long-term use of a flat `LeadershipProfile.tier` hierarchy while keeping old leadership data during migration.

## Payments
- Payment: receiptNo, memberId, type, amount, method, referenceNo, paidAt, status, proofUrl, receivedBy, remarks

## Elections
- Election: termId, title, electionDate, status
- ElectionCandidate: electionId, memberId, positionId, votes, result

## Activities
- Activity: title, date, venue, description, income, expense, status
- ActivityParticipant: activityId, memberId, attendanceStatus

## Audit Trail
- AuditLog: adminId, action, entityType, entityId, beforeJson, afterJson, createdAt

## Design rule
A person must exist once in `Member`. Cabinet, executive committee, election, payment and activity records should reference that same member ID instead of duplicating the person's profile.
