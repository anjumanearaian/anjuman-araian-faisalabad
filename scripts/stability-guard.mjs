import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const passes = [];

function full(file) {
  return path.join(root, file);
}

function read(file) {
  try {
    return fs.readFileSync(full(file), "utf8");
  } catch {
    return "";
  }
}

function check(condition, label) {
  if (condition) passes.push(label);
  else failures.push(label);
}

function exists(file, label = file) {
  check(fs.existsSync(full(file)), label);
}

function contains(file, needles, label) {
  const text = read(file);
  const required = Array.isArray(needles) ? needles : [needles];
  check(Boolean(text) && required.every((needle) => text.includes(needle)), label);
}

// Secrets must stay outside Git. Example files are intentionally allowed.
for (const file of [".env", ".env.local", ".env.production", ".env.production.local", "backend/.env"]) {
  check(!fs.existsSync(full(file)), `secret file is not committed: ${file}`);
}

// Central display normalization is a locked invariant for member/matrimonial consistency.
contains(
  "src/app/lib/displayFormat.ts",
  ["export function formatPersonName", "export function formatPlaceName", "export function normalizeMemberDisplay", "export function normalizeMatrimonialDisplay"],
  "central display normalizer remains available",
);
contains(
  "src/app/lib/memberStore.ts",
  ["normalizeMemberDisplay", "normalizeMemberPayload", "createAdminMember", "updateMember"],
  "member create/edit/read paths keep centralized normalization",
);
contains(
  "src/app/lib/memberDirectoryStore.ts",
  ["normalizeMemberDisplay", "/homepage/member-directory"],
  "public member directory keeps centralized normalization",
);
contains(
  "src/app/context/MemberContext.tsx",
  ["normalizeMemberDisplay", "setMember"],
  "member session keeps normalized display data",
);
contains(
  "src/app/lib/matrimonialStore.ts",
  ["normalizeMatrimonialPayload", "normalizeMatrimonialDisplay", "createMatrimonial", "updateMatrimonial"],
  "matrimonial create/edit/read paths keep centralized normalization",
);

// Authentication and role separation must not silently disappear.
contains(
  "backend/middleware/auth.ts",
  ["JWT_SECRET is not configured", "requireAdmin", "requireMatrimonialAdmin", "requireSuperAdmin", "requireFinanceAdmin", "requireMember"],
  "role-based authentication middleware remains enforced",
);
contains(
  "backend/middleware/rateLimiter.ts",
  ["loginLimiter", "registerLimiter", "apiLimiter", "uploadLimiter", "NODE_ENV === \"production\""],
  "production rate limiting remains configured",
);
exists("backend/middleware/validate.ts", "request validation middleware remains present");

// Public directory must never return contact fields to anonymous visitors.
contains(
  "backend/routes/homepage.ts",
  [
    "const canSeeContacts",
    "...(canSeeContacts ? { phone: true, whatsapp: true, email: true } : {})",
    "contactDetailsVisible: canSeeContacts",
  ],
  "public member contact privacy gate remains intact",
);

// Matrimonial photos/documents are private, authenticated, no-store resources.
contains(
  "backend/routes/matrimonial.ts",
  [
    "PRIVATE_FILE_PREFIX",
    'router.get("/private-file/:id", requireMember',
    'res.setHeader("Cache-Control","private, no-store")',
    'res.setHeader("X-Robots-Tag","noindex, noarchive, nosnippet")',
    "photoAccessStatus",
  ],
  "private matrimonial file authorization and no-cache rules remain intact",
);
contains(
  "src/app/components/SecureMatrimonialImage.tsx",
  ["Authorization: `Bearer ${token}`", 'cache: "no-store"', "Private image access denied"],
  "private matrimonial images require an authenticated fetch",
);

// Historical security migrations are append-only safety rails. Do not remove or edit them casually.
for (const file of [
  "backend/prisma/migrations/20260913_member_finance_immutable_audit_guards/migration.sql",
  "backend/prisma/migrations/20260913_payment_status_requires_finance_approval/migration.sql",
  "backend/prisma/migrations/20260913_payment_verification_queue/migration.sql",
  "backend/prisma/migrations/20260913_secure_audit_and_payment_tables/migration.sql",
  "backend/prisma/migrations/20260914_matrimonial_matching_privacy_v2/migration.sql",
]) {
  exists(file, `security migration retained: ${path.basename(path.dirname(file))}`);
}

exists("tests/auth-regression.cjs", "authentication regression test remains present");

if (failures.length) {
  console.error("\nLOCKED STABILITY/SECURITY CHECK FAILED\n");
  for (const item of failures) console.error(`  ✗ ${item}`);
  console.error(`\n${failures.length} locked invariant(s) failed. Do not merge or deploy until resolved.\n`);
  process.exit(1);
}

console.log(`PASS: ${passes.length} locked stability/security invariants.`);
