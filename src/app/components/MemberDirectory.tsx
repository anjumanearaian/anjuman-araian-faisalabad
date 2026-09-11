import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Briefcase, Crown, LockKeyhole, MapPin, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { requestMemberContact } from "../lib/memberStore";
import { useMember } from "../context/MemberContext";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type DirectoryCell = "all" | "male" | "women";

interface DirectoryRole {
  id: string;
  role: string;
  tier: number;
  category: string;
  period?: string | null;
}

interface DirectoryMember {
  id: string;
  memberNo: string;
  fullName: string;
  city?: string | null;
  occupation?: string | null;
  education?: string | null;
  designation?: string | null;
  membershipType?: string | null;
  memberCell?: "male" | "women" | string | null;
  photoUrl?: string | null;
  leadershipRoles?: DirectoryRole[];
}

function memberCell(member: DirectoryMember): "male" | "women" {
  return member.memberCell === "women" ? "women" : "male";
}

function membershipLabel(value?: string | null) {
  const labels: Record<string, string> = {
    ordinary: "Regular Member",
    life: "Life Member",
    patron: "Patron Member",
    overseas: "Overseas Member",
  };
  return labels[String(value || "").toLowerCase()] || value || "Member";
}

function normalized(value?: string | null) {
  return String(value || "").toLowerCase().replace(/[._/-]+/g, " ").replace(/\s+/g, " ").trim();
}

function rolePriority(role?: string | null) {
  const value = normalized(role);
  if (value === "president" || value.endsWith(" president")) return 0;
  if (value.includes("general secretary")) return 10;
  if (value.includes("senior vice president") || value.includes("senior vice chairman")) return 20;
  if (value.includes("vice president") || value.includes("vice chairman")) return 30;
  if (value.includes("joint secretary")) return 40;
  if (value.includes("finance secretary") || value.includes("treasurer")) return 50;
  if (value.includes("information secretary") || value.includes("media secretary")) return 60;
  if (value.includes("secretary")) return 70;
  if (value.includes("executive")) return 80;
  return 100;
}

function rolesForView(member: DirectoryMember, view: DirectoryCell) {
  const roles = [...(member.leadershipRoles || [])];
  if (view === "women") {
    const womenRoles = roles.filter((role) => normalized(role.category).includes("women"));
    if (womenRoles.length) return womenRoles;
  }
  return roles;
}

function primaryRole(member: DirectoryMember, view: DirectoryCell) {
  return rolesForView(member, view)
    .sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || rolePriority(a.role) - rolePriority(b.role) || a.role.localeCompare(b.role))[0] || null;
}

function directoryOrder(a: DirectoryMember, b: DirectoryMember, view: DirectoryCell) {
  const aRole = primaryRole(a, view);
  const bRole = primaryRole(b, view);
  if (aRole && !bRole) return -1;
  if (!aRole && bRole) return 1;
  if (aRole && bRole) {
    const tier = (aRole.tier ?? 99) - (bRole.tier ?? 99);
    if (tier) return tier;
    const role = rolePriority(aRole.role) - rolePriority(bRole.role);
    if (role) return role;
  }
  return String(a.memberNo || "").localeCompare(String(b.memberNo || ""), undefined, { numeric: true }) || a.fullName.localeCompare(b.fullName);
}

function maskedContact() {
  return "03XX •••••••";
}

