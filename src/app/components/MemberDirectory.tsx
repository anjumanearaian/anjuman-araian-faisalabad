import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Briefcase, LockKeyhole, MapPin, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { fetchMemberDirectory, requestMemberContact } from "../lib/memberStore";
import type { Member } from "../lib/memberStore";
import { useMember } from "../context/MemberContext";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

function memberCell(member: Member) {
  return member.memberCell || (member.gender === "female" ? "women" : "male");
}

function membershipLabel(value?: string) {
  const labels: Record<string, string> = {
    ordinary: "Regular Member",
    life: "Life Member",
    patron: "Patron Member",
    overseas: "Overseas Member",
  };
  return labels[String(value || "").toLowerCase()] || value || "Member";
}

function maskedContact(member: Member) {
  const raw = String(member.whatsapp || member.phone || "").replace(/\D/g, "");
  if (raw.length >= 4) return `${raw.slice(0, Math.min(4, raw.length))} •••••••`;
  return "03XX •••••••";
}

export function MemberDirectory({
  currentMemberId,
  initialCell = "all",
  publicHeading = false,
}: {
  currentMemberId?: string;
  initialCell?: "all" | "male" | "women";
  publicHeading?: boolean;
}) {
  const navigate = useNavigate();
  const { member: loggedInMember } = useMember();
  const [search, setSearch] = useState("");
  const [cell, setCell] = useState<"all" | "male" | "women">(initialCell);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [requestingMember, setRequestingMember] = useState<Member | null>(null);
  const [requestReason, setRequestReason] = useState("Community coordination");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");

  useEffect(() => {
    setCell(initialCell);
  }, [initialCell]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMemberDirectory(100)
      .then((res) => {
        if (!active) return;
        setAllMembers(res.data);
        setLoadError("");
      })
      .catch(() => {
        if (!active) return;
        setLoadError("Member directory could not be loaded. Please try again.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMembers
      .filter((m) => cell === "all" || memberCell(m) === cell)
      .filter((m) => {
        if (!q) return true;
        return [m.fullName, m.memberNo, m.city, m.occupation, m.designation, m.membershipType]
          .some((value) => String(value || "").toLowerCase().includes(q));
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [allMembers, search, cell]);

  const startContactRequest = (target: Member) => {
    if (!loggedInMember) {
      navigate("/member/login");
      return;
    }
    if (target.id === (currentMemberId || loggedInMember.id)) return;
    setRequestStatus("");
    setRequestReason("Community coordination");
    setRequestingMember(target);
  };

  const submitContactRequest = async () => {
    if (!requestingMember) return;
    setRequestBusy(true);
    setRequestStatus("");
    try {
      const result = await requestMemberContact(requestingMember.id, requestReason);
      setRequestStatus(result.message || "Request submitted successfully.");
    } catch (error: any) {
      setRequestStatus(error?.message || "The request could not be submitted.");
    } finally {
      setRequestBusy(false);
    }
  };

  return (
    <div className="member-directory">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div>
          {!publicHeading && <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: "0 0 5px" }}>Member Directory</h3>}
          <p style={{ margin: 0, color: "#777", fontSize: 13 }}>
            {filteredMembers.length} member{filteredMembers.length === 1 ? "" : "s"} shown. Private contact information is protected.
          </p>
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={cell}
            onChange={(e) => setCell(e.target.value as "all" | "male" | "women")}
            aria-label="Filter members"
            style={{ border: "1px solid #d9dfdc", borderRadius: 9, padding: "10px 12px", color: GREEN, backgroundColor: "white", fontWeight: 600 }}
          >
            <option value="all">All Members</option>
            <option value="male">General Members</option>
            <option value="women">Women Wing</option>
          </select>
          <div style={{ position: "relative" }}>
            <Search size={16} color="#8a8a8a" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="search"
              placeholder="Search name, ID, city, profession"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "10px 14px 10px 36px", borderRadius: 9, border: "1px solid #d9dfdc", fontSize: 13, width: 285, maxWidth: "75vw", outline: "none", fontFamily: "'Lato', sans-serif" }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "#777", backgroundColor: "white", borderRadius: 14 }}>Loading member directory…</div>
      ) : loadError ? (
        <div style={{ padding: 32, textAlign: "center", color: "#9f2d2d", backgroundColor: "#fff8f8", borderRadius: 14 }}>{loadError}</div>
      ) : filteredMembers.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "#888", backgroundColor: "white", borderRadius: 14, border: "1px dashed #dcdcdc" }}>No members found for this search.</div>
      ) : (
        <div className="directory-shell">
          <div className="directory-head">
            <span>Member</span>
            <span>Member ID</span>
            <span>City</span>
            <span>Membership</span>
            <span>Profession</span>
            <span>Contact</span>
          </div>
          {filteredMembers.map((m) => (
            <div className="directory-row" key={m.id}>
              <button className="member-identity" onClick={() => setSelectedMember(m)} type="button">
                <span className="member-avatar">
                  {m.photoUrl ? <img src={m.photoUrl} alt={m.fullName} /> : <UserRound size={22} />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <strong>{m.fullName}</strong>
                  {m.designation && <small>{m.designation}</small>}
                </span>
              </button>
              <div className="directory-cell member-id"><span className="mobile-label">Member ID</span>{m.memberNo || "—"}</div>
              <div className="directory-cell"><span className="mobile-label">City</span><MapPin size={13} /> {m.city || "Faisalabad"}</div>
              <div className="directory-cell"><span className="mobile-label">Membership</span><span className="membership-pill">{membershipLabel(m.membershipType)}</span></div>
              <div className="directory-cell profession"><span className="mobile-label">Profession</span><Briefcase size={13} /> {m.occupation || "—"}</div>
              <div className="contact-cell">
                <span className="masked-number"><LockKeyhole size={12} /> {maskedContact(m)}</span>
                {m.id === (currentMemberId || loggedInMember?.id) ? (
                  <span className="own-contact">Your profile</span>
                ) : (
                  <button type="button" onClick={() => startContactRequest(m)}>Request Contact</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMember && (
        <div className="directory-modal-backdrop" role="presentation" onMouseDown={() => setSelectedMember(null)}>
          <div className="directory-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedMember(null)} aria-label="Close"><X size={20} /></button>
            <div className="profile-heading">
              <span className="profile-avatar">
                {selectedMember.photoUrl ? <img src={selectedMember.photoUrl} alt={selectedMember.fullName} /> : <UserRound size={34} />}
              </span>
              <div>
                <h3>{selectedMember.fullName}</h3>
                <p>{selectedMember.memberNo || "Approved Member"}</p>
                <span className="verified-badge"><ShieldCheck size={12} /> Approved Member</span>
              </div>
            </div>
            <div className="profile-grid">
              <div><small>City</small><strong>{selectedMember.city || "—"}</strong></div>
              <div><small>Membership</small><strong>{membershipLabel(selectedMember.membershipType)}</strong></div>
              <div><small>Profession</small><strong>{selectedMember.occupation || "—"}</strong></div>
              <div><small>Designation</small><strong>{selectedMember.designation || "—"}</strong></div>
            </div>
            <div className="privacy-box">
              <div><LockKeyhole size={18} /><strong>Contact protected</strong></div>
              <p>Residential address, CNIC, email and company/business details are not published in the directory.</p>
              <div className="protected-contact">{maskedContact(selectedMember)}</div>
              {selectedMember.id !== (currentMemberId || loggedInMember?.id) && (
                <button onClick={() => { setSelectedMember(null); startContactRequest(selectedMember); }}>Request Contact</button>
              )}
            </div>
          </div>
        </div>
      )}

      {requestingMember && (
        <div className="directory-modal-backdrop" role="presentation" onMouseDown={() => !requestBusy && setRequestingMember(null)}>
          <div className="directory-modal request-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setRequestingMember(null)} disabled={requestBusy} aria-label="Close"><X size={20} /></button>
            <h3>Request Contact</h3>
            <p className="request-intro">Requesting contact details for <strong>{requestingMember.fullName}</strong> ({requestingMember.memberNo}). Your member identity will be attached to the request.</p>
            <label htmlFor="contact-reason">Reason for contact</label>
            <select id="contact-reason" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} disabled={requestBusy}>
              <option>Community coordination</option>
              <option>Welfare matter</option>
              <option>Professional networking</option>
              <option>Event or committee matter</option>
              <option>Other legitimate purpose</option>
            </select>
            {requestStatus && <div className="request-status">{requestStatus}</div>}
            <button className="submit-request" onClick={submitContactRequest} disabled={requestBusy || Boolean(requestStatus && requestStatus.toLowerCase().includes("sent"))}>
              {requestBusy ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .directory-shell { background:#fff; border:1px solid #e7ebe8; border-radius:14px; overflow:hidden; box-shadow:0 3px 18px rgba(25,58,40,.06); }
        .directory-head, .directory-row { display:grid; grid-template-columns:minmax(245px,1.55fr) minmax(130px,.85fr) minmax(120px,.75fr) minmax(135px,.85fr) minmax(150px,1fr) minmax(185px,1.05fr); align-items:center; gap:12px; }
        .directory-head { padding:13px 18px; background:#f8f6f0; color:#6b6b6b; font-size:11px; font-weight:800; letter-spacing:.045em; text-transform:uppercase; }
        .directory-row { min-height:78px; padding:10px 18px; border-top:1px solid #eef0ef; }
        .directory-row:hover { background:#fcfdfc; }
        .member-identity { display:flex; align-items:center; gap:12px; padding:0; border:0; background:none; text-align:left; cursor:pointer; color:${GREEN}; font-family:inherit; }
        .member-identity strong { display:block; font-family:'Playfair Display',serif; font-size:15px; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .member-identity small { display:block; margin-top:4px; color:#858585; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .member-avatar { width:48px; height:48px; border-radius:50%; border:2px solid #d6bd7d; background:#f1f6f3; color:${GREEN}; display:grid; place-items:center; overflow:hidden; flex:0 0 48px; }
        .member-avatar img, .profile-avatar img { width:100%; height:100%; object-fit:cover; }
        .directory-cell { display:flex; align-items:center; gap:5px; color:#555; font-size:12px; min-width:0; }
        .member-id { color:${GREEN}; font-weight:700; font-size:11px; }
        .membership-pill { display:inline-block; background:#eef6f1; color:${GREEN}; border-radius:20px; padding:5px 9px; font-size:11px; font-weight:700; }
        .profession { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .contact-cell { display:flex; flex-direction:column; align-items:flex-start; gap:6px; }
        .masked-number { display:flex; align-items:center; gap:5px; color:#777; font-size:11px; letter-spacing:.03em; }
        .contact-cell button, .privacy-box button { border:1px solid rgba(26,77,46,.25); background:#f0f7f3; color:${GREEN}; border-radius:7px; padding:6px 9px; font-size:11px; font-weight:800; cursor:pointer; }
        .own-contact { color:#7a7a7a; font-size:11px; font-weight:700; }
        .mobile-label { display:none; }
        .directory-modal-backdrop { position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(13,27,20,.58); backdrop-filter:blur(2px); }
        .directory-modal { position:relative; width:min(560px,100%); background:#fff; border-radius:18px; padding:28px; box-shadow:0 24px 70px rgba(0,0,0,.24); }
        .close-modal { position:absolute; right:18px; top:18px; border:0; background:none; color:#888; cursor:pointer; }
        .profile-heading { display:flex; gap:17px; align-items:center; padding-right:30px; }
        .profile-avatar { width:82px; height:82px; flex:0 0 82px; border-radius:50%; overflow:hidden; border:3px solid ${GOLD}; display:grid; place-items:center; background:#f3f6f4; color:${GREEN}; }
        .profile-heading h3, .request-modal h3 { margin:0 0 5px; color:${GREEN}; font-family:'Playfair Display',serif; font-size:22px; }
        .profile-heading p { margin:0 0 8px; color:#858585; font-size:12px; }
        .verified-badge { display:inline-flex; align-items:center; gap:4px; color:#1b7b44; background:#eaf7ef; border-radius:20px; padding:4px 8px; font-size:10px; font-weight:800; }
        .profile-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:24px 0; }
        .profile-grid > div { border:1px solid #eceeec; border-radius:10px; padding:12px; }
        .profile-grid small { display:block; color:#8a8a8a; font-size:10px; text-transform:uppercase; letter-spacing:.05em; margin-bottom:5px; }
        .profile-grid strong { color:#333; font-size:13px; }
        .privacy-box { background:#f8f6f0; border-radius:12px; padding:16px; }
        .privacy-box > div:first-child { display:flex; align-items:center; gap:7px; color:${GREEN}; }
        .privacy-box p { margin:8px 0 12px; color:#777; font-size:12px; line-height:1.55; }
        .protected-contact { margin-bottom:10px; font-weight:800; letter-spacing:.05em; color:#555; }
        .request-intro { color:#666; line-height:1.6; font-size:13px; margin:8px 0 18px; padding-right:18px; }
        .request-modal label { display:block; color:${GREEN}; font-size:12px; font-weight:800; margin-bottom:7px; }
        .request-modal select { width:100%; padding:11px 12px; border:1px solid #d9dfdc; border-radius:9px; background:#fff; font:inherit; font-size:13px; }
        .request-status { margin-top:12px; padding:10px 12px; background:#f0f7f3; color:${GREEN}; border-radius:8px; font-size:12px; line-height:1.45; }
        .submit-request { width:100%; margin-top:16px; padding:11px; border:0; border-radius:9px; background:${GREEN}; color:white; font-weight:800; cursor:pointer; }
        .submit-request:disabled { opacity:.6; cursor:not-allowed; }
        @media (max-width: 860px) {
          .directory-shell { background:transparent; border:0; box-shadow:none; overflow:visible; }
          .directory-head { display:none; }
          .directory-row { display:grid; grid-template-columns:1fr 1fr; gap:10px 14px; margin-bottom:12px; padding:16px; background:#fff; border:1px solid #e7ebe8; border-radius:12px; box-shadow:0 2px 9px rgba(25,58,40,.04); }
          .member-identity { grid-column:1 / -1; padding-bottom:10px; border-bottom:1px solid #f0f1f0; }
          .directory-cell { display:block; font-size:12px; }
          .directory-cell svg { display:none; }
          .mobile-label { display:block; margin-bottom:3px; color:#999; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
          .profession { white-space:normal; }
          .contact-cell { grid-column:1 / -1; flex-direction:row; justify-content:space-between; align-items:center; padding-top:8px; border-top:1px solid #f0f1f0; }
        }
        @media (max-width: 520px) {
          .directory-row { grid-template-columns:1fr; }
          .directory-cell, .contact-cell { grid-column:1; }
          .profile-grid { grid-template-columns:1fr; }
          .directory-modal { padding:24px 20px; }
          .profile-avatar { width:68px; height:68px; flex-basis:68px; }
        }
      `}</style>
    </div>
  );
}
