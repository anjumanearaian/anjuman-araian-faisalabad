import path from "node:path";
import { fileURLToPath } from "node:url";

// backend/index.ts uses __dirname for its local-development upload fallback.
// Define it before dynamically loading the ESM backend so Vercel can execute it safely.
(globalThis as any).__dirname = path.dirname(
  fileURLToPath(new URL("../backend/index.js", import.meta.url))
);

const backendModule = await import("../backend/index.js");
const app =
  typeof backendModule.default === "function"
    ? backendModule.default
    : (backendModule as any);

export default app;
