import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Member } from "../lib/memberStore";

import { apiClient } from "../lib/apiClient";

interface MemberContextType {
  member: Member | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const MemberContext = createContext<MemberContextType>({
  member: null,
  login: async () => ({ ok: false }),
  logout: () => {},
  refresh: async () => {},
});

export function MemberProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiClient<{ token: string; member: Member }>("/members/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (data.token) {
        localStorage.setItem("araian_member_token", data.token);
        setMember(data.member);
        return { ok: true };
      }
      return { ok: false, error: "Invalid response from server" };
    } catch (e: any) {
      return { ok: false, error: e.message || "Invalid email or password." };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("araian_member_token");
    setMember(null);
  }, []);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("araian_member_token");
    if (!token) { setMember(null); return; }
    try {
      const data = await apiClient<Member>("/members/me");
      setMember(data);
    } catch (e) {
      setMember(null);
      localStorage.removeItem("araian_member_token");
    }
  }, []);

  return (
    <MemberContext.Provider value={{ member, login, logout, refresh }}>
      {children}
    </MemberContext.Provider>
  );
}

export const useMember = () => useContext(MemberContext);
