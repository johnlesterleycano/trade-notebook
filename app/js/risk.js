// Position sizing: how many shares so that hitting your stop-loss costs at most riskPct of your trading money.
// Pure, tested in tests/risk.test.js.
import { phBoardLot, buy } from "./fees.js";
import { round2 } from "./format.js";

// Reward : risk, e.g. 2 means the target is twice as far from entry as the stop.
export const rewardRisk = (entry, stop, target) => entry > stop && target > entry ? round2((target - entry) / (entry - stop)) : 0;

// capital and the risk budget are in pesos; for US trades fx turns them into dollars.
export function positionSize({ capital, riskPct, entry, stop, market = "PH", fx = 0, rates }) {
  const out = { shares: 0, lot: 1, riskBudget: 0, risk: 0, cost: null, cappedByCash: false, warnings: [] };
  const us = market === "US";
  if (!(capital > 0)) { out.warnings.push("Set your trading money in Settings to size positions."); return out; }
  if (!(entry > 0) || !(stop > 0)) return out;
  if (stop >= entry) { out.warnings.push("For a buy, the stop-loss must be below the entry price."); return out; }
  if (us && !(fx > 0)) { out.warnings.push("Enter the peso–dollar rate for US trades."); return out; }
  const rate = us ? fx : 1;
  out.riskBudget = round2(capital * riskPct / 100);
  const budget = out.riskBudget / rate, cash = capital / rate, perShare = entry - stop;
  // US brokers like Gotrade sell fractions, so round down to 0.0001 share; PSE trades go in whole board lots
  const step = us ? 1e-4 : phBoardLot(entry);
  out.lot = us ? 0 : step;
  const fit = n => Math.floor(n / step + 1e-9) * step;
  let shares = fit(budget / perShare);
  // never more than the money you have, after fees
  while (shares > 0 && buy(market, entry, shares, rates).net > cash) { shares = fit(shares - step); out.cappedByCash = true; }
  out.shares = us ? Math.round(shares * 1e4) / 1e4 : shares;
  if (!out.shares) {
    out.warnings.push(us ? "Your risk budget is too small for this stop." : `Even one board lot (${step.toLocaleString("en-PH")} shares) risks more than your limit, or costs more than your trading money. Pick a closer stop, a cheaper stock or a smaller position.`);
    return out;
  }
  out.cost = buy(market, entry, out.shares, rates);
  out.risk = round2(out.shares * perShare * rate);
  if (out.cappedByCash) out.warnings.push("Limited by your trading money, not by risk.");
  return out;
}
