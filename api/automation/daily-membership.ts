import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const automationModule = require("../../backend/dist/serverless/memberAutomation.js");
const memberAutomation = automationModule.memberAutomation;

export default async function handler(req: any, res: any) {
  return memberAutomation(req, res);
}
