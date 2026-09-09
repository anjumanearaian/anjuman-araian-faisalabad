import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backendModule = require("../../../backend/dist/index.js");
const app = backendModule.default ?? backendModule;

export default app;
