ALTER TABLE "PaymentSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MemberAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentSubmissionAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessAuditLog" ENABLE ROW LEVEL SECURITY;

ALTER FUNCTION public.prevent_audit_mutation() SET search_path = public, pg_temp;
ALTER FUNCTION public.audit_payment_submission_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_member_payment_status_to_membership_draft() SET search_path = public, pg_temp;
ALTER FUNCTION public.audit_member_insert_update() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_protected_record_delete() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_matrimonial_payment_submission() SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_matrimonial_payment_metadata_from_draft() SET search_path = public, pg_temp;
ALTER FUNCTION public.require_approved_payment_submission() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_business_payment_payer_name() SET search_path = public, pg_temp;
ALTER FUNCTION public.protect_business_audit_log() SET search_path = public, pg_temp;
ALTER FUNCTION public.audit_business_table_change() SET search_path = public, pg_temp;