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
    if (res.statusCode === 201 && payload?.id) {
      try {
        const member = await prisma.member.findUnique({
          where: { id: String(payload.id) },
          select: { formNo: true, memberNo: true, authUserId: true },
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
