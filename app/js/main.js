// Start-up, section switching and the event handlers. Views return HTML strings; this file wires them up.
import { S, load, save, exportJSON, importJSON, backupName, resetAll } from "./store.js";
import { DEFAULT_RATES } from "./fees.js";
import { num } from "./format.js";
import { C, calcView, calcOut, calcRail, priceHints } from "./views/calc.js";
import { J, journalView } from "./views/journal.js";
import { reviewView } from "./views/review.js";
import { learnView } from "./views/learn.js";
import { settingsView } from "./views/settings.js";
import { openTrade, confirmDelete } from "./forms.js";

const TABS = { calc: ["Calculator", calcView], journal: ["Journal", journalView], review: ["Review", reviewView], learn: ["Learn", learnView], settings: ["Settings", settingsView] };
const ORDER = Object.keys(TABS);
const view = document.getElementById("view");
let tab = "calc";

function render(focus) {
  const [title, fn] = TABS[tab];
  document.getElementById("title").textContent = title;
  document.title = title + " · Trade Notebook";
  document.querySelectorAll("[data-tab]").forEach(b => { if (b.dataset.tab === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  view.innerHTML = fn();
  if (tab === "calc") hints();
  if (focus) view.focus();
}

function go(t) {
  if (!TABS[t] || t === tab) return;
  tab = t;
  history.replaceState(null, "", "#" + t);
  render(true);
  scrollTo({ top: 0 });
}

// calculator: redraw results only, so the field being typed in keeps focus
function hints() {
  const h = priceHints(), set = (id, text, bad) => { const el = document.getElementById(id); if (el) { el.textContent = text; el.classList.toggle("bad", !!bad); } };
  set("priceHint", h.price, h.badPrice);
  set("qtyHint", h.qty, h.badQty);
}
function refreshCalc() {
  document.getElementById("calcOut").innerHTML = calcOut();
  document.getElementById("calcRail").innerHTML = calcRail();
  hints();
}

const setPath = (path, value) => { const keys = path.split("."), last = keys.pop(); let o = S.settings; for (const k of keys) o = o[k]; o[last] = value; };

document.addEventListener("click", e => {
  const tb = e.target.closest("[data-tab]");
  if (tb) return go(tb.dataset.tab);
  const b = e.target.closest("[data-act]");
  if (!b || b.tagName === "SELECT" || b.tagName === "INPUT") return;
  const a = b.dataset.act, done = () => render();
  if (a === "calc-market") { C.market = b.dataset.market; render(); }
  else if (a === "use-size") { C.qty = b.dataset.qty; document.getElementById("c-qty").value = C.qty; refreshCalc(); }
  else if (a === "log-calc") openTrade({ market: C.market, symbol: C.symbol, entryPrice: num(C.price), qty: num(C.qty), stop: num(C.stop), target: num(C.target), entryFx: num(C.fx || S.settings.fx), exitFx: num(C.fx || S.settings.fx) }, () => go("journal"));
  else if (a === "new-trade") openTrade(null, done);
  else if (a === "edit-trade") openTrade(S.trades.find(t => t.id === b.dataset.id), done);
  else if (a === "delete-trade") confirmDelete(b.dataset.id);
  else if (a === "close-dlg") b.closest("dialog").close();
  else if (a === "status-filter") { J.status = b.dataset.status; render(); }
  else if (a === "practice-filter") { S.settings.showPractice = b.dataset.show; save(); render(); }
  else if (a === "reset-rates") { S.settings.rates[b.dataset.market] = { ...DEFAULT_RATES[b.dataset.market] }; save(); render(); }
  else if (a === "export") {
    const url = URL.createObjectURL(new Blob([exportJSON()], { type: "application/json" })), link = document.createElement("a");
    link.href = url; link.download = backupName(); document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  else if (a === "reset-all") { if (confirm("Delete every trade and setting on this device? Download a backup first if you want to keep them.")) { resetAll(); render(); } }
});

document.addEventListener("input", e => {
  const el = e.target;
  if (el.closest("#calcForm")) { C[el.name] = el.name === "symbol" ? el.value.toUpperCase() : el.value; refreshCalc(); return; }
  if (el.dataset.set && el.type === "number") {
    const p = el.dataset.set, v = num(el.value), isRate = p.startsWith("rates.") && !p.includes("min");
    if (el.value === "" || v < 0) return;
    setPath(p, isRate ? v / 100 : v);
    save();
  }
});

document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.learn) { if (el.checked) S.learn[el.dataset.learn] = true; else delete S.learn[el.dataset.learn]; save(); render(); document.querySelector(`[data-learn="${CSS.escape(el.dataset.learn)}"]`)?.focus(); }
  else if (el.dataset.set && el.type === "checkbox") { setPath(el.dataset.set, el.checked); save(); }
  else if (el.dataset.set && el.type === "number") { load(); render(); } // show the cleaned value (an out-of-range number falls back to its default)
  else if (el.dataset.act === "theme") window.tradeTheme?.set(el.value);
  else if (el.dataset.act === "import" && el.files[0]) {
    el.files[0].text().then(text => {
      if (!confirm("Replace everything on this device with this backup?")) return;
      try { const n = importJSON(text); render(); alert(`Restored ${n} trade${n === 1 ? "" : "s"}.`); } catch (err) { alert(err.message); }
    });
    el.value = "";
  }
});

document.addEventListener("submit", e => { if (e.target.id === "calcForm") e.preventDefault(); });

// computers: 1–5 switch sections (not while typing or with a dialog open)
document.addEventListener("keydown", e => {
  const typing = e.target.closest("select,textarea,input:not([type=checkbox]):not([type=file])");
  if (e.altKey || e.ctrlKey || e.metaKey || document.querySelector("dialog[open]") || typing) return;
  const i = +e.key - 1;
  if (i >= 0 && i < ORDER.length) go(ORDER[i]);
});

// tapping the dimmed backdrop closes the dialog
document.getElementById("tradeDlg").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

load();
const start = location.hash.slice(1);
if (TABS[start]) tab = start;
render();
