// Formatting helpers. Pure: no DOM, so node tests can import them.
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const nf4 = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 4, minimumFractionDigits: 0 });
export const round2 = v => Math.round((+v || 0) * 100) / 100;
export const round4 = v => Math.round((+v || 0) * 1e4) / 1e4;
// whole amounts show no decimals; anything with cents shows both digits (₱1,234.50, not ₱1,234.5)
const money = sym => v => { const a = Math.abs(round2(v)); return (v < 0 ? "−" : "") + sym + (Number.isInteger(a) ? nf : nf2).format(a); };
export const peso = money("₱");
export const usd = money("$");
export const cur = (v, market) => market === "US" ? usd(v) : peso(v);
export const signed = (v, market) => (v > 0 ? "+" : "") + cur(v, market);
// prices keep up to 4 decimals (PSE ticks go down to ₱0.0001)
export const price = v => nf4.format(+v || 0);
export const qty = v => nf4.format(+v || 0);
export const pct = (v, d = 0) => (+v || 0).toFixed(d) + "%";
export const rx = v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(+v || 0).toFixed(2) + "R";
// accepts "1,234.50", "₱500" and a typed minus sign (U+2212)
export const num = v => { const n = parseFloat(String(v ?? "").replace(/−/g, "-").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; };
export const uid = () => { const a = new Uint8Array(6); crypto.getRandomValues(a); return Array.from(a, b => b.toString(36).padStart(2, "0")).join("").slice(0, 10); };
// sum in cents so 0.1 + 0.2 stays 0.3
export const sum = (a, f) => Math.round(a.reduce((t, x) => t + Math.round((+f(x) || 0) * 100), 0)) / 100;

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const isISO = s => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(s));
export const isoOf = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const todayISO = () => isoOf(new Date());
export const fmtDate = iso => { if (!iso) return ""; if (!isISO(iso)) return String(iso); return MONTHS[+iso.slice(5, 7) - 1].slice(0, 3) + " " + (+iso.slice(8, 10)) + ", " + iso.slice(0, 4); };
export const mLabel = m => /^\d{4}-\d{2}$/.test(m) ? MONTHS[+m.slice(5, 7) - 1].slice(0, 3) + " " + m.slice(0, 4) : String(m ?? "");
