import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAdmin } from "../context/AdminContext";
import { Shield, Eye, EyeOff, LogOut, Newspaper, FileText, CalendarDays, CheckCircle, XCircle, Clock, Edit2, Trash2, Plus, X, ArrowRight, Users, UserCheck, UserX, AlertCircle, Briefcase, DollarSign, MessageCircle, Heart, Globe, Settings, Image as ImageIcon, Crown, Star, Upload, ChevronLeft, ChevronRight, Phone, Mail, PieChart, BarChart3, Settings2, LayoutDashboard, ShieldAlert } from "lucide-react";
import { fetchAllContent, createContent, updateContent, deleteContent, NewsItem, EventItem, statusColors, ContentStatus, paginateData } from "../lib/contentStore";
import { fetchAllMembers, updateMemberStatus, updateMember, deleteMember, statusColors as mStatusColors, Member, MemberStatus, MemberVisibility } from "../lib/memberStore";
import { fetchAllBusinesses, updateBusinessStatus, updateBusiness, deleteBusiness, businessStatusColors, paymentStatusColors, Business, BusinessStatus, PaymentStatus, sponsorshipPackages } from "../lib/businessStore";
import { fetchAllMatrimonials, updateMatrimonialStatus, updateMatrimonial, deleteMatrimonial, matrimonialStatusColors, MatrimonialProfile, MatrimonialStatus, MatrimonialPaymentStatus } from "../lib/matrimonialStore";
import { RichTextEditor } from "../components/ui/RichTextEditor";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { ImageModal } from "../components/ui/ImageModal";
import { getLeadershipProfiles, saveLeadershipProfiles, fetchLeadershipProfiles, fetchLeadershipMessages, createLeadershipProfile, updateLeadershipProfile, deleteLeadershipProfile, updateLeadershipMessage, LeadershipProfile } from "../lib/leadershipStore";
import { fetchMediaGallery, createMedia, updateMedia, deleteMedia, MediaItem } from "../lib/mediaStore";
import { fetchOverseasChapters, createOverseasChapter, updateOverseasChapter, deleteOverseasChapter, OverseasChapter } from "../lib/overseasStore";
import { getSiteSettings, saveSiteSettings, fetchSiteSettings, updateSiteSettings, SiteSettings, PaymentMethod, MembershipTier } from "../lib/settingsStore";
import { fetchAllMessages, updateMessageStatus, deleteMessage, MessageRequest, MessageStatus } from "../lib/messageStore";
import { getRevenueRecords, getProfitSharing, saveProfitSharing, RevenueRecord, ProfitSharingConfig, logRevenueRecord } from "../lib/revenueStore";
import { apiClient } from "../lib/apiClient";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

