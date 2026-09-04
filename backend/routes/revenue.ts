import express from "express";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

// GET /api/revenue - Fetch all revenue records (including synthetic logs for already registered entities)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const dbRecords = await prisma.revenueRecord.findMany({
      orderBy: { date: "desc" },
    });

    // Cast as any[] for flexibility during synthesis
    const records: any[] = [...dbRecords];

    // Fetch approved members, businesses, matrimonials and settings
    const [approvedMembers, approvedBusinesses, approvedMatrimonials, settings] = await Promise.all([
      prisma.member.findMany({ where: { status: "approved" } }),
      prisma.business.findMany({ where: { status: "approved" } }),
      prisma.matrimonial.findMany({ where: { status: "approved" } }),
      prisma.siteSettings.findUnique({ where: { id: "settings" } }),
    ]);

    // Defaults for mapping
    const defaultMembershipTiers = [
      { type: "ordinary", name: "Ordinary Member", fee: "Rs. 500 / year" },
      { type: "life", name: "Life Member", fee: "Rs. 5,000 once" },
      { type: "patron", name: "Patron Member", fee: "Rs. 25,000 once" },
      { type: "overseas", name: "Overseas Member", fee: "$100 / year" }
    ];

    const defaultMatrimonialPackages = [
      { name: "Standard Listing", fee: "Rs. 500 once", isFeatured: false },
      { name: "Featured / VIP Listing", fee: "Rs. 2,000 once", isFeatured: true }
    ];

    const defaultSponsorshipPackages: Record<string, { name: string; price: string }> = {
      basic: { name: "Basic Listing", price: "Rs. 1,000 / year" },
      premium: { name: "Premium Listing", price: "Rs. 5,000 / year" },
      vip: { name: "VIP Sponsor", price: "Rs. 15,000 / year" }
    };

    const parseFeeAmount = (feeString: string): number => {
      if (!feeString) return 0;
      const match = feeString.replace(/,/g, '').match(/\d+(\.\d+)?/);
      return match ? parseFloat(match[0]) : 0;
    };

    const determineFrequency = (feeString: string): string => {
      const lowerFee = (feeString || "").toLowerCase();
      if (lowerFee.includes("month")) {
        return "monthly";
      } else if (lowerFee.includes("year") || lowerFee.includes("annual")) {
        return "yearly";
      }
      return "one_time";
    };

    // Keep track of existing records to avoid duplicates
    const existingMembers = new Set(
      dbRecords.filter(r => r.itemType === "membership").map(r => r.customerName.toLowerCase().trim())
    );
    const existingBusinesses = new Set(
      dbRecords.filter(r => r.itemType === "business_sponsorship").map(r => r.customerName.toLowerCase().trim())
    );
    const existingMatrimonials = new Set(
      dbRecords.filter(r => r.itemType === "matrimonial_featured").map(r => r.customerName.toLowerCase().trim())
    );

    // 1. Synthesize Member memberships
    const parsedTiers = (settings?.membershipTiers as any[]) || defaultMembershipTiers;
    for (const m of approvedMembers) {
      const nameKey = m.fullName.toLowerCase().trim();
      if (!existingMembers.has(nameKey)) {
        const tier = parsedTiers.find((t: any) => t.type === m.membershipType);
        const itemName = tier?.name || `${m.membershipType.charAt(0).toUpperCase() + m.membershipType.slice(1)} Member`;
        const feeString = tier?.fee || "Rs. 0";
        const amount = parseFeeAmount(feeString);
        const paymentFrequency = determineFrequency(feeString);

        records.push({
          id: `synthetic-member-${m.id}`,
          customerName: m.fullName,
          itemType: "membership",
          itemName,
          amount,
          paymentFrequency,
          date: m.approvedAt || m.createdAt || new Date(),
        });
      }
    }

    // 2. Synthesize Business sponsorships
    for (const b of approvedBusinesses) {
      const nameKey = b.businessName.toLowerCase().trim();
      if (!existingBusinesses.has(nameKey)) {
        const pkg = defaultSponsorshipPackages[b.sponsorshipPackage];
        const itemName = pkg?.name || `${b.sponsorshipPackage.charAt(0).toUpperCase() + b.sponsorshipPackage.slice(1)} Sponsorship`;
        const feeString = pkg?.price || "Rs. 0";
        const amount = parseFeeAmount(feeString);
        const paymentFrequency = determineFrequency(feeString);

        records.push({
          id: `synthetic-business-${b.id}`,
          customerName: b.businessName,
          itemType: "business_sponsorship",
          itemName,
          amount,
          paymentFrequency,
          date: b.createdAt || new Date(),
        });
      }
    }

    // 3. Synthesize Matrimonial VIP/Standard profiles
    const parsedMatPackages = (settings?.matrimonialPackages as any[]) || defaultMatrimonialPackages;
    for (const mat of approvedMatrimonials) {
      const nameKey = mat.name.toLowerCase().trim();
      if (!existingMatrimonials.has(nameKey)) {
        const isFeatured = mat.isFeatured;
        const pkg = parsedMatPackages.find((p: any) => p.isFeatured === isFeatured) || 
                    parsedMatPackages.find((p: any) => p.name.toLowerCase().includes(isFeatured ? "featured" : "standard"));
        
        const itemName = pkg?.name || (isFeatured ? "Featured / VIP Listing" : "Standard Listing");
        const feeString = pkg?.fee || (isFeatured ? "Rs. 2,000 once" : "Rs. 500 once");
        const amount = parseFeeAmount(feeString);
        const paymentFrequency = determineFrequency(feeString);

        records.push({
          id: `synthetic-matrimonial-${mat.id}`,
          customerName: mat.name,
          itemType: "matrimonial_featured",
          itemName,
          amount,
          paymentFrequency,
          date: mat.createdAt || new Date(),
        });
      }
    }

    // Sort by date descending
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(records);
  } catch (error: any) {
    console.error("Failed to fetch revenue records:", error);
    res.status(500).json({ error: "Failed to fetch revenue records" });
  }
});

