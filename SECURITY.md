# Security Policy

## Production principles

- Authorization is enforced on the server, not only by hiding UI controls.
- Private member and matrimonial data is returned only to authorized roles/owners.
- Secrets belong in Vercel/provider environment settings and must never be committed.
- Historical database migrations and audit protections are treated as append-only production records.
- Payment verification and consent gates must not be bypassed for convenience.

## Before merging a security-sensitive change

Run:

```bash
npm run verify:locked
```

Then test at least one allowed and one denied access path for the affected feature.

## Sensitive areas

Changes to authentication, roles, database migrations, payment/finance logic, member identity, matrimonial privacy, file access, API routing or deployment configuration require explicit review before production.

## Credential exposure

If a real password, JWT secret, database URL, API key or provider token is ever committed or exposed, treat it as compromised: revoke/rotate it at the provider, replace the deployment secret, and remove it from future source. Deleting the visible Git line alone is not sufficient remediation.

## Recovery

Use the documented stable production baseline and provider/database backups to recover. Prefer the smallest compatible fix over redesigning an already accepted production module during an incident.
