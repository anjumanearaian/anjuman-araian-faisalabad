import { BarChart3, Brain, CalendarClock, CheckCircle2, Info } from "lucide-react";
import {
  BEHAVIOR_QUESTIONS,
  BehaviorAnswers,
  BehaviorKey,
  TIMELINE_FLEXIBILITY_OPTIONS,
  TIMELINE_UNITS,
  TimelineFlexibility,
  TimelineUnit,
  scoreBand,
} from "../../lib/matrimonialCompatibility";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function TimelineField({ value, unit, flexibility, onValue, onUnit, onFlexibility }: {
  value: string;
  unit: TimelineUnit;
  flexibility: TimelineFlexibility;
  onValue: (value: string) => void;
  onUnit: (value: TimelineUnit) => void;
  onFlexibility: (value: TimelineFlexibility) => void;
}) {
  return <div style={box}>
    <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 7 }}><CalendarClock size={15} color={GOLD}/><strong style={label}>Marriage Timeline</strong></div>
    <div lang="ur" dir="rtl" style={urdu}>شادی کا متوقع وقت عدد اور مدت کے ساتھ درج کریں تاکہ میچنگ میں خودکار طور پر موازنہ ہو سکے۔</div>
    <div className="timeline-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 8 }}>
      <input inputMode="numeric" min={1} max={3650} type="number" value={value} onChange={(e) => onValue(e.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 6" style={input}/>
      <select value={unit} onChange={(e) => onUnit(e.target.value as TimelineUnit)} style={input}>{TIMELINE_UNITS.map((x) => <option key={x.value} value={x.value}>{x.label} · {x.urdu}</option>)}</select>
    </div>
    <select value={flexibility} onChange={(e) => onFlexibility(e.target.value as TimelineFlexibility)} style={{ ...input, marginTop: 7 }}>{TIMELINE_FLEXIBILITY_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label} · {x.urdu}</option>)}</select>
  </div>;
}

