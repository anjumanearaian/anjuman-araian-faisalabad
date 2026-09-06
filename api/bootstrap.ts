import path from "node:path";
import { fileURLToPath } from "node:url";

// Provide a global __dirname before the backend module is evaluated.
// backend/index.ts uses __dirname only for its local upload fallback.
(globalThis as any).__dirname = path.dirname(
  fileURLToPath(new URL("../backend/index.ts", import.meta.url))
);
