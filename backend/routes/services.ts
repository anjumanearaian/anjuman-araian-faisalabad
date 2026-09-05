import { Router } from "express";

const router = Router();
router.get("/", (_req, res) => res.json([
  { id: "membership", title: "Membership", path: "/member/register" },
  { id: "matrimonial", title: "Matrimonial Services", path: "/matrimonial" },
  { id: "business", title: "Business Directory", path: "/business" },
  { id: "welfare", title: "Welfare Activities", path: "/news" },
  { id: "overseas", title: "Overseas Community", path: "/overseas" },
]));
export default router;