export function BehaviorQuestionnaire({ answers, onChange, compact = false }: {
  answers: BehaviorAnswers;
  onChange: (key: BehaviorKey, value: number | undefined) => void;
  compact?: boolean;
}) {
  const answered = BEHAVIOR_QUESTIONS.filter((q) => Number(answers?.[q.key]) >= 1).length;
  return <details style={{ ...box, padding: 0 }}>
    <summary style={{ cursor: "pointer", listStyle: "none", padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div><div style={{ display: "flex", gap: 7, alignItems: "center" }}><Brain size={15} color={GOLD}/><strong style={label}>Quick Compatibility Questions</strong></div><div lang="ur" dir="rtl" style={{ ...urdu, marginTop: 4 }}>یہ نفسیاتی ٹیسٹ نہیں۔ صرف طرزِ زندگی اور بات چیت کے انداز کا مختصر خاکہ ہے، جس سے میچنگ بہتر ہوتی ہے۔</div></div>
      <span style={{ background: answered === BEHAVIOR_QUESTIONS.length ? "#dcfce7" : "#f3f4f6", color: answered === BEHAVIOR_QUESTIONS.length ? "#166534" : "#555", padding: "4px 8px", borderRadius: 18, fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{answered}/{BEHAVIOR_QUESTIONS.length}</span>
    </summary>
    <div style={{ borderTop: "1px solid #eee", padding: compact ? 10 : 12, display: "grid", gap: 9 }}>
      {BEHAVIOR_QUESTIONS.map((q) => {
        const value = Number(answers?.[q.key] || 0);
        return <div key={q.key} style={{ border: "1px solid #edf0ed", borderRadius: 9, padding: 9 }}>
          <div style={{ color: GREEN, fontSize: 10, fontWeight: 800 }}>{q.label}</div>
          <div lang="ur" dir="rtl" style={{ color: "#708078", fontSize: 9, lineHeight: 1.5, marginTop: 2 }}>{q.urdu}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginTop: 7 }}>
            <span style={{ color: "#888", fontSize: 8 }}>{q.low}</span>
            <div style={{ display: "flex", gap: 4 }}>{[1,2,3,4,5].map((n) => <button type="button" key={n} onClick={() => onChange(q.key, value === n ? undefined : n)} aria-label={`${q.label} ${n}`} style={{ width: 27, height: 27, borderRadius: "50%", border: `1px solid ${value === n ? GREEN : "#d8dfda"}`, background: value === n ? GREEN : "white", color: value === n ? "white" : GREEN, fontSize: 9, fontWeight: 900, cursor: "pointer" }}>{n}</button>)}</div>
            <span style={{ color: "#888", fontSize: 8, textAlign: "right" }}>{q.high}</span>
          </div>
        </div>;
      })}
      <div style={{ background: "#f8faf9", borderRadius: 8, padding: 8, color: "#6a756e", fontSize: 9, lineHeight: 1.55 }}><Info size={11} style={{ verticalAlign: "-2px", marginRight: 4 }}/>These answers are optional and private. They are used as a soft compatibility signal, not as a diagnosis or automatic decision.</div>
    </div>
  </details>;
}

export function ReadinessPanel({ readiness, title = "Profile Readiness" }: { readiness: { overall:number; core:number; profile:number; preferences:number; behavior:number }; title?: string }) {
  return <div style={{ background: "white", border: "1px solid #e3e8e4", borderRadius: 11, padding: 12, marginBottom: 14, boxShadow: "0 3px 14px rgba(0,0,0,.035)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div><strong style={{ color: GREEN, fontSize: 12 }}>{title}</strong><div lang="ur" dir="rtl" style={{ color: "#778078", fontSize: 9, marginTop: 2 }}>جتنی مکمل معلومات ہوں گی، میچنگ اتنی واضح اور قابلِ اعتماد ہوگی۔</div></div><div style={{ fontSize: 22, color: GREEN, fontWeight: 900 }}>{readiness.overall}%</div></div>
    <div style={{ height: 8, background: "#edf1ee", borderRadius: 10, overflow: "hidden", marginTop: 8 }}><div style={{ width: `${Math.max(0,Math.min(100,readiness.overall))}%`, height: "100%", background: GREEN, borderRadius: 10 }}/></div>
    <div className="readiness-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 8 }}><MiniProgress label="Required" value={readiness.core}/><MiniProgress label="Profile" value={readiness.profile}/><MiniProgress label="Preferences" value={readiness.preferences}/><MiniProgress label="Behavior" value={readiness.behavior}/></div>
  </div>;
}

function MiniProgress({ label, value }: { label:string; value:number }) {
  return <div style={{ background: "#fafbfa", borderRadius: 7, padding: 6 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 4, color: "#777", fontSize: 8 }}><span>{label}</span><b>{value}%</b></div><div style={{ height: 4, borderRadius: 5, background: "#e7ece8", overflow: "hidden", marginTop: 4 }}><div style={{ width: `${value}%`, height: "100%", background: value >= 80 ? GREEN : GOLD }}/></div></div>;
}

export function MatchScoreGraph({ mutual = 0, forward = 0, reverse = 0, confidence = 0, categories }: {
  mutual?: number;
  forward?: number;
  reverse?: number;
  confidence?: number;
  categories?: Record<string, number | undefined>;
}) {
  const categoryEntries = Object.entries(categories || {}).filter(([,v]) => typeof v === "number") as Array<[string,number]>;
  return <div style={{ ...box, marginTop: 10 }}><div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}><BarChart3 size={14} color={GOLD}/><strong style={{ color: GREEN, fontSize: 11 }}>Compatibility Graph · {scoreBand(mutual)}</strong></div><ScoreBar label="Overall Mutual Match" value={mutual}/><ScoreBar label="Your preference fit" value={forward}/><ScoreBar label="Their preference fit" value={reverse}/><ScoreBar label="Data confidence" value={confidence} muted/>{categoryEntries.map(([k,v]) => <ScoreBar key={k} label={prettyCategory(k)} value={v}/>)}</div>;
}

export function MatchDistribution({ scores }: { scores: number[] }) {
  const groups = [
    { label: "80%+ Excellent", min: 80, max: 101 },
    { label: "70–79% Strong", min: 70, max: 80 },
    { label: "55–69% Good", min: 55, max: 70 },
    { label: "Below 55% Broader", min: 0, max: 55 },
  ];
  const max = Math.max(1, ...groups.map((g) => scores.filter((s) => s >= g.min && s < g.max).length));
  return <div style={{ ...box, marginBottom: 13 }}><div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}><BarChart3 size={14} color={GOLD}/><strong style={{ color: GREEN, fontSize: 11 }}>Available Match Distribution</strong><span style={{ marginLeft: "auto", color: "#777", fontSize: 9 }}>{scores.length} profiles</span></div>{groups.map((g) => { const count = scores.filter((s) => s >= g.min && s < g.max).length; return <div key={g.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr 30px", gap: 7, alignItems: "center", marginTop: 6 }}><span style={{ color: "#666", fontSize: 9 }}>{g.label}</span><div style={{ height: 7, background: "#edf1ee", borderRadius: 8, overflow: "hidden" }}><div style={{ width: `${count/max*100}%`, minWidth: count ? 5 : 0, height: "100%", background: GREEN }}/></div><b style={{ color: GREEN, fontSize: 9, textAlign: "right" }}>{count}</b></div>})}</div>;
}

function ScoreBar({ label, value, muted = false }: { label:string; value:number; muted?:boolean }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return <div style={{ display: "grid", gridTemplateColumns: "145px 1fr 34px", gap: 7, alignItems: "center", marginTop: 6 }}><span style={{ color: muted ? "#888" : "#59665e", fontSize: 9 }}>{label}</span><div style={{ height: 7, background: "#edf1ee", borderRadius: 8, overflow: "hidden" }}><div style={{ width: `${safe}%`, height: "100%", background: muted ? "#94a3b8" : safe >= 70 ? GREEN : GOLD }}/></div><b style={{ color: muted ? "#64748b" : GREEN, fontSize: 9, textAlign: "right" }}>{safe}%</b></div>;
}

function prettyCategory(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
}

const box: React.CSSProperties = { border: "1px solid #e7e2d9", borderRadius: 10, padding: 11, background: "#fff" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d7dfd9", borderRadius: 7, padding: "9px 10px", background: "white", color: "#2e3d34", fontSize: 11 };
const label: React.CSSProperties = { color: GREEN, fontSize: 11, fontWeight: 800 };
const urdu: React.CSSProperties = { color: "#708078", fontSize: 9, lineHeight: 1.55, textAlign: "right" };