function StatusBadge({ status }: { status: ContentStatus }) {
  const s = statusColors[status];
  return (
    <span style={{ backgroundColor: s.bg, color: s.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      {status === "published" && <CheckCircle size={10} />}
      {status === "draft" && <Clock size={10} />}
      {status === "rejected" && <XCircle size={10} />}
      {s.label}
    </span>
  );
}

function actionBtn(color: string, subtle = false): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: subtle ? "#f5f5f5" : `${color}15`, color: subtle ? "#555" : color, border: `1px solid ${subtle ? "#e5e5e5" : `${color}40`}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Lato', sans-serif" };
}

// ── News mini-form ──────────────────────────────────────────────────────────
const blankNews = (): Omit<NewsItem, "id" | "createdAt" | "updatedAt"> => ({
  type: "news", title: "", date: new Date().toISOString().slice(0, 10), category: "Announcement", body: "", status: "draft",
  images: [] as string[]
});

// ── Events mini-form ────────────────────────────────────────────────────────
const blankEvent = (): Omit<EventItem, "id" | "createdAt" | "updatedAt"> => ({
  type: "event", title: "", date: "", time: "", location: "", category: "Meeting", desc: "", status: "draft",
  images: [] as string[]
});

// ── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen() {
  const { login } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      setError("");
      navigate("/admin");
    } else {
      setError("Invalid email or password. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#f8f5ef" }}>
      <div style={{ backgroundColor: "white", borderRadius: 16, padding: "48px 40px", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Shield size={32} color={GOLD} />
          </div>
          <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Admin Login</h2>
          <p style={{ color: "#888", fontSize: 14 }}>Anjuman-e-Araian Content Management</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Admin Email</label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} required placeholder="admin@example.com"
              style={{ width: "100%", padding: "12px 14px", border: `1px solid ${error ? "#dc2626" : "rgba(26,77,46,0.2)"}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: "'Lato', sans-serif" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Admin Password</label>
            <div style={{ position: "relative" }}>
              <input type={show ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} required placeholder="Enter admin password"
                style={{ width: "100%", padding: "12px 44px 12px 14px", border: `1px solid ${error ? "#dc2626" : "rgba(26,77,46,0.2)"}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: "'Lato', sans-serif" }} />
              <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{error}</p>}
          </div>
          <button type="submit" style={{ width: "100%", backgroundColor: GREEN, color: "white", border: "none", borderRadius: 8, padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Lato', sans-serif", letterSpacing: "0.06em" }}>
            Login
          </button>
        </form>
        <p style={{ color: "#bbb", fontSize: 12, textAlign: "center", marginTop: 20 }}>Admin access is restricted to authorized personnel only.</p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const { logout, role } = useAdmin();
  const navigate = useNavigate();
  const getInitialTab = () => {
    if (role === "welfare_manager") return "dashboard";
    return "dashboard";
  };
  const [tab, setTab] = useState<"dashboard" | "news" | "events" | "members" | "forms" | "businesses" | "matrimonial" | "leadership" | "media" | "overseas" | "settings" | "messages" | "analytics" | "admins">(getInitialTab as any);
  const [formDrafts, setFormDrafts] = useState<any[]>([]);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => { if (tab === "forms") apiClient<any[]>("/forms/admin/all").then(setFormDrafts).catch(() => setFormDrafts([])); }, [tab]);

  const importMembers = async (file?: File) => {
    if (!file) return;
    setImportMessage("Reading spreadsheet…");
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: "" });
      const result = await apiClient<{ imported: number; skipped: number }>("/members/import", { method: "POST", body: JSON.stringify({ rows }) });
      setImportMessage(`${result.imported} members imported${result.skipped ? `, ${result.skipped} skipped` : ""}.`); loadContent();
    } catch (error: any) { setImportMessage(error.message || "Import failed"); }
  };

  // Messages state
  const [messages, setMessages] = useState<MessageRequest[]>([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotalPages, setMessagesTotalPages] = useState(1);
  const [messageDateFilter, setMessageDateFilter] = useState("all");
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [viewingMessage, setViewingMessage] = useState<MessageRequest | null>(null);

  const loadMessages = async (page = 1) => {
    try {
      const res = await fetchAllMessages(page, adminLimit, messageDateFilter);
      setMessages(res.data);
      setMessagesTotalPages(res.totalPages);
    } catch (err) {}
  };

  useEffect(() => {
    setMessagesPage(1);
  }, [messageDateFilter]);

  useEffect(() => {
    if (tab === "messages") loadMessages(messagesPage);
  }, [tab, messagesPage, messageDateFilter]);

  const handleUpdateMessageStatus = async (id: string, status: MessageStatus) => {
    try {
      await updateMessageStatus(id, status);
      loadMessages(messagesPage);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (confirm("Delete this message permanently?")) {
      await deleteMessage(id);
      loadMessages(messagesPage);
    }
  };

  // News state
  const [news, setNews] = useState<NewsItem[]>([]);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newsForm, setNewsForm] = useState(blankNews());
  const [newsErr, setNewsErr] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);

  // Events state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [eventForm, setEventForm] = useState(blankEvent());
  const [eventErr, setEventErr] = useState("");
  const [eventLoading, setEventLoading] = useState(false);

  // API Data Fetching
  const loadContent = async () => {
    try {
      const newsRes = await fetchAllContent("news", 1, 100, true);
      setNews(newsRes.data as NewsItem[]);
      const eventsRes = await fetchAllContent("event", 1, 100, true);
      setEvents(eventsRes.data as EventItem[]);
      const membersRes = await fetchAllMembers(1, 100);
      setMembers(membersRes.data);
      const bizRes = await fetchAllBusinesses(1, 100, true);
      // @ts-ignore
      setBusinesses(bizRes.data);
      const matRes = await fetchAllMatrimonials(1, 100, true);
      // @ts-ignore
      setMatrimonials(matRes.data);
    } catch (e) {
      console.error("Failed to fetch content", e);
    }
  };

  useEffect(() => {
    if (tab === "news" || tab === "events" || tab === "members" || tab === "businesses" || tab === "matrimonial") {
      loadContent();
    }
  }, [tab]);

  const openAddNews = () => { setEditingNews(null); setNewsForm(blankNews()); setNewsErr(""); setShowNewsForm(true); };
  const openEditNews = (item: NewsItem) => { setEditingNews(item); setNewsForm({ type: "news", title: item.title, date: item.date, category: item.category, body: item.body, status: item.status, images: item.images || [] }); setNewsErr(""); setShowNewsForm(true); };
  const submitNews = async () => {
    if (!newsForm.title || !newsForm.body) { setNewsErr("Title and content are required."); return; }
    setNewsLoading(true);
    try {
      if (editingNews) {
        await updateContent(editingNews.id, newsForm as any);
      } else {
        await createContent({ ...newsForm, type: "news" } as any);
      }
      setShowNewsForm(false); setEditingNews(null); setNewsErr("");
      loadContent();
    } catch (e: any) { setNewsErr(e.message); }
    finally { setNewsLoading(false); }
  };
  const setNewsStatus = async (id: string, status: ContentStatus) => {
    await updateContent(id, { status });
    loadContent();
  };
  const delNews = async (id: string) => {
    if (confirm("Delete permanently?")) {
      await deleteContent(id);
      loadContent();
    }
  };

  // Events helpers
  const openAddEvent = () => { setEditingEvent(null); setEventForm(blankEvent()); setEventErr(""); setShowEventForm(true); };
  const openEditEvent = (item: EventItem) => { setEditingEvent(item); setEventForm({ type: "event", title: item.title, date: item.date, time: item.time || "", location: item.location || "", category: item.category, desc: item.desc, status: item.status, images: item.images || [] }); setEventErr(""); setShowEventForm(true); };
  const submitEvent = async () => {
    if (!eventForm.title || !eventForm.date || !eventForm.location) { setEventErr("Title, Date and Location are required."); return; }
    setEventLoading(true);
    try {
      if (editingEvent) {
        await updateContent(editingEvent.id, eventForm as any);
      } else {
        await createContent({ ...eventForm, type: "event" } as any);
      }
      setShowEventForm(false); setEditingEvent(null); setEventErr("");
      loadContent();
    } catch (e: any) { setEventErr(e.message); }
    finally { setEventLoading(false); }
  };
  const setEventStatus = async (id: string, status: ContentStatus) => {
    await updateContent(id, { status });
    loadContent();
  };
  const delEvent = async (id: string) => {
    if (confirm("Delete permanently?")) {
      await deleteContent(id);
      loadContent();
    }
  };

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [memberStatusFilter, setMemberStatusFilter] = useState<"all" | MemberStatus>("pending");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const approveMember = async (id: string) => {
    try {
      await updateMemberStatus(id, "approved");
      // Add a revenue log for membership fee (if applicable)
      const m = members.find((x) => x.id === id);
      if (m) {
        const settings = getSiteSettings();
        const tier = settings.membershipTiers?.find((t) => t.type === m.membershipType);
        if (tier) {
          logRevenueRecord({ customerName: m.fullName, itemType: "membership", itemName: tier.name, feeString: tier.fee });
        }
      }
      loadContent();
    } catch (e) {
      console.error("Approve failed", e);
    }
  };

  const rejectMember = async (id: string) => {
    try {
      await updateMemberStatus(id, "rejected", rejectReason);
      setRejectReason(""); setSelectedMember(null);
      loadContent();
    } catch (e) {
      console.error("Reject failed", e);
    }
  };

  const setMemberStatus = async (id: string, status: MemberStatus) => {
    await updateMemberStatus(id, status);
    loadContent();
  };



  const toggleFeatureMember = async (id: string) => {
    const m = members.find(x => x.id === id);
    if (m) {
      setMembers(prev => prev.map(p => p.id === id ? { ...p, isFeatured: !m.isFeatured } : p));
      try {
        await updateMember(id, { isFeatured: !m.isFeatured });
      } catch(e) {
        setMembers(prev => prev.map(p => p.id === id ? { ...p, isFeatured: m.isFeatured } : p));
        console.error("Failed to toggle member isFeatured", e);
      }
    }
  };

  const toggleShowOnPortal = async (id: string) => {
    const m = members.find(x => x.id === id);
    if (!m) return;
    try {
      setMembers(prev => prev.map(p => p.id === id ? { ...p, showOnPortal: !m.showOnPortal } : p));
      await updateMember(id, { showOnPortal: !m.showOnPortal });
    } catch (e) {
      setMembers(prev => prev.map(p => p.id === id ? { ...p, showOnPortal: m.showOnPortal } : p));
      console.error("Failed to toggle showOnPortal", e);
    }
  };

  const toggleShowOnWeb = async (id: string) => {
    const m = members.find(x => x.id === id);
    if (!m) return;
    try {
      setMembers(prev => prev.map(p => p.id === id ? { ...p, showOnWeb: !m.showOnWeb } : p));
      await updateMember(id, { showOnWeb: !m.showOnWeb });
    } catch (e) {
      setMembers(prev => prev.map(p => p.id === id ? { ...p, showOnWeb: m.showOnWeb } : p));
      console.error("Failed to toggle showOnWeb", e);
    }
  };

  const toggleFeaturePortalMember = async (id: string) => {
    const m = members.find(x => x.id === id);
    if (m) {
      setMembers(prev => prev.map(p => p.id === id ? { ...p, isFeaturedPortal: !m.isFeaturedPortal } : p));
      try {
        await updateMember(id, { isFeaturedPortal: !m.isFeaturedPortal });
      } catch(e) {
        setMembers(prev => prev.map(p => p.id === id ? { ...p, isFeaturedPortal: m.isFeaturedPortal } : p));
        console.error("Failed to toggle member isFeaturedPortal", e);
      }
    }
  };

  const saveAdminNote = async (id: string) => {
    await updateMemberStatus(id, members.find(m => m.id === id)?.status || "pending", undefined, adminNote);
    setAdminNote(""); setSelectedMember(null);
    loadContent();
  };

  const delMember = async (id: string) => {
    if (confirm("Permanently delete this member?")) {
      await deleteMember(id);
      loadContent();
    }
  };

  // Businesses state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessStatusFilter, setBusinessStatusFilter] = useState<"all" | BusinessStatus>("pending");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [viewingBusiness, setViewingBusiness] = useState<Business | null>(null);
  const [businessRejectReason, setBusinessRejectReason] = useState("");
  const [businessLoadingId, setBusinessLoadingId] = useState<string | null>(null);

  const approveBusiness = async (id: string) => {
    setBusinessLoadingId(id);
    try {
      await updateBusinessStatus(id, "approved", "verified");
      const b = businesses.find((x) => x.id === id);
      if (b) {
        const pkg = sponsorshipPackages[b.sponsorshipPackage];
        if (pkg) {
          await logRevenueRecord({ customerName: b.businessName, itemType: "business_sponsorship", itemName: pkg.name, feeString: pkg.price });
        }
      }
      await loadContent();
    } catch (e) {
      console.error("Failed to approve business", e);
    } finally {
      setBusinessLoadingId(null);
    }
  };

  const rejectBusiness = async (id: string) => {
    setBusinessLoadingId(id);
    try {
      await updateBusinessStatus(id, "rejected", undefined, businessRejectReason);
      setBusinessRejectReason(""); setSelectedBusiness(null);
      await loadContent();
    } catch (e) {
      console.error("Failed to reject business", e);
    } finally {
      setBusinessLoadingId(null);
    }
  };

  const setBusinessPaymentStatus = async (id: string, paymentStatus: PaymentStatus) => {
    setBusinessLoadingId(id);
    try {
      await updateBusinessStatus(id, businesses.find(b => b.id === id)?.status || "pending", paymentStatus);
      await loadContent();
    } finally {
      setBusinessLoadingId(null);
    }
  };

  const delBusiness = async (id: string) => {
    if (confirm("Permanently delete this business?")) {
      setBusinessLoadingId(id);
      try {
        await deleteBusiness(id);
        await loadContent();
      } finally {
        setBusinessLoadingId(null);
      }
    }
  };

  // Matrimonial state
  const [matrimonials, setMatrimonials] = useState<MatrimonialProfile[]>([]);
  const [matrimonialStatusFilter, setMatrimonialStatusFilter] = useState<"all" | MatrimonialStatus>("pending");
  const [selectedMatrimonial, setSelectedMatrimonial] = useState<MatrimonialProfile | null>(null);
  const [viewingMatrimonial, setViewingMatrimonial] = useState<MatrimonialProfile | null>(null);
  const [matrimonialRejectReason, setMatrimonialRejectReason] = useState("");

  const toggleMatrimonialPortalShow = async (id: string) => {
    const m = matrimonials.find(x => x.id === id);
    if (m) {
      setMatrimonials(prev => prev.map(p => p.id === id ? { ...p, showOnPortal: !m.showOnPortal } : p));
      try {
        await updateMatrimonial(id, { showOnPortal: !m.showOnPortal });
      } catch (e) {
        setMatrimonials(prev => prev.map(p => p.id === id ? { ...p, showOnPortal: m.showOnPortal } : p)); // revert on error
        console.error("Failed to toggle showOnPortal", e);
      }
    }
  };

  const toggleMatrimonialFeature = async (id: string) => {
    const m = matrimonials.find(x => x.id === id);
    if (m) {
      setMatrimonials(prev => prev.map(p => p.id === id ? { ...p, isFeatured: !m.isFeatured } : p));
      try {
        await updateMatrimonial(id, { isFeatured: !m.isFeatured });
      } catch (e) {
        setMatrimonials(prev => prev.map(p => p.id === id ? { ...p, isFeatured: m.isFeatured } : p)); // revert on error
        console.error("Failed to toggle isFeatured", e);
      }
    }
  };

  const delMatrimonial = async (id: string) => {
    if (confirm("Permanently delete this matrimonial profile?")) {
      await deleteMatrimonial(id);
      loadContent();
    }
  };

  const approveMatrimonial = async (id: string) => {
    try {
      await updateMatrimonialStatus(id, "approved", "verified");
      const m = matrimonials.find((x) => x.id === id);
      if (m) {
        await logRevenueRecord({ customerName: m.name, itemType: "matrimonial_featured", itemName: "Profile Submission", feeString: "Rs. 2,000" });
      }
      loadContent();
    } catch (e) {
      console.error("Failed to approve matrimonial", e);
    }
  };

  const rejectMatrimonial = async (id: string) => {
    try {
      await updateMatrimonialStatus(id, "rejected", undefined, matrimonialRejectReason);
      setMatrimonialRejectReason(""); setSelectedMatrimonial(null);
      loadContent();
    } catch (e) {
      console.error("Failed to reject matrimonial", e);
    }
  };

  const setMatrimonialPaymentStatus = async (id: string, paymentStatus: MatrimonialPaymentStatus) => {
    await updateMatrimonialStatus(id, matrimonials.find(m => m.id === id)?.status || "pending", paymentStatus);
    loadContent();
  };

// Pagination configuration
const adminLimit = 10;
const [newsPage, setNewsPage] = useState(1);
const [eventsPage, setEventsPage] = useState(1);
const [membersPage, setMembersPage] = useState(1);
const [businessesPage, setBusinessesPage] = useState(1);
const [matrimonialsPage, setMatrimonialsPage] = useState(1);

// Reset pagination when active filter categories change
useEffect(() => { setNewsPage(1); }, [news.length]);
useEffect(() => { setEventsPage(1); }, [events.length]);
useEffect(() => { setMembersPage(1); }, [memberStatusFilter]);
useEffect(() => { setBusinessesPage(1); }, [businessStatusFilter]);
useEffect(() => { setMatrimonialsPage(1); }, [matrimonialStatusFilter]);


// Memoized collections
const sortedNews = useMemo(() => {
  return [...news].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}, [news]);
const paginatedNews = useMemo(() => {
  return paginateData(sortedNews, newsPage, adminLimit);
}, [sortedNews, newsPage]);

const sortedEvents = useMemo(() => {
  return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}, [events]);
const paginatedEvents = useMemo(() => {
  return paginateData(sortedEvents, eventsPage, adminLimit);
}, [sortedEvents, eventsPage]);

const filteredMembers = useMemo(() => {
  return members
    .filter((m) => memberStatusFilter === "all" || m.status === memberStatusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}, [members, memberStatusFilter]);
const paginatedMembers = useMemo(() => {
  return paginateData(filteredMembers, membersPage, adminLimit);
}, [filteredMembers, membersPage]);

const filteredBusinesses = useMemo(() => {
  return businesses
    .filter((b) => businessStatusFilter === "all" || b.status === businessStatusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}, [businesses, businessStatusFilter]);
const paginatedBusinesses = useMemo(() => {
  return paginateData(filteredBusinesses, businessesPage, adminLimit);
}, [filteredBusinesses, businessesPage]);

const filteredMatrimonials = useMemo(() => {
  return matrimonials
    .filter((m) => matrimonialStatusFilter === "all" || m.status === matrimonialStatusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}, [matrimonials, matrimonialStatusFilter]);
const paginatedMatrimonials = useMemo(() => {
  return paginateData(filteredMatrimonials, matrimonialsPage, adminLimit);
}, [filteredMatrimonials, matrimonialsPage]);



const stats = [
  { icon: Newspaper, label: "Total News", value: news.length, sub: `${news.filter((n) => n.status === "published").length} published` },
  { icon: CalendarDays, label: "Total Events", value: events.length, sub: `${events.filter((e) => e.status === "published").length} published` },
  { icon: Users, label: "Total Members", value: members.length, sub: `${members.filter((m) => m.status === "approved").length} approved` },
  { icon: Briefcase, label: "Total Businesses", value: businesses.length, sub: `${businesses.filter((b) => b.status === "pending").length} pending approval` },
  { icon: MessageCircle, label: "Total Messages", value: messages.length, sub: `${messages.filter((m) => m.status === "unread").length} unread` },
];

return (
  <div style={{ display: "flex", backgroundColor: "#f8f5ef", minHeight: "100vh" }}>
    {/* Sidebar */}
    <aside style={{ width: 260, backgroundColor: "white", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", position: "fixed", height: "100vh", overflowY: "auto", zIndex: 10 }}>
      {/* Sidebar Header */}
      <div style={{ padding: "24px", backgroundColor: GREEN, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Shield size={18} color={GREEN} />
          </div>
          <div>
            <p style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Admin Panel</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
              {role?.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, paddingLeft: 12 }}>Menu</div>
        {(() => {
          const all = [
            ["dashboard", "Dashboard", <LayoutDashboard size={18} />],
            ["news", "News & Updates", <Newspaper size={18} />],
            ["events", "Events", <CalendarDays size={18} />],
            ["members", `Members ${members.filter((m) => m.status === "pending").length > 0 ? `(${members.filter((m) => m.status === "pending").length})` : ""}`, <Users size={18} />],
            ["forms", `Saved Forms ${formDrafts.filter((d) => d.status === "incomplete").length ? `(${formDrafts.filter((d) => d.status === "incomplete").length})` : ""}`, <FileText size={18} />],
            ["businesses", `Businesses ${businesses.filter((b) => b.status === "pending").length > 0 ? `(${businesses.filter((b) => b.status === "pending").length})` : ""}`, <Briefcase size={18} />],
            ["matrimonial", `Matrimonial ${matrimonials.filter((m) => m.status === "pending").length > 0 ? `(${matrimonials.filter((m) => m.status === "pending").length})` : ""}`, <Heart size={18} />],
            ["leadership", "Leadership", <Crown size={18} />],
            ["media", "Media Gallery", <ImageIcon size={18} />],
            ["overseas", "Overseas Chapters", <Globe size={18} />],
            ["settings", "Site Settings", <Settings size={18} />],
            ["analytics", "Revenue Analytics", <BarChart3 size={18} />],
            ["messages", `Messages ${messages.filter((m) => m.status === "unread").length > 0 ? `(${messages.filter((m) => m.status === "unread").length})` : ""}`, <MessageCircle size={18} />],
            ["admins", "Admin Users", <ShieldAlert size={18} />],
          ] as const;

          const allowed = role === "content_manager"
            ? all.filter(([t]) => t === "dashboard" || t === "news" || t === "events" || t === "media")
            : role === "welfare_manager"
              ? all.filter(([t]) => t === "dashboard" || t === "members" || t === "forms" || t === "businesses" || t === "matrimonial")
              : all;

          return allowed.map(([t, label, icon]) => (
            <button 
              key={t} 
              onClick={() => setTab(t as any)} 
              style={{ 
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, border: "none", cursor: "pointer", 
                backgroundColor: tab === t ? "#f0f7f3" : "transparent", 
                color: tab === t ? GREEN : "#555", 
                fontWeight: tab === t ? 700 : 600, 
                fontSize: 14, fontFamily: "'Lato', sans-serif", position: "relative", textAlign: "left", transition: "all 0.2s" 
              }}
            >
              <div style={{ color: tab === t ? GREEN : "#888", display: "flex" }}>{icon}</div>
              {label}
              
              {t === "members" && members.filter((m) => m.status === "pending").length > 0 && (
                <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 16, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              )}
              {t === "businesses" && businesses.filter((b) => b.status === "pending").length > 0 && (
                <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 16, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              )}
              {t === "matrimonial" && matrimonials.filter((m) => m.status === "pending").length > 0 && (
                <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 16, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              )}
              {t === "messages" && messages.filter((m) => m.status === "unread").length > 0 && (
                <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 16, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              )}
            </button>
          ));
        })()}
      </nav>

      {/* Sidebar Footer */}
      <div style={{ padding: "20px 24px", borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={() => { logout(); window.location.href = "/"; }} style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%", justifyContent: "center" }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>

    {/* Main Content Area */}
    <main style={{ flex: 1, marginLeft: 260, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      
      {/* Top Header */}
      <header style={{ backgroundColor: "white", padding: "18px 32px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 5 }}>
        <h1 style={{ color: "#333", fontSize: 18, fontWeight: 700, margin: 0, textTransform: "capitalize" }}>
          {tab === "dashboard" ? "Dashboard Overview" : tab.replace("-", " ")}
        </h1>
        <div style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>
          Welcome back, {role?.replace("_", " ")}
        </div>
      </header>

      <div style={{ padding: "32px", flex: 1, maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        
        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>System Overview</h2>
              <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>A quick summary of the Anjuman-e-Araian platform.</p>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }} className="stats-grid">
              {stats.map(({ icon: Icon, label, value, sub }) => (
                <div key={label} style={{ backgroundColor: "white", borderRadius: 12, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", borderTop: `3px solid ${GOLD}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#f0f7f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} color={GREEN} />
                    </div>
                    <span style={{ color: "#888", fontSize: 13, fontWeight: 600 }}>{label}</span>
                  </div>
                  <div style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{value}</div>
                  <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* ── NEWS TAB ── */}
      {tab === "news" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
              News and Announcements <span style={{ color: "#aaa", fontSize: 16, fontWeight: 400 }}>({news.length})</span>
            </h2>
            <button onClick={openAddNews} style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: GREEN, color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              <Plus size={16} /> Add Article
            </button>
          </div>

          <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f5ef" }}>
                  {["Title", "Category", "Date", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedNews.data.map((item, i) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                    <td style={{ padding: "14px 16px", maxWidth: 320 }}>
                      <p style={{ color: GREEN, fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{item.title}</p>
                      <p style={{ color: "#aaa", fontSize: 12, margin: "3px 0 0" }}>{item.body.slice(0, 60)}…</p>
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>{item.category}</span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#666", fontSize: 13, whiteSpace: "nowrap" }}>{new Date(item.date).toLocaleDateString()}</td>
                    <td style={{ padding: "14px 16px" }}><StatusBadge status={item.status} /></td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                        <button onClick={() => openEditNews(item)} style={actionBtn("#3b82f6")} title="Edit"><Edit2 size={12} /></button>
                        {item.status !== "published" && <button onClick={() => setNewsStatus(item.id, "published")} style={actionBtn("#15803d")} title="Publish"><CheckCircle size={12} /></button>}
                        {item.status === "published" && <button onClick={() => setNewsStatus(item.id, "draft")} style={actionBtn("#854d0e")} title="Unpublish"><EyeOff size={12} /></button>}
                        {item.status !== "rejected" && <button onClick={() => setNewsStatus(item.id, "rejected")} style={actionBtn("#b91c1c")} title="Reject"><XCircle size={12} /></button>}
                        {item.status === "rejected" && <button onClick={() => setNewsStatus(item.id, "draft")} style={actionBtn("#854d0e")} title="Restore to Draft"><Clock size={12} /></button>}
                        <button onClick={() => delNews(item.id)} style={actionBtn("#6b7280", true)} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {news.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>No articles yet. Add one above.</div>}
            {paginatedNews.totalPages > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: "1px solid #f5f5f5", fontFamily: "'Lato', sans-serif" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Showing page {newsPage} of {paginatedNews.totalPages}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={newsPage === 1} onClick={() => setNewsPage(p => Math.max(p - 1, 1))} style={actionBtn(GREEN, newsPage === 1)}><ChevronLeft size={14} /> Prev</button>
                  <button disabled={!paginatedNews.hasMore} onClick={() => setNewsPage(p => Math.min(p + 1, paginatedNews.totalPages))} style={actionBtn(GREEN, !paginatedNews.hasMore)}>Next <ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EVENTS TAB ── */}
      {tab === "events" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
              Events <span style={{ color: "#aaa", fontSize: 16, fontWeight: 400 }}>({events.length})</span>
            </h2>
            <button onClick={openAddEvent} style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: GREEN, color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              <Plus size={16} /> Add Event
            </button>
          </div>

          <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f5ef" }}>
                  {["Title", "Date / Time", "Location", "Category", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.data.map((ev, i) => (
                  <tr key={ev.id} style={{ borderTop: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                    <td style={{ padding: "14px 16px", maxWidth: 240 }}>
                      <p style={{ color: GREEN, fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{ev.title}</p>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#666", fontSize: 13, whiteSpace: "nowrap" }}>
                      <div>{new Date(ev.date).toLocaleDateString()}</div>
                      {ev.time && <div style={{ color: "#aaa", fontSize: 12 }}>{ev.time}</div>}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#666", fontSize: 13, maxWidth: 180 }}>{ev.location}</td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>{ev.category}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}><StatusBadge status={ev.status} /></td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEditEvent(ev)} style={actionBtn("#3b82f6")} title="Edit"><Edit2 size={12} /></button>
                        {ev.status !== "published" && <button onClick={() => setEventStatus(ev.id, "published")} style={actionBtn("#15803d")} title="Publish"><CheckCircle size={12} /></button>}
                        {ev.status === "published" && <button onClick={() => setEventStatus(ev.id, "draft")} style={actionBtn("#854d0e")} title="Unpublish"><EyeOff size={12} /></button>}
                        {ev.status !== "rejected" && <button onClick={() => setEventStatus(ev.id, "rejected")} style={actionBtn("#b91c1c")} title="Reject"><XCircle size={12} /></button>}
                        {ev.status === "rejected" && <button onClick={() => setEventStatus(ev.id, "draft")} style={actionBtn("#854d0e")} title="Restore"><Clock size={12} /></button>}
                        <button onClick={() => delEvent(ev.id)} style={actionBtn("#6b7280", true)} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {events.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>No events yet. Add one above.</div>}
            {paginatedEvents.totalPages > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: "1px solid #f5f5f5", fontFamily: "'Lato', sans-serif" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Showing page {eventsPage} of {paginatedEvents.totalPages}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={eventsPage === 1} onClick={() => setEventsPage(p => Math.max(p - 1, 1))} style={actionBtn(GREEN, eventsPage === 1)}><ChevronLeft size={14} /> Prev</button>
                  <button disabled={!paginatedEvents.hasMore} onClick={() => setEventsPage(p => Math.min(p + 1, paginatedEvents.totalPages))} style={actionBtn(GREEN, !paginatedEvents.hasMore)}>Next <ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MEMBERS TAB ── */}
      {tab === "members" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
              Member Registrations <span style={{ color: "#aaa", fontSize: 16, fontWeight: 400 }}>({members.length})</span>
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ ...actionBtn(GREEN), padding: "7px 13px" }}><Upload size={14} /> Import Excel / CSV<input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { void importMembers(e.target.files?.[0]); e.target.value = ""; }} /></label>
              {(["all", "pending", "approved", "rejected", "inactive"] as const).map((s) => {
                const count = s === "all" ? members.length : members.filter((m) => m.status === s).length;
                const sc = s !== "all" ? mStatusColors[s] : null;
                return (
                  <button key={s} onClick={() => setMemberStatusFilter(s)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${memberStatusFilter === s ? GREEN : "#ddd"}`, cursor: "pointer", backgroundColor: memberStatusFilter === s ? GREEN : "white", color: memberStatusFilter === s ? "white" : "#555", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
                    {s === "all" ? "All" : s} ({count})
                  </button>
                );
              })}
            </div>
          </div>
          {importMessage && <p style={{ background: "#f0f7f3", color: GREEN, padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{importMessage}</p>}

          <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif", minWidth: 900 }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f5ef" }}>
                  {["Member", "Contact", "Location", "Type", "Status", "Web View", "Portal View", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "14px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.data.map((m, i) => {
                  const sc = mStatusColors[m.status];
                  return (
                    <tr key={m.id} style={{ borderTop: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {m.photoUrl
                            ? <img src={m.photoUrl} alt={m.fullName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            : <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#f0f7f3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: GREEN, fontWeight: 700, fontSize: 14 }}>{m.fullName[0]}</span></div>
                          }
                          <div>
                            <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, margin: 0 }}>{m.fullName}</p>
                            <p style={{ color: "#aaa", fontSize: 11, margin: "2px 0 0" }}>CNIC: {m.cnic}</p>
                            {m.memberNo && <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, margin: "2px 0 0" }}>{m.memberNo}</p>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 12, color: "#444", margin: 0 }}>{m.email}</p>
                        <p style={{ fontSize: 12, color: "#888", margin: "3px 0 0" }}>{m.phone}</p>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#555" }}>{m.city}, {m.province}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8, textTransform: "capitalize" }}>{m.membershipType}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{sc.label}</span>
                        {m.status === "rejected" && m.rejectionReason && (
                          <p style={{ color: "#b91c1c", fontSize: 11, margin: "4px 0 0", maxWidth: 140 }}>{m.rejectionReason}</p>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <button
                            onClick={() => toggleShowOnWeb(m.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", backgroundColor: m.showOnWeb ? "#dcfce7" : "#f3f4f6", color: m.showOnWeb ? "#15803d" : "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            {m.showOnWeb ? <><Eye size={11} /> Show Web</> : <><EyeOff size={11} /> Hide Web</>}
                          </button>
                          <button
                            onClick={() => toggleFeatureMember(m.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", backgroundColor: m.isFeatured ? "#fef9c3" : "#f3f4f6", color: m.isFeatured ? "#a16207" : "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            <Star size={11} fill={m.isFeatured ? "#c8a04a" : "none"} color={m.isFeatured ? "#c8a04a" : "#6b7280"} /> {m.isFeatured ? "Web Featured" : "Web Std"}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <button
                            onClick={() => toggleShowOnPortal(m.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", backgroundColor: m.showOnPortal ? "#dcfce7" : "#f3f4f6", color: m.showOnPortal ? "#15803d" : "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            {m.showOnPortal ? <><Eye size={11} /> Show Portal</> : <><EyeOff size={11} /> Hide Portal</>}
                          </button>
                          <button
                            onClick={() => toggleFeaturePortalMember(m.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", backgroundColor: m.isFeaturedPortal ? "#fef9c3" : "#f3f4f6", color: m.isFeaturedPortal ? "#a16207" : "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            <Star size={11} fill={m.isFeaturedPortal ? "#c8a04a" : "none"} color={m.isFeaturedPortal ? "#c8a04a" : "#6b7280"} /> {m.isFeaturedPortal ? "Portal Featured" : "Portal Std"}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button onClick={() => setViewingMember(m)} style={actionBtn("#6366f1")} title="View Details"><Eye size={12} /> View</button>
                          {m.status === "pending" && <>
                            <button onClick={() => approveMember(m.id)} style={actionBtn("#15803d")} title="Approve"><UserCheck size={12} /> Approve</button>
                            <button onClick={() => { setSelectedMember(m); setRejectReason(""); }} style={actionBtn("#b91c1c")} title="Reject"><UserX size={12} /> Reject</button>
                          </>}
                          {m.status === "approved" && <>
                            <button onClick={() => setMemberStatus(m.id, "inactive")} style={actionBtn("#854d0e")} title="Deactivate"><EyeOff size={12} /> Deactivate</button>
                          </>}
                          {m.status === "inactive" && <button onClick={() => setMemberStatus(m.id, "approved")} style={actionBtn("#15803d")} title="Reactivate"><CheckCircle size={12} /> Reactivate</button>}
                          {m.status === "rejected" && <button onClick={() => setMemberStatus(m.id, "pending")} style={actionBtn("#854d0e")} title="Re-review"><Clock size={12} /> Re-review</button>}
                          <button onClick={() => delMember(m.id)} style={actionBtn("#6b7280", true)} title="Delete"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredMembers.length === 0 && (
              <div style={{ textAlign: "center", padding: 48, color: "#aaa" }}>No members in this category.</div>
            )}
            {paginatedMembers.totalPages > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: "1px solid #f5f5f5", fontFamily: "'Lato', sans-serif" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Showing page {membersPage} of {paginatedMembers.totalPages}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={membersPage === 1} onClick={() => setMembersPage(p => Math.max(p - 1, 1))} style={actionBtn(GREEN, membersPage === 1)}><ChevronLeft size={14} /> Prev</button>
                  <button disabled={!paginatedMembers.hasMore} onClick={() => setMembersPage(p => Math.min(p + 1, paginatedMembers.totalPages))} style={actionBtn(GREEN, !paginatedMembers.hasMore)}>Next <ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "forms" && <div><div style={{ marginBottom: 20 }}><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, margin: 0 }}>Saved and Submitted Forms</h2><p style={{ color: "#666", fontSize: 14 }}>Incomplete forms remain visible here while applicants continue across multiple sessions.</p></div><div style={{ background: "white", borderRadius: 12, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr style={{ background: "#f8f5ef" }}>{["Applicant", "Form", "Progress", "Status", "Last Activity"].map(h => <th key={h} style={{ textAlign: "left", padding: 14, color: "#777", fontSize: 12 }}>{h}</th>)}</tr></thead><tbody>{formDrafts.map(d => <tr key={d.id} style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 14 }}><strong style={{ color: GREEN }}>{d.authUser?.name || "Applicant"}</strong><div style={{ fontSize: 12, color: "#777" }}>{d.authUser?.email}</div></td><td style={{ padding: 14, textTransform: "capitalize" }}>{d.formType}</td><td style={{ padding: 14 }}><div style={{ width: 140, background: "#e5e7eb", height: 8, borderRadius: 8 }}><div style={{ width: `${d.completion}%`, height: 8, borderRadius: 8, background: d.status === "submitted" ? "#15803d" : GOLD }} /></div><small>{d.completion}%</small></td><td style={{ padding: 14 }}><span style={{ background: d.status === "submitted" ? "#dcfce7" : "#fef9c3", color: d.status === "submitted" ? "#166534" : "#854d0e", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{d.status === "submitted" ? "Submitted" : "Incomplete"}</span></td><td style={{ padding: 14, color: "#666", fontSize: 13 }}>{new Date(d.updatedAt).toLocaleString()}</td></tr>)}</tbody></table>{!formDrafts.length && <div style={{ padding: 40, textAlign: "center", color: "#999" }}>No saved forms yet.</div>}</div></div>}

      {/* ── BUSINESSES TAB ── */}
      {tab === "businesses" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
              Business Directory Submissions <span style={{ color: "#aaa", fontSize: 16, fontWeight: 400 }}>({businesses.length})</span>
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["all", "pending", "approved", "rejected"] as const).map((s) => {
                const count = s === "all" ? businesses.length : businesses.filter((b) => b.status === s).length;
                return (
                  <button key={s} onClick={() => setBusinessStatusFilter(s)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${businessStatusFilter === s ? GREEN : "#ddd"}`, cursor: "pointer", backgroundColor: businessStatusFilter === s ? GREEN : "white", color: businessStatusFilter === s ? "white" : "#555", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
                    {s === "all" ? "All" : s} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif", minWidth: 900 }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f5ef" }}>
                  {["Business", "Owner/Contact", "Location", "Package", "Status", "Payment Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "14px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedBusinesses.data.map((b, i) => {
                  const sc = businessStatusColors[b.status];
                  const pc = paymentStatusColors[b.paymentStatus];
                  return (
                    <tr key={b.id} style={{ borderTop: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: "#f0f7f3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {b.logoUrl ? (
                              <img src={b.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                            ) : (
                              <Briefcase size={16} color={GREEN} />
                            )}
                          </div>
                          <div>
                            <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, margin: 0 }}>{b.businessName}</p>
                            <p style={{ color: "#aaa", fontSize: 11, margin: "2px 0 0" }}>Category: {b.category}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 12, color: "#444", margin: 0 }}>{b.ownerName}</p>
                        <p style={{ fontSize: 11, color: "#888", margin: "3px 0 0" }}>{b.phone}</p>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#555" }}>{b.city}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ backgroundColor: "#f8f5ef", color: GOLD, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8, textTransform: "capitalize", border: `1px solid ${GOLD}` }}>{b.sponsorshipPackage}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{sc.label}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ backgroundColor: pc.bg, color: pc.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{pc.label}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button onClick={() => setViewingBusiness(b)} style={actionBtn("#6366f1")} title="View Details"><Eye size={12} /> View</button>
                          {b.status === "pending" && (
                            <>
                              <button onClick={() => approveBusiness(b.id)} style={actionBtn("#15803d")} title="Approve"><UserCheck size={12} /> Approve</button>
                              <button onClick={() => { setSelectedBusiness(b); setBusinessRejectReason(""); }} style={actionBtn("#b91c1c")} title="Reject"><UserX size={12} /> Reject</button>
                            </>
                          )}
                          <button onClick={() => delBusiness(b.id)} style={actionBtn("#6b7280", true)} title="Delete"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredBusinesses.length === 0 && (
              <div style={{ textAlign: "center", padding: 48, color: "#aaa" }}>No business submissions in this category.</div>
            )}
            {paginatedBusinesses.totalPages > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: "1px solid #f5f5f5", fontFamily: "'Lato', sans-serif" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Showing page {businessesPage} of {paginatedBusinesses.totalPages}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={businessesPage === 1} onClick={() => setBusinessesPage(p => Math.max(p - 1, 1))} style={actionBtn(GREEN, businessesPage === 1)}><ChevronLeft size={14} /> Prev</button>
                  <button disabled={!paginatedBusinesses.hasMore} onClick={() => setBusinessesPage(p => Math.min(p + 1, paginatedBusinesses.totalPages))} style={actionBtn(GREEN, !paginatedBusinesses.hasMore)}>Next <ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── MATRIMONIAL TAB ── */}
      {tab === "matrimonial" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
              Matrimonial Submissions <span style={{ color: "#aaa", fontSize: 16, fontWeight: 400 }}>({matrimonials.length})</span>
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["all", "pending", "approved", "rejected"] as const).map((s) => {
                const count = s === "all" ? matrimonials.length : matrimonials.filter((m) => m.status === s).length;
                return (
                  <button key={s} onClick={() => setMatrimonialStatusFilter(s)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${matrimonialStatusFilter === s ? GREEN : "#ddd"}`, cursor: "pointer", backgroundColor: matrimonialStatusFilter === s ? GREEN : "white", color: matrimonialStatusFilter === s ? "white" : "#555", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
                    {s === "all" ? "All" : s} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif", minWidth: 900 }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f5ef" }}>
                  {["Candidate", "Details", "Location", "Status", "Show on Portal", "Featured", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "14px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedMatrimonials.data.map((m, i) => {
                  const sc = matrimonialStatusColors[m.status];
                  return (
                    <tr key={m.id} style={{ borderTop: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#f0f7f3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                            ) : (
                              <Heart size={16} color={GREEN} />
                            )}
                          </div>
                          <div>
                            <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, margin: 0 }}>{m.name}</p>
                            <p style={{ color: "#aaa", fontSize: 11, margin: "2px 0 0" }}>{m.gender}, {m.age} Years</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 12, color: "#444", margin: 0 }}>Edu: {m.education}</p>
                        <p style={{ fontSize: 11, color: "#888", margin: "3px 0 0" }}>Prof: {m.profession}</p>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#555" }}>{m.city}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{sc.label}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={() => toggleMatrimonialPortalShow(m.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", backgroundColor: m.showOnPortal ? "#dcfce7" : "#f3f4f6", color: m.showOnPortal ? "#15803d" : "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          {m.showOnPortal ? <><Eye size={11} /> Show</> : <><EyeOff size={11} /> Hide</>}
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={() => toggleMatrimonialFeature(m.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", backgroundColor: m.isFeatured ? "#fef9c3" : "#f3f4f6", color: m.isFeatured ? "#a16207" : "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          <Star size={11} fill={m.isFeatured ? "#c8a04a" : "none"} color={m.isFeatured ? "#c8a04a" : "#6b7280"} /> {m.isFeatured ? "Featured" : "Standard"}
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button onClick={() => setViewingMatrimonial(m)} style={actionBtn("#6366f1")} title="View Details"><Eye size={12} /> View</button>
                          {m.status === "pending" && (
                            <>
                              <button onClick={() => approveMatrimonial(m.id)} style={actionBtn("#15803d")} title="Approve"><UserCheck size={12} /> Approve</button>
                              <button onClick={() => { setSelectedMatrimonial(m); setMatrimonialRejectReason(""); }} style={actionBtn("#b91c1c")} title="Reject"><UserX size={12} /> Reject</button>
                            </>
                          )}
                          <button onClick={() => delMatrimonial(m.id)} style={actionBtn("#6b7280", true)} title="Delete"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredMatrimonials.length === 0 && (
              <div style={{ textAlign: "center", padding: 48, color: "#aaa" }}>No matrimonial inquiries in this category.</div>
            )}
            {paginatedMatrimonials.totalPages > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: "1px solid #f5f5f5", fontFamily: "'Lato', sans-serif" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Showing page {matrimonialsPage} of {paginatedMatrimonials.totalPages}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={matrimonialsPage === 1} onClick={() => setMatrimonialsPage(p => Math.max(p - 1, 1))} style={actionBtn(GREEN, matrimonialsPage === 1)}><ChevronLeft size={14} /> Prev</button>
                  <button disabled={!paginatedMatrimonials.hasMore} onClick={() => setMatrimonialsPage(p => Math.min(p + 1, paginatedMatrimonials.totalPages))} style={actionBtn(GREEN, !paginatedMatrimonials.hasMore)}>Next <ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Member detail modal ── */}
      {viewingMember && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
          <div style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            {/* Modal header */}
            <div style={{ backgroundColor: GREEN, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "16px 16px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {viewingMember.photoUrl
                  ? <img src={viewingMember.photoUrl} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: `3px solid ${GOLD}` }} />
                  : <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: GREEN, fontWeight: 700, fontSize: 22 }}>{viewingMember.fullName[0]}</span></div>
                }
                <div>
                  <p style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: 0 }}>{viewingMember.fullName}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {viewingMember.memberNo && <span style={{ backgroundColor: GOLD, color: "#1a1a1a", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{viewingMember.memberNo}</span>}
                    <span style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white", fontSize: 11, padding: "2px 8px", borderRadius: 10 }}>{viewingMember.membershipType} member</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingMember(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}><X size={22} /></button>
            </div>

            <div style={{ padding: "28px 28px" }}>
              {/* Personal */}
              <DetailSection title="Personal Information" items={[
                ["Full Name", viewingMember.fullName], ["Father's Name", viewingMember.fatherName],
                ["CNIC", viewingMember.cnic], ["Date of Birth", viewingMember.dob ? new Date(viewingMember.dob).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" }) : "—"],
                ["Gender", viewingMember.gender], ["Blood Group", viewingMember.bloodGroup],
              ]} />

              {/* Contact — including WhatsApp (admin only) */}
              <DetailSection title="Contact Information" badge="WhatsApp visible to admin only" items={[
                ["Email", viewingMember.email], ["Phone", viewingMember.phone],
                ["WhatsApp", viewingMember.whatsapp || viewingMember.phone],
                ["City", viewingMember.city], ["District", viewingMember.district],
                ["Province", viewingMember.province], ["Address", viewingMember.address],
              ]} />

              {/* WhatsApp quick-action */}
              {(viewingMember.whatsapp || viewingMember.phone) && (
                <div style={{ marginBottom: 24 }}>
                  <a
                    href={`https://wa.me/${(viewingMember.whatsapp || viewingMember.phone).replace(/\D/g, "")}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "#25D366", color: "white", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    Message on WhatsApp
                  </a>
                </div>
              )}

              {/* Professional */}
              <DetailSection title="Education and Occupation" items={[
                ["Education", viewingMember.education], ["Occupation", viewingMember.occupation],
              ]} />

              {/* Family Info */}
              {viewingMember.family && Object.values(viewingMember.family).some(Boolean) && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Family Information</p>
                    <span style={{ backgroundColor: "#fef9c3", color: "#854d0e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>🔒 Admin Only</span>
                  </div>
                  <div style={{ backgroundColor: "#f8f5ef", borderRadius: 10, padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      ["Spouse Name", viewingMember.family.spouseName],
                      ["Children", viewingMember.family.childrenCount ? `${viewingMember.family.childrenCount} child(ren)` : ""],
                      ["Children Details", viewingMember.family.childrenDetails],
                      ["Family Branch", viewingMember.family.familyBranch],
                      ["Family City", viewingMember.family.familyCity],
                      ["Family Contact", viewingMember.family.familyContactName],
                      ["Family Contact No.", viewingMember.family.familyContactNumber],
                      ["Emergency Contact", viewingMember.family.emergencyContactName],
                      ["Emergency No.", viewingMember.family.emergencyContactNumber],
                      ["Relationship", viewingMember.family.emergencyRelationship],
                    ].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label}>
                        <p style={{ color: "#aaa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>{label}</p>
                        <p style={{ color: "#1a1a1a", fontSize: 13, margin: "3px 0 0" }}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {(viewingMember.photoUrl || viewingMember.cnicFrontUrl || viewingMember.cnicBackUrl || viewingMember.paymentProofUrl) && (
                <div style={{ marginTop: 24, marginBottom: 20 }}>
                  <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Uploaded Documents</p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[
                      ["Photo", viewingMember.photoUrl],
                      ["CNIC Front", viewingMember.cnicFrontUrl],
                      ["CNIC Back", viewingMember.cnicBackUrl],
                      ["Payment Proof", viewingMember.paymentProofUrl]
                    ].filter(([, v]) => v).map(([label, src]) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <a onClick={(e) => { e.preventDefault(); setZoomImage(src as string); }} href="#" style={{ cursor: "pointer", display: "block" }}>
                          <img src={src as string} alt={label as string} style={{ width: 100, height: 80, objectFit: "cover", borderRadius: 8, display: "block", border: "1px solid #e5e7eb" }} />
                        </a>
                        <p style={{ color: "#888", fontSize: 11, marginTop: 4 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Photos */}
              {viewingMember.additionalPhotos && viewingMember.additionalPhotos.length > 0 && (
                <div style={{ marginTop: 20, marginBottom: 20 }}>
                  <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Additional Photos</p>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                    {viewingMember.additionalPhotos.map((src, i) => (
                      <a key={i} onClick={(e) => { e.preventDefault(); setZoomImage(src as string); }} href="#" style={{ cursor: "pointer", flexShrink: 0 }}>
                        <img src={src} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin note */}
              {viewingMember.adminNote && (
                <div style={{ marginTop: 20, padding: "12px 16px", backgroundColor: "#f0f7f3", borderRadius: 8, border: "1px solid rgba(26,77,46,0.1)" }}>
                  <p style={{ color: GREEN, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Admin Note</p>
                  <p style={{ color: "#555", fontSize: 13, margin: 0 }}>{viewingMember.adminNote}</p>
                </div>
              )}

              {/* Password Reset Section */}
              <div style={{ marginTop: 24, padding: "16px 20px", backgroundColor: "#fef9c3", borderRadius: 10, border: "1px solid rgba(200, 160, 74, 0.3)" }}>
                <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>Reset Member Password</p>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 6 }}>Set New Temporary Password</label>
                    <input
                      type="text"
                      id={`reset-pass-input-${viewingMember.id}`}
                      placeholder="e.g. TempPass123"
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const input = document.getElementById(`reset-pass-input-${viewingMember.id}`) as HTMLInputElement;
                      if (input && input.value) {
                        updateMember(viewingMember.id, { password: input.value }).then(() => {
                          loadContent();
                          alert(`Password reset successfully to: ${input.value}`);
                          input.value = "";
                        });
                      } else {
                        alert("Please type a new password first.");
                      }
                    }}
                    style={{ backgroundColor: GREEN, color: "white", border: "none", borderRadius: 6, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    Reset Password
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                {viewingMember.status === "pending" && (
                  <button onClick={() => { approveMember(viewingMember.id); setViewingMember(null); }} style={{ backgroundColor: "#15803d", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <UserCheck size={14} /> Approve Member
                  </button>
                )}
                <button onClick={() => setViewingMember(null)} style={{ backgroundColor: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject member modal ── */}
      {selectedMember && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: 32, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ color: "#b91c1c", fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Reject Application</h3>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>Rejecting application of: <strong>{selectedMember.fullName}</strong></p>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Reason for rejection (shown to applicant)</label>
            <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Incomplete documents, CNIC not matching..."
              style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.2)", borderRadius: 7, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "'Lato', sans-serif", marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => rejectMember(selectedMember.id)} style={{ flex: 1, backgroundColor: "#b91c1c", color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Confirm Rejection</button>
              <button onClick={() => setSelectedMember(null)} style={{ flex: 1, backgroundColor: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Business detail modal ── */}
      {viewingBusiness && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
          <div style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ backgroundColor: GREEN, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "16px 16px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {viewingBusiness.logoUrl ? (
                    <div onClick={() => setZoomImage(viewingBusiness.logoUrl || null)} style={{ cursor: "pointer", width: "100%", height: "100%" }}>
                      <img src={viewingBusiness.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                    </div>
                  ) : (
                    <Briefcase size={24} color={GREEN} />
                  )}
                </div>
                <div>
                  <p style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: 0 }}>{viewingBusiness.businessName}</p>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, margin: 0 }}>Category: {viewingBusiness.category} | Package: {viewingBusiness.sponsorshipPackage}</p>
                </div>
              </div>
              <button onClick={() => setViewingBusiness(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}><X size={22} /></button>
            </div>

            <div style={{ padding: "28px 28px" }}>
              <DetailSection title="Owner and Business Info" items={[
                ["Business Name", viewingBusiness.businessName], ["Owner Name", viewingBusiness.ownerName],
                ["Category", viewingBusiness.category], ["Sponsorship Package", viewingBusiness.sponsorshipPackage],
                ["Description", viewingBusiness.description], ["Products/Services", viewingBusiness.productsServices],
                ["Discount Offer for Members", viewingBusiness.discountOffer || "None"],
              ]} />

              <DetailSection title="Contact Info and Links" items={[
                ["Phone", viewingBusiness.phone], ["WhatsApp", viewingBusiness.whatsapp],
                ["Email", viewingBusiness.email], ["Website", viewingBusiness.website || "—"],
                ["Social Links", viewingBusiness.socialLinks || "—"],
                ["City", viewingBusiness.city], ["Address", viewingBusiness.address || "—"],
              ]} />

              {/* Payment Status Dropdown */}
              <div style={{ marginBottom: 24, backgroundColor: "#fcf8f0", padding: "16px 20px", borderRadius: 10, border: `1px solid rgba(200,160,74,0.2)` }}>
                <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>Payment Verification</p>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>Verify Payment Status</label>
                    <select
                      value={viewingBusiness.paymentStatus}
                      onChange={(e) => setBusinessPaymentStatus(viewingBusiness.id, e.target.value as PaymentStatus)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, fontFamily: "'Poppins', sans-serif" }}
                    >
                      <option value="pending">Pending</option>
                      <option value="received">Received</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  {viewingBusiness.paymentProofUrl && (
                    <div>
                      <p style={{ fontSize: 12, color: "#666", margin: "0 0 4px 0" }}>Receipt / Transfer Proof</p>
                      <a onClick={(e) => { e.preventDefault(); setZoomImage(viewingBusiness.paymentProofUrl || null); }} href="#" style={{ cursor: "pointer", display: "inline-block" }}>
                        <img src={viewingBusiness.paymentProofUrl} alt="Receipt Proof" style={{ height: 60, borderRadius: 6, border: "1px solid #ddd", display: "block" }} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin note */}
              {viewingBusiness.adminNote && (
                <div style={{ marginTop: 20, padding: "12px 16px", backgroundColor: "#fdf2f2", borderRadius: 8, border: "1px solid rgba(185,28,28,0.1)", marginBottom: 20 }}>
                  <p style={{ color: "#b91c1c", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Rejection Note</p>
                  <p style={{ color: "#555", fontSize: 13, margin: 0 }}>{viewingBusiness.adminNote}</p>
                </div>
              )}

              {/* Additional Photos */}
              {viewingBusiness.additionalPhotos && viewingBusiness.additionalPhotos.length > 0 && (
                <div style={{ marginTop: 20, marginBottom: 20 }}>
                  <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Additional Business Photos</p>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                    {viewingBusiness.additionalPhotos.map((src, i) => (
                      <a key={i} onClick={(e) => { e.preventDefault(); setZoomImage(src); }} href="#" style={{ cursor: "pointer", flexShrink: 0 }}>
                        <img src={src} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                {viewingBusiness.status === "pending" && (
                  <>
                    <button onClick={() => { approveBusiness(viewingBusiness.id); setViewingBusiness(null); }} style={{ backgroundColor: "#15803d", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <UserCheck size={14} /> Approve listing
                    </button>
                    <button onClick={() => { setSelectedBusiness(viewingBusiness); setViewingBusiness(null); setBusinessRejectReason(""); }} style={{ backgroundColor: "#b91c1c", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <UserX size={14} /> Reject listing
                    </button>
                  </>
                )}
                <button onClick={() => setViewingBusiness(null)} style={{ backgroundColor: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject business modal ── */}
      {selectedBusiness && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: 32, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ color: "#b91c1c", fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Reject Business Listing</h3>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>Rejecting: <strong>{selectedBusiness.businessName}</strong></p>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Reason for rejection</label>
            <textarea rows={3} value={businessRejectReason} onChange={(e) => setBusinessRejectReason(e.target.value)} placeholder="e.g. Invalid payment proof, inappropriate details..."
              style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.2)", borderRadius: 7, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "'Lato', sans-serif", marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => rejectBusiness(selectedBusiness.id)} style={{ flex: 1, backgroundColor: "#b91c1c", color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Confirm Rejection</button>
              <button onClick={() => setSelectedBusiness(null)} style={{ flex: 1, backgroundColor: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Matrimonial detail modal ── */}
      {viewingMatrimonial && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
          <div style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ backgroundColor: GREEN, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "16px 16px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {viewingMatrimonial.photoUrl ? (
                    <div onClick={() => setZoomImage(viewingMatrimonial.photoUrl || null)} style={{ cursor: "pointer", width: "100%", height: "100%" }}>
                      <img src={viewingMatrimonial.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    </div>
                  ) : (
                    <Heart size={24} color={GREEN} />
                  )}
                </div>
                <div>
                  <p style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: 0 }}>{viewingMatrimonial.name}</p>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, margin: 0 }}>Matrimonial Candidate ({viewingMatrimonial.gender}, {viewingMatrimonial.age} Years)</p>
                </div>
              </div>
              <button onClick={() => setViewingMatrimonial(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}><X size={22} /></button>
            </div>

            <div style={{ padding: "28px 28px" }}>
              <DetailSection title="Candidate Details" items={[
                ["Full Name", viewingMatrimonial.name], ["Gender", viewingMatrimonial.gender],
                ["Age", viewingMatrimonial.age], ["City", viewingMatrimonial.city],
                ["Education", viewingMatrimonial.education], ["Profession", viewingMatrimonial.profession],
              ]} />

              <DetailSection title="Proposal and Requirements" items={[
                ["Family Background", viewingMatrimonial.familyBackground || "—"],
                ["Partner Requirements", viewingMatrimonial.requirements || "—"],
                ["Contact No / WhatsApp", viewingMatrimonial.contact],
              ]} />

              {/* WhatsApp direct-action */}
              {viewingMatrimonial.contact && (
                <div style={{ marginBottom: 24 }}>
                  <a
                    href={`https://wa.me/${viewingMatrimonial.contact.replace(/\D/g, "")}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "#25D366", color: "white", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                  >
                    <MessageCircle size={15} /> Contact Candidate via WhatsApp
                  </a>
                </div>
              )}

              {/* Payment Status Dropdown */}
              <div style={{ marginBottom: 24, backgroundColor: "#fcf8f0", padding: "16px 20px", borderRadius: 10, border: `1px solid rgba(200,160,74,0.2)` }}>
                <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>Payment Verification</p>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>Verify Payment Status</label>
                    <select
                      value={viewingMatrimonial.paymentStatus}
                      onChange={(e) => setMatrimonialPaymentStatus(viewingMatrimonial.id, e.target.value as MatrimonialPaymentStatus)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, fontFamily: "'Poppins', sans-serif" }}
                    >
                      <option value="pending">Pending</option>
                      <option value="received">Received</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  {viewingMatrimonial.paymentProofUrl && (
                    <div>
                      <p style={{ fontSize: 12, color: "#666", margin: "0 0 4px 0" }}>Receipt / Transfer Proof</p>
                      <a onClick={(e) => { e.preventDefault(); setZoomImage(viewingMatrimonial.paymentProofUrl || null); }} href="#" style={{ cursor: "pointer", display: "inline-block" }}>
                        <img src={viewingMatrimonial.paymentProofUrl} alt="Receipt Proof" style={{ height: 60, borderRadius: 6, border: "1px solid #ddd", display: "block" }} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin note */}
              {viewingMatrimonial.adminNote && (
                <div style={{ marginTop: 20, padding: "12px 16px", backgroundColor: "#fdf2f2", borderRadius: 8, border: "1px solid rgba(185,28,28,0.1)", marginBottom: 20 }}>
                  <p style={{ color: "#b91c1c", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Rejection Note</p>
                  <p style={{ color: "#555", fontSize: 13, margin: 0 }}>{viewingMatrimonial.adminNote}</p>
                </div>
              )}

              {/* Additional Photos */}
              {viewingMatrimonial.additionalPhotos && viewingMatrimonial.additionalPhotos.length > 0 && (
                <div style={{ marginTop: 20, marginBottom: 20 }}>
                  <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Additional Candidate Photos</p>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                    {viewingMatrimonial.additionalPhotos.map((src, i) => (
                      <a key={i} onClick={(e) => { e.preventDefault(); setZoomImage(src); }} href="#" style={{ cursor: "pointer", flexShrink: 0 }}>
                        <img src={src} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                {viewingMatrimonial.status === "pending" && (
                  <>
                    <button onClick={() => { approveMatrimonial(viewingMatrimonial.id); setViewingMatrimonial(null); }} style={{ backgroundColor: "#15803d", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <UserCheck size={14} /> Approve Submission
                    </button>
                    <button onClick={() => { setSelectedMatrimonial(viewingMatrimonial); setViewingMatrimonial(null); setMatrimonialRejectReason(""); }} style={{ backgroundColor: "#b91c1c", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <UserX size={14} /> Reject Submission
                    </button>
                  </>
                )}
                <button onClick={() => setViewingMatrimonial(null)} style={{ backgroundColor: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject matrimonial modal ── */}
      {selectedMatrimonial && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: 32, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ color: "#b91c1c", fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Reject Matrimonial Submission</h3>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>Rejecting: <strong>{selectedMatrimonial.name}</strong></p>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Reason for rejection</label>
            <textarea rows={3} value={matrimonialRejectReason} onChange={(e) => setMatrimonialRejectReason(e.target.value)} placeholder="e.g. Incomplete information, invalid receipt..."
              style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.2)", borderRadius: 7, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "'Lato', sans-serif", marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => rejectMatrimonial(selectedMatrimonial.id)} style={{ flex: 1, backgroundColor: "#b91c1c", color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Confirm Rejection</button>
              <button onClick={() => setSelectedMatrimonial(null)} style={{ flex: 1, backgroundColor: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── News form modal ── */}
      {showNewsForm && (
        <FormModal title={editingNews ? "Edit Article" : "Add Article"} onClose={() => setShowNewsForm(false)} onSubmit={submitNews} err={newsErr} maxWidth={800} loading={newsLoading}>
          <FormField label="Headline *" type="text" value={newsForm.title} onChange={(v) => setNewsForm((f) => ({ ...f, title: v }))} placeholder="News headline..." />
          <FormField label="Date" type="date" value={newsForm.date} onChange={(v) => setNewsForm((f) => ({ ...f, date: v }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Category</label>
              <select value={newsForm.category} onChange={(e) => setNewsForm((f) => ({ ...f, category: e.target.value }))} style={selectStyle}>
                {["Announcement", "Education", "Welfare", "Organisation", "Overseas"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Status</label>
              <select value={newsForm.status} onChange={(e) => setNewsForm((f) => ({ ...f, status: e.target.value as ContentStatus }))} style={selectStyle}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Content *</label>
            <RichTextEditor value={newsForm.body} onChange={(v) => setNewsForm((f) => ({ ...f, body: v }))} placeholder="Full article content..." />
          </div>
          <div style={{ marginTop: 16 }}>
            <MultiImageUpload
              label="Article Photos (Optional)"
              images={newsForm.images || []}
              onChange={(imgs) => setNewsForm((f) => ({ ...f, images: imgs }))}
            />
          </div>

          {/* Live Preview Panel */}
          <div style={{ marginTop: 24, padding: 20, backgroundColor: "#fdfbf7", border: `1px solid rgba(200, 160, 74, 0.3)`, borderRadius: 10 }}>
            <p style={{ color: GOLD, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>Live Article Preview</p>
            <div style={{ backgroundColor: "white", padding: 24, borderRadius: 8, border: "1px solid #eee" }}>
              <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>{newsForm.category}</span>
              <h2 dir="auto" style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginTop: 10, marginBottom: 8 }}>{newsForm.title || "Untitled Article"}</h2>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>{new Date(newsForm.date).toLocaleDateString()} · Status: <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{newsForm.status}</span></p>
              <div dir="auto"
                style={{ fontSize: 14, color: "#333", lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: newsForm.body || "<em>No content yet. Start typing...</em>" }}
              />
              {newsForm.images && newsForm.images.length > 0 && (
                <div style={{ display: "flex", gap: 10, marginTop: 16, overflowX: "auto", paddingBottom: 6 }}>
                  {newsForm.images.map((src, i) => (
                    <img key={i} src={src} alt="" style={{ height: 80, width: 110, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </FormModal>
      )}

      {/* ── Event form modal ── */}
      {showEventForm && (
        <FormModal title={editingEvent ? "Edit Event" : "Add Event"} onClose={() => setShowEventForm(false)} onSubmit={submitEvent} err={eventErr} maxWidth={800} loading={eventLoading}>
          <FormField label="Event Title *" type="text" value={eventForm.title} onChange={(v) => setEventForm((f) => ({ ...f, title: v }))} placeholder="Event name..." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Date *" type="date" value={eventForm.date} onChange={(v) => setEventForm((f) => ({ ...f, date: v }))} />
            <FormField label="Time" type="text" value={eventForm.time || ""} onChange={(v) => setEventForm((f) => ({ ...f, time: v }))} placeholder="e.g. 10:00 AM" />
          </div>
          <FormField label="Location *" type="text" value={eventForm.location || ""} onChange={(v) => setEventForm((f) => ({ ...f, location: v }))} placeholder="Venue name, city..." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Category</label>
              <select value={eventForm.category} onChange={(e) => setEventForm((f) => ({ ...f, category: e.target.value }))} style={selectStyle}>
                {["Meeting", "Welfare", "Election", "Education", "Convention"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Status</label>
              <select value={eventForm.status} onChange={(e) => setEventForm((f) => ({ ...f, status: e.target.value as ContentStatus }))} style={selectStyle}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Description</label>
            <RichTextEditor value={eventForm.desc} onChange={(v) => setEventForm((f) => ({ ...f, desc: v }))} placeholder="Event details..." />
          </div>
          <div style={{ marginTop: 16 }}>
            <MultiImageUpload
              label="Event Photos (Optional)"
              images={eventForm.images || []}
              onChange={(imgs) => setEventForm((f) => ({ ...f, images: imgs }))}
            />
          </div>

          {/* Live Preview Panel */}
          <div style={{ marginTop: 24, padding: 20, backgroundColor: "#fdfbf7", border: `1px solid rgba(200, 160, 74, 0.3)`, borderRadius: 10 }}>
            <p style={{ color: GOLD, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>Live Event Preview</p>
            <div style={{ backgroundColor: "white", padding: 24, borderRadius: 8, border: "1px solid #eee" }}>
              <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>{eventForm.category}</span>
              <h2 dir="auto" style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginTop: 10, marginBottom: 8 }}>{eventForm.title || "Untitled Event"}</h2>
              <p style={{ color: "#666", fontSize: 13, marginBottom: 12 }}>
                <strong>Date:</strong> {eventForm.date || "—"} | <strong>Time:</strong> {eventForm.time || "—"}<br />
                <strong>Location:</strong> {eventForm.location || "—"}
              </p>
              <div dir="auto"
                style={{ fontSize: 14, color: "#333", lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: eventForm.desc || "<em>No description yet.</em>" }}
              />
              {eventForm.images && eventForm.images.length > 0 && (
                <div style={{ display: "flex", gap: 10, marginTop: 16, overflowX: "auto", paddingBottom: 6 }}>
                  {eventForm.images.map((src, i) => (
                    <img key={i} src={src} alt="" style={{ height: 80, width: 110, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </FormModal>
      )}

      {/* ── New Tabs ── */}
      {tab === "settings" && <SettingsTab />}
      {tab === "overseas" && <OverseasTab />}
      {tab === "media" && <MediaTab />}
      {tab === "leadership" && <LeadershipTab />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "admins" && <AdminsTab />}

      {tab === "messages" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>Message Requests</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>Filter by Date:</span>
              <select 
                value={messageDateFilter}
                onChange={(e) => setMessageDateFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", outline: "none", fontFamily: "'Inter', sans-serif" }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
              </select>
            </div>
          </div>

          {messages.length === 0 && <div style={{ textAlign: "center", padding: "64px 0", color: "#999", fontSize: 15 }}>No messages found.</div>}

          {messages.length > 0 && (
            <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 14px rgba(0,0,0,0.05)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #eee" }}>
                    <th style={{ padding: "16px 24px", fontSize: 13, color: "#666", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "16px 24px", fontSize: 13, color: "#666", fontWeight: 600 }}>Sender Info</th>
                    <th style={{ padding: "16px 24px", fontSize: 13, color: "#666", fontWeight: 600 }}>Message</th>
                    <th style={{ padding: "16px 24px", fontSize: 13, color: "#666", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: "16px 24px", fontSize: 13, color: "#666", fontWeight: 600, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr key={msg.id} style={{ borderBottom: "1px solid #eee", backgroundColor: msg.status === "unread" ? "#fffcfc" : "white" }}>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ display: "inline-block", fontSize: 10, backgroundColor: msg.type === "contact" ? "#e0f2fe" : "#fef08a", color: msg.type === "contact" ? "#0284c7" : "#a16207", padding: "4px 8px", borderRadius: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>{msg.type.replace("_", " ")}</span>
                        <br/>
                        <span style={{ display: "inline-block", fontSize: 10, backgroundColor: msg.status === "unread" ? "#fee2e2" : "#d1fae5", color: msg.status === "unread" ? "#b91c1c" : "#047857", padding: "4px 8px", borderRadius: 12, fontWeight: 700 }}>{msg.status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <h4 style={{ margin: "0 0 4px 0", color: GREEN, fontSize: 15 }}>{msg.name}</h4>
                        <a href={`mailto:${msg.email}`} style={{ color: "#666", fontSize: 13, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}><Mail size={12} /> {msg.email}</a>
                        {msg.phone && <a href={`tel:${msg.phone}`} style={{ color: "#666", fontSize: 13, display: "flex", alignItems: "center", gap: 4, textDecoration: "none", marginTop: 4 }}><Phone size={12} /> {msg.phone}</a>}
                      </td>
                      <td style={{ padding: "16px 24px", maxWidth: 200 }}>
                        <div dir="auto" style={{ fontSize: 13, color: "#444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {msg.message}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: 13, color: "#666" }}>
                        {new Date(msg.createdAt).toLocaleDateString()}<br/>
                        <span style={{ fontSize: 11, color: "#aaa" }}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
                          <button onClick={() => setViewingMessage(msg)} style={actionBtn(GREEN)}><Eye size={14} /> View</button>
                          {msg.type === "forgot_password" && (
                            <button onClick={() => { setTab("members"); }} style={actionBtn(GOLD)}>Reset Password</button>
                          )}
                          {msg.status === "unread" ? (
                            <button onClick={() => handleUpdateMessageStatus(msg.id, "resolved")} style={actionBtn("#10b981")}><CheckCircle size={14} /> Resolve</button>
                          ) : (
                            <button onClick={() => handleUpdateMessageStatus(msg.id, "unread")} style={actionBtn("#6b7280", true)}><Clock size={14} /> Unread</button>
                          )}
                          <button onClick={() => handleDeleteMessage(msg.id)} style={actionBtn("#ef4444")}><Trash2 size={14} /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {messagesTotalPages > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32 }}>
              <span style={{ fontSize: 13, color: "#666" }}>Page {messagesPage} of {messagesTotalPages}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={messagesPage === 1} onClick={() => setMessagesPage(p => Math.max(p - 1, 1))} style={actionBtn(GREEN, messagesPage === 1)}><ChevronLeft size={16} /> Prev</button>
                <button disabled={(messagesPage >= messagesTotalPages)} onClick={() => setMessagesPage(p => Math.min(p + 1, messagesTotalPages))} style={actionBtn(GREEN, (messagesPage >= messagesTotalPages))}>Next <ChevronRight size={16} /></button>
              </div>
            </div>
          )}

          {viewingMessage && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ backgroundColor: "white", borderRadius: 12, padding: 32, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
                <button onClick={() => setViewingMessage(null)} style={{ position: "absolute", top: 24, right: 24, background: "transparent", border: "none", cursor: "pointer", color: "#666" }}><X size={20}/></button>
                <h3 style={{ margin: "0 0 16px 0", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22 }}>Message Details</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24, padding: 16, backgroundColor: "#f9fafb", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Sender Name</div>
                    <div style={{ fontSize: 14, color: "#333", fontWeight: 600 }}>{viewingMessage.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Email Address</div>
                    <a href={`mailto:${viewingMessage.email}`} style={{ fontSize: 14, color: GREEN, textDecoration: "none" }}>{viewingMessage.email}</a>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Phone Number</div>
                    {viewingMessage.phone ? <a href={`tel:${viewingMessage.phone}`} style={{ fontSize: 14, color: GREEN, textDecoration: "none" }}>{viewingMessage.phone}</a> : <span style={{ fontSize: 14, color: "#999" }}>N/A</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Date Received</div>
                    <div style={{ fontSize: 14, color: "#333" }}>{new Date(viewingMessage.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Message Content</div>
                <div dir="auto" style={{ backgroundColor: "#f0f7f3", padding: 20, borderRadius: 8, fontSize: 15, color: "#222", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {viewingMessage.message}
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 32 }}>
                  <button onClick={() => { handleDeleteMessage(viewingMessage.id); setViewingMessage(null); }} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    <Trash2 size={16}/> Delete
                  </button>
                  <button onClick={() => setViewingMessage(null)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #ddd", background: "white", color: "#666", cursor: "pointer", fontWeight: 600 }}>Close</button>
                  {viewingMessage.status === "unread" && (
                    <button onClick={() => { handleUpdateMessageStatus(viewingMessage.id, "resolved"); setViewingMessage({...viewingMessage, status: "resolved"}); }} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#10b981", color: "white", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={16}/> Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      </div>
    </main>

    <style>{`@media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2,1fr) !important; } } @media (max-width: 500px) { .stats-grid { grid-template-columns: 1fr !important; } }`}</style>
    <ImageModal imageUrl={zoomImage} onClose={() => setZoomImage(null)} />
  </div>
);
}

// ── Shared form modal ──────────────────────────────────────────────────────────
function FormModal({ title, children, onClose, onSubmit, err, maxWidth = 600, loading = false }: { title: string; children: React.ReactNode; onClose: () => void; onSubmit: () => void; err: string; maxWidth?: number; loading?: boolean; }) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ backgroundColor: "white", borderRadius: 14, padding: 32, width: "100%", maxWidth, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} disabled={loading} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={22} /></button>
        </div>
        {err && <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12, backgroundColor: "#fee2e2", padding: "8px 12px", borderRadius: 6 }}>{err}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, opacity: loading ? 0.6 : 1, pointerEvents: loading ? "none" : "auto" }}>{children}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={onSubmit} disabled={loading} style={{ flex: 1, backgroundColor: loading ? "#a3b8aa" : GREEN, color: "white", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Lato', sans-serif" }}>
            {loading ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} disabled={loading} style={{ flex: 1, backgroundColor: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Lato', sans-serif" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div>
      <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.25)`, borderRadius: 7, fontSize: 14, boxSizing: "border-box", fontFamily: "'Lato', sans-serif" }} />
    </div>
  );
}

const selectStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.25)`, borderRadius: 7, fontSize: 14, fontFamily: "'Lato', sans-serif" };

function DetailSection({ title, badge, items }: { title: string; badge?: string; items: [string, string][] }) {
  const visible = items.filter(([, v]) => v);
  if (!visible.length) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{title}</p>
        {badge && <span style={{ backgroundColor: "#fef9c3", color: "#854d0e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>{badge}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, backgroundColor: "#f8f5ef", borderRadius: 10, padding: "14px 18px" }}>
        {visible.map(([label, val]) => (
          <div key={label}>
            <p style={{ color: "#aaa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>{label}</p>
            <p style={{ color: "#1a1a1a", fontSize: 13, margin: "3px 0 0", wordBreak: "break-word" }}>{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings Tab ────────────────────────────────────────────────────────────────
function PDFUploadField({
  label,
  pdfUrl,
  pdfName,
  onUpload,
  onRemove
}: {
  label: string;
  pdfUrl?: string;
  pdfName?: string;
  onUpload: (url: string, name: string) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("araian_admin_token")}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onUpload(data.url, file.name);
    } catch (e: any) {
      setUploadError(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700 }}>{label}</label>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, backgroundColor: "#f9fafb", display: "flex", flexDirection: "column", gap: 12, minHeight: 90, justifyContent: "center" }}>
        {pdfUrl && !pdfUrl.startsWith("data:") ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#15803d", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle size={14} /> Uploaded
              </span>
              <button
                type="button"
                onClick={onRemove}
                style={{ border: "none", backgroundColor: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
              >
                Remove
              </button>
            </div>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#4b5563", fontSize: 12, fontWeight: 600, wordBreak: "break-all" }}>
              {pdfName || "document.pdf"}
            </a>
          </div>
        ) : (
          <div>
            {pdfUrl?.startsWith("data:") && (
              <p style={{ color: "#ef4444", fontSize: 11, margin: "0 0 8px 0", fontWeight: 600 }}>⚠ Old format detected — please re-upload to fix.</p>
            )}
            <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 10px 0" }}>No PDF uploaded yet.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                backgroundColor: GREEN,
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 700,
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.7 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Upload size={14} /> {uploading ? "Uploading..." : "Choose PDF File"}
            </button>
            {uploadError && <p style={{ color: "#ef4444", fontSize: 11, margin: "8px 0 0 0" }}>{uploadError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              style={{ display: "none" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSiteSettings().then(setSettings).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateSiteSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading settings...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
          Site Settings
        </h2>
        <button onClick={handleSave} disabled={saving} style={{ ...actionBtn(GREEN), opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
          <CheckCircle size={14} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
      {saved && <div style={{ backgroundColor: "#dcfce7", padding: "12px 16px", borderRadius: 8, marginBottom: 20 }}><p style={{ color: "#15803d", fontSize: 14, margin: 0, fontWeight: 700 }}>✓ Settings updated successfully.</p></div>}
      {error && <div style={{ backgroundColor: "#fee2e2", padding: "12px 16px", borderRadius: 8, marginBottom: 20 }}><p style={{ color: "#b91c1c", fontSize: 14, margin: 0, fontWeight: 700 }}>✗ {error}</p></div>}
      <div style={{ backgroundColor: "white", padding: 24, borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 10 }}>Contact Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <FormField label="Official WhatsApp Number (Format: 923001234567)" type="text" value={settings.whatsappNumber} onChange={(v) => setSettings({ ...settings, whatsappNumber: v })} />
          <FormField label="Contact Phone" type="text" value={settings.contactPhone} onChange={(v) => setSettings({ ...settings, contactPhone: v })} />
          <FormField label="Contact Email" type="email" value={settings.contactEmail} onChange={(v) => setSettings({ ...settings, contactEmail: v })} />
          <FormField label="Head Office Address" type="text" value={settings.address} onChange={(v) => setSettings({ ...settings, address: v })} />
        </div>
        <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginTop: 32, marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 10 }}>Social Media Links</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <FormField label="Facebook URL" type="url" value={settings.facebookUrl} onChange={(v) => setSettings({ ...settings, facebookUrl: v })} />
          <FormField label="Twitter URL" type="url" value={settings.twitterUrl} onChange={(v) => setSettings({ ...settings, twitterUrl: v })} />
          <FormField label="Instagram URL" type="url" value={settings.instagramUrl} onChange={(v) => setSettings({ ...settings, instagramUrl: v })} />
          <FormField label="LinkedIn URL" type="url" value={settings.linkedinUrl} onChange={(v) => setSettings({ ...settings, linkedinUrl: v })} />
        </div>

        <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginTop: 32, marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 10 }}>Homepage Hero Slider</h3>
        <div style={{ marginBottom: 32 }}>
          <MultiImageUpload label="Hero Images (will rotate on Homepage)" images={settings.heroSlides || []} onChange={(imgs) => setSettings({ ...settings, heroSlides: imgs })} />
        </div>

        <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginTop: 32, marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 10 }}>Constitution and PDF Documents</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 32 }}>
          <PDFUploadField
            label="Constitution PDF"
            pdfUrl={settings.constitutionPdfUrl}
            pdfName={settings.constitutionPdfName}
            onUpload={(url, name) => setSettings({ ...settings, constitutionPdfUrl: url, constitutionPdfName: name })}
            onRemove={() => setSettings({ ...settings, constitutionPdfUrl: "", constitutionPdfName: "" })}
          />

          <PDFUploadField
            label="Memorandum of Association PDF"
            pdfUrl={settings.memorandumPdfUrl}
            pdfName={settings.memorandumPdfName}
            onUpload={(url, name) => setSettings({ ...settings, memorandumPdfUrl: url, memorandumPdfName: name })}
            onRemove={() => setSettings({ ...settings, memorandumPdfUrl: "", memorandumPdfName: "" })}
          />

          <PDFUploadField
            label="Rules and Regulations PDF"
            pdfUrl={settings.rulesPdfUrl}
            pdfName={settings.rulesPdfName}
            onUpload={(url, name) => setSettings({ ...settings, rulesPdfUrl: url, rulesPdfName: name })}
            onRemove={() => setSettings({ ...settings, rulesPdfUrl: "", rulesPdfName: "" })}
          />
        </div>

        <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginTop: 32, marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 10 }}>Home Page Slider Images</h3>
        <MultiImageUpload label="Upload Slider Images" images={settings.heroSlides || []} onChange={(imgs) => setSettings({ ...settings, heroSlides: imgs })} />

        <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginTop: 40, marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <DollarSign size={18} /> Payment Methods
        </h3>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>Configure bank accounts and digital wallets for members to pay fees. These will be shown on the registration page.</p>

        <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
          {(settings.paymentMethods || []).map((method, idx) => (
            <div key={method.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, position: "relative", backgroundColor: "#fcfcfc" }}>
              <button
                onClick={() => setSettings({ ...settings, paymentMethods: settings.paymentMethods!.filter((_, i) => i !== idx) })}
                style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                title="Remove Method"
              >
                <Trash2 size={16} />
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
                <FormField label="Bank/Wallet Name" type="text" value={method.bankName} onChange={(v) => {
                  const newMethods = [...(settings.paymentMethods || [])];
                  newMethods[idx].bankName = v;
                  setSettings({ ...settings, paymentMethods: newMethods });
                }} />
                <FormField label="Account Title" type="text" value={method.accountTitle} onChange={(v) => {
                  const newMethods = [...(settings.paymentMethods || [])];
                  newMethods[idx].accountTitle = v;
                  setSettings({ ...settings, paymentMethods: newMethods });
                }} />
                <FormField label="Account No / IBAN" type="text" value={method.accountNo} onChange={(v) => {
                  const newMethods = [...(settings.paymentMethods || [])];
                  newMethods[idx].accountNo = v;
                  setSettings({ ...settings, paymentMethods: newMethods });
                }} />
              </div>
            </div>
          ))}
          <button
            onClick={() => setSettings({
              ...settings,
              paymentMethods: [...(settings.paymentMethods || []), { id: `p_${Date.now()}`, bankName: "New Bank", accountTitle: "", accountNo: "" }]
            })}
            style={{ ...actionBtn(GREEN, true), width: "fit-content", padding: "8px 16px" }}
          >
            <Plus size={14} /> Add Payment Method
          </button>
        </div>

        <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginTop: 40, marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <Crown size={18} /> Membership Pricing and Tiers
        </h3>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>Configure the pricing and benefits for each membership tier. Do not change the "Internal ID" unless necessary.</p>

        <div style={{ display: "grid", gap: 16 }}>
          {(settings.membershipTiers || []).map((tier, idx) => (
            <div key={tier.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, position: "relative", backgroundColor: "#fcfcfc" }}>
              <button
                onClick={() => setSettings({ ...settings, membershipTiers: settings.membershipTiers!.filter((_, i) => i !== idx) })}
                style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                title="Remove Tier"
              >
                <Trash2 size={16} />
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
                <FormField label="Internal ID (e.g. ordinary, life)" type="text" value={tier.type} onChange={(v) => {
                  const newTiers = [...(settings.membershipTiers || [])];
                  newTiers[idx].type = v;
                  setSettings({ ...settings, membershipTiers: newTiers });
                }} />
                <FormField label="Display Name" type="text" value={tier.name} onChange={(v) => {
                  const newTiers = [...(settings.membershipTiers || [])];
                  newTiers[idx].name = v;
                  setSettings({ ...settings, membershipTiers: newTiers });
                }} />
                <FormField label="Pricing (e.g. Rs. 500 / year)" type="text" value={tier.fee} onChange={(v) => {
                  const newTiers = [...(settings.membershipTiers || [])];
                  newTiers[idx].fee = v;
                  setSettings({ ...settings, membershipTiers: newTiers });
                }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <FormField label="Benefits Description" type="text" value={tier.description} onChange={(v) => {
                  const newTiers = [...(settings.membershipTiers || [])];
                  newTiers[idx].description = v;
                  setSettings({ ...settings, membershipTiers: newTiers });
                }} />
              </div>
            </div>
          ))}
          <button
            onClick={() => setSettings({
              ...settings,
              membershipTiers: [...(settings.membershipTiers || []), { id: `t_${Date.now()}`, type: "new_tier", name: "New Tier", fee: "Free", description: "" }]
            })}
            style={{ ...actionBtn(GREEN, true), width: "fit-content", padding: "8px 16px", marginTop: 8 }}
          >
            <Plus size={14} /> Add Membership Tier
          </button>
        </div>

        <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginTop: 40, marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <Star size={18} /> Matrimonial Packages
        </h3>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>Configure the pricing and features for Matrimonial profiles. Featured packages will appear at the top of the directory with a VIP badge.</p>

        <div style={{ display: "grid", gap: 16 }}>
          {(settings.matrimonialPackages || []).map((pkg, idx) => (
            <div key={pkg.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, position: "relative", backgroundColor: "#fcfcfc" }}>
              <button
                onClick={() => setSettings({ ...settings, matrimonialPackages: settings.matrimonialPackages!.filter((_, i) => i !== idx) })}
                style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                title="Remove Package"
              >
                <Trash2 size={16} />
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
                <FormField label="Display Name (e.g. Featured Listing)" type="text" value={pkg.name} onChange={(v) => {
                  const newPkgs = [...(settings.matrimonialPackages || [])];
                  newPkgs[idx].name = v;
                  setSettings({ ...settings, matrimonialPackages: newPkgs });
                }} />
                <FormField label="Pricing (e.g. Rs. 2,000 once)" type="text" value={pkg.fee} onChange={(v) => {
                  const newPkgs = [...(settings.matrimonialPackages || [])];
                  newPkgs[idx].fee = v;
                  setSettings({ ...settings, matrimonialPackages: newPkgs });
                }} />
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#333", fontWeight: 600, paddingBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={pkg.isFeatured}
                      onChange={(e) => {
                        const newPkgs = [...(settings.matrimonialPackages || [])];
                        newPkgs[idx].isFeatured = e.target.checked;
                        setSettings({ ...settings, matrimonialPackages: newPkgs });
                      }}
                      style={{ width: 16, height: 16, accentColor: GOLD }}
                    />
                    Is Featured (VIP Badge)?
                  </label>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <FormField label="Package Description" type="text" value={pkg.description} onChange={(v) => {
                  const newPkgs = [...(settings.matrimonialPackages || [])];
                  newPkgs[idx].description = v;
                  setSettings({ ...settings, matrimonialPackages: newPkgs });
                }} />
              </div>
            </div>
          ))}
          <button
            onClick={() => setSettings({
              ...settings,
              matrimonialPackages: [...(settings.matrimonialPackages || []), { id: `mp_${Date.now()}`, name: "New Package", fee: "Rs. 0 once", description: "", isFeatured: false }]
            })}
            style={{ ...actionBtn(GREEN, true), width: "fit-content", padding: "8px 16px", marginTop: 8 }}
          >
            <Plus size={14} /> Add Matrimonial Package
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Overseas Tab ──────────────────────────────────────────────────────────────
function OverseasTab() {
  const [chapters, setChapters] = useState<OverseasChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<OverseasChapter, "id">>({ country: "", flag: "", city: "", established: "", coordinator: "", phone: "", email: "", members: 0 });

  const loadChapters = async () => {
    setLoading(true);
    try {
      const data = await fetchOverseasChapters();
      setChapters(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChapters();
  }, []);

  const submit = async () => {
    try {
      if (editingId) {
        await updateOverseasChapter(editingId, form);
      } else {
        await createOverseasChapter(form);
      }
      setShowForm(false);
      setEditingId(null);
      loadChapters();
    } catch (e) {
      console.error(e);
    }
  };

  const del = async (id: string) => {
    if (confirm("Delete chapter?")) {
      try {
        await deleteOverseasChapter(id);
        loadChapters();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
          Overseas Chapters <span style={{ color: "#aaa", fontSize: 16, fontWeight: 400 }}>({chapters.length})</span>
        </h2>
        <button onClick={() => { setEditingId(null); setForm({ country: "", flag: "", city: "", established: "", coordinator: "", phone: "", email: "", members: 0 }); setShowForm(true); }} style={actionBtn(GREEN)}>
          <Plus size={14} /> Add Chapter
        </button>
      </div>
      <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif", minWidth: 900 }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f5ef" }}>
              {["Chapter", "Location", "Coordinator", "Contact", "Members", "Actions"].map((h) => (
                <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: "40px 14px", textAlign: "center", color: "#888" }}>Loading...</td></tr>
            ) : chapters.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "40px 14px", textAlign: "center", color: "#888" }}>No overseas chapters found.</td></tr>
            ) : chapters.map((c, i) => (
              <tr key={c.id} style={{ borderTop: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 24 }}>{c.flag}</div>
                    <div>
                      <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, margin: 0 }}>{c.country}</p>
                      <p style={{ color: "#aaa", fontSize: 11, margin: "2px 0 0" }}>Est. {c.established}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "#555" }}>{c.city}</td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "#444", fontWeight: 600 }}>{c.coordinator}</td>
                <td style={{ padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, color: "#555", margin: 0 }}>{c.phone}</p>
                  <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>{c.email}</p>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "#555" }}>
                  <span style={{ backgroundColor: "#f0f7f3", color: GREEN, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{c.members}</span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => { setEditingId(c.id); setForm(c); setShowForm(true); }} style={actionBtn("#6b7280")} title="Edit"><Edit2 size={12} /> Edit</button>
                    <button onClick={() => del(c.id)} style={actionBtn("#6b7280", true)} title="Delete"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <FormModal title={editingId ? "Edit Chapter" : "Add Chapter"} onClose={() => setShowForm(false)} onSubmit={submit} err="">
          <FormField label="Country Name" type="text" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <FormField label="Flag Emoji (e.g. 🇬🇧)" type="text" value={form.flag} onChange={(v) => setForm({ ...form, flag: v })} />
          <FormField label="City / Region" type="text" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <FormField label="Year Established" type="text" value={form.established} onChange={(v) => setForm({ ...form, established: v })} />
          <FormField label="Coordinator Name" type="text" value={form.coordinator} onChange={(v) => setForm({ ...form, coordinator: v })} />
          <FormField label="Phone" type="text" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <FormField label="Number of Members" type="number" value={form.members.toString()} onChange={(v) => setForm({ ...form, members: parseInt(v) || 0 })} />
        </FormModal>
      )}
    </div>
  );
}

// ── Media Tab ────────────────────────────────────────────────────────────────
function MediaTab() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ urls: string[], title: string, type: "photo" | "video", date: string, caption: string }>({ urls: [], title: "", type: "photo", date: new Date().toISOString().slice(0, 10), caption: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const loadMedia = async () => {
    setLoading(true);
    try {
      // Admin dashboard might need 20 items per page
      const res = await fetchMediaGallery(page, 20);
      setMedia(res.data);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error("Failed to fetch media", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [page]);

  const submit = async () => {
    if (form.urls.length === 0) return;
    try {
      const newItems = form.urls.map((url) => ({
        title: form.title,
        caption: form.caption,
        date: form.date,
        type: form.type,
        url: url
      }));
      
      if (editingId) {
        await updateMedia(editingId, newItems[0]);
      } else {
        await createMedia(newItems);
      }
      setShowForm(false);
      setEditingId(null);
      loadMedia(); // refresh
    } catch (e) {
      console.error("Failed to save media", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete media?")) {
      try {
        await deleteMedia(id);
        loadMedia();
      } catch (e) {
        console.error("Failed to delete media", e);
      }
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
          Media Gallery
        </h2>
        <button onClick={() => { setEditingId(null); setForm({ urls: [], title: "", type: "photo", date: new Date().toISOString().slice(0, 10), caption: "" }); setShowForm(true); }} style={actionBtn(GREEN)}>
          <Plus size={14} /> Add Media
        </button>
      </div>
      <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif", minWidth: 700 }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f5ef" }}>
              {["Thumbnail", "Title and Caption", "Type", "Date", "Actions"].map((h) => (
                <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: "40px 14px", textAlign: "center", color: "#888" }}>Loading...</td></tr>
            ) : media.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "40px 14px", textAlign: "center", color: "#888" }}>No media items found.</td></tr>
            ) : media.map((m, i) => (
              <tr key={m.id} style={{ borderTop: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "14px 16px", width: 100 }}>
                  <img src={m.url} alt={m.title} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, display: "block", border: "1px solid #eee" }} />
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, margin: 0 }}>{m.title || "Untitled"}</p>
                  {m.caption && <p style={{ color: "#888", fontSize: 11, margin: "2px 0 0" }}>{m.caption}</p>}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ backgroundColor: m.type === "video" ? "#fce7f3" : "#e0f2fe", color: m.type === "video" ? "#be185d" : "#0369a1", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>
                    {m.type}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "#555" }}>{new Date(m.date).toLocaleDateString()}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setEditingId(m.id); setForm({ urls: [m.url], title: m.title, type: m.type, date: m.date.slice(0, 10), caption: m.caption || "" }); setShowForm(true); }} style={actionBtn("#0ea5e9")} title="Edit"><Edit2 size={12} /></button>
                    <button onClick={() => handleDelete(m.id)} style={actionBtn("#6b7280")} title="Delete"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", borderTop: "1px solid #eee" }}>
            <span style={{ fontSize: 13, color: "#666" }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={actionBtn(GREEN, page === 1)}>Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={actionBtn(GREEN, page === totalPages)}>Next</button>
            </div>
          </div>
        )}
      </div>
      {showForm && (
        <FormModal title="Add Photo to Gallery" onClose={() => setShowForm(false)} onSubmit={submit} err="">
          <FormField label="Photo Title" type="text" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <FormField label="Caption" type="text" value={form.caption} onChange={(v) => setForm({ ...form, caption: v })} />
          <FormField label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "photo" | "video" })} style={selectStyle}>
              <option value="photo">Photo</option>
              <option value="video">Video</option>
            </select>
          </div>
          <MultiImageUpload label="Upload Image(s)/Thumbnail(s)" images={form.urls} onChange={(imgs) => setForm({ ...form, urls: imgs })} />
        </FormModal>
      )}
    </div>
  );
}

// ── Leadership Tab ────────────────────────────────────────────────────────────
function AttributesEditor({
  attributes,
  onChange
}: {
  attributes: { label: string, value: string }[],
  onChange: (newAttrs: { label: string, value: string }[]) => void
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Key Attributes / Stats</label>
      {(attributes || []).map((attr, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Label (e.g. Term)"
            value={attr.label}
            onChange={(e) => { const n = [...attributes]; n[i].label = e.target.value; onChange(n); }}
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
          />
          <input
            type="text"
            placeholder="Value (e.g. 2024 - 2027)"
            value={attr.value}
            onChange={(e) => { const n = [...attributes]; n[i].value = e.target.value; onChange(n); }}
            style={{ flex: 1.5, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
          />
          <button
            onClick={() => { const n = [...attributes]; n.splice(i, 1); onChange(n); }}
            style={{ padding: "8px 12px", border: "none", backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
          >X</button>
        </div>
      ))}
      <button
        onClick={() => onChange([...(attributes || []), { label: "", value: "" }])}
        style={{ padding: "8px 14px", border: "1px dashed #c8a04a", backgroundColor: "transparent", color: "#c8a04a", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, marginTop: 4, width: "100%" }}
      >+ Add Attribute</button>
    </div>
  );
}

function LeadershipTab() {
  const [profiles, setProfiles] = useState<LeadershipProfile[]>([]);
  const [presMsg, setPresMsg] = useState<any>({ name: "", body: "", photo: "", attributes: [] });
  const [secMsg, setSecMsg] = useState<any>({ name: "", body: "", photo: "", attributes: [] });
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<LeadershipProfile, "id">>({ name: "", role: "", city: "", tier: 2, category: "cabinet", image: "", period: "", description: "" });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profs, msgs] = await Promise.all([
        fetchLeadershipProfiles(),
        fetchLeadershipMessages()
      ]);
      setProfiles(profs);
      const parseAttrs = (m: any) => {
        if (!m) return m;
        return {
          ...m,
          attributes: typeof m.attributes === 'string' ? JSON.parse(m.attributes) : (Array.isArray(m.attributes) ? m.attributes : [])
        };
      };
      const pMsg = msgs.find((m: any) => m.type === "president");
      const sMsg = msgs.find((m: any) => m.type === "secretary");
      if (pMsg) setPresMsg(parseAttrs(pMsg));
      if (sMsg) setSecMsg(parseAttrs(sMsg));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveMessages = async () => {
    try {
      await updateLeadershipMessage("president", presMsg);
      await updateLeadershipMessage("secretary", secMsg);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const submitProfile = async () => {
    try {
      if (editingId) {
        await updateLeadershipProfile(editingId, form);
      } else {
        await createLeadershipProfile(form);
      }
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
          Leadership and Messages
        </h2>
        
      </div>
      {saved && <div style={{ backgroundColor: "#dcfce7", padding: "12px 16px", borderRadius: 8, marginBottom: 20 }}><p style={{ color: "#15803d", fontSize: 14, margin: 0, fontWeight: 700 }}>✓ Leadership messages saved.</p></div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 40 }}>
        <div style={{ flex: "1 1 400px", backgroundColor: "white", padding: 24, borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid rgba(26,77,46,0.08)` }}>
          <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>President's Message</h3>
          <FormField label="President Name" type="text" value={presMsg.name} onChange={(v) => setPresMsg({ ...presMsg, name: v })} />
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Message Body</label>
            <RichTextEditor value={presMsg.body} onChange={(v) => setPresMsg({ ...presMsg, body: v })} placeholder="Message..." />
          </div>
          <div style={{ marginTop: 16 }}>
            <MultiImageUpload label="President Photo" images={presMsg.photo ? [presMsg.photo] : []} onChange={(imgs) => setPresMsg({ ...presMsg, photo: imgs[0] || "" })} />
          </div>
          <AttributesEditor attributes={presMsg.attributes || []} onChange={(attrs) => setPresMsg({ ...presMsg, attributes: attrs })} />
        </div>
        <div style={{ flex: "1 1 400px", backgroundColor: "white", padding: 24, borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid rgba(26,77,46,0.08)` }}>
          <h3 style={{ color: GREEN, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>General Secretary's Message</h3>
          <FormField label="Secretary Name" type="text" value={secMsg.name} onChange={(v) => setSecMsg({ ...secMsg, name: v })} />
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Message Body</label>
            <RichTextEditor value={secMsg.body} onChange={(v) => setSecMsg({ ...secMsg, body: v })} placeholder="Message..." />
          </div>
          <div style={{ marginTop: 16 }}>
            <MultiImageUpload label="Secretary Photo" images={secMsg.photo ? [secMsg.photo] : []} onChange={(imgs) => setSecMsg({ ...secMsg, photo: imgs[0] || "" })} />
          </div>
          <AttributesEditor attributes={secMsg.attributes || []} onChange={(attrs) => setSecMsg({ ...secMsg, attributes: attrs })} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ color: GREEN, fontSize: 20, fontWeight: 700, margin: 0 }}>Leadership Profiles</h3>
        <button onClick={() => { setEditingId(null); setForm({ name: "", role: "", city: "", tier: 2, category: "cabinet", image: "", period: "", description: "" }); setShowForm(true); }} style={actionBtn(GREEN)}>
          <Plus size={14} /> Add Profile
        </button>
      </div>
      <div style={{ overflowX: "auto", backgroundColor: "white", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid rgba(26,77,46,0.08)` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif", minWidth: 800 }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f5ef" }}>
              {["Name", "Role", "Category", "City", "Actions"].map((h) => (
                <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px 14px", textAlign: "center", color: "#888" }}>Loading...</td>
              </tr>
            ) : profiles.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px 14px", textAlign: "center", color: "#888" }}>No profiles added yet.</td>
              </tr>
            ) : profiles.map((p, i) => (
              <tr key={p.id} style={{ borderTop: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: GREEN }}>{p.name}</td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "#444" }}>{p.role}</td>
                <td style={{ padding: "14px 16px", fontSize: 12 }}>
                  <span style={{ backgroundColor: p.category === "cabinet" ? "#e0f2fe" : p.category === "executive" ? "#fce7f3" : "#f0f7f3", color: p.category === "cabinet" ? "#0369a1" : p.category === "executive" ? "#be185d" : GREEN, padding: "4px 10px", borderRadius: 12, textTransform: "capitalize", fontWeight: 600, letterSpacing: "0.02em" }}>
                    {p.category}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "#555" }}>{p.city}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => { setEditingId(p.id); setForm(p); setShowForm(true); }} style={actionBtn("#6b7280")} title="Edit"><Edit2 size={12} /></button>
                    <button onClick={async () => { 
                      if (confirm("Delete profile?")) {
                        try {
                          await deleteLeadershipProfile(p.id);
                          loadData();
                        } catch (e) {
                          console.error(e);
                        }
                      } 
                    }} style={actionBtn("#6b7280", true)} title="Delete"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <FormModal title={editingId ? "Edit Profile" : "Add Profile"} onClose={() => setShowForm(false)} onSubmit={submitProfile} err="">
          <FormField label="Full Name" type="text" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <FormField label="Role / Title" type="text" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
          <FormField label="City" type="text" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} style={selectStyle}>
                {["cabinet", "executive", "advisory", "founder", "expresident"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Hierarchy Tier (Cabinet only)</label>
              <select value={form.tier} onChange={(e) => setForm({ ...form, tier: parseInt(e.target.value) })} style={selectStyle}>
                <option value="0">0 - President</option>
                <option value="1">1 - SVP / Gen Sec</option>
                <option value="2">2 - VP / Secretaries</option>
                <option value="3">3 - Members</option>
              </select>
            </div>
          </div>
          {(form.category === "founder" || form.category === "expresident") && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 16 }}>
              <FormField label="Tenure / Period" type="text" value={form.period || ""} onChange={(v) => setForm({ ...form, period: v })} />
              <FormField label="Description / Highlights" type="text" value={form.description || ""} onChange={(v) => setForm({ ...form, description: v })} />
            </div>
          )}
          <MultiImageUpload label="Profile Image" images={form.image ? [form.image] : []} onChange={(imgs) => setForm({ ...form, image: imgs[0] || "" })} />
        </FormModal>
      )}
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [profitConfig, setProfitConfig] = useState<ProfitSharingConfig>({ developerPercentage: 20 });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "one_time" | "monthly" | "yearly">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  const [showManualRevenueForm, setShowManualRevenueForm] = useState(false);
  const [manualRevenueForm, setManualRevenueForm] = useState({
    customerName: "",
    itemType: "other" as "membership" | "business_sponsorship" | "matrimonial_featured" | "other",
    itemName: "",
    feeString: ""
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [revRecords, config] = await Promise.all([
          getRevenueRecords(),
          getProfitSharing()
        ]);
        setRecords(revRecords);
        setProfitConfig(config);
      } catch (err) {
        console.error("Failed to load analytics data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSavePercentage = async (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      const newConfig = { developerPercentage: num };
      setProfitConfig(newConfig);
      await saveProfitSharing(newConfig);
    }
  };

  const handleManualRevenueSubmit = async () => {
    if (!manualRevenueForm.customerName || !manualRevenueForm.itemName || !manualRevenueForm.feeString) {
      alert("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    await logRevenueRecord(manualRevenueForm);
    
    const [revRecords, config] = await Promise.all([
      getRevenueRecords(),
      getProfitSharing()
    ]);
    setRecords(revRecords);
    setProfitConfig(config);
    setLoading(false);

    setShowManualRevenueForm(false);
    setManualRevenueForm({ customerName: "", itemType: "other", itemName: "", feeString: "" });
  };


  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => filter === "all" || r.paymentFrequency === filter)
      .filter((r) => {
        if (startDate && new Date(r.date) < new Date(startDate)) return false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (new Date(r.date) > end) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, filter, startDate, endDate]);

  const paginatedRecords = useMemo(() => {
    return paginateData(filteredRecords, page, 10);
  }, [filteredRecords, page]);

  const totalRevenue = filteredRecords.reduce((acc, r) => acc + r.amount, 0);
  const developerShare = (totalRevenue * profitConfig.developerPercentage) / 100;
  const ownerShare = totalRevenue - developerShare;

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Loading analytics...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <PieChart size={24} color={GOLD} /> Revenue Analytics
        </h2>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <button onClick={() => setShowManualRevenueForm(true)} style={{ backgroundColor: GOLD, color: "white", padding: "12px 20px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={16} /> Add Manual Revenue
          </button>
          <div style={{ backgroundColor: "white", padding: "12px 20px", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#666", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Settings2 size={16} /> Developer Share %</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min="0" max="100"
                value={profitConfig.developerPercentage}
                onChange={(e) => handleSavePercentage(e.target.value)}
                style={{ width: 60, padding: "8px", borderRadius: 6, border: "1px solid #ddd", textAlign: "center", fontWeight: 700, color: GREEN }}
              />
              <span style={{ fontWeight: 700, color: "#888" }}>%</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
        <div style={{ backgroundColor: GREEN, borderRadius: 16, padding: 24, color: "white", boxShadow: "0 4px 20px rgba(26,77,46,0.15)" }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>Total Revenue</div>
          <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>Rs. {totalRevenue.toLocaleString()}</div>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", borderTop: `4px solid ${GOLD}` }}>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>Owner's Share ({100 - profitConfig.developerPercentage}%)</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#333", fontFamily: "'Playfair Display', serif" }}>Rs. {ownerShare.toLocaleString()}</div>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", borderTop: `4px solid #3b82f6` }}>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>Developer's Share ({profitConfig.developerPercentage}%)</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#3b82f6", fontFamily: "'Playfair Display', serif" }}>Rs. {developerShare.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
          <h3 style={{ fontSize: 18, color: GREEN, fontWeight: 700, margin: 0 }}>Recent Transactions</h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Filter:</span>
              {(["all", "one_time", "monthly", "yearly"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${filter === f ? GREEN : "#eee"}`, backgroundColor: filter === f ? GREEN : "transparent", color: filter === f ? "white" : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}
                >
                  {f.replace("_", "-")}
                </button>
              ))}
            </div>
            <div style={{ width: 1, backgroundColor: "#eee", alignSelf: "stretch" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}><CalendarDays size={14} style={{ marginBottom: -2 }} /> Date:</span>
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12, color: "#555", outline: "none" }} title="Start Date" />
              <span style={{ color: "#aaa", fontSize: 12 }}>to</span>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12, color: "#555", outline: "none" }} title="End Date" />
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center" }} title="Clear Dates">
                  <XCircle size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              <th style={{ padding: "12px 16px", color: "#888", fontSize: 13, fontWeight: 600 }}>Date</th>
              <th style={{ padding: "12px 16px", color: "#888", fontSize: 13, fontWeight: 600 }}>Customer</th>
              <th style={{ padding: "12px 16px", color: "#888", fontSize: 13, fontWeight: 600 }}>Package / Item</th>
              <th style={{ padding: "12px 16px", color: "#888", fontSize: 13, fontWeight: 600 }}>Frequency</th>
              <th style={{ padding: "12px 16px", color: "#888", fontSize: 13, fontWeight: 600, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.data.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>No transactions found.</td></tr>
            ) : paginatedRecords.data.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "transparent" : "#fafafa" }}>
                <td style={{ padding: "16px", fontSize: 13, color: "#555" }}>{new Date(r.date).toLocaleDateString()}</td>
                <td style={{ padding: "16px", fontSize: 14, fontWeight: 600, color: "#333" }}>{r.customerName}</td>
                <td style={{ padding: "16px", fontSize: 13 }}>
                  <span style={{ display: "block", color: GREEN, fontWeight: 600 }}>{r.itemName}</span>
                  <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>{r.itemType.replace("_", " ")}</span>
                </td>
                <td style={{ padding: "16px", fontSize: 12 }}>
                  <span style={{ backgroundColor: r.paymentFrequency === "one_time" ? "#f3e8ff" : "#e0f2fe", color: r.paymentFrequency === "one_time" ? "#7e22ce" : "#0369a1", padding: "4px 10px", borderRadius: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {r.paymentFrequency.replace("_", "-")}
                  </span>
                </td>
                <td style={{ padding: "16px", fontSize: 15, fontWeight: 700, color: GREEN, textAlign: "right" }}>
                  Rs. {r.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedRecords.totalPages > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
            <span style={{ fontSize: 13, color: "#888" }}>Page {page} of {paginatedRecords.totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={actionBtn(GREEN, page === 1)}><ChevronLeft size={16} /> Prev</button>
              <button disabled={!paginatedRecords.hasMore} onClick={() => setPage(p => p + 1)} style={actionBtn(GREEN, !paginatedRecords.hasMore)}>Next <ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {showManualRevenueForm && (
        <FormModal title="Add Manual Revenue" onClose={() => setShowManualRevenueForm(false)} onSubmit={handleManualRevenueSubmit} err="">
          <FormField label="Customer / Payer Name" type="text" value={manualRevenueForm.customerName} onChange={(v) => setManualRevenueForm({ ...manualRevenueForm, customerName: v })} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Item Type</label>
            <select value={manualRevenueForm.itemType} onChange={(e) => setManualRevenueForm({ ...manualRevenueForm, itemType: e.target.value as any })} style={selectStyle}>
              <option value="other">Other / Manual</option>
              <option value="membership">Membership</option>
              <option value="business_sponsorship">Business Sponsorship</option>
              <option value="matrimonial_featured">Matrimonial Featured</option>
            </select>
          </div>
          <FormField label="Item Name / Description" type="text" value={manualRevenueForm.itemName} onChange={(v) => setManualRevenueForm({ ...manualRevenueForm, itemName: v })} />
          <FormField label="Amount & Frequency (e.g., '1000' or 'Rs 5000 / year')" type="text" value={manualRevenueForm.feeString} onChange={(v) => setManualRevenueForm({ ...manualRevenueForm, feeString: v })} />
        </FormModal>
      )}
    </div>
  );
}

// ── Admin Users Tab ───────────────────────────────────────────────────────────
function AdminsTab() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/auth/admin/list", {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("araian_admin_token")}` }
      });
      if (res.ok) setAdmins(await res.json());
    } catch (e) { } finally { setLoading(false); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    try {
      const res = await fetch("/api/auth/admin/reset-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("araian_admin_token")}`
        },
        body: JSON.stringify({ targetAdminId: resetId, newPassword })
      });
      if (res.ok) {
        alert("Password updated successfully!");
        setResetId(null);
        setNewPassword("");
        setError("");
      } else {
        setError("Failed to update password");
      }
    } catch (e) {
      setError("An error occurred");
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading admins...</div>;

  return (
    <div>
      <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: "0 0 24px 0" }}>Admin Users</h2>
      <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f5ef" }}>
              <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase" }}>Username / Email</th>
              <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase" }}>Role</th>
              <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a, i) => (
              <tr key={a.id} style={{ borderTop: "1px solid #f5f5f5", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "14px 16px", color: GREEN, fontWeight: 600, fontSize: 14 }}>{a.username}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, textTransform: "capitalize" }}>
                    {a.role.replace("_", " ")}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <button onClick={() => setResetId(a.id)} style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetId && (
        <FormModal title="Reset Admin Password" onClose={() => { setResetId(null); setError(""); }} onSubmit={handleReset as any} err={error}>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Enter a new password for <strong>{admins.find(a => a.id === resetId)?.username}</strong></p>
          <FormField label="New Password" type="password" value={newPassword} onChange={setNewPassword} />
        </FormModal>
      )}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export function AdminPage() {
  const { isAdmin } = useAdmin();
  return isAdmin ? <Dashboard /> : <LoginScreen />;
}
