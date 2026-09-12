import { apiClient } from "./apiClient";

export interface FinanceMember {
  id: string;
  memberNo: string;
  fullName: string;
  email?: string;
  status: "approved";
  membershipType?: string;
}

export interface FinanceOfficer {
  id: string;
  memberId: string;
  name: string;
  memberNo: string;
  role: string;
  unit?: string | null;
}

export interface FinanceHead {
  id: string;
  name: string;
  kind: "revenue" | "expense" | "adjustment";
  defaultAmount?: number | null;
  notes?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface FinanceSummary {
  credits: number;
  debits: number;
  balance: number;
  count: number;
  legacyCount: number;
  pendingPayments?: number;
}

export interface FinanceLedgerRow {
  id: string;
  source: "ledger" | "legacy";
  serialNo?: number | null;
  transactionNo: string;
  type: "revenue" | "expense" | "adjustment";
  direction: "credit" | "debit";
  memberId?: string | null;
  member?: { id: string; memberNo: string; fullName: string } | null;
  partyName: string;
  category: string;
  amount: number;
  paymentMethod?: string | null;
  paymentSenderName?: string | null;
  proofUrl?: string | null;
  supportingDocuments?: string[];
  cashBookNo?: string | null;
  receiptNo?: string | null;
  voucherNo?: string | null;
  externalReference?: string | null;
  description?: string | null;
  issuedByName?: string | null;
  issuedByRole?: string | null;
  handledByMemberId?: string | null;
  handledByName?: string | null;
  handledByRole?: string | null;
  status: "posted" | "void";
  transactionDate: string;
}

export interface FinanceAuditRow {
  id: string;
  transactionId?: string | null;
  action: string;
  actorAdminId?: string | null;
  actorName?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  createdAt: string;
}

export interface FinanceTransactionInput {
  type: "revenue" | "expense" | "adjustment";
  direction?: "credit" | "debit";
  memberId?: string | null;
  partyName: string;
  category: string;
  amount: number;
  paymentMethod?: string | null;
  paymentSenderName?: string | null;
  proofUrl?: string | null;
  supportingDocuments?: string[];
  cashBookNo?: string | null;
  receiptNo?: string | null;
  voucherNo?: string | null;
  externalReference?: string | null;
  description?: string | null;
  transactionDate?: string | Date;
  handledByAssignmentId?: string | null;
}

export interface PaymentSubmission {
  id: string;
  sourceType: string;
  sourceRecordId?: string | null;
  sourceKey?: string | null;
  memberId?: string | null;
  memberNo?: string | null;
  memberFullName?: string | null;
  payerName: string;
  senderName: string;
  category: string;
  amount: number;
  currency: string;
  paymentMethod?: string | null;
  transactionReference?: string | null;
  proofUrl: string;
  supportingDocuments: string[];
  description?: string | null;
  status: "pending" | "approved" | "rejected";
  submittedByAdminId?: string | null;
  submittedByName?: string | null;
  submittedByRole?: string | null;
  submittedAt: string;
  reviewedByAdminId?: string | null;
  reviewedByName?: string | null;
  reviewedByRole?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  cashBookNo?: string | null;
  financeTransactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSubmissionInput {
  sourceType?: string;
  sourceRecordId?: string | null;
  sourceKey?: string | null;
  memberId?: string | null;
  payerName: string;
  senderName: string;
  category: string;
  amount: number;
  currency?: string;
  paymentMethod?: string | null;
  transactionReference?: string | null;
  proofUrl: string;
  supportingDocuments?: string[];
  description?: string | null;
}

export type FinanceLedgerView = "active" | "archived" | "all";
export type PaymentSubmissionStatus = "pending" | "approved" | "rejected" | "all";

export const fetchFinanceMembers = () => apiClient<FinanceMember[]>("/finance/members");
export const fetchFinanceOfficers = () => apiClient<FinanceOfficer[]>("/finance/officers");
export const fetchFinanceHeads = (kind = "all") => apiClient<FinanceHead[]>(`/finance/heads?kind=${encodeURIComponent(kind)}`);
export const createFinanceHead = (data: Pick<FinanceHead, "name" | "kind"> & { defaultAmount?: number | null; notes?: string | null; displayOrder?: number }) => apiClient<FinanceHead>("/finance/heads", { method: "POST", body: JSON.stringify(data) });
export const updateFinanceHead = (id: string, data: Partial<FinanceHead>) => apiClient<FinanceHead>(`/finance/heads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const fetchFinanceSummary = () => apiClient<FinanceSummary>("/finance/summary");
export const fetchFinanceLedger = (q = "", type = "all", view: FinanceLedgerView = "active") => apiClient<FinanceLedgerRow[]>(`/finance/ledger?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&view=${encodeURIComponent(view)}`);
export const createFinanceTransaction = (data: FinanceTransactionInput) => apiClient<FinanceLedgerRow>("/finance/transactions", { method: "POST", body: JSON.stringify(data) });
export const updateFinanceTransaction = (id: string, data: FinanceTransactionInput) => apiClient<FinanceLedgerRow>(`/finance/transactions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const voidFinanceTransaction = (id: string, reason: string) => apiClient<FinanceLedgerRow>(`/finance/transactions/${id}/void`, { method: "PATCH", body: JSON.stringify({ reason }) });
export const restoreFinanceTransaction = (id: string, reason: string) => apiClient<FinanceLedgerRow>(`/finance/transactions/${id}/restore`, { method: "PATCH", body: JSON.stringify({ reason }) });
export const fetchFinanceAudit = (id: string) => apiClient<FinanceAuditRow[]>(`/finance/transactions/${id}/audit`);

export const fetchPaymentSubmissions = (status: PaymentSubmissionStatus = "pending", q = "") => apiClient<PaymentSubmission[]>(`/finance/payment-submissions?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`);
export const createPaymentSubmission = (data: PaymentSubmissionInput) => apiClient<PaymentSubmission>("/finance/payment-submissions", { method: "POST", body: JSON.stringify(data) });
export const reviewPaymentSubmission = (id: string, data: { action: "approve" | "reject"; cashBookNo?: string | null; reviewNote?: string | null; ledgerAmount?: number | null }) => apiClient<any>(`/finance/payment-submissions/${id}/review`, { method: "PATCH", body: JSON.stringify(data) });
export const fetchPaymentSubmissionAudit = (id: string) => apiClient<FinanceAuditRow[]>(`/finance/payment-submissions/${id}/audit`);

export function financeReceiptUrl(id: string) {
  const encodedPath = ["finance", "transactions", id, "receipt.pdf"].map(encodeURIComponent).join("__");
  return `/api/__proxy__${encodedPath}`;
}