export function MemberDirectory({
  currentMemberId,
  initialCell = "all",
  publicHeading = false,
}: {
  currentMemberId?: string;
  initialCell?: DirectoryCell;
  publicHeading?: boolean;
}) {
  const navigate = useNavigate();
  const { member: loggedInMember } = useMember();
  const [search, setSearch] = useState("");
  const [cell, setCell] = useState<DirectoryCell>(initialCell);
  const [allMembers, setAllMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);
  const [requestingMember, setRequestingMember] = useState<DirectoryMember | null>(null);
  const [requestReason, setRequestReason] = useState("Community coordination");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");

  useEffect(() => setCell(initialCell), [initialCell]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient<{ members: DirectoryMember[]; total: number }>("/leadership/member-directory")
      .then((res) => {
        if (!active) return;
        setAllMembers(res.members || []);
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
      .filter((member) => cell === "all" || memberCell(member) === cell)
      .filter((member) => {
        if (!q) return true;
        const roles = (member.leadershipRoles || []).map((role) => `${role.role} ${role.category}`).join(" ");
        return [member.fullName, member.memberNo, member.city, member.occupation, member.designation, member.membershipType, roles]
          .some((value) => String(value || "").toLowerCase().includes(q));
      })
      .sort((a, b) => directoryOrder(a, b, cell));
  }, [allMembers, search, cell]);

  const startContactRequest = (target: DirectoryMember) => {
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

  const selectedRole = selectedMember ? primaryRole(selectedMember, cell) : null;

  return (
    <div className="member-directory">
      <div className="directory-toolbar">
        <div>
          {!publicHeading && <h3>Member Directory</h3>}
          <p>{filteredMembers.length} approved member{filteredMembers.length === 1 ? "" : "s"} shown. Office-bearers are listed first by organizational hierarchy.</p>
        </div>
        <div className="directory-controls">
          <select value={cell} onChange={(event) => setCell(event.target.value as DirectoryCell)} aria-label="Filter members">
            <option value="all">All Members</option>
            <option value="male">General Members</option>
            <option value="women">Women Wing</option>
          </select>
          <div className="search-box">
            <Search size={16} />
            <input type="search" placeholder="Search name, ID, city, profession or role" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="directory-state">Loading member directory…</div>
      ) : loadError ? (
        <div className="directory-state error">{loadError}</div>
      ) : filteredMembers.length === 0 ? (
        <div className="directory-state">No members found for this search.</div>
      ) : (
        <div className="directory-shell">
          <div className="directory-head">
            <span>Member</span><span>Member ID</span><span>City</span><span>Membership</span><span>Profession</span><span>Contact</span>
          </div>
          {filteredMembers.map((member) => {
            const role = primaryRole(member, cell);
            const extraRoles = Math.max(0, rolesForView(member, cell).length - 1);
            return (
              <div className={`directory-row${role ? " office-bearer" : ""}`} key={member.id}>
                <button className="member-identity" onClick={() => setSelectedMember(member)} type="button">
                  <span className="member-avatar">
                    {member.photoUrl ? <img src={member.photoUrl} alt={member.fullName} /> : <UserRound size={22} />}
                  </span>
                  <span className="member-name-block">
                    <strong>{member.fullName}</strong>
                    {role ? (
                      <span className="role-line"><Crown size={12} /> {role.role}{extraRoles ? ` +${extraRoles}` : ""}</span>
                    ) : member.designation ? <small>{member.designation}</small> : null}
                  </span>
                </button>
                <div className="directory-cell member-id"><span className="mobile-label">Member ID</span>{member.memberNo || "—"}</div>
                <div className="directory-cell"><span className="mobile-label">City</span><MapPin size={13} /> {member.city || "Faisalabad"}</div>
                <div className="directory-cell"><span className="mobile-label">Membership</span><span className="membership-pill">{membershipLabel(member.membershipType)}</span></div>
                <div className="directory-cell profession"><span className="mobile-label">Profession</span><Briefcase size={13} /> {member.occupation || member.designation || "—"}</div>
                <div className="contact-cell">
                  <span className="masked-number"><LockKeyhole size={12} /> {maskedContact()}</span>
                  {member.id === (currentMemberId || loggedInMember?.id) ? <span className="own-contact">Your profile</span> : <button type="button" onClick={() => startContactRequest(member)}>Request Contact</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedMember && (
        <div className="directory-modal-backdrop" role="presentation" onMouseDown={() => setSelectedMember(null)}>
          <div className="directory-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedMember(null)} aria-label="Close"><X size={20} /></button>
            <div className="profile-heading">
              <span className="profile-avatar">{selectedMember.photoUrl ? <img src={selectedMember.photoUrl} alt={selectedMember.fullName} /> : <UserRound size={34} />}</span>
              <div>
                <h3>{selectedMember.fullName}</h3>
                <p>{selectedMember.memberNo || "Approved Member"}</p>
                <span className="verified-badge"><ShieldCheck size={12} /> Approved Member</span>
              </div>
            </div>
            <div className="profile-grid">
              {selectedRole && <div className="role-detail"><small>Organizational Role</small><strong>{selectedRole.role}</strong></div>}
              <div><small>City</small><strong>{selectedMember.city || "—"}</strong></div>
              <div><small>Membership</small><strong>{membershipLabel(selectedMember.membershipType)}</strong></div>
              <div><small>Profession</small><strong>{selectedMember.occupation || "—"}</strong></div>
              <div><small>Professional Designation</small><strong>{selectedMember.designation || "—"}</strong></div>
            </div>
            {(selectedMember.leadershipRoles || []).length > 1 && (
              <div className="all-roles">
                <small>Other organizational responsibilities</small>
                <div>{(selectedMember.leadershipRoles || []).map((role) => <span key={role.id}>{role.role}</span>)}</div>
              </div>
            )}
            <div className="privacy-box">
              <div><LockKeyhole size={18} /><strong>Contact protected</strong></div>
              <p>Residential address, CNIC, email, phone number and company/business details are not published in the directory.</p>
              <div className="protected-contact">{maskedContact()}</div>
              {selectedMember.id !== (currentMemberId || loggedInMember?.id) && <button onClick={() => { setSelectedMember(null); startContactRequest(selectedMember); }}>Request Contact</button>}
            </div>
          </div>
        </div>
      )}

      {requestingMember && (
        <div className="directory-modal-backdrop" role="presentation" onMouseDown={() => !requestBusy && setRequestingMember(null)}>
          <div className="directory-modal request-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close-modal" onClick={() => setRequestingMember(null)} disabled={requestBusy} aria-label="Close"><X size={20} /></button>
            <h3>Request Contact</h3>
            <p className="request-intro">Requesting contact details for <strong>{requestingMember.fullName}</strong> ({requestingMember.memberNo}). Your approved member identity will be attached to the request.</p>
            <label htmlFor="contact-reason">Reason for contact</label>
            <select id="contact-reason" value={requestReason} onChange={(event) => setRequestReason(event.target.value)} disabled={requestBusy}>
              <option>Community coordination</option><option>Welfare matter</option><option>Professional networking</option><option>Event or committee matter</option><option>Other legitimate purpose</option>
            </select>
            {requestStatus && <div className="request-status">{requestStatus}</div>}
            <button className="submit-request" onClick={submitContactRequest} disabled={requestBusy || Boolean(requestStatus && requestStatus.toLowerCase().includes("sent"))}>{requestBusy ? "Submitting…" : "Submit Request"}</button>
          </div>
        </div>
      )}

      <style>{`
        .directory-toolbar{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px;gap:16px;flex-wrap:wrap}.directory-toolbar h3{color:${GREEN};font-family:'Playfair Display',serif;font-size:22px;font-weight:700;margin:0 0 5px}.directory-toolbar p{margin:0;color:#777;font-size:13px;line-height:1.5}.directory-controls{display:flex;gap:9px;flex-wrap:wrap;align-items:center}.directory-controls select{border:1px solid #d9dfdc;border-radius:9px;padding:10px 12px;color:${GREEN};background:#fff;font-weight:600}.search-box{position:relative}.search-box svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#8a8a8a}.search-box input{padding:10px 14px 10px 36px;border-radius:9px;border:1px solid #d9dfdc;font-size:13px;width:320px;max-width:76vw;outline:none;font-family:'Lato',sans-serif}.directory-state{padding:44px;text-align:center;color:#777;background:#fff;border-radius:14px;border:1px dashed #dcdcdc}.directory-state.error{color:#9f2d2d;background:#fff8f8}.directory-shell{background:#fff;border:1px solid #e7ebe8;border-radius:14px;overflow:hidden;box-shadow:0 3px 18px rgba(25,58,40,.06)}.directory-head,.directory-row{display:grid;grid-template-columns:minmax(245px,1.55fr) minmax(130px,.85fr) minmax(120px,.75fr) minmax(135px,.85fr) minmax(150px,1fr) minmax(185px,1.05fr);align-items:center;gap:12px}.directory-head{padding:13px 18px;background:#f8f6f0;color:#6b6b6b;font-size:11px;font-weight:800;letter-spacing:.045em;text-transform:uppercase}.directory-row{min-height:78px;padding:10px 18px;border-top:1px solid #eef0ef}.directory-row.office-bearer{background:linear-gradient(90deg,rgba(200,160,74,.08),rgba(255,255,255,0) 42%);border-left:3px solid ${GOLD}}.directory-row:hover{background-color:#fcfdfc}.member-identity{display:flex;align-items:center;gap:12px;padding:0;border:0;background:none;text-align:left;cursor:pointer;color:${GREEN};font-family:inherit}.member-name-block{min-width:0}.member-identity strong{display:block;font-family:'Playfair Display',serif;font-size:15px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.member-identity small{display:block;margin-top:4px;color:#858585;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.role-line{display:flex;align-items:center;gap:4px;margin-top:5px;color:#9a762c;font-size:11px;font-weight:800}.member-avatar{width:48px;height:48px;border-radius:50%;border:2px solid #d6bd7d;background:#f1f6f3;color:${GREEN};display:grid;place-items:center;overflow:hidden;flex:0 0 48px}.member-avatar img,.profile-avatar img{width:100%;height:100%;object-fit:cover}.directory-cell{display:flex;align-items:center;gap:5px;color:#555;font-size:12px;min-width:0}.member-id{color:${GREEN};font-weight:700;font-size:11px}.membership-pill{display:inline-block;background:#eef6f1;color:${GREEN};border-radius:20px;padding:5px 9px;font-size:11px;font-weight:700}.profession{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.contact-cell{display:flex;flex-direction:column;align-items:flex-start;gap:6px}.masked-number{display:flex;align-items:center;gap:5px;color:#777;font-size:11px;letter-spacing:.03em}.contact-cell button,.privacy-box button{border:1px solid rgba(26,77,46,.25);background:#f0f7f3;color:${GREEN};border-radius:7px;padding:6px 9px;font-size:11px;font-weight:800;cursor:pointer}.own-contact{color:#7a7a7a;font-size:11px;font-weight:700}.mobile-label{display:none}.directory-modal-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(13,27,20,.58);backdrop-filter:blur(2px)}.directory-modal{position:relative;width:min(590px,100%);background:#fff;border-radius:18px;padding:28px;box-shadow:0 24px 70px rgba(0,0,0,.24)}.close-modal{position:absolute;right:18px;top:18px;border:0;background:none;color:#888;cursor:pointer}.profile-heading{display:flex;gap:17px;align-items:center;padding-right:30px}.profile-avatar{width:82px;height:82px;flex:0 0 82px;border-radius:50%;overflow:hidden;border:3px solid ${GOLD};display:grid;place-items:center;background:#f3f6f4;color:${GREEN}}.profile-heading h3,.request-modal h3{margin:0 0 5px;color:${GREEN};font-family:'Playfair Display',serif;font-size:22px}.profile-heading p{margin:0 0 8px;color:#858585;font-size:12px}.verified-badge{display:inline-flex;align-items:center;gap:4px;color:#1b7b44;background:#eaf7ef;border-radius:20px;padding:4px 8px;font-size:10px;font-weight:800}.profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:24px 0}.profile-grid>div{border:1px solid #eceeec;border-radius:10px;padding:12px}.profile-grid .role-detail{background:#fffbef;border-color:#ead9a7}.profile-grid small,.all-roles small{display:block;color:#8a8a8a;font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}.profile-grid strong{color:#333;font-size:13px}.all-roles{margin:-10px 0 18px}.all-roles div{display:flex;gap:7px;flex-wrap:wrap}.all-roles span{background:#f8f6f0;color:${GREEN};border-radius:18px;padding:5px 9px;font-size:11px;font-weight:700}.privacy-box{background:#f8f6f0;border-radius:12px;padding:16px}.privacy-box>div:first-child{display:flex;align-items:center;gap:7px;color:${GREEN}}.privacy-box p{margin:8px 0 12px;color:#777;font-size:12px;line-height:1.55}.protected-contact{margin-bottom:10px;font-weight:800;letter-spacing:.05em;color:#555}.request-intro{color:#666;line-height:1.6;font-size:13px;margin:8px 0 18px;padding-right:18px}.request-modal label{display:block;color:${GREEN};font-size:12px;font-weight:800;margin-bottom:7px}.request-modal select{width:100%;padding:11px 12px;border:1px solid #d9dfdc;border-radius:9px;background:#fff;font:inherit;font-size:13px}.request-status{margin-top:12px;padding:10px 12px;background:#f0f7f3;color:${GREEN};border-radius:8px;font-size:12px;line-height:1.45}.submit-request{width:100%;margin-top:16px;padding:11px;border:0;border-radius:9px;background:${GREEN};color:#fff;font-weight:800;cursor:pointer}.submit-request:disabled{opacity:.6;cursor:not-allowed}@media(max-width:860px){.directory-shell{background:transparent;border:0;box-shadow:none;overflow:visible}.directory-head{display:none}.directory-row{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;margin-bottom:12px;padding:16px;background:#fff;border:1px solid #e7ebe8;border-radius:12px;box-shadow:0 2px 9px rgba(25,58,40,.04)}.directory-row.office-bearer{border-left:3px solid ${GOLD}}.member-identity{grid-column:1/-1;padding-bottom:10px;border-bottom:1px solid #f0f1f0}.directory-cell{display:block;font-size:12px}.directory-cell svg{display:none}.mobile-label{display:block;margin-bottom:3px;color:#999;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.profession{white-space:normal}.contact-cell{grid-column:1/-1;flex-direction:row;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid #f0f1f0}}@media(max-width:520px){.directory-row{grid-template-columns:1fr}.directory-cell,.contact-cell{grid-column:1}.profile-grid{grid-template-columns:1fr}.directory-modal{padding:24px 20px}.profile-avatar{width:68px;height:68px;flex-basis:68px}}
      `}</style>
    </div>
  );
}
