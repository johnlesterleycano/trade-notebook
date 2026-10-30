// Trade journal rules: one entry per trade (buy, then later sell). Pure, tested in tests/journal.test.js.
// Money is kept in the trade's own currency (₱ for PH, $ for US); totals convert US trades to pesos at the exit rate.
import { buy, sell } from "./fees.js";
import { round2, round4, num, isISO } from "./format.js";

export const SETUPS = ["Breakout", "Pullback", "Support bounce", "Trend follow", "Dividend / long term", "Index / ETF investing", "Other"];
export const EMOTIONS = ["Calm", "Confident", "Unsure", "FOMO (fear of missing out)", "Fearful", "Revenge", "Bored"];
export const BROKERS = { PH: "COL Financial", US: "Gotrade" };

const txt = (v, n = 2000) => String(v ?? "").slice(0, n);
const pos = v => { const n = num(v); return n > 0 ? n : 0; };

export function normalizeTrade(t = {}) {
  const market = t.market === "US" ? "US" : "PH";
  const x = {
    id: txt(t.id, 40), market, broker: txt(t.broker, 60) || BROKERS[market], symbol: txt(t.symbol, 12).toUpperCase().trim(),
    practice: !!t.practice, entryDate: isISO(t.entryDate) ? t.entryDate : "", entryPrice: pos(t.entryPrice), qty: round4(pos(t.qty)),
    entryFx: market === "US" ? pos(t.entryFx) : 1, stop: pos(t.stop), target: pos(t.target),
    setup: txt(t.setup, 60), reason: txt(t.reason), emotion: txt(t.emotion, 60),
    exitDate: isISO(t.exitDate) ? t.exitDate : "", exitPrice: pos(t.exitPrice), exitFx: market === "US" ? pos(t.exitFx) : 1,
    lesson: txt(t.lesson), tags: txt(t.tags, 200)
  };
  x.closed = !!(x.exitDate && x.exitPrice);
  return x;
}

// Problems that stop a save, and habits worth flagging but allowed.
export function checkTrade(t, settings = {}) {
  const errors = [], warnings = [];
  if (!t.symbol) errors.push("Add the stock symbol.");
  if (!t.entryDate) errors.push("Add the buy date.");
  if (!(t.entryPrice > 0)) errors.push("Add the buy price.");
  if (!(t.qty > 0)) errors.push("Add the number of shares.");
  if (t.market === "US" && !(t.entryFx > 0)) errors.push("Add the peso–dollar rate on the buy date.");
  if (!(t.stop > 0)) errors.push("Plan your stop-loss before you buy: the price where you admit you were wrong.");
  else if (t.stop >= t.entryPrice) errors.push("The stop-loss must be below the buy price.");
  if (!t.reason.trim()) errors.push("Write why you are buying. One sentence is enough.");
  if ((t.exitDate && !t.exitPrice) || (!t.exitDate && t.exitPrice)) errors.push("To close the trade, add both the sell date and the sell price.");
  if (t.exitDate && t.entryDate && t.exitDate < t.entryDate) errors.push("The sell date is before the buy date.");
  if (t.closed && t.market === "US" && !(t.exitFx > 0)) errors.push("Add the peso–dollar rate on the sell date.");
  if (!errors.length) {
    const risk = initialRiskPHP(t), cap = settings.capital || 0, limit = (settings.riskPct || 1) / 100 * cap;
    if (cap > 0 && risk > limit * 1.001) warnings.push(`This trade risks ${Math.round(risk / cap * 1000) / 10}% of your trading money, more than your ${settings.riskPct || 1}% limit.`);
    if (t.target > 0 && t.target <= t.entryPrice) warnings.push("The target is not above the buy price.");
  }
  return { errors, warnings };
}

// What you planned to lose if the stop was hit, in pesos.
export const initialRisk = t => round2(Math.max(0, t.entryPrice - t.stop) * t.qty);
export const initialRiskPHP = t => round2(initialRisk(t) * (t.market === "US" ? t.entryFx : 1));

