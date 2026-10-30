// Review: is your way of trading working? Win rate, average win vs loss, expectancy, and the habits behind them.
import { S } from "../store.js";
import { esc, peso, signed, pct, mLabel, fmtDate } from "../format.js";
import { stats, monthly, equity, byField } from "../journal.js";
import { visible, practiceSeg } from "./journal.js";
import { empty } from "./common.js";

function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
const k = v => { const a = Math.abs(v); return (v < 0 ? "−" : "") + "₱" + (a >= 1000 ? Math.round(a / 100) / 10 + "k" : Math.round(a)); };

// running total after each sell; zero line in the middle when there are losses
function equityChart(pts) {
  const W = 420, H = 200, L = 48, R = 10, T = 12, B = 26;
  const hi = niceMax(Math.max(0, ...pts.map(p => p.total))), lo = -niceMax(Math.max(0, ...pts.map(p => -p.total))) * (pts.some(p => p.total < 0) ? 1 : 0);
  const y = v => T + (H - T - B) * (hi - v) / ((hi - lo) || 1);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Running total of closed trades">`;
  [hi, (hi + lo) / 2, lo].forEach(t => { s += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"${t === 0 ? ' stroke-width="1.5"' : ""}/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${k(t)}</text>`; });
  if (lo < 0) s += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)" stroke-dasharray="3 3"/>`;
  const all = [{ total: 0 }, ...pts], xa = i => L + (W - L - R) * (i / Math.max(1, all.length - 1));
  s += `<polyline points="${all.map((p, i) => xa(i) + "," + y(p.total)).join(" ")}" fill="none" stroke="var(--pink)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  pts.forEach((p, i) => { s += `<circle cx="${xa(i + 1)}" cy="${y(p.total)}" r="3.5" fill="var(--surface)" stroke="var(--pink)" stroke-width="2"><title>${esc(fmtDate(p.date))} ${esc(p.symbol)}: ${esc(peso(p.total))}</title></circle>`; });
  return s + `<text x="${L}" y="${H - 6}">First trade</text><text x="${W - R}" y="${H - 6}" text-anchor="end">Latest</text></svg>`;
}

const table = (head, rows) => `<div class="scroll-x"><table class="glance"><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
const pnlCell = v => `<td class="money ${v > 0 ? "pos" : v < 0 ? "neg" : ""}">${esc(signed(v))}</td>`;

export function reviewView() {
  const trades = visible(), rates = S.settings.rates, s = stats(trades, rates);
  const head = `<div class="card-head"><h2>Your numbers</h2>${practiceSeg()}</div>`;
  if (!s.count) return `<div class="st"><div class="st-main"><section class="card sec">${head}<p class="muted">Close at least one trade in the Journal to see your numbers here.</p></section></div><aside class="st-rail">${empty("Nothing to review yet", "After 20–30 closed trades these numbers start to mean something. Keep journaling, including practice trades.")}</aside></div>`;
  const pf = s.profitFactor === Infinity ? "No losses yet" : s.profitFactor.toFixed(2);
  const verdict = s.count < 20 ? ["soft", `${s.count} of 20 trades: too early to judge`] : s.expectancy > 0 ? ["good", "Your edge looks positive"] : ["bad", "Losing on average: review before adding money"];
  const glance = `<table class="glance"><tbody>
    <tr><td>Closed trades</td><td>${s.count} <span class="muted">(${s.wins} won, ${s.losses} lost)</span></td></tr>
    <tr><td>Win rate</td><td>${pct(s.winRate)}</td></tr>
    <tr><td>Average win</td><td class="money pos">${esc(peso(s.avgWin))}</td></tr>
    <tr><td>Average loss</td><td class="money neg">${esc(peso(-s.avgLoss))}</td></tr>
    <tr class="strong"><td>Expectancy (average per trade)</td>${pnlCell(s.expectancy)}</tr>
    <tr><td>Average R (result ÷ planned risk)</td><td>${s.avgR.toFixed(2)}R</td></tr>
    <tr><td>Profit factor (wins ÷ losses)</td><td>${esc(pf)}</td></tr>
    <tr><td>Biggest loss</td><td class="money neg">${esc(peso(s.biggestLoss))}</td></tr>
    <tr><td>Fees paid on closed trades</td><td class="money">${esc(peso(s.fees))}</td></tr>
  </tbody></table>`;
  const habits = [];
  if (s.stopsIgnored) habits.push(`<li><b>${s.stopsIgnored}</b> ${s.stopsIgnored === 1 ? "loss was" : "losses were"} more than 1.25× the planned risk. That usually means the stop-loss was moved or ignored.</li>`);
  const noLesson = trades.filter(t => t.closed && !t.lesson.trim()).length;
  if (noLesson) habits.push(`<li><b>${noLesson}</b> closed ${noLesson === 1 ? "trade has" : "trades have"} no lesson written down.</li>`);
  if (s.avgLoss > s.avgWin && s.count >= 5) habits.push(`<li>Your average loss is bigger than your average win. Cut losers sooner, or let winners run to the target.</li>`);
  if (!habits.length) habits.push(`<li>No warning signs. Keep following the plan.</li>`);
  const months = monthly(trades, rates), emo = byField(trades, rates, "emotion"), setups = byField(trades, rates, "setup");
  const grp = g => table(["", "Trades", "Won", "Result"], g.map(x => `<tr><td>${esc(x.key)}</td><td>${x.count}</td><td>${x.wins}</td>${pnlCell(x.pnl)}</tr>`));
  const main = `<section class="card sec">${head}${glance}</section>
    <section class="card sec"><div class="card-head"><h2>Running total</h2></div>${equityChart(equity(trades, rates))}</section>
    <section class="card sec"><div class="card-head"><h2>By month</h2></div>${table(["Month", "Trades", "Result"], months.map(m => `<tr><td>${esc(mLabel(m.month))}</td><td>${m.count}</td>${pnlCell(m.pnl)}</tr>`).reverse())}</section>
    <section class="card sec"><div class="card-head"><h2>By how you felt</h2></div>${grp(emo)}<p class="note">If FOMO or revenge trades lose money, that's your rule: don't trade in that mood.</p></section>
    <section class="card sec"><div class="card-head"><h2>By setup</h2></div>${grp(setups)}<p class="note">Do more of the setups that work and drop the ones that don't.</p></section>`;
  const rail = `<div class="hero"><div class="eyebrow">Realized result</div><div class="hero-big money">${esc(signed(s.total))}</div><p class="hero-sub">${s.count} closed · ${s.open} open · after fees</p>
    <div class="hero-stats"><div><b>${pct(s.winRate)}</b><span>Win rate</span></div><div><b class="money">${esc(signed(s.expectancy))}</b><span>Per trade</span></div></div></div>
    <p><span class="chip ${verdict[0]}">${esc(verdict[1])}</span></p>
    <section class="card panel"><h2>Habits to watch</h2><ul class="tips">${habits.join("")}</ul></section>`;
  return `<div class="st"><div class="st-main">${main}</div><aside class="st-rail" aria-label="Summary">${rail}</aside></div>`;
}
