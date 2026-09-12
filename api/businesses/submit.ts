import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backendModule = require("../../backend/dist/index.js");
const app = backendModule.default ?? backendModule;
const prismaModule = require("../../backend/dist/lib/prisma.js");
const prisma = prismaModule.default ?? prismaModule.prisma;

function packageAmount(pkg: string) {
  const key = String(pkg || "basic").toLowerCase();
  if (key === "vip") return 15000;
  if (key === "premium") return 5000;
  return 1000;
}

export default async function handler(req: any, res: any) {
  const submittedBody = req.body && typeof req.body === "object" ? { ...req.body } : {};
  const originalJson = res.json.bind(res);

  res.json = async (payload: any) => {
    if ((res.statusCode === 200 || res.statusCode === 201) && payload?.id) {
      try {
        const business = await prisma.business.findUnique({
          where: { id: String(payload.id) },
          select: { id: true, ownerName: true, sponsorshipPackage: true, paymentProofUrl: true, additionalPhotos: true },
        });
        if (business?.paymentProofUrl) {
          const senderName = String(submittedBody.paymentSenderName || business.ownerName || "Business payer").trim();
          const paymentMethod = String(submittedBody.paymentMethod || "").trim() || null;
          const paymentReference = String(submittedBody.paymentReference || "").trim() || null;
          const sourceKey = `business-registration:${business.id}`;
          const documents = business.additionalPhotos || JSON.stringify(submittedBody.additionalPhotos || []);
          await prisma.$executeRaw`
            INSERT INTO "PaymentSubmission" (
              "sourceType", "sourceRecordId", "sourceKey", "payerName", "senderName", "category", "amount", "currency",
              "paymentMethod", "transactionReference", "proofUrl", "supportingDocuments", "description", "status"
            ) VALUES (
              'business', ${business.id}, ${sourceKey}, ${business.ownerName}, ${senderName}, ${`Business Directory ${business.sponsorshipPackage} Listing`}, ${packageAmount(business.sponsorshipPackage)}, 'PKR',
              ${paymentMethod}, ${paymentReference}, ${business.paymentProofUrl}, ${documents}, 'Submitted with business registration; finance verification required before ledger posting.', 'pending'
            )
            ON CONFLICT ("sourceKey") DO UPDATE SET
              "senderName" = EXCLUDED."senderName",
              "paymentMethod" = EXCLUDED."paymentMethod",
              "transactionReference" = EXCLUDED."transactionReference",
              "proofUrl" = EXCLUDED."proofUrl",
              "supportingDocuments" = EXCLUDED."supportingDocuments",
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "PaymentSubmission"."status" = 'pending'
          `;
        }
      } catch (error) {
        console.error("[BUSINESS_SUBMIT_PAYMENT_QUEUE]", error);
      }
    }
    return originalJson(payload);
  };

  return app(req, res);
}
