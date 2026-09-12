import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backendModule = require("../../backend/dist/index.js");
const app = backendModule.default ?? backendModule;
const prismaModule = require("../../backend/dist/lib/prisma.js");
const prisma = prismaModule.default ?? prismaModule.prisma;

export default async function handler(req: any, res: any) {
  const submittedBody = req.body && typeof req.body === "object" ? { ...req.body } : {};
  const originalJson = res.json.bind(res);

  res.json = async (payload: any) => {
    if ((res.statusCode === 200 || res.statusCode === 201) && payload?.id) {
      try {
        const profile = await prisma.matrimonial.findUnique({
          where: { id: String(payload.id) },
          select: { id: true, name: true, feeAmount: true, paymentProofUrl: true, additionalPhotos: true },
        });
        if (profile?.paymentProofUrl) {
          const senderName = String(submittedBody.paymentSenderName || profile.name || "Matrimonial payer").trim();
          const paymentMethod = String(submittedBody.paymentMethod || "").trim() || null;
          const paymentReference = String(submittedBody.paymentReference || "").trim() || null;
          const sourceKey = `matrimonial-registration:${profile.id}`;
          const documents = profile.additionalPhotos || JSON.stringify(submittedBody.additionalPhotos || []);
          await prisma.$executeRaw`
            INSERT INTO "PaymentSubmission" (
              "sourceType", "sourceRecordId", "sourceKey", "payerName", "senderName", "category", "amount", "currency",
              "paymentMethod", "transactionReference", "proofUrl", "supportingDocuments", "description", "status"
            ) VALUES (
              'matrimonial', ${profile.id}, ${sourceKey}, ${profile.name}, ${senderName}, 'Matrimonial Application Fee', ${Number(profile.feeAmount || 0)}, 'PKR',
              ${paymentMethod}, ${paymentReference}, ${profile.paymentProofUrl}, ${documents}, 'Submitted with matrimonial application; finance verification required before ledger posting.', 'pending'
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
        console.error("[MATRIMONIAL_SUBMIT_PAYMENT_QUEUE]", error);
      }
    }
    return originalJson(payload);
  };

  return app(req, res);
}
