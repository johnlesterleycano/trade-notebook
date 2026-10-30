// Journal: every trade with its plan (stop, target, reason) and, once sold, the result and the lesson.
import { S } from "../store.js";
import { esc, peso, cur, qty as fq, fmtDate, rx } from "../format.js";
import { result, positions, initialRiskPHP } from "../journal.js";
import { pnlChip, marketChip, empty } from "./common.js";

// list filters for this visit
export const J = { status: "all" };

export const visible = () => S.trades.filter(t => S.settings.showPractice === "all" || (S.settings.showPractice === "practice") === t.practice);

const seg = (act, key, cur, opts, label) => `<div class="seg small" role="group" aria-label="${label}">${opts.map(([v, l]) => `<button type="button" data-act="${act}" data-${key}="${v}" aria-pressed="${cur === v}">${l}</button>`).join("")}</div>`;
export const practiceSeg = () => seg("practice-filter", "show", S.settings.showPractice, [["all", "All"], ["real", "Real"], ["practice", "Practice"]], "Real or practice trades");

function row(t) {
  const r = result(t, S.settings.rates);
  const meta = [fmtDate(t.entryDate) + (t.closed ? " → " + fmtDate(t.exitDate) : ""), t.setup, t.practice ? "Practice" : ""].filter(Boolean).join(" · ");
  const right = t.closed
    ? `${pnlChip(r.pnl, t.market)}<span class="row-meta">${rx(r.r)}${t.market === "US" ? " · " + esc(peso(r.pnlPHP)) : ""}</span>`
    : `<span class="chip warn">Open</span><span class="row-meta">stop ${esc(cur(t.stop, t.market))}</span>`;
  return `<li><button type="button" class="row trade" data-act="edit-trade" data-id="${esc(t.id)}">
    <span class="row-main"><span class="row-name">${esc(t.symbol)} ${marketChip(t.market)}</span><span class="row-meta">${esc(meta)}</span></span>
    <span class="col-qty money">${esc(fq(t.qty))} @ ${esc(cur(t.entryPrice, t.market))}</span>
    <span class="row-amt">${right}</span>
  </button></li>`;
}

export function journalView() {
  const all = visible(), list = all.filter(t => J.status === "all" || (J.status === "open") !== t.closed)
    .sort((a, b) => (a.closed - b.closed) || ((b.exitDate || b.entryDate) > (a.exitDate || a.entryDate) ? 1 : -1));
  const head = `<div class="card-head"><h2>Trades</h2>${seg("status-filter", "status", J.status, [["all", "All"], ["open", "Open"], ["closed", "Closed"]], "Open or closed trades")}${practiceSeg()}<button type="button" class="btn small" data-act="new-trade">New trade</button></div>`;
  const main = !S.trades.length
    ? empty("No trades yet", "Plan your first trade in the Calculator, or add one here. Practice trades count too: tick “Practice” for paper trades.", `<button type="button" class="btn" data-act="new-trade">Add a trade</button>`)
    : `<section class="card sec">${head}${list.length ? `<ul class="list" role="list">${list.map(row).join("")}</ul>` : `<p class="muted">No trades match these filters.</p>`}</section>`;
  const pos = positions(all), open = pos.length;
  const rail = `<section class="card panel"><h2>Open positions</h2>${open ? `<table class="lines"><tbody>${pos.map(p => `<tr><th scope="row">${esc(p.symbol)} <span class="muted">${esc(fq(p.qty))} @ ${esc(cur(p.avgPrice, p.market))}</span></th><td class="money">${esc(cur(p.cost, p.market))}</td></tr>`).join("")}</tbody></table>
    <p class="note">Planned loss if every stop is hit: <b>${esc(peso(all.filter(t => !t.closed).reduce((s, t) => s + initialRiskPHP(t), 0)))}</b></p>` : `<p class="muted">Nothing open.</p>`}</section>
    <section class="card panel"><h2>Journal habits</h2><ul class="tips">
      <li>Write the plan <b>before</b> you buy: entry, stop-loss, target, reason.</li>
      <li>Close the trade here the day you sell, and add one lesson.</li>
      <li>Review every payday: are your losses smaller than your wins?</li></ul></section>`;
  return `<div class="st"><div class="st-main">${main}</div><aside class="st-rail static" aria-label="Positions">${rail}</aside></div>`;
}
