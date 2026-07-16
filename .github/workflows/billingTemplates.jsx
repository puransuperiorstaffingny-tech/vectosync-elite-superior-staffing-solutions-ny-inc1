// Professional invoice & timesheet print templates.
// Each renders inside a fixed 7 x 4.5 inch canvas (.doc-7x45).
// Stored selection key in localStorage.

export const INVOICE_TEMPLATES = [
  {
    id: "inv_classic_navy",
    name: "Classic Navy",
    description: "Clean corporate invoice with a navy header band and tidy line-item table.",
    accent: "#0a1d3b",
    text: "#ffffff",
    tableHead: "#e6f0fb",
    tableHeadText: "#0a1d3b",
    body: "#1e293b",
    tags: ["Corporate", "Minimal"],
  },
  {
    id: "inv_cyan_modern",
    name: "Cyan Modern",
    description: "Bright, modern invoice with cyan accents and bold totals block.",
    accent: "#0e7490",
    text: "#ffffff",
    tableHead: "#cffafe",
    tableHeadText: "#0e7490",
    body: "#0f172a",
    tags: ["Modern", "Bold"],
  },
  {
    id: "inv_gold_elite",
    name: "Gold Elite",
    description: "Premium dark invoice with gold lettering — matches VectoSync Elite branding.",
    accent: "#1a1207",
    text: "#fbbf24",
    tableHead: "#2a2110",
    tableHeadText: "#fbbf24",
    body: "#1f2937",
    tags: ["Premium", "Dark"],
  },
  {
    id: "inv_emerald_fresh",
    name: "Emerald Fresh",
    description: "Approachable green-accented invoice, great for service businesses.",
    accent: "#065f46",
    text: "#ffffff",
    tableHead: "#d1fae5",
    tableHeadText: "#065f46",
    body: "#1e293b",
    tags: ["Friendly", "Service"],
  },
];

export const TIMESHEET_TEMPLATES = [
  {
    id: "ts_grid_navy",
    name: "Navy Grid",
    description: "Structured weekly timesheet with a navy header and gridlines.",
    accent: "#0a1d3b",
    text: "#ffffff",
    tableHead: "#e6f0fb",
    tableHeadText: "#0a1d3b",
    body: "#1e293b",
    tags: ["Weekly", "Structured"],
  },
  {
    id: "ts_compact_cyan",
    name: "Compact Cyan",
    description: "Space-efficient layout for many entries with cyan accents.",
    accent: "#0e7490",
    text: "#ffffff",
    tableHead: "#cffafe",
    tableHeadText: "#0e7490",
    body: "#0f172a",
    tags: ["Compact", "Dense"],
  },
  {
    id: "ts_gold_elite",
    name: "Gold Elite",
    description: "Premium dark timesheet with gold headings to match the brand.",
    accent: "#1a1207",
    text: "#fbbf24",
    tableHead: "#2a2110",
    tableHeadText: "#fbbf24",
    body: "#1f2937",
    tags: ["Premium", "Dark"],
  },
  {
    id: "ts_minimal_slate",
    name: "Minimal Slate",
    description: "Understated grayscale timesheet that prints cleanly anywhere.",
    accent: "#334155",
    text: "#ffffff",
    tableHead: "#e2e8f0",
    tableHeadText: "#334155",
    body: "#1e293b",
    tags: ["Minimal", "Universal"],
  },
];

const STORE_KEY = "vse_billing_templates";

export function getSelectedTemplates() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return {
      invoice: s.invoice || INVOICE_TEMPLATES[0].id,
      timesheet: s.timesheet || TIMESHEET_TEMPLATES[0].id,
    };
  } catch {
    return { invoice: INVOICE_TEMPLATES[0].id, timesheet: TIMESHEET_TEMPLATES[0].id };
  }
}

export function setSelectedTemplate(type, id) {
  const current = getSelectedTemplates();
  const next = { ...current, [type]: id };
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
  return next;
}