// Result of a closed trade, fees included.
export function result(t, rates) {
  const cost = buy(t.market, t.entryPrice, t.qty, rates), proceeds = t.closed ? sell(t.market, t.exitPrice, t.qty, rates) : null;
  if (!proceeds) return { cost, proceeds: null, pnl: 0, pnlPHP: 0, r: 0, pctReturn: 0, fees: cost.fees };
  const pnl = round2(proceeds.net - cost.net), risk = initialRisk(t);
  return {
    cost, proceeds, pnl, fees: round2(cost.fees + proceeds.fees),
    pnlPHP: round2(pnl * (t.market === "US" ? t.exitFx : 1)),
    r: risk > 0 ? round2(pnl / risk) : 0,
    pctReturn: cost.net > 0 ? round2(pnl / cost.net * 100) : 0
  };
}

// Open trades grouped by market and symbol, with the average buy price.
export function positions(trades) {
  const m = new Map();
  for (const t of trades) {
    if (t.closed) continue;
    const k = t.market + ":" + t.symbol, p = m.get(k) || { market: t.market, symbol: t.symbol, qty: 0, cost: 0, risk: 0, count: 0 };
    p.qty = round4(p.qty + t.qty); p.cost += t.entryPrice * t.qty; p.risk += initialRisk(t); p.count++;
    m.set(k, p);
  }
  return [...m.values()].map(p => ({ ...p, cost: round2(p.cost), risk: round2(p.risk), avgPrice: round4(p.cost / p.qty) })).sort((a, b) => b.cost - a.cost);
}

// The numbers that tell you whether your way of trading works.
export function stats(trades, rates) {
  const closed = trades.filter(t => t.closed).map(t => ({ t, ...result(t, rates) }));
  const wins = closed.filter(x => x.pnlPHP > 0), losses = closed.filter(x => x.pnlPHP <= 0);
  const tot = a => round2(a.reduce((s, x) => s + x.pnlPHP, 0));
  const grossWin = tot(wins), grossLoss = -tot(losses), n = closed.length;
  const avgWin = wins.length ? round2(grossWin / wins.length) : 0, avgLoss = losses.length ? round2(grossLoss / losses.length) : 0;
  const winRate = n ? wins.length / n : 0;
  return {
    count: n, open: trades.length - n, wins: wins.length, losses: losses.length,
    winRate: round2(winRate * 100), total: tot(closed), fees: round2(closed.reduce((s, x) => s + x.fees * (x.t.market === "US" ? x.t.exitFx : 1), 0)),
    avgWin, avgLoss,
    // average result per trade: winRate × avgWin − lossRate × avgLoss
    expectancy: n ? round2(tot(closed) / n) : 0,
    avgR: n ? round2(closed.reduce((s, x) => s + x.r, 0) / n) : 0,
    profitFactor: grossLoss > 0 ? round2(grossWin / grossLoss) : (grossWin > 0 ? Infinity : 0),
    biggestLoss: losses.length ? Math.min(...losses.map(x => x.pnlPHP)) : 0,
    // a loss well past the planned stop means the stop was moved or ignored
    stopsIgnored: closed.filter(x => x.r < -1.25).length
  };
}

// Realized result per month of the sell date, oldest first.
export function monthly(trades, rates) {
  const m = new Map();
  for (const t of trades) if (t.closed) { const k = t.exitDate.slice(0, 7), x = m.get(k) || { month: k, pnl: 0, count: 0 }; x.pnl = round2(x.pnl + result(t, rates).pnlPHP); x.count++; m.set(k, x); }
  return [...m.values()].sort((a, b) => a.month < b.month ? -1 : 1);
}

// Running total after each closed trade, for the equity curve.
export function equity(trades, rates) {
  let run = 0;
  return trades.filter(t => t.closed).sort((a, b) => a.exitDate < b.exitDate ? -1 : a.exitDate > b.exitDate ? 1 : 0)
    .map(t => { run = round2(run + result(t, rates).pnlPHP); return { date: t.exitDate, symbol: t.symbol, total: run }; });
}

// Average result grouped by a field (emotion or setup): which moods and setups make or lose money.
export function byField(trades, rates, field) {
  const m = new Map();
  for (const t of trades) if (t.closed) { const k = t[field] || "Not set", x = m.get(k) || { key: k, pnl: 0, count: 0, wins: 0 }; const p = result(t, rates).pnlPHP; x.pnl = round2(x.pnl + p); x.count++; if (p > 0) x.wins++; m.set(k, x); }
  return [...m.values()].sort((a, b) => b.count - a.count);
}
