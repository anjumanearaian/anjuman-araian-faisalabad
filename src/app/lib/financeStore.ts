import { apiClient } from "./apiClient";

export interface FinanceMember {
  id: string;
  memberNo: string;
  fullName: string;
  email?: string;
  status: "approved";
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
}

export const fetchFinanceMembers = () => apiClient<FinanceMember[]>("/finance/members");
export const fetchFinanceSummary = () => apiClient<FinanceSummary>("/finance/summary");
export const fetchFinanceLedger = (q = "", type = "all") => apiClient<FinanceLedgerRow[]>(`/finance/ledger?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`);
export const createFinanceTransaction = (data: FinanceTransactionInput) => apiClient<FinanceLedgerRow>("/finance/transactions", { method: "POST", body: JSON.stringify(data) });
export const voidFinanceTransaction = (id: string, reason: string) => apiClient<FinanceLedgerRow>(`/finance/transactions/${id}/void`, { method: "PATCH", body: JSON.stringify({ reason }) });

export function financeReceiptUrl(id: string) {
  const encodedPath = ["finance", "transactions", id, "receipt.pdf"].map(encodeURIComponent).join("__");
  return `/api/__proxy__${encodedPath}`;
}
