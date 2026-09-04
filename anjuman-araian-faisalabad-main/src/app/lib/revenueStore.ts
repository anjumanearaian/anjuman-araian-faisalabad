import { apiClient } from "./apiClient";

export type ItemType = "membership" | "business_sponsorship" | "matrimonial_featured" | "other";
export type PaymentFrequency = "one_time" | "monthly" | "yearly";

export interface RevenueRecord {
  id: string;
  customerName: string;
  itemType: ItemType;
  itemName: string;
  amount: number;
  paymentFrequency: PaymentFrequency;
  date: string;
}

export interface ProfitSharingConfig {
  developerPercentage: number;
}

export async function getProfitSharing(): Promise<ProfitSharingConfig> {
  try {
    const data = await apiClient("/revenue/profit-sharing");
    return data as ProfitSharingConfig;
  } catch {
    return { developerPercentage: 20 };
  }
}

export async function saveProfitSharing(config: ProfitSharingConfig): Promise<void> {
  await apiClient("/revenue/profit-sharing", {
    method: "PATCH",
    body: JSON.stringify(config),
  });
}

export async function getRevenueRecords(): Promise<RevenueRecord[]> {
  try {
    const data = await apiClient("/revenue");
    return data as RevenueRecord[];
  } catch {
    return [];
  }
}

export function parseFeeAmount(feeString: string): number {
  if (!feeString) return 0;
  // Remove commas to prevent breaking the number, then extract digits optionally followed by a decimal part
  const match = feeString.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

export async function logRevenueRecord(data: { customerName: string; itemType: ItemType; itemName: string; feeString: string }): Promise<void> {
  // Extract amount using helper
  const amount = parseFeeAmount(data.feeString);
  
  // Determine frequency
  const lowerFee = data.feeString.toLowerCase();
  let paymentFrequency: PaymentFrequency = "one_time";
  if (lowerFee.includes("month")) {
    paymentFrequency = "monthly";
  } else if (lowerFee.includes("year") || lowerFee.includes("annual")) {
    paymentFrequency = "yearly";
  }

  if (amount > 0) {
    await apiClient("/revenue", {
      method: "POST",
      body: JSON.stringify({
        customerName: data.customerName,
        itemType: data.itemType,
        itemName: data.itemName,
        amount,
        paymentFrequency,
      }),
    });
  }
}
