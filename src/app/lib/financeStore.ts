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

export interface FinanceTransactionInput {
  type: "revenue" | "expense" | "adjustment";
  direction?: "credit" | "debit";
  memberId?: string | null;
  partyName: string;
  category: string;
  amount: number;
  paymentMethod?: string | null;
  cashBookNo?: string | null;
  receiptNo?: string | null;
  voucherNo?: string | null;
  externalReference?: string | null;
  description?: string | null;
  transactionDate?: string | Date;
  handledByAssignmentId?: string | null;
}

export const fetchFinanceMembers = () => apiClient<FinanceMember[]>("/finance/members");
export const fetchFinanceOfficers = () => apiClient<FinanceOfficer[]>("/finance/officers");
export const fetchFinanceHeads = (kind = "all") => apiClient<FinanceHead[]>(`/finance/heads?kind=${encodeURIComponent(kind)}`);
export const createFinanceHead = (data: Pick<FinanceHead, "name" | "kind"> & { defaultAmount?: number | null; notes?: string | null; displayOrder?: number }) => apiClient<FinanceHead>("/finance/heads", { method: "POST", body: JSON.stringify(data) });
export const updateFinanceHead = (id: string, data: Partial<FinanceHead>) => apiClient<FinanceHead>(`/finance/heads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const fetchFinanceSummary = () => apiClient<FinanceSummary>("/finance/summary");
export const fetchFinanceLedger = (q = "", type = "all") => apiClient<FinanceLedgerRow[]>(`/finance/ledger?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`);
export const createFinanceTransaction = (data: FinanceTransactionInput) => apiClient<FinanceLedgerRow>("/finance/transactions", { method: "POST", body: JSON.stringify(data) });
export const updateFinanceTransaction = (id: string, data: FinanceTransactionInput) => apiClient<FinanceLedgerRow>(`/finance/transactions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const voidFinanceTransaction = (id: string, reason: string) => apiClient<FinanceLedgerRow>(`/finance/transactions/${id}/void`, { method: "PATCH", body: JSON.stringify({ reason }) });

export function financeReceiptUrl(id: string) {
  const encodedPath = ["finance", "transactions", id, "receipt.pdf"].map(encodeURIComponent).join("__");
  return `/api/__proxy__${encodedPath}`;
}
