## Change summary

Describe the smallest intended change and the approved requirement it satisfies.

## Locked-area checklist

- [ ] I did not rename/remove a working API route or change an existing payload contract without an explicit migration/compatibility plan.
- [ ] I did not edit or delete a historical database migration.
- [ ] Member IDs/member numbers and ownership rules remain stable.
- [ ] Payment/finance approval gates remain enforced.
- [ ] Public member responses do not expose contact, CNIC, address, documents or other private fields.
- [ ] Matrimonial contact/photo/document access still follows authenticated ownership/admin/consent rules.
- [ ] Server-side role checks remain the source of authorization.
- [ ] Name/location display consistency remains centralized through the shared formatter where applicable.
- [ ] No real secrets or `.env` files are included.
- [ ] `npm run verify:locked` passes.
- [ ] Vercel preview or production smoke test completed for affected user flows.
- [ ] A known-good rollback point remains available.

## Verification notes

List the pages, roles and denied/allowed scenarios tested. For high-risk changes, include rollback notes.
