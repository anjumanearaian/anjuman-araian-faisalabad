# Preview Status — 29 August 2026

This package is the **preview-ready V1 integration build** for Anjuman-e-Araian Faisalabad.

## Completed in this build
- Existing React/Vite frontend retained.
- Existing Express/Prisma backend retained and prepared for Vercel Functions.
- SPA/API routing corrected so `/api/*` is not swallowed by the frontend rewrite.
- Database-aware `/api/health` endpoint added.
- Vercel preview-domain CORS support added.
- Admin/member authentication hardening applied.
- Public member/business/matrimonial payloads sanitized to avoid exposing sensitive fields.
- Member self-edit allowlist and current-password verification added.
- File upload flow changed from browser base64 to `/api/upload` + Vercel Blob-compatible URLs.
- Existing legacy `/uploads/*` media preserved as static public assets.
- Admin-only protection added to messages, revenue, business editing and matrimonial editing.
- Production rate limits tightened.
- No production `.env`, Vercel project linkage, Git metadata, database file or node_modules included.

## Required before preview can be fully functional online
1. Create a separate Vercel project named `anjuman-e-araian-faisalabad`.
2. Add `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ALLOWED_ORIGINS` in Vercel project settings.
3. Connect a Vercel Blob store.
4. Deploy this package and verify `/api/health` plus the acceptance test in `DEPLOY_PREVIEW_FIRST.md`.

## Required before main-domain public launch
- Enable **private** file storage/delivery for CNICs, payment proofs and other sensitive documents.
- Rotate any credentials that were present in the earlier development archive.
- Complete final mobile/UI polish and content verification.
- Add `anjumanearaian.org` and `www.anjumanearaian.org` only after preview approval.
