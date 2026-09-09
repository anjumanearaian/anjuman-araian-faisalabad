import express from "express";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const dbRecords = await prisma.revenueRecord.findMany({ orderBy: { date: "desc" } });
    const records: any[] = [...dbRecords];
    const [approvedMembers, approvedBusinesses, approvedMatrimonials, settings] = await Promise.all([
      prisma.member.findMany({ where: { status: "approved" } }),
      prisma.business.findMany({ where: { status: "approved" } }),
      prisma.matrimonial.findMany({ where: { status: "approved" } }),
      prisma.siteSettings.findUnique({ where: { id: "settings" } }),
    ]);

    const defaultMembershipTiers = [
      { type: "ordinary", name: "Regular / Annual Member", fee: "Rs. 1,000 / year" },
      { type: "life", name: "Life Member", fee: "Rs. 3,000 once" },
      { type: "patron", name: "Patron Member", fee: "Rs. 25,000 once" },
      { type: "overseas", name: "Overseas Member", fee: "$100 / year" }
    ];
    const defaultMatrimonialPackages = [
      { name: "Member Matrimonial Application", fee: "Rs. 3,000 once", isFeatured: false },
      { name: "Non-Member Matrimonial Application", fee: "Rs. 5,000 once", isFeatured: false }
    ];
    const defaultSponsorshipPackages: Record<string, { name: string; price: string }> = {
      basic: { name: "Basic Listing", price: "Rs. 1,000 / year" },
      premium: { name: "Premium Listing", price: "Rs. 5,000 / year" },
      vip: { name: "VIP Sponsor", price: "Rs. 15,000 / year" }
    };
    const parseFeeAmount = (feeString: string): number => {
      if (!feeString) return 0;
      const match = feeString.replace(/,/g, "").match(/\d+(\.\d+)?/);
      return match ? parseFloat(match[0]) : 0;
    };
    const determineFrequency = (feeString: string): string => {
      const lowerFee = (feeString || "").toLowerCase();
      if (lowerFee.includes("month")) return "monthly";
      if (lowerFee.includes("year") || lowerFee.includes("annual")) return "yearly";
      return "one_time";
    };

    const existingMembers = new Set(dbRecords.filter(r => r.itemType === "membership").map(r => r.customerName.toLowerCase().trim()));
    const existingBusinesses = new Set(dbRecords.filter(r => r.itemType === "business_sponsorship").map(r => r.customerName.toLowerCase().trim()));
    const existingMatrimonials = new Set(dbRecords.filter(r => r.itemType === "matrimonial_featured").map(r => r.customerName.toLowerCase().trim()));

    const parsedTiers = (settings?.membershipTiers as any[]) || defaultMembershipTiers;
    for (const m of approvedMembers) {
      const nameKey = m.fullName.toLowerCase().trim();
      if (!existingMembers.has(nameKey)) {
        const tier = parsedTiers.find((t: any) => t.type === m.membershipType);
        const itemName = tier?.name || `${m.membershipType.charAt(0).toUpperCase() + m.membershipType.slice(1)} Member`;
        const feeString = tier?.fee || "Rs. 0";
        records.push({ id: `synthetic-member-${m.id}`, customerName: m.fullName, itemType: "membership", itemName, amount: parseFeeAmount(feeString), paymentFrequency: determineFrequency(feeString), reference: `membership:${m.id}`, date: m.approvedAt || m.createdAt || new Date() });
      }
    }

    for (const b of approvedBusinesses) {
      const nameKey = b.businessName.toLowerCase().trim();
      if (!existingBusinesses.has(nameKey)) {
        const pkg = defaultSponsorshipPackages[b.sponsorshipPackage];
        const feeString = pkg?.price || "Rs. 0";
        records.push({ id: `synthetic-business-${b.id}`, customerName: b.businessName, itemType: "business_sponsorship", itemName: pkg?.name || `${b.sponsorshipPackage} Sponsorship`, amount: parseFeeAmount(feeString), paymentFrequency: determineFrequency(feeString), reference: `business:${b.id}`, date: b.createdAt || new Date() });
      }
    }

    const parsedMatPackages = (settings?.matrimonialPackages as any[]) || defaultMatrimonialPackages;
    void parsedMatPackages;
    for (const mat of approvedMatrimonials) {
      const nameKey = mat.name.toLowerCase().trim();
      if (!existingMatrimonials.has(nameKey)) {
        const itemName = mat.applicantType === "member" ? "Member Matrimonial Application" : "Non-Member Matrimonial Application";
        const feeString = `Rs. ${mat.feeAmount || (mat.applicantType === "member" ? 3000 : 5000)} once`;
        records.push({ id: `synthetic-matrimonial-${mat.id}`, customerName: mat.name, itemType: "matrimonial_featured", itemName, amount: mat.feeAmount || parseFeeAmount(feeString), paymentFrequency: determineFrequency(feeString), reference: `matrimonial:${mat.id}`, date: mat.createdAt || new Date() });
      }
    }

    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(records);
  } catch (error: any) {
    console.error("Failed to fetch revenue records:", error);
    res.status(500).json({ error: "Failed to fetch revenue records" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { customerName, itemType, itemName, amount, paymentFrequency, reference, receiptNo } = req.body;
    // Older front-end approval handlers also post a revenue line after the new
    // server-side approval transaction. Return the authoritative record instead
    // of creating a duplicate entry.
    const existing = await prisma.revenueRecord.findFirst({
      where: {
        OR: [
          ...(reference ? [{ reference: String(reference) }] : []),
          { customerName: { equals: String(customerName || ""), mode: "insensitive" }, itemType: String(itemType || "") },
        ]
      },
      orderBy: { date: "desc" },
    });
    if (existing) return void res.status(200).json(existing);

    const newRecord = await prisma.revenueRecord.create({
      data: {
        customerName, itemType, itemName, amount, paymentFrequency,
        reference: reference || null,
        receiptNo: receiptNo || null,
      },
    });
    res.status(201).json(newRecord);
  } catch (error: any) {
    console.error("Failed to add revenue record:", error);
    res.status(500).json({ error: "Failed to add revenue record" });
  }
});

router.get("/profit-sharing", requireAdmin, async (_req, res) => {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "settings" } });
    if (!settings) return void res.json({ developerPercentage: 20 });
    res.json({ developerPercentage: settings.developerPercentage ?? 20 });
  } catch (error: any) {
    console.error("Failed to fetch profit sharing:", error);
    res.status(500).json({ error: "Failed to fetch profit sharing" });
  }
});

router.patch("/profit-sharing", requireAdmin, async (req, res) => {
  try {
    const { developerPercentage } = req.body;
    if (developerPercentage === undefined || developerPercentage < 0 || developerPercentage > 100) return void res.status(400).json({ error: "Invalid developer percentage" });
    const updated = await prisma.siteSettings.upsert({
      where: { id: "settings" }, update: { developerPercentage },
      create: { id: "settings", whatsappNumber: "", contactEmail: "", contactPhone: "", address: "", facebookUrl: "", twitterUrl: "", instagramUrl: "", linkedinUrl: "", developerPercentage },
    });
    res.json({ developerPercentage: updated.developerPercentage });
  } catch (error: any) {
    console.error("Failed to update profit sharing:", error);
    res.status(500).json({ error: "Failed to update profit sharing" });
  }
});

export default router;
