// Trade costs for Philippine (PSE, e.g. through COL Financial) and US (e.g. through Gotrade) stocks.
// Pure functions, tested in tests/fees.test.js. Every rate is a setting: brokers and the law change them,
// so the defaults here are a starting point to check against your broker's current fee page.
import { round2, round4 } from "./format.js";

export const DEFAULT_RATES = {
  ph: {
    commission: 0.0025,   // 0.25% of the trade value
    minCommission: 20,    // ₱ per trade; brokers set their own minimum since SEC MC No. 7 (2024)
    vat: 0.12,            // 12% VAT on the commission
    pseFee: 0.00005,      // PSE transaction fee, 0.005%
    vatOnPseFee: true,    // brokers add VAT to the PSE fee since September 2025
    sccp: 0.0001,         // clearing fee (SCCP), 0.01%
    salesTax: 0.001       // stock transaction tax on sells: 0.1% since CMEPA (July 2025), was 0.6%
  },
  us: {
    commission: 0.003,    // 0.15%–0.3% of the trade value, depending on country and plan
    minCommission: 0.1,   // $ per trade
    fxSpread: 0.005,      // cost of converting pesos to dollars (and back), about 0.3%–1%
    withholding: 0.25     // US tax kept from dividends of Philippine residents (treaty rate, with a W-8BEN)
  }
};

// PSE price bands: from this price up, [tick size, board lot]. Check against the PSE's published table.
export const PH_BANDS = [
  [0.0001, 0.0001, 1000000],
  [0.01, 0.001, 100000],
  [0.05, 0.001, 10000],
  [0.25, 0.005, 10000],
  [0.5, 0.01, 1000],
  [5, 0.01, 100],
  [10, 0.02, 100],
  [20, 0.05, 100],
  [50, 0.05, 10],
  [100, 0.1, 10],
  [200, 0.2, 10],
  [500, 0.5, 10],
  [1000, 1, 5],
  [2000, 2, 5],
  [5000, 5, 5]
];
const EPS = 1e-9;
const band = p => { let b = PH_BANDS[0]; for (const x of PH_BANDS) if (p + EPS >= x[0]) b = x; return b; };
export const phTick = p => band(+p || 0)[1];
export const phBoardLot = p => band(+p || 0)[2];
// is the price a multiple of its band's tick? (₱27.35 yes, ₱27.32 no)
export const phOnTick = p => { const t = phTick(p), n = p / t; return p > 0 && Math.abs(n - Math.round(n)) < 1e-6; };
export const phLotOk = (p, q) => q > 0 && Number.isInteger(q / phBoardLot(p));
// next valid price above / below, crossing into the next band when needed
export const phTickUp = p => { const t = phTick(p); const v = round4(Math.floor(p / t + 1e-6) * t + t); return phOnTick(v) ? v : round4(band(v)[0]); };
export const phTickDown = p => { const t = phTick(p - 1e-6); return round4(Math.ceil(p / t - 1e-6) * t - t); };
export const phRoundUp = p => phOnTick(p) ? round4(p) : phTickUp(p);
export const phRoundDown = p => { const t = phTick(p); return round4(Math.floor(p / t + 1e-6) * t); };

const r = (rates, k) => ({ ...DEFAULT_RATES[k], ...(rates || {}) });

// One side of a PSE trade, every fee rounded to the centavo like a broker's confirmation slip.
function phSide(price, qty, rates, sell) {
  const R = r(rates, "ph"), gross = round2(price * qty);
  if (!(gross > 0)) return { gross: 0, commission: 0, vat: 0, pseFee: 0, pseVat: 0, sccp: 0, salesTax: 0, fees: 0, net: 0 };
  const commission = round2(Math.max(gross * R.commission, R.minCommission));
  const vat = round2(commission * R.vat);
  const pseFee = round2(gross * R.pseFee);
  const pseVat = R.vatOnPseFee ? round2(pseFee * R.vat) : 0;
  const sccp = round2(gross * R.sccp);
  const salesTax = sell ? round2(gross * R.salesTax) : 0;
  const fees = round2(commission + vat + pseFee + pseVat + sccp + salesTax);
  return { gross, commission, vat, pseFee, pseVat, sccp, salesTax, fees, net: round2(sell ? gross - fees : gross + fees) };
}
export const phBuy = (price, qty, rates) => phSide(price, qty, rates, false);
export const phSell = (price, qty, rates) => phSide(price, qty, rates, true);

// Lowest valid price where selling gets back everything the buy cost.
export function phBreakEven(buyPrice, qty, rates) {
  const cost = phBuy(buyPrice, qty, rates).net;
  if (!(cost > 0)) return 0;
  let p = phRoundUp(buyPrice);
  for (let i = 0; i < 100000 && phSell(p, qty, rates).net < cost; i++) p = phTickUp(p);
  return p;
}

// One side of a US trade, in dollars. Fractional shares are fine.
function usSide(price, qty, rates, sell) {
  const R = r(rates, "us"), gross = round2(price * qty);
  if (!(gross > 0)) return { gross: 0, commission: 0, fees: 0, net: 0 };
  const commission = round2(Math.max(gross * R.commission, R.minCommission));
  return { gross, commission, fees: commission, net: round2(sell ? gross - commission : gross + commission) };
}
export const usBuy = (price, qty, rates) => usSide(price, qty, rates, false);
export const usSell = (price, qty, rates) => usSide(price, qty, rates, true);

// Lowest price (to the cent) where selling gets back what the buy cost, in dollars.
export function usBreakEven(buyPrice, qty, rates) {
  const R = r(rates, "us"), cost = usBuy(buyPrice, qty, rates).net;
  if (!(cost > 0)) return 0;
  let p = cost / (qty * (1 - R.commission));
  if (p * qty * R.commission < R.minCommission) p = (cost + R.minCommission) / qty;
  // the estimate ignores cent rounding, so start a little below it and step up
  p = Math.max(0.01, round2(Math.ceil(p * 100 - 1e-6) / 100 - 0.05));
  while (usSell(p, qty, rates).net < cost) p = round2(p + 0.01);
  return p;
}

// Pesos needed to fund dollars, and what converting costs (the spread over the quoted rate).
export function usFunding(dollars, fx, rates) {
  const R = r(rates, "us"), base = round2(dollars * fx);
  const fxCost = round2(base * R.fxSpread);
  return { base, fxCost, pesos: round2(base + fxCost) };
}

export const usDividendNet = (gross, rates) => round2(gross * (1 - r(rates, "us").withholding));

// Market-neutral helpers: costs in the trade's own currency (₱ for PH, $ for US).
export const buy = (market, price, qty, rates) => market === "US" ? usBuy(price, qty, rates?.us) : phBuy(price, qty, rates?.ph);
export const sell = (market, price, qty, rates) => market === "US" ? usSell(price, qty, rates?.us) : phSell(price, qty, rates?.ph);
export const breakEven = (market, price, qty, rates) => market === "US" ? usBreakEven(price, qty, rates?.us) : phBreakEven(price, qty, rates?.ph);
