// State `S`, kept in this browser only (localStorage), with a JSON backup file to move or restore it.
import { DEFAULT_RATES } from "./fees.js";
import { normalizeTrade } from "./journal.js";
import { num, uid, todayISO } from "./format.js";

const KEY = "trade-notebook-v1";
export const VERSION = 1;

// missing or out-of-range values fall back to the default (num() would turn a missing value into 0)
const clamp = (v, lo, hi, d) => { if (v === undefined || v === null || v === "") return d; const n = num(v); return n >= lo && n <= hi ? n : d; };
const rates = (r = {}, k) => {
  const D = DEFAULT_RATES[k], out = {};
  for (const [f, d] of Object.entries(D)) out[f] = typeof d === "boolean" ? (r[f] === undefined ? d : !!r[f]) : clamp(r[f], 0, f.startsWith("min") ? 1e6 : 1, d);
  return out;
};

// The source of truth for the saved shape; anything missing or broken falls back to a default.
export function normalizeData(d = {}) {
  const s = d.settings || {};
  const trades = (Array.isArray(d.trades) ? d.trades : []).map(t => normalizeTrade({ ...t, id: t && t.id ? t.id : uid() }));
  const learn = {};
  for (const [k, v] of Object.entries(d.learn || {})) if (/^[a-z0-9-]{1,40}$/.test(k) && v) learn[k] = true;
  return {
    version: VERSION,
    settings: {
      capital: clamp(s.capital, 0, 1e12, 0),
      riskPct: clamp(s.riskPct, 0.1, 10, 1),
      fx: clamp(s.fx, 0, 1000, 0),
      showPractice: s.showPractice === "real" || s.showPractice === "practice" ? s.showPractice : "all",
      rates: { ph: rates(s.rates?.ph, "ph"), us: rates(s.rates?.us, "us") }
    },
    trades, learn
  };
}

export const S = normalizeData();

export function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
  Object.assign(S, normalizeData(raw || {}));
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch { return false; }
}

export function putTrade(t) {
  const x = normalizeTrade({ ...t, id: t.id || uid() }), i = S.trades.findIndex(y => y.id === x.id);
  if (i < 0) S.trades.push(x); else S.trades[i] = x;
  save();
  return x;
}
export function deleteTrade(id) { S.trades = S.trades.filter(t => t.id !== id); save(); }

export const backupName = () => "trade-notebook-backup-" + todayISO() + ".json";
export const exportJSON = () => JSON.stringify({ app: "trade-notebook", exported: new Date().toISOString(), ...S }, null, 2);

// Replaces everything with the file's contents. Throws when the file is not a Trade Notebook backup.
export function importJSON(text) {
  let d;
  try { d = JSON.parse(text); } catch { throw new Error("That file is not valid JSON."); }
  if (!d || d.app !== "trade-notebook") throw new Error("That file is not a Trade Notebook backup.");
  Object.assign(S, normalizeData(d));
  save();
  return S.trades.length;
}

export function resetAll() { Object.assign(S, normalizeData()); try { localStorage.removeItem(KEY); } catch {} }
