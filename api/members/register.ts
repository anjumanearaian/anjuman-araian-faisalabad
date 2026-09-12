import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backendModule = require("../../backend/dist/index.js");
const app = backendModule.default ?? backendModule;
const prismaModule = require("../../backend/dist/lib/prisma.js");
const prisma = prismaModule.default ?? prismaModule.prisma;

function membershipPayment(type: string) {
  const key = String(type || "ordinary").toLowerCase();
  if (["life", "lifetime"].includes(key)) return { category: "Life Membership Fee", amount: 3000, currency: "PKR" };
  if (key === "patron") return { category: "Patron Membership Fee", amount: 25000, currency: "PKR" };
  if (key === "overseas") return { category: "Overseas Membership Fee", amount: 100, currency: "USD" };
  return { category: "Annual Membership Fee", amount: 1000, currency: "PKR" };
}

export default async function handler(req: any, res: any) {
  const submittedBody = req.body && typeof req.body === "object" ? { ...req.body } : {};
  const originalJson = res.json.bind(res);

  res.json = async (payload: any) => {
    if (res.statusCode === 201 && payload?.id) {
      try {
        const member = await prisma.member.findUnique({
          where: { id: String(payload.id) },
          select: { id: true, formNo: true, memberNo: true, authUserId: true, fullName: true, membershipType: true, paymentProofUrl: true, additionalPhotos: true },
        });
        if (member?.authUserId) {
          const { familyInfo, ...form } = submittedBody;
          await prisma.formDraft.upsert({
            where: { authUserId_formType: { authUserId: member.authUserId, formType: "membership" } },
            update: {
              data: { form, family: familyInfo || {} },
              currentStep: 5,
              completion: 100,
              status: "submitted",
              paymentStatus: "submitted",
              submittedAt: new Date(),
            },
            create: {
              authUserId: member.authUserId,
              formType: "membership",
              data: { form, family: familyInfo || {} },
              currentStep: 5,
              completion: 100,
              status: "submitted",
              paymentStatus: "submitted",
              submittedAt: new Date(),
            },
          });
        }

        if (member?.paymentProofUrl) {
          const payment = membershipPayment(member.membershipType);
          const senderName = String(submittedBody.paymentSenderName || member.fullName || "Member").trim();
          const paymentMethod = String(submittedBody.paymentMethod || "").trim() || null;
          const paymentReference = String(submittedBody.paymentReference || "").trim() || null;
          const documents = member.additionalPhotos || JSON.stringify(submittedBody.additionalPhotos || []);
          const sourceKey = `membership-registration:${member.id}`;
          await prisma.$executeRaw`
            INSERT INTO "PaymentSubmission" (
              "sourceType", "sourceRecordId", "sourceKey", "memberId", "payerName", "senderName", "category", "amount", "currency",
              "paymentMethod", "transactionReference", "proofUrl", "supportingDocuments", "description", "status"
            ) VALUES (
              'membership', ${member.id}, ${sourceKey}, ${member.id}, ${member.fullName}, ${senderName}, ${payment.category}, ${payment.amount}, ${payment.currency},
              ${paymentMethod}, ${paymentReference}, ${member.paymentProofUrl}, ${documents}, 'Submitted with membership registration; finance verification required before ledger posting.', 'pending'
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

        payload = { ...payload, formNo: member?.formNo || undefined, memberNo: member?.memberNo || payload.memberNo };
      } catch (error) {
        console.error("[MEMBERS_REGISTER_FINALIZE]", error);
        // Registration itself succeeded; never turn it into a failure because a
        // post-submit synchronization step could not complete.
      }
    }
    return originalJson(payload);
  };

  return app(req, res);
}
