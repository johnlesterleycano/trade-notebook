// Saved data shape and backups. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeData, importJSON, exportJSON, S } from "../app/js/store.js";
import { DEFAULT_RATES } from "../app/js/fees.js";

test("empty data gets the default settings and fee rates", () => {
  const d = normalizeData();
  assert.deepEqual(d.settings.rates, DEFAULT_RATES);
  assert.equal(d.settings.riskPct, 1);
  assert.equal(d.settings.capital, 0);
  assert.deepEqual(d.trades, []);
});

test("saved values are kept; broken ones fall back", () => {
  const d = normalizeData({ settings: { capital: "50000", riskPct: 50, rates: { ph: { salesTax: 0.006, commission: -1, vatOnPseFee: false } } }, learn: { emergency: true, "bad key!": true } });
  assert.equal(d.settings.capital, 50000);
  assert.equal(d.settings.riskPct, 1);
  assert.equal(d.settings.rates.ph.salesTax, 0.006);
  assert.equal(d.settings.rates.ph.commission, DEFAULT_RATES.ph.commission);
  assert.equal(d.settings.rates.ph.vatOnPseFee, false);
  assert.deepEqual(d.learn, { emergency: true });
});

test("trades get ids and are cleaned", () => {
  const d = normalizeData({ trades: [{ symbol: "abc", market: "PH", entryPrice: "10", qty: 100 }] });
  assert.equal(d.trades[0].symbol, "ABC");
  assert.ok(d.trades[0].id.length > 0);
});

test("backup round trip, and other files are refused", () => {
  globalThis.localStorage = { setItem() {}, getItem() { return null; }, removeItem() {} };
  Object.assign(S, normalizeData({ settings: { capital: 1000 }, trades: [{ id: "t1", symbol: "ABC", entryPrice: 10, qty: 100 }] }));
  const text = exportJSON();
  Object.assign(S, normalizeData());
  assert.equal(importJSON(text), 1);
  assert.equal(S.settings.capital, 1000);
  assert.throws(() => importJSON("{}"), /not a Trade Notebook backup/);
  assert.throws(() => importJSON("nope"), /not valid JSON/);
});