// POST /api/revenue - Log a new revenue record
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { customerName, itemType, itemName, amount, paymentFrequency } = req.body;
    const newRecord = await prisma.revenueRecord.create({
      data: {
        customerName,
        itemType,
        itemName,
        amount,
        paymentFrequency,
      },
    });
    res.status(201).json(newRecord);
  } catch (error: any) {
    console.error("Failed to add revenue record:", error);
    res.status(500).json({ error: "Failed to add revenue record" });
  }
});

// GET /api/revenue/profit-sharing - Fetch developer percentage
router.get("/profit-sharing", requireAdmin, async (req, res) => {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: "settings" } });
    
    // If settings don't exist yet, return default
    if (!settings) {
      return res.json({ developerPercentage: 20 });
    }

    res.json({ developerPercentage: settings.developerPercentage ?? 20 });
  } catch (error: any) {
    console.error("Failed to fetch profit sharing:", error);
    res.status(500).json({ error: "Failed to fetch profit sharing" });
  }
});

// PATCH /api/revenue/profit-sharing - Update developer percentage
router.patch("/profit-sharing", requireAdmin, async (req, res) => {
  try {
    const { developerPercentage } = req.body;
    
    if (developerPercentage === undefined || developerPercentage < 0 || developerPercentage > 100) {
      return res.status(400).json({ error: "Invalid developer percentage" });
    }

    const updated = await prisma.siteSettings.upsert({
      where: { id: "settings" },
      update: { developerPercentage },
      create: {
        id: "settings",
        whatsappNumber: "",
        contactEmail: "",
        contactPhone: "",
        address: "",
        facebookUrl: "",
        twitterUrl: "",
        instagramUrl: "",
        linkedinUrl: "",
        developerPercentage,
      },
    });

    res.json({ developerPercentage: updated.developerPercentage });
  } catch (error: any) {
    console.error("Failed to update profit sharing:", error);
    res.status(500).json({ error: "Failed to update profit sharing" });
  }
});

export default router;

// dummy edit
