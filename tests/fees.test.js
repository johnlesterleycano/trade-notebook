// Fee rules. Synthetic numbers only, worked out by hand in the comments.
import test from "node:test";
import assert from "node:assert/strict";
import { phTick, phBoardLot, phOnTick, phLotOk, phTickUp, phTickDown, phRoundUp, phRoundDown, phBuy, phSell, phBreakEven, usBuy, usSell, usBreakEven, usFunding, usDividendNet, DEFAULT_RATES } from "../app/js/fees.js";

test("PSE tick size and board lot at every band edge", () => {
  const cases = [
    [0.0001, 0.0001, 1000000], [0.0099, 0.0001, 1000000], [0.01, 0.001, 100000], [0.049, 0.001, 100000],
    [0.05, 0.001, 10000], [0.249, 0.001, 10000], [0.25, 0.005, 10000], [0.495, 0.005, 10000],
    [0.5, 0.01, 1000], [4.99, 0.01, 1000], [5, 0.01, 100], [9.99, 0.01, 100], [10, 0.02, 100], [19.98, 0.02, 100],
    [20, 0.05, 100], [27.35, 0.05, 100], [49.95, 0.05, 100], [50, 0.05, 10], [99.95, 0.05, 10], [100, 0.1, 10],
    [199.9, 0.1, 10], [200, 0.2, 10], [499.8, 0.2, 10], [500, 0.5, 10], [999.5, 0.5, 10], [1000, 1, 5],
    [1999, 1, 5], [2000, 2, 5], [4998, 2, 5], [5000, 5, 5], [12345, 5, 5]
  ];
  for (const [p, tick, lot] of cases) { assert.equal(phTick(p), tick, `tick at ${p}`); assert.equal(phBoardLot(p), lot, `lot at ${p}`); }
});

test("valid prices, lots and tick steps", () => {
  assert.equal(phOnTick(27.35), true);
  assert.equal(phOnTick(27.32), false);
  assert.equal(phOnTick(10.01), false); // ₱10–19.98 moves in ₱0.02 steps
  assert.equal(phLotOk(27.35, 300), true);
  assert.equal(phLotOk(27.35, 250), false);
  assert.equal(phLotOk(3, 1000), true);
  assert.equal(phTickUp(9.99), 10);
  assert.equal(phTickUp(10), 10.02);
  assert.equal(phTickUp(0.495), 0.5);
  assert.equal(phTickDown(10), 9.99);
  assert.equal(phTickDown(27.35), 27.3);
  assert.equal(phRoundUp(27.32), 27.35);
  assert.equal(phRoundDown(27.32), 27.3);
});

test("PSE buy: commission, VAT, PSE fee with VAT, clearing fee", () => {
  // 1,000 shares at ₱10: gross 10,000 · commission 25 · VAT 3 · PSE 0.50 · VAT on PSE 0.06 · SCCP 1
  assert.deepEqual(phBuy(10, 1000), { gross: 10000, commission: 25, vat: 3, pseFee: 0.5, pseVat: 0.06, sccp: 1, salesTax: 0, fees: 29.56, net: 10029.56 });
});

test("PSE sell adds the 0.1% stock transaction tax", () => {
  const s = phSell(10, 1000);
  assert.equal(s.salesTax, 10);
  assert.equal(s.fees, 39.56);
  assert.equal(s.net, 9960.44);
});

test("small PSE trades pay the minimum commission", () => {
  const b = phBuy(5, 100); // gross 500 → 0.25% is ₱1.25, so the ₱20 minimum applies
  assert.equal(b.commission, 20);
  assert.equal(b.vat, 2.4);
});

test("rates can be changed (old 0.6% sales tax, no VAT on the PSE fee)", () => {
  const s = phSell(10, 1000, { salesTax: 0.006, vatOnPseFee: false });
  assert.equal(s.salesTax, 60);
  assert.equal(s.pseVat, 0);
  assert.equal(s.fees, 89.5);
});

test("PSE break-even is the first valid price that covers both sides' fees", () => {
  // cost 10,029.56; fees on a sell ≈ 0.3956% → need gross ≥ 10,069.39 → ₱10.0694 → next ₱0.02 tick is ₱10.08
  assert.equal(phBreakEven(10, 1000), 10.08);
  assert.ok(phSell(10.06, 1000).net < phBuy(10, 1000).net);
  assert.equal(phBreakEven(0, 1000), 0);
});

test("US trades: percentage commission with a minimum, fractional shares", () => {
  assert.deepEqual(usBuy(100, 2.5), { gross: 250, commission: 0.75, fees: 0.75, net: 250.75 });
  assert.equal(usSell(100, 2.5).net, 249.25);
  assert.equal(usBuy(10, 0.5).commission, 0.1); // 0.3% of $5 is under the $0.10 minimum
});

test("US break-even is to the cent", () => {
  // cost $250.75; selling 2.5 at $100.60 gives 251.50 − 0.75 = 250.75
  assert.equal(usBreakEven(100, 2.5), 100.6);
  assert.ok(usSell(100.59, 2.5).net < 250.75);
});

test("funding in pesos and dividends after US withholding", () => {
  assert.deepEqual(usFunding(250.75, 58), { base: 14543.5, fxCost: 72.72, pesos: 14616.22 });
  assert.equal(usDividendNet(10), 7.5);
  assert.equal(usDividendNet(10, { withholding: 0.3 }), 7);
  assert.equal(DEFAULT_RATES.ph.salesTax, 0.001);
});
