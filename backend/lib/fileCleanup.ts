import { del } from "@vercel/blob";
import prisma from "./prisma";

const dbFile = (url: string) => url.match(/^\/api\/files\/([0-9a-f-]{36})$/i)?.[1] || "";
const blobFile = (url: string) => /^https:\/\/[^/]*blob\.vercel-storage\.com\//i.test(url);

function containsJsonValue(value: unknown, url: string) {
  if (Array.isArray(value)) return value.some((item) => item === url || containsJsonValue(item, url));
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some((item) => item === url || containsJsonValue(item, url));
  return false;
}

export function isManagedFileUrl(value?: string | null) {
  const url = String(value || "").trim();
  return Boolean(url && (dbFile(url) || blobFile(url)));
}

async function isReferenced(url: string) {
  if (await prisma.member.findFirst({ where: { OR: [
    { photoUrl: url }, { cnicFrontUrl: url }, { cnicBackUrl: url }, { paymentProofUrl: url }, { additionalPhotos: { contains: url } }
  ] }, select: { id: true } })) return true;

  if (await prisma.business.findFirst({ where: { OR: [
    { logoUrl: url }, { paymentProofUrl: url }, { additionalPhotos: { contains: url } }
  ] }, select: { id: true } })) return true;

  if (await prisma.matrimonial.findFirst({ where: { OR: [
    { photoUrl: url }, { paymentProofUrl: url }, { additionalPhotos: { contains: url } }
  ] }, select: { id: true } })) return true;

  if (await prisma.leadershipProfile.findFirst({ where: { image: url }, select: { id: true } })) return true;
  if (await prisma.leadershipMessage.findFirst({ where: { photo: url }, select: { id: true } })) return true;
  if (await prisma.media.findFirst({ where: { url }, select: { id: true } })) return true;

  const settings = await prisma.siteSettings.findUnique({ where: { id: "settings" } });
  if (settings) {
    if ([settings.constitutionPdfUrl, settings.memorandumPdfUrl, settings.rulesPdfUrl].includes(url)) return true;
    if (containsJsonValue(settings.heroSlides, url)) return true;
  }
  return false;
}

export async function deleteManagedFileIfUnreferenced(value?: string | null) {
  const url = String(value || "").trim();
  if (!isManagedFileUrl(url) || await isReferenced(url)) return;

  const id = dbFile(url);
  if (id) {
    await prisma.storedFile.delete({ where: { id } }).catch(() => undefined);
    return;
  }
  if (blobFile(url)) await del(url).catch(() => undefined);
}

export async function cleanupRemovedFiles(before: Array<string | null | undefined>, after: Array<string | null | undefined>) {
  const keep = new Set(after.map((x) => String(x || "").trim()).filter(Boolean));
  const removed = [...new Set(before.map((x) => String(x || "").trim()).filter(Boolean))].filter((url) => !keep.has(url));
  for (const url of removed) await deleteManagedFileIfUnreferenced(url);
}
