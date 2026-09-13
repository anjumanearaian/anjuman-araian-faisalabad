import { CSSProperties, useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";

function isPrivateMatrimonialFile(src?: string | null) {
  return Boolean(src && src.startsWith("/api/matrimonial/private-file/"));
}

function requestUrl(src: string) {
  const endpoint = src.replace(/^\/api/, "");
  const path = endpoint.split("?")[0];
  const query = endpoint.includes("?") ? endpoint.slice(endpoint.indexOf("?") + 1) : "";
  const encoded = path.replace(/^\/+/, "").split("/").filter(Boolean).map(encodeURIComponent).join("__");
  return `/api/__proxy__${encoded}${query ? `?${query}` : ""}`;
}

function authToken() {
  if (typeof window === "undefined") return null;
  const isAdminPage = window.location.pathname.startsWith("/admin");
  const admin = sessionStorage.getItem("araian_admin_token");
  const member = localStorage.getItem("araian_member_token");
  return isAdminPage ? (admin || member) : (member || admin);
}

export function SecureMatrimonialImage({
  src,
  alt,
  style,
  className,
  placeholder = "Private image",
}: {
  src?: string | null;
  alt: string;
  style?: CSSProperties;
  className?: string;
  placeholder?: string;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const privateFile = isPrivateMatrimonialFile(src);

  useEffect(() => {
    setFailed(false);
    setObjectUrl(null);
    if (!src || !privateFile) return;
    const controller = new AbortController();
    let createdUrl: string | null = null;
    (async () => {
      try {
        const token = authToken();
        if (!token) throw new Error("Authentication required");
        const response = await fetch(requestUrl(src), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Private image access denied");
        const blob = await response.blob();
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      } catch (error: any) {
        if (error?.name !== "AbortError") setFailed(true);
      }
    })();
    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src, privateFile]);

  if (!src || failed || (privateFile && !objectUrl)) {
    return (
      <div className={className} style={{ ...style, display: "grid", placeItems: "center", background: "#f3f6f4", color: "#6b756e", textAlign: "center", overflow: "hidden" }} title={failed ? "Private image is not available to this session" : placeholder}>
        <div><LockKeyhole size={18}/><div style={{ fontSize: 8, marginTop: 3 }}>{failed ? "Private / locked" : placeholder}</div></div>
      </div>
    );
  }

  return <img className={className} src={privateFile ? objectUrl || undefined : src} alt={alt} style={style}/>;
}
