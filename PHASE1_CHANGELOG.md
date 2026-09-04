# Preview Release — Technical Changes

This preview package is based on the supplied Anjuman frontend/backend and keeps the existing UI and data model compatible for a fast first deployment.

## Deployment
- Added Vercel API entrypoints for the Express backend.
- Added Vercel-safe SPA routing that excludes `/api/*` from the frontend fallback.
- Added Vercel Blob support for persistent uploads.
- Preserved legacy uploaded images under `public/uploads`.
- Removed committed secrets and local development artifacts.
- Added an environment-independent Prisma generate fallback so the frontend can build before a live DB URL is available.
- Added `/api/health` deployment diagnostics.

## Membership workflow
- Changed membership and business single-file inputs from base64-in-browser storage to server upload URLs.
- Added upload-progress protection so forms cannot submit while files are still uploading.
- Improved duplicate member detection using both email and CNIC.
- Improved member-number sequence generation.
- Added secure current-password verification for member password changes.
- Restricted member self-editing so a member cannot change approval/admin fields.

## Privacy and access control
- Public/member directory API no longer returns CNIC, private contact details, address, payment proofs or private administrative fields.
- Public business directory no longer exposes payment proof/admin fields.
- Public matrimonial directory no longer exposes direct contact, payment proof or admin fields.
- Business and matrimonial edit endpoints now require admin access.
- Message inbox read/update/delete endpoints now require admin access; public contact submission remains open.
- Revenue/profit-sharing endpoints now require admin access.
- Admin JWT now preserves the admin's actual stored role.

## Production hardening
- Added trusted proxy configuration for Vercel rate limiting.
- Tightened production login rate limiting.
- Removed insecure default admin-password fallback.
- Added baseline security response headers.
- Added Vercel preview-domain CORS support before the custom domain is linked.

## Deliberately deferred until first preview is stable
- V2 relational Payment ledger.
- Governance Terms / Positions / historical office-bearer records.
- Elections and Committees tables.
- Audit-log table.
- Private Blob delivery for CNIC/payment documents. For preview testing, use dummy documents only until private-document delivery is completed.
- Full premium visual redesign. The existing UI is retained first so functionality can be validated before the design pass.
