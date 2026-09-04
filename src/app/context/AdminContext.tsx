import { createContext, useContext, useState, ReactNode } from "react";

export type AdminRole = "super_admin" | "content_manager" | "welfare_manager";

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

export function AdminProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AdminRole | null>(() => {
    const saved = sessionStorage.getItem("araian_admin_role");
    return saved ? (saved as AdminRole) : null;
  });
  const isAdmin = !!role;

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password })
      });
      if (res.ok) {
        const data = await res.json();
        // Save token for future authenticated requests
        sessionStorage.setItem("araian_admin_token", data.token);
        setRole(data.user.role || "super_admin");
        sessionStorage.setItem("araian_admin_role", data.user.role || "super_admin");
        return true;
      }
    } catch (e) {
      console.error("Backend login failed:", e);
    }
    
    return false;
  };

  const logout = () => {
    setRole(null);
    sessionStorage.removeItem("araian_admin_role");
    sessionStorage.removeItem("araian_admin_token");
  };

  return <AdminContext.Provider value={{ isAdmin, role, login, logout }}>{children}</AdminContext.Provider>;
}

export const useAdmin = () => useContext(AdminContext);
