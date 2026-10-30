// Journal rules. Synthetic trades only (made-up symbols).
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTrade, checkTrade, result, positions, stats, monthly, equity, byField, initialRiskPHP } from "../app/js/journal.js";
import { phBuy, phSell } from "../app/js/fees.js";

const ph = (o = {}) => normalizeTrade({ id: "a", market: "PH", symbol: "abc", entryDate: "2030-01-10", entryPrice: 10, qty: 1000, stop: 9.5, reason: "Bounce off support", ...o });
const us = (o = {}) => normalizeTrade({ id: "u", market: "US", symbol: "xyz", entryDate: "2030-02-01", entryPrice: 100, qty: 2, entryFx: 56, stop: 90, reason: "Index fund", ...o });

test("normalize fills defaults and cleans input", () => {
  const t = ph({ qty: "1,000", exitDate: "nope" });
  assert.equal(t.symbol, "ABC");
  assert.equal(t.broker, "COL Financial");
  assert.equal(t.qty, 1000);
  assert.equal(t.exitDate, "");
  assert.equal(t.closed, false);
  assert.equal(us().broker, "Gotrade");
  assert.equal(ph().entryFx, 1);
});

test("a plan needs a stop below entry and a reason", () => {
  assert.deepEqual(checkTrade(ph()).errors, []);
  assert.match(checkTrade(ph({ stop: 0 })).errors.join(" "), /stop-loss/);
  assert.match(checkTrade(ph({ stop: 10.5 })).errors.join(" "), /below/);
  assert.match(checkTrade(ph({ reason: " " })).errors.join(" "), /why/);
  assert.match(checkTrade(ph({ exitDate: "2030-01-20" })).errors.join(" "), /both/);
  assert.match(checkTrade(ph({ exitDate: "2030-01-01", exitPrice: 11 })).errors.join(" "), /before/);
  assert.match(checkTrade(us({ entryFx: 0 })).errors.join(" "), /rate/);
});

test("risking more than the limit is a warning, not an error", () => {
  // ₱0.50 × 1,000 = ₱500 risk; 1% of ₱20,000 is ₱200
  const c = checkTrade(ph(), { capital: 20000, riskPct: 1 });
  assert.equal(c.errors.length, 0);
  assert.match(c.warnings[0], /2.5%/);
  assert.equal(initialRiskPHP(us()), 1120); // $10 × 2 × ₱56
});

test("PH result includes fees on both sides", () => {
  // buy 10,029.56; sell 1,000 at ₱11 → 11,000 − 43.52 = 10,956.48 → +926.92; risk ₱500 → 1.85R
  const r = result(ph({ exitDate: "2030-01-20", exitPrice: 11 }));
  assert.equal(r.pnl, 926.92);
  assert.equal(r.pnlPHP, 926.92);
  assert.equal(r.r, 1.85);
  assert.equal(r.fees, 73.08);
});

test("US result in dollars and pesos at the sell-date rate", () => {
  // cost 200.60; proceeds 220 − 0.66 = 219.34 → +$18.74 × ₱57 = ₱1,068.18
  const r = result(us({ exitDate: "2030-03-01", exitPrice: 110, exitFx: 57 }));
  assert.equal(r.pnl, 18.74);
  assert.equal(r.pnlPHP, 1068.18);
});

test("stats, months, equity curve and groups", () => {
  const win = ph({ id: "1", exitDate: "2030-01-20", exitPrice: 11, emotion: "Calm" });
  const loss = ph({ id: "2", exitDate: "2030-02-05", exitPrice: 9.5, emotion: "FOMO (fear of missing out)" });
  const big = ph({ id: "3", exitDate: "2030-02-07", exitPrice: 9, emotion: "FOMO (fear of missing out)" }); // stop was ₱9.50
  const open = ph({ id: "4", symbol: "def" });
  const lossPnl = Math.round((phSell(9.5, 1000).net - phBuy(10, 1000).net) * 100) / 100;
  const bigPnl = Math.round((phSell(9, 1000).net - phBuy(10, 1000).net) * 100) / 100;
  const all = [win, loss, big, open];
  const s = stats(all);
  assert.equal(s.count, 3);
  assert.equal(s.open, 1);
  assert.equal(s.wins, 1);
  assert.equal(s.winRate, 33.33);
  assert.equal(s.total, Math.round((926.92 + lossPnl + bigPnl) * 100) / 100);
  assert.equal(s.expectancy, Math.round(s.total / 3 * 100) / 100);
  assert.equal(s.biggestLoss, bigPnl);
  assert.equal(s.stopsIgnored, 1);
  assert.ok(s.profitFactor > 0 && s.profitFactor < 1);
  assert.deepEqual(monthly(all).map(m => [m.month, m.count]), [["2030-01", 1], ["2030-02", 2]]);
  assert.deepEqual(equity(all).map(e => e.total), [926.92, Math.round((926.92 + lossPnl) * 100) / 100, s.total]);
  const fomo = byField(all, undefined, "emotion")[0];
  assert.equal(fomo.key, "FOMO (fear of missing out)");
  assert.equal(fomo.count, 2);
  assert.equal(fomo.wins, 0);
});

test("open positions average the buy price per symbol", () => {
  const p = positions([ph({ id: "1", qty: 1000, entryPrice: 10 }), ph({ id: "2", qty: 1000, entryPrice: 11, stop: 10 }), us(), ph({ id: "3", exitDate: "2030-01-20", exitPrice: 11 })]);
  assert.equal(p.length, 2);
  const abc = p.find(x => x.symbol === "ABC");
  assert.equal(abc.qty, 2000);
  assert.equal(abc.avgPrice, 10.5);
  assert.equal(abc.risk, 1500);
});

test("empty journal", () => {
  const s = stats([]);
  assert.equal(s.count, 0);
  assert.equal(s.winRate, 0);
  assert.equal(s.profitFactor, 0);
});
