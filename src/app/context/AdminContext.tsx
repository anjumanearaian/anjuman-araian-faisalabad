import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AdminRole = "admin" | "super_admin" | "content_manager" | "welfare_manager" | "finance_secretary" | "assistant_finance_secretary";

interface AdminContextType {
  isAdmin: boolean;
  role: AdminRole | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  role: null,
  login: async () => false,
  logout: () => {},
});

const ADMIN_ROLES: AdminRole[] = ["admin", "super_admin", "content_manager", "welfare_manager", "finance_secretary", "assistant_finance_secretary"];

function clearStoredAdminSession() {
  sessionStorage.removeItem("araian_admin_role");
  sessionStorage.removeItem("araian_admin_token");
}

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function restoreAdminRole(): AdminRole | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem("araian_admin_token");
  const saved = sessionStorage.getItem("araian_admin_role") as AdminRole | null;
  if (!token || !saved || !ADMIN_ROLES.includes(saved)) {
    clearStoredAdminSession();
    return null;
  }

  const payload = decodeJwtPayload(token);
  const expiresAt = Number(payload?.exp || 0) * 1000;
  if (!payload || !expiresAt || expiresAt <= Date.now() || !ADMIN_ROLES.includes(String(payload.role || "") as AdminRole)) {
    clearStoredAdminSession();
    return null;
  }
  return saved;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AdminRole | null>(() => restoreAdminRole());
  const isAdmin = !!role;

  useEffect(() => {
    const expire = () => {
      clearStoredAdminSession();
      setRole(null);
    };
    window.addEventListener("araian-admin-session-expired", expire);
    return () => window.removeEventListener("araian-admin-session-expired", expire);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email.trim().toLowerCase(), password })
      });
      if (res.ok) {
        const data = await res.json();
        const nextRole = String(data?.user?.role || "") as AdminRole;
        if (!data?.token || !ADMIN_ROLES.includes(nextRole)) {
          clearStoredAdminSession();
          return false;
        }
        sessionStorage.setItem("araian_admin_token", data.token);
        sessionStorage.setItem("araian_admin_role", nextRole);
        setRole(nextRole);
        return true;
      }
    } catch (e) {
      console.error("Backend login failed:", e);
    }

    return false;
  };

  const logout = () => {
    setRole(null);
    clearStoredAdminSession();
  };

  return <AdminContext.Provider value={{ isAdmin, role, login, logout }}>{children}</AdminContext.Provider>;
}

export const useAdmin = () => useContext(AdminContext);
