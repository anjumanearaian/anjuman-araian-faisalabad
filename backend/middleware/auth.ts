import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

function requireRoles(allowedRoles: string[], errorMessage: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret()) as any;
      if (!allowedRoles.includes(String(decoded.role || ""))) {
        res.status(403).json({ error: errorMessage });
        return;
      }
      (req as any).user = decoded;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

// Core administrative settings, leadership, messages and finance remain limited
// to full administrators. Scoped managers use the dedicated guards below.
export const requireAdmin = requireRoles(["admin", "super_admin"], "Admin access required");
export const requireContentAdmin = requireRoles(["admin", "super_admin", "content_manager"], "Content manager access required");
export const requireWelfareAdmin = requireRoles(["admin", "super_admin", "welfare_manager"], "Welfare manager access required");
export const requireSuperAdmin = requireRoles(["super_admin"], "Super Admin access required");
export const requireFinanceAdmin = requireRoles(["admin", "super_admin", "finance_secretary", "assistant_finance_secretary"], "Finance access required");

// Any signed-in member/applicant/admin token. Ownership checks remain the
// responsibility of the route that consumes this middleware.
export const requireMember = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7).trim(), getJwtSecret()) as any;
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
