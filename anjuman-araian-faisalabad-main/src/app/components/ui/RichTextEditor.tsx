import React, { useRef, useEffect, useState } from "react";
import { Bold, Italic, Highlighter, List, AlignRight } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const GOLD = "#c8a04a";

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isUrdu, setIsUrdu] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCmd = (cmd: string, arg: string = "") => {
    document.execCommand(cmd, false, arg);
    handleInput();
  };

  const editorStyle: React.CSSProperties = {
    minHeight: 180,
    border: "1px solid rgba(26,77,46,0.15)",
    borderRadius: "0 0 8px 8px",
    padding: "12px 14px",
    backgroundColor: "white",
    fontSize: isUrdu ? 18 : 14,
    lineHeight: 1.8,
    outline: "none",
    textAlign: "start",
    fontFamily: isUrdu ? "'Amiri', 'Noto Nastaliq Urdu', serif" : "'Poppins', sans-serif"
  };

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(26,77,46,0.15)" }}>
      {/* Toolbar */}
      <div style={{ backgroundColor: "#f8f5ef", borderBottom: "1px solid rgba(26,77,46,0.15)", padding: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => execCmd("bold")} style={btnStyle} title="Bold"><Bold size={15} /></button>
        <button type="button" onClick={() => execCmd("italic")} style={btnStyle} title="Italic"><Italic size={15} /></button>
        <button type="button" onClick={() => execCmd("backColor", "#fef08a")} style={btnStyle} title="Highlight"><Highlighter size={15} /></button>
        <button type="button" onClick={() => execCmd("insertUnorderedList")} style={btnStyle} title="Bullet List"><List size={15} /></button>
        <button type="button" onClick={() => setIsUrdu(!isUrdu)} style={{ ...btnStyle, backgroundColor: isUrdu ? GOLD : "transparent", color: isUrdu ? "white" : "#1a4d2e" }} title="Urdu Mode (Larger Font)"><AlignRight size={15} /> <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 3 }}>Urdu</span></button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        style={editorStyle}
        data-placeholder={placeholder}
        dir={isUrdu ? "rtl" : "auto"}
      />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  padding: "5px 8px",
  color: "#1a4d2e",
  display: "flex",
  alignItems: "center"
};
