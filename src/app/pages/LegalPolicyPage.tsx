import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const UPDATED = "28 September 2026";

type Section = { heading: string; body: React.ReactNode };
type Policy = { title: string; subtitle: string; intro: string; sections: Section[] };

const policies: Record<string, Policy> = {
  privacy: {
    title: "Privacy Policy",
    subtitle: "How Anjuman-e-Araian Faisalabad handles personal information",
    intro: "This policy explains how information is collected, used, protected and retained across membership, business, matrimonial, governance, finance and other community services.",
    sections: [
      { heading: "Information we collect", body: <p>Depending on the service, we may collect identity and contact details, membership information, family information voluntarily supplied by the applicant, business information, private matrimonial profile data, uploaded photographs and documents, payment receipts, and records needed to operate Anjuman services.</p> },
      { heading: "How we use information", body: <p>Information is used to process applications, verify identity and eligibility, administer membership and services, maintain official records, review payments, communicate with applicants and members, prevent misuse, improve operations, and comply with lawful organizational obligations.</p> },
      { heading: "Matrimonial and sensitive information", body: <p>Matrimonial information, private photographs, contact details and supporting documents are handled as restricted information. Public visibility is limited by the privacy choices and approval workflow of the service. Compatibility tools are decision-support only and do not guarantee suitability.</p> },
      { heading: "Payment records", body: <p>Payment receipts and related verification records are used for finance review and audit. A submitted payment proof does not become an official ledger receipt until it is verified by authorized Finance/Accounts personnel.</p> },
      { heading: "Sharing and access", body: <p>Access is limited to authorized personnel according to their operational role. We do not sell personal information. Information may be disclosed when required by law, to protect users or the organization, or to service providers acting on our behalf under appropriate safeguards.</p> },
      { heading: "Security and retention", body: <p>We use access controls, restricted admin roles, audit records and technical safeguards appropriate to the service. Records are retained for as long as reasonably required for operational, legal, governance or audit purposes, after which they may be deleted or anonymized where appropriate.</p> },
      { heading: "Your choices", body: <p>You may request correction of inaccurate information, ask about the information associated with your account, or request review of privacy settings by contacting Anjuman through the official Contact page. Some official, audit or legal records may need to be retained.</p> },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    subtitle: "Rules for using the official Anjuman digital platform",
    intro: "By using this website or submitting an application, you agree to provide accurate information and use the platform lawfully and respectfully.",
    sections: [
      { heading: "Official platform", body: <p>This website supports Anjuman-e-Araian Faisalabad services including membership, community information, business listings, matrimonial services, governance and finance administration. Availability of a feature does not create an automatic entitlement to approval or service.</p> },
      { heading: "Applications and approvals", body: <p>Membership, business listings, matrimonial profiles and other submissions may be reviewed, verified, returned for correction, approved, rejected, suspended or archived according to the relevant service rules and organizational authority.</p> },
      { heading: "User responsibilities", body: <p>You must not submit false, misleading, unlawful, abusive or unauthorized information; impersonate another person; upload material you do not have permission to use; attempt to bypass access controls; or misuse private information obtained through the platform.</p> },
      { heading: "Accounts and access", body: <p>You are responsible for maintaining control of your sign-in method and for activity performed through your account. Administrative access is role-based and may be changed or withdrawn when responsibilities change.</p> },
      { heading: "Content and listings", body: <p>Business and community listings are provided for information and networking. Anjuman may edit formatting, remove prohibited material, correct obvious errors, or withdraw content that conflicts with organizational rules or applicable law.</p> },
      { heading: "Changes", body: <p>Services and these terms may be updated as operational, security or legal requirements change. The latest published version applies from its stated update date.</p> },
    ],
  },
  cookies: {
    title: "Cookie & Local Storage Policy",
    subtitle: "How browser storage is used on this website",
    intro: "The website uses browser storage and similar technologies where necessary to provide secure sign-in, preserve form progress and operate site features.",
    sections: [
      { heading: "Essential storage", body: <p>Essential cookies or local storage may be used for authentication, session continuity, saved form drafts, security controls, interface preferences and preventing repeated setup steps.</p> },
      { heading: "Analytics or advertising", body: <p>If optional analytics, advertising or similar measurement tools are introduced, they should be configured in accordance with applicable consent and disclosure requirements. Essential service storage is not used as a substitute for unnecessary tracking.</p> },
      { heading: "Your controls", body: <p>You can clear cookies and local storage through your browser settings. Doing so may sign you out, remove locally saved drafts or reset preferences.</p> },
    ],
  },
  payments: {
    title: "Payment & Refund Policy",
    subtitle: "How fees, verification and refunds are handled",
    intro: "Only payment details shown on the official website or confirmed by authorized Anjuman personnel should be used for payments.",
    sections: [
      { heading: "Payment verification", body: <p>Uploading a receipt or payment proof creates a verification record only. It does not by itself mean that payment has been accepted. Finance/Accounts must verify the payment before it is posted to the official ledger.</p> },
      { heading: "Incorrect or rejected proof", body: <p>If a payment proof cannot be verified, the applicant may be asked to submit a corrected receipt or additional information. Rejected or pending proofs do not count as official revenue until verified.</p> },
      { heading: "Internal transfers", body: <p>Transfers between authorized Anjuman custodians or accounts are internal movements of the same organizational funds. They do not create new income or expense and are recorded separately for custody and audit purposes.</p> },
      { heading: "Refund requests", body: <p>Refund eligibility depends on the nature of the fee, the service status and the applicable organizational decision. Refund requests should be submitted through the Contact page with the payment reference and reason. Approval of a refund is not automatic unless required by applicable law or an expressly stated service rule.</p> },
    ],
  },
  disclaimer: {
    title: "Website Disclaimer",
    subtitle: "Important information about website content and services",
    intro: "This website is an official digital platform of Anjuman-e-Araian Faisalabad, but published information should be read in its proper context.",
    sections: [
      { heading: "General information", body: <p>News, notices, directories and community information are provided in good faith. Although reasonable efforts are made to keep information accurate, administrative records and official decisions take precedence where there is a discrepancy.</p> },
      { heading: "Business directory", body: <p>Listing a business does not constitute a guarantee, warranty or endorsement of its products or services. Users should make their own commercial decisions and checks.</p> },
      { heading: "Matrimonial service", body: <p>Compatibility indicators, profiles and introductions are facilitation tools only. They do not constitute a guarantee of compatibility, character, future conduct, marriage outcome or suitability. Participants and families remain responsible for their own verification and decisions.</p> },
      { heading: "External links", body: <p>Links to third-party websites or services are provided for convenience. Anjuman is not responsible for third-party content, availability, privacy practices or transactions.</p> },
    ],
  },
};

export function LegalPolicyPage({ type }: { type: keyof typeof policies }) {
  const policy = policies[type];
  return <div>
    <PageHeader title={policy.title} subtitle={policy.subtitle} breadcrumb={["Home", policy.title]} />
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "44px 24px 70px" }}>
      <article style={{ background: "white", border: "1px solid #e8e2d9", borderRadius: 16, padding: "34px 36px", boxShadow: "0 8px 30px rgba(26,77,46,.06)" }}>
        <div style={{ borderLeft: `4px solid ${GOLD}`, paddingLeft: 16, marginBottom: 28 }}>
          <p style={{ margin: 0, color: "#4f5d55", lineHeight: 1.75, fontSize: 14 }}>{policy.intro}</p>
          <div style={{ marginTop: 8, color: "#8a8f8b", fontSize: 11 }}>Last updated: {UPDATED}</div>
        </div>
        {policy.sections.map((section) => <section key={section.heading} style={{ marginTop: 26 }}>
          <h2 style={{ margin: "0 0 8px", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20 }}>{section.heading}</h2>
          <div style={{ color: "#56625b", fontSize: 13.5, lineHeight: 1.8 }}>{section.body}</div>
        </section>)}
        <div style={{ marginTop: 34, paddingTop: 20, borderTop: "1px solid #eee7dc", color: "#657168", fontSize: 12.5, lineHeight: 1.75 }}>
          Questions about this policy can be submitted through the <Link to="/contact" style={{ color: GREEN, fontWeight: 800 }}>official Contact page</Link>.
        </div>
      </article>
    </main>
  </div>;
}
