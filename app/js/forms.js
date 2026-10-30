// The trade form, on a native <dialog>: a centered dialog on a computer, a bottom sheet on a phone.
import { S, putTrade, deleteTrade } from "./store.js";
import { esc, cur, peso, todayISO, rx } from "./format.js";
import { normalizeTrade, checkTrade, result, initialRiskPHP, SETUPS, EMOTIONS, BROKERS } from "./journal.js";

const dlg = () => document.getElementById("tradeDlg");
let onDone = () => {}, warnedFor = "";

const input = (name, label, v, attrs = "", hint = "") => `<div class="field"><label for="t-${name}">${label}</label><input id="t-${name}" name="${name}" value="${esc(v)}" ${attrs}>${hint ? `<small class="hint">${hint}</small>` : ""}</div>`;
const numIn = (name, label, v, hint = "") => input(name, label, v || "", 'inputmode="decimal" autocomplete="off"', hint);
const select = (name, label, v, opts) => `<div class="field"><label for="t-${name}">${label}</label><select id="t-${name}" name="${name}"><option value="">Choose…</option>${opts.map(o => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;

function formHTML(t, isNew) {
  const us = t.market === "US", c = us ? "$" : "₱";
  return `<form method="dialog" id="tradeForm" novalidate>
  <div class="sheet-head"><h2 id="tradeTitle">${isNew ? "New trade" : esc(t.symbol || "Trade")}</h2><button type="button" class="icon-btn" data-act="close-dlg" aria-label="Close">✕</button></div>
  <input type="hidden" name="id" value="${esc(t.id)}">
  <div class="sheet-body">
    <fieldset><legend>The plan (before you buy)</legend>
      <div class="form-grid">
        <div class="field"><label for="t-market">Market</label><select id="t-market" name="market"><option value="PH"${!us ? " selected" : ""}>PH stocks</option><option value="US"${us ? " selected" : ""}>US stocks</option></select></div>
        ${input("broker", "Broker", t.broker, 'autocomplete="off" maxlength="60"')}
        ${input("symbol", "Stock", t.symbol, 'autocapitalize="characters" spellcheck="false" maxlength="12" required')}
        ${input("entryDate", "Buy date", t.entryDate, 'type="date" required')}
        ${numIn("entryPrice", `Buy price (${c})`, t.entryPrice)}
        ${numIn("qty", "Shares", t.qty)}
        ${us ? numIn("entryFx", "₱ per $1 on buy date", t.entryFx === 1 ? "" : t.entryFx) : ""}
        ${numIn("stop", `Stop-loss (${c})`, t.stop, "Required: where you sell if wrong")}
        ${numIn("target", `Target (${c})`, t.target)}
        ${select("setup", "Setup", t.setup, SETUPS)}
        ${select("emotion", "How you feel", t.emotion, EMOTIONS)}
      </div>
      <div class="field"><label for="t-reason">Why are you buying?</label><textarea id="t-reason" name="reason" rows="2" maxlength="2000" required>${esc(t.reason)}</textarea></div>
      <label class="toggle"><input type="checkbox" name="practice"${t.practice ? " checked" : ""}><span>Practice trade (paper money, not real)</span></label>
    </fieldset>
    <fieldset><legend>Closing it (when you sell)</legend>
      <div class="form-grid">
        ${input("exitDate", "Sell date", t.exitDate, 'type="date"')}
        ${numIn("exitPrice", `Sell price (${c})`, t.exitPrice)}
        ${us ? numIn("exitFx", "₱ per $1 on sell date", t.exitFx === 1 ? "" : t.exitFx) : ""}
      </div>
      <div class="field"><label for="t-lesson">Lesson learned</label><textarea id="t-lesson" name="lesson" rows="2" maxlength="2000">${esc(t.lesson)}</textarea></div>
      ${input("tags", "Tags", t.tags, 'autocomplete="off" maxlength="200" placeholder="e.g. earnings, dividend"')}
    </fieldset>
    <p id="tradePreview" class="note" aria-live="polite"></p>
    <div id="tradeMsg" role="alert"></div>
  </div>
  <div class="sheet-foot">
    ${isNew ? "" : `<button type="button" class="btn small danger" data-act="delete-trade" data-id="${esc(t.id)}">Delete</button>`}
    <button type="submit" class="btn" id="tradeSave">Save</button>
  </div></form>`;
}

const readForm = form => {
  const d = Object.fromEntries(new FormData(form));
  d.practice = !!form.elements.practice.checked;
  return normalizeTrade(d);
};

function preview(form) {
  const t = readForm(form), el = form.querySelector("#tradePreview");
  if (!(t.entryPrice > 0 && t.qty > 0)) { el.textContent = ""; return; }
  const risk = t.stop > 0 && t.stop < t.entryPrice ? `Planned risk ${peso(initialRiskPHP(t))}` : "";
  const r = t.closed ? result(t, S.settings.rates) : null;
  el.textContent = [risk, r ? `Result ${cur(r.pnl, t.market)} (${rx(r.r)}) after ${cur(r.fees, t.market)} fees` : ""].filter(Boolean).join(" · ");
}

export function openTrade(t, done) {
  const isNew = !t || !t.id || !S.trades.some(x => x.id === t.id);
  const base = normalizeTrade({ entryDate: todayISO(), entryFx: S.settings.fx, exitFx: S.settings.fx, ...(t || {}) });
  onDone = done || (() => {}); warnedFor = "";
  const d = dlg();
  d.setAttribute("aria-labelledby", "tradeTitle");
  // switching market redraws the form (currency labels, rate fields, default broker)
  const draw = t => {
    d.innerHTML = formHTML(t, isNew);
    const f = d.querySelector("form");
    f.addEventListener("submit", submit);
    f.addEventListener("input", e => {
      if (e.target.name !== "market") return preview(f);
      const next = readForm(f); next.broker = BROKERS[next.market];
      if (next.market === "US") { next.entryFx = S.settings.fx || 0; next.exitFx = S.settings.fx || 0; }
      draw(next); d.querySelector("#t-market").focus();
    });
    preview(f);
  };
  draw(base);
  if (!d.open) d.showModal();
  d.querySelector(isNew && !base.symbol ? "#t-symbol" : "#t-entryPrice")?.focus();
}

function submit(e) {
  e.preventDefault();
  const form = e.target, t = readForm(form), { errors, warnings } = checkTrade(t, S.settings), msg = form.querySelector("#tradeMsg");
  if (errors.length) { msg.innerHTML = `<ul class="msg bad">${errors.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; return; }
  const key = JSON.stringify(t);
  if (warnings.length && warnedFor !== key) {
    warnedFor = key;
    msg.innerHTML = `<ul class="msg warn">${warnings.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    form.querySelector("#tradeSave").textContent = "Save anyway";
    return;
  }
  const saved = putTrade(t);
  dlg().close();
  onDone(saved);
}

export function confirmDelete(id) {
  const t = S.trades.find(x => x.id === id);
  if (!t || !confirm(`Delete the ${t.symbol} trade from ${t.entryDate}? This can't be undone.`)) return;
  deleteTrade(id);
  dlg().close();
  onDone(null);
}
