// Position sizing. Synthetic numbers only.
import test from "node:test";
import assert from "node:assert/strict";
import { positionSize, rewardRisk } from "../app/js/risk.js";

test("PSE: shares rounded down to the board lot", () => {
  // ₱50,000 × 1% = ₱500 at risk; ₱1.55 a share to the stop → 322 shares → 300 (lots of 100)
  const p = positionSize({ capital: 50000, riskPct: 1, entry: 27.35, stop: 25.8 });
  assert.equal(p.shares, 300);
  assert.equal(p.lot, 100);
  assert.equal(p.riskBudget, 500);
  assert.equal(p.risk, 465);
  assert.equal(p.cost.gross, 8205);
  assert.equal(p.cappedByCash, false);
});

test("PSE: never more than the trading money after fees", () => {
  // ₱500 risk / ₱0.35 → 1,400 shares, but only ₱5,000 to spend → 100 shares (₱2,757.83 with fees)
  const p = positionSize({ capital: 5000, riskPct: 10, entry: 27.35, stop: 27 });
  assert.equal(p.shares, 100);
  assert.equal(p.cappedByCash, true);
  assert.ok(p.cost.net <= 5000);
});

test("PSE: too small for one board lot says so", () => {
  const p = positionSize({ capital: 1000, riskPct: 1, entry: 27.35, stop: 25.8 });
  assert.equal(p.shares, 0);
  assert.match(p.warnings[0], /board lot/);
});

test("US: fractional shares in dollars from a peso budget", () => {
  // ₱50,000 at ₱50 per $1 = $1,000; 1% risk = $10; $10 a share to the stop → 1 share
  const p = positionSize({ capital: 50000, riskPct: 1, entry: 100, stop: 90, market: "US", fx: 50 });
  assert.equal(p.shares, 1);
  assert.equal(p.risk, 500); // in pesos
  const q = positionSize({ capital: 50000, riskPct: 1, entry: 100, stop: 70, market: "US", fx: 50 });
  assert.equal(q.shares, 0.3333);
});

test("bad inputs give a warning instead of a size", () => {
  assert.equal(positionSize({ capital: 50000, riskPct: 1, entry: 10, stop: 11 }).shares, 0);
  assert.match(positionSize({ capital: 50000, riskPct: 1, entry: 10, stop: 11 }).warnings[0], /below/);
  assert.match(positionSize({ capital: 0, riskPct: 1, entry: 10, stop: 9 }).warnings[0], /Settings/);
  assert.match(positionSize({ capital: 50000, riskPct: 1, entry: 10, stop: 9, market: "US" }).warnings[0], /rate/);
});

test("reward to risk", () => {
  assert.equal(rewardRisk(10, 9, 13), 3);
  assert.equal(rewardRisk(10, 9, 9.5), 0);
  assert.equal(rewardRisk(10, 11, 13), 0);
});
