import { useEffect } from "react";
import {
  MATRIMONIAL_EMPLOYER_TYPE_OPTIONS,
  MATRIMONIAL_HOBBY_OPTIONS,
  MATRIMONIAL_LANGUAGE_OPTIONS,
  MATRIMONIAL_NATIONALITY_OPTIONS,
  MATRIMONIAL_PREFERENCE_OPTIONS,
  MATRIMONIAL_RELOCATION_OPTIONS,
} from "../../lib/matrimonialStructuredOptions";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const BINDING_ATTR = "data-matrimonial-structured-binding";

function clean(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function key(value: unknown) {
  return clean(value).normalize("NFKC").toLocaleLowerCase();
}

function tokens(value: string) {
  const seen = new Set<string>();
  return value.split(",").map(clean).filter((item) => {
    const k = key(item);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function optionList(options: string[]) {
  const seen = new Set<string>();
  return options.map(clean).filter((item) => {
    const k = key(item);
    if (!k || k === "other" || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function makeEl<K extends keyof HTMLElementTagNameMap>(tag: K, styles?: Partial<CSSStyleDeclaration>) {
  const el = document.createElement(tag);
  if (styles) Object.assign(el.style, styles);
  return el;
}

function findLabelText(input: HTMLInputElement) {
  const parent = input.parentElement;
  const label = parent?.querySelector(":scope > label") || parent?.querySelector("label");
  return clean(label?.textContent);
}

function findPreferenceTitle(input: HTMLInputElement) {
  let node: HTMLElement | null = input.parentElement;
  for (let i = 0; i < 5 && node; i++, node = node.parentElement) {
    const primary = node.querySelector<HTMLInputElement>('input[placeholder^="Primary"]');
    const secondary = node.querySelector<HTMLInputElement>('input[placeholder^="Secondary"]');
    const acceptable = node.querySelector<HTMLInputElement>('input[placeholder^="Acceptable"]');
    if (primary && secondary && acceptable) {
      const strong = node.querySelector("strong");
      return clean(strong?.textContent);
    }
  }
  return "";
}

function chip(text: string, remove: () => void) {
  const item = makeEl("span", {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "#f0f7f3",
    color: GREEN,
    border: "1px solid #d6e6dc",
    borderRadius: "999px",
    padding: "5px 8px",
    fontSize: "10px",
    fontWeight: "700",
    lineHeight: "1",
  });
  item.textContent = text;
  const x = makeEl("button", {
    border: "0",
    background: "transparent",
    color: "#8a4d3c",
    cursor: "pointer",
    fontWeight: "900",
    padding: "0",
    lineHeight: "1",
  });
  x.type = "button";
  x.textContent = "×";
  x.setAttribute("aria-label", `Remove ${text}`);
  x.onclick = (event) => { event.preventDefault(); remove(); };
  item.appendChild(x);
  return item;
}

function enhanceMulti(input: HTMLInputElement, options: string[]) {
  const existingId = input.getAttribute(BINDING_ATTR);
  if (existingId) {
    const existing = document.querySelector<HTMLElement>(`[data-structured-wrapper="${existingId}"]`);
    if (existing && existing.dataset.lastValue !== input.value) existing.dispatchEvent(new CustomEvent("structured-sync"));
    return;
  }

  const id = `structured-${Math.random().toString(36).slice(2)}`;
  input.setAttribute(BINDING_ATTR, id);
  const wrapper = makeEl("div", { marginTop: "2px" });
  wrapper.dataset.structuredWrapper = id;
  input.style.display = "none";
  input.insertAdjacentElement("afterend", wrapper);
  const known = optionList(options);
  let showOther = false;

  const commit = (items: string[]) => setReactInputValue(input, items.join(", "));
  const render = () => {
    const current = tokens(input.value);
    wrapper.dataset.lastValue = input.value;
    wrapper.replaceChildren();

    const chips = makeEl("div", { display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: current.length ? "7px" : "0" });
    current.forEach((value) => chips.appendChild(chip(value, () => commit(current.filter((item) => key(item) !== key(value))))));
    if (current.length) wrapper.appendChild(chips);

    const row = makeEl("div", { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "6px", alignItems: "center" });
    const select = makeEl("select", {
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid rgba(26,77,46,.2)",
      borderRadius: "8px",
      padding: "9px 10px",
      background: "white",
      color: "#26352d",
      fontSize: "11px",
    });
    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Select from list · فہرست سے منتخب کریں";
    select.appendChild(first);
    known.filter((item) => !current.some((selected) => key(selected) === key(item))).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    const other = document.createElement("option");
    other.value = "__other__";
    other.textContent = "Other / Add new · دیگر / نیا شامل کریں";
    select.appendChild(other);

    const add = makeEl("button", {
      border: `1px solid ${GOLD}`,
      borderRadius: "8px",
      background: "#fff9ef",
      color: GREEN,
      padding: "9px 10px",
      fontSize: "10px",
      fontWeight: "800",
      cursor: "pointer",
      whiteSpace: "nowrap",
    });
    add.type = "button";
    add.textContent = "+ Add";
    add.onclick = (event) => {
      event.preventDefault();
      if (!select.value) return;
      if (select.value === "__other__") { showOther = true; render(); return; }
      commit([...current, select.value]);
      showOther = false;
    };
    row.append(select, add);
    wrapper.appendChild(row);

    if (showOther) {
      const otherRow = makeEl("div", { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "6px", marginTop: "6px" });
      const custom = makeEl("input", {
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid rgba(26,77,46,.2)",
        borderRadius: "8px",
        padding: "9px 10px",
        fontSize: "11px",
      }) as HTMLInputElement;
      custom.placeholder = "Type new option · نئی چیز لکھیں";
      const customAdd = makeEl("button", {
        border: "0",
        borderRadius: "8px",
        background: GREEN,
        color: "white",
        padding: "9px 11px",
        fontSize: "10px",
        fontWeight: "800",
        cursor: "pointer",
      });
      customAdd.type = "button";
      customAdd.textContent = "Add";
      const addCustom = () => {
        const value = clean(custom.value);
        if (!value) return;
        commit([...current, value]);
        showOther = false;
      };
      customAdd.onclick = (event) => { event.preventDefault(); addCustom(); };
      custom.onkeydown = (event) => { if (event.key === "Enter") { event.preventDefault(); addCustom(); } };
      otherRow.append(custom, customAdd);
      wrapper.appendChild(otherRow);
      window.setTimeout(() => custom.focus(), 0);
    }

    const hint = makeEl("small", { display: "block", color: "#758078", fontSize: "9px", lineHeight: "1.5", marginTop: "5px" });
    hint.setAttribute("lang", "ur");
    hint.setAttribute("dir", "rtl");
    hint.textContent = "ایک سے زیادہ آپشن شامل کیے جا سکتے ہیں۔ پہلے فہرست سے منتخب کریں، ضرورت ہو تو Other سے نیا آپشن شامل کریں۔";
    wrapper.appendChild(hint);
  };

  wrapper.addEventListener("structured-sync", render as EventListener);
  input.addEventListener("input", render);
  render();
}

function enhanceSingle(input: HTMLInputElement, options: string[]) {
  const existingId = input.getAttribute(BINDING_ATTR);
  if (existingId) {
    const existing = document.querySelector<HTMLElement>(`[data-structured-wrapper="${existingId}"]`);
    if (existing && existing.dataset.lastValue !== input.value) existing.dispatchEvent(new CustomEvent("structured-sync"));
    return;
  }

  const id = `structured-${Math.random().toString(36).slice(2)}`;
  input.setAttribute(BINDING_ATTR, id);
  const wrapper = makeEl("div");
  wrapper.dataset.structuredWrapper = id;
  input.style.display = "none";
  input.insertAdjacentElement("afterend", wrapper);
  const known = optionList(options);

  const render = () => {
    wrapper.dataset.lastValue = input.value;
    wrapper.replaceChildren();
    const current = clean(input.value);
    const isKnown = known.some((item) => key(item) === key(current));
    const row = makeEl("div", { display: "grid", gridTemplateColumns: current && !isKnown ? "minmax(0,1fr) minmax(0,1fr)" : "1fr", gap: "6px" });
    const select = makeEl("select", {
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid rgba(26,77,46,.2)",
      borderRadius: "8px",
      padding: "9px 10px",
      background: "white",
      color: "#26352d",
      fontSize: "11px",
    });
    const blank = document.createElement("option"); blank.value = ""; blank.textContent = "Select · منتخب کریں"; select.appendChild(blank);
    known.forEach((value) => { const option = document.createElement("option"); option.value = value; option.textContent = value; select.appendChild(option); });
    const other = document.createElement("option"); other.value = "__other__"; other.textContent = "Other / Add new · دیگر"; select.appendChild(other);
    select.value = isKnown ? known.find((item) => key(item) === key(current)) || "" : current ? "__other__" : "";
    select.onchange = () => {
      if (select.value === "__other__") { if (isKnown || !current) setReactInputValue(input, ""); render(); return; }
      setReactInputValue(input, select.value);
    };
    row.appendChild(select);

    if (select.value === "__other__") {
      const custom = makeEl("input", {
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid rgba(26,77,46,.2)",
        borderRadius: "8px",
        padding: "9px 10px",
        fontSize: "11px",
      }) as HTMLInputElement;
      custom.placeholder = "Type custom value · نئی چیز لکھیں";
      custom.value = isKnown ? "" : current;
      custom.onchange = () => setReactInputValue(input, clean(custom.value));
      custom.onblur = () => { if (clean(custom.value) !== clean(input.value)) setReactInputValue(input, clean(custom.value)); };
      row.appendChild(custom);
    }
    wrapper.appendChild(row);
  };

  wrapper.addEventListener("structured-sync", render as EventListener);
  input.addEventListener("input", render);
  render();
}

function enhance() {
  if (typeof window === "undefined" || !window.location.pathname.includes("matrimonial")) return;

  document.querySelectorAll<HTMLInputElement>('input[type="text"]:not([data-matrimonial-structured-skip])').forEach((input) => {
    const label = findLabelText(input);
    if (label === "Languages") return enhanceMulti(input, MATRIMONIAL_LANGUAGE_OPTIONS);
    if (label === "Hobbies" || label === "Hobbies / Interests") return enhanceMulti(input, MATRIMONIAL_HOBBY_OPTIONS);
    if (label === "Relocation" || label === "Relocation Preference") return enhanceMulti(input, MATRIMONIAL_RELOCATION_OPTIONS);
    if (label === "Nationality") return enhanceSingle(input, MATRIMONIAL_NATIONALITY_OPTIONS);
    if (label === "Employer Type" || label === "Employer / Organization Type") return enhanceSingle(input, MATRIMONIAL_EMPLOYER_TYPE_OPTIONS);

    const placeholder = clean(input.getAttribute("placeholder"));
    if (placeholder.startsWith("Primary") || placeholder.startsWith("Secondary") || placeholder.startsWith("Acceptable")) {
      const title = findPreferenceTitle(input);
      const options = MATRIMONIAL_PREFERENCE_OPTIONS[title];
      if (options?.length) enhanceMulti(input, options);
    }
  });
}

export function MatrimonialStructuredInputEnhancer() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(enhance, 600);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, []);
  return null;
}
