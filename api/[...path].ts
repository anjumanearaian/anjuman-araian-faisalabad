import backendModule from "../backend/index.js";

const app =
  typeof backendModule === "function"
    ? backendModule
    : (backendModule as any).default;

export default app;
