# Matrimonial Module Workflow

## Access model

- Public visitors can view only aggregate matrimonial service statistics and service information.
- Candidate profiles, matching results, interests, photos, contacts, forms and audit records require authenticated access.
- `matrimonial_manager` is a scoped operational admin role for the matrimonial control center and matching desk.
- The primary internal manager record is private and is not published as a public contact.

## Candidate flow

1. A verified user signs in by email/Google and creates one or more candidate profiles for self or an authorized adult family member.
2. A matrimonial manager may create the same full profile for a walk-in or assisted client.
3. Candidate/guardian consent is recorded before approval or matching visibility.
4. Profile information is stored as structured candidate data plus structured partner preferences.
5. Approved profiles enter the private matching engine only when matching visibility is enabled.

## Matching flow

1. The system calculates directional compatibility in both directions.
2. Must-have conflicts are treated separately from softer preferences.
3. Unknown fields reduce score confidence rather than automatically counting as a mismatch.
4. Users initially see anonymized profile codes and safe profile attributes only.
5. An interest request goes to manager review before the target side is asked for consent.
6. A portal user accepts or declines from their authenticated account.
7. For an offline target, an authorized manager may record consent only with a consent method and audit note.
8. Name, photo and contact access is released only when the workflow and the profile's privacy settings allow it.

## Security and privacy

- Matrimonial photos and supporting documents use authenticated private file endpoints.
- Private routes are excluded from indexing and return noindex headers.
- Supabase RLS is enabled on matrimonial, match-request, audit and manager-setting tables, with no public policies.
- Audit records are append-only at database level.
- The audit trail records relevant profile, interest, consent and manager actions.
- The legacy member-directory matrimonial endpoint is retired from profile access in favor of aggregate statistics and the private match finder.

## Administrative flow

- Control Center: candidate registry, verification, audit and interest queue.
- Add Client / Candidate: complete manager-entered profile form.
- Matching Desk: select candidate, review scored matches, create/forward interest, record offline consent where permitted.
- Official Form: confidential print/PDF output for authorized administrative use.
- Finance/payment status remains a separate workflow concern and must not itself expose a candidate publicly.
