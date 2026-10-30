// Calculator: the full cost of a trade before you place it, a break-even price and a position size from your risk limit.
import { S } from "../store.js";
import { esc, peso, usd, cur, price as fp, qty as fq, pct, num } from "../format.js";
import { phTick, phBoardLot, phOnTick, phLotOk, phRoundUp, buy, sell, breakEven, usFunding, usDividendNet } from "../fees.js";
import { positionSize, rewardRisk } from "../risk.js";
import { lines, pnlChip, DISCLAIMER } from "./common.js";

// what is typed in the calculator; lives for this visit only
export const C = { market: "PH", symbol: "", price: "", qty: "", stop: "", target: "", fx: "" };

const field = (name, label, value, hint = "", attrs = "") => `<div class="field"><label for="c-${name}">${label}</label><input id="c-${name}" name="${name}" value="${esc(value)}" inputmode="decimal" autocomplete="off" ${attrs}>${hint}</div>`;

export function calcView() {
  const us = C.market === "US", fx = C.fx || (S.settings.fx || "");
  return `<div class="st">
  <div class="st-main">
    <section class="card sec" aria-labelledby="calcTitle">
      <div class="card-head"><h2 id="calcTitle">Plan a trade</h2>
        <div class="seg" role="group" aria-label="Market">
          <button type="button" data-act="calc-market" data-market="PH" aria-pressed="${!us}">PH · COL</button>
          <button type="button" data-act="calc-market" data-market="US" aria-pressed="${us}">US · Gotrade</button>
        </div>
      </div>
      <form id="calcForm" class="form-grid" autocomplete="off">
        <div class="field"><label for="c-symbol">Stock</label><input id="c-symbol" name="symbol" value="${esc(C.symbol)}" placeholder="${us ? "e.g. VOO" : "e.g. FMETF"}" autocapitalize="characters" spellcheck="false" maxlength="12"></div>
        ${field("price", `Buy price (${us ? "$" : "₱"})`, C.price, `<small id="priceHint" class="hint"></small>`)}
        ${field("qty", "Shares", C.qty, `<small id="qtyHint" class="hint"></small>`)}
        ${field("stop", `Stop-loss (${us ? "$" : "₱"})`, C.stop, `<small class="hint">Where you sell if you're wrong</small>`)}
        ${field("target", `Target (${us ? "$" : "₱"})`, C.target, `<small class="hint">Where you plan to take profit</small>`)}
        ${us ? field("fx", "₱ per $1", fx, `<small class="hint">Today's peso–dollar rate</small>`) : ""}
      </form>
    </section>
    <div id="calcOut" class="contents">${calcOut()}</div>
  </div>
  <aside class="st-rail" id="calcRail" aria-label="Summary">${calcRail()}</aside>
</div>`;
}

const read = () => {
  const us = C.market === "US";
  return { us, market: C.market, p: num(C.price), q: num(C.qty), stop: num(C.stop), target: num(C.target), fx: us ? num(C.fx || S.settings.fx) : 1, rates: S.settings.rates };
};

export function priceHints() {
  const { us, p, q } = read();
  if (us) return { price: p > 0 ? "Any price to the cent" : "", qty: "Fractions are fine, e.g. 0.25", bad: false };
  if (!(p > 0)) return { price: "", qty: "", bad: false };
  const tick = phTick(p), lot = phBoardLot(p);
  const priceMsg = phOnTick(p) ? `Moves in ₱${fp(tick)} steps` : `Not a valid PSE price: it moves in ₱${fp(tick)} steps. Nearest above is ₱${fp(phRoundUp(p))}.`;
  const qtyMsg = q > 0 && !phLotOk(p, q) ? `Must be a multiple of the board lot: ${fq(lot)} shares` : `Board lot: ${fq(lot)} shares`;
  return { price: priceMsg, qty: qtyMsg, badPrice: !phOnTick(p), badQty: q > 0 && !phLotOk(p, q) };
}

function sizeSection() {
  const { market, p, stop, fx, rates } = read(), s = S.settings;
  if (!(p > 0) || !(stop > 0)) return `<p class="muted">Enter a buy price and a stop-loss and this suggests how many shares keep your loss at ${pct(s.riskPct, s.riskPct % 1 ? 1 : 0)} of your trading money.</p>`;
  const z = positionSize({ capital: s.capital, riskPct: s.riskPct, entry: p, stop, market, fx, rates });
  const warn = z.warnings.map(w => `<p class="note warn">${esc(w)}</p>`).join("");
  if (!z.shares) return warn;
  return `<p>Risking ${pct(s.riskPct, s.riskPct % 1 ? 1 : 0)} of ${peso(s.capital)} is <b>${peso(z.riskBudget)}</b>. At ${cur(p - stop, market)} a share to your stop, buy up to <b>${fq(z.shares)} shares</b> (${cur(z.cost.net, market)} with fees).</p>
  <p class="muted">If the stop is hit you lose about ${peso(z.risk)} plus fees.</p>${warn}
  <button type="button" class="btn small ghost" data-act="use-size" data-qty="${z.shares}">Use ${fq(z.shares)} shares</button>`;
}

export function calcOut() {
  const { us, market, p, q, stop, target, fx, rates } = read();
  const size = `<section class="card sec"><div class="card-head"><h2>How many shares?</h2></div>${sizeSection()}</section>`;
  if (!(p > 0) || !(q > 0)) return size + `<section class="card sec"><div class="card-head"><h2>What it costs</h2></div><p class="muted">Enter a buy price and number of shares to see every fee.</p></section>`;
  const b = buy(market, p, q, rates), exitP = target > 0 ? target : p, s = sell(market, exitP, q, rates);
  const buyRows = us
    ? [["Shares × price", b.gross], ["Commission", b.commission], ["Total in dollars", b.net, "total"]]
    : [["Shares × price", b.gross], ["Commission", b.commission], ["VAT on commission (12%)", b.vat], ["PSE transaction fee", b.pseFee], b.pseVat ? ["VAT on PSE fee", b.pseVat] : null, ["Clearing fee (SCCP)", b.sccp], ["Total to pay", b.net, "total"]];
  const sellRows = us
    ? [["Shares × price", s.gross], ["Commission", -s.commission], ["You receive", s.net, "total"]]
    : [["Shares × price", s.gross], ["Commission", -s.commission], ["VAT on commission", -s.vat], ["PSE transaction fee", -s.pseFee], s.pseVat ? ["VAT on PSE fee", -s.pseVat] : null, ["Clearing fee (SCCP)", -s.sccp], ["Stock transaction tax", -s.salesTax], ["You receive", s.net, "total"]];
  const pnl = Math.round((s.net - b.net) * 100) / 100;
  let out = size + `<section class="card sec"><div class="card-head"><h2>Buying ${fq(q)} ${esc(C.symbol || "shares")} at ${cur(p, market)}</h2></div>${lines(buyRows, market)}`;
  if (us && fx > 0) { const f = usFunding(b.net, fx, rates.us); out += `<p class="note">Funding in pesos: about <b>${peso(f.pesos)}</b>, of which ${peso(f.fxCost)} is the currency conversion (${pct(rates.us.fxSpread * 100, 1)}). Dividends: the US keeps ${pct(rates.us.withholding * 100)}, so a $1.00 dividend pays you ${usd(usDividendNet(1, rates.us))}.</p>`; }
  out += `</section><section class="card sec"><div class="card-head"><h2>${target > 0 ? `Selling at your target, ${cur(target, market)}` : "Selling at the same price"}</h2>${pnlChip(pnl, market)}</div>${lines(sellRows, market)}`;
  if (!(target > 0)) out += `<p class="note">Buying and selling at the same price still loses ${cur(-pnl, market)} to fees. That's why you need the break-even price.</p>`;
  out += `</section>`;
  if (stop > 0 && stop < p) {
    const l = sell(market, stop, q, rates), loss = Math.round((l.net - b.net) * 100) / 100;
    out += `<section class="card sec"><div class="card-head"><h2>If your stop-loss at ${cur(stop, market)} is hit</h2>${pnlChip(loss, market)}</div><p>You'd get back ${cur(l.net, market)}. ${us && fx > 0 ? `That's about ${peso(loss * fx)}. ` : ""}Decide now that you will sell there; don't move the stop down later.</p></section>`;
  }
  return out;
}

export function calcRail() {
  const { us, market, p, q, stop, target, fx, rates } = read();
  if (!(p > 0) || !(q > 0)) return `<div class="hero"><div class="eyebrow">Total to buy</div><div class="hero-big">${us ? "$0" : "₱0"}</div><p class="hero-sub">Fill in the price and shares.</p></div><p class="note">${esc(DISCLAIMER)}</p>`;
  const b = buy(market, p, q, rates), be = breakEven(market, p, q, rates), rr = rewardRisk(p, stop, target);
  const round = sell(market, p, q, rates), feePct = b.net > 0 ? (b.net - round.net) / b.gross * 100 : 0;
  const maxLoss = stop > 0 && stop < p ? sell(market, stop, q, rates).net - b.net : 0;
  return `<div class="hero">
    <div class="eyebrow">Total to buy</div>
    <div class="hero-big money">${cur(b.net, market)}</div>
    <p class="hero-sub">${us && fx > 0 ? `≈ ${peso(b.net * fx)} · ` : ""}${fq(q)} ${esc(C.symbol || "shares")} at ${cur(p, market)}</p>
    <div class="hero-stats">
      <div><b class="money">${cur(be, market)}</b><span>Break-even sell price</span></div>
      <div><b>${pct(feePct, 2)}</b><span>Fees to buy and sell</span></div>
      <div><b class="money${maxLoss ? " neg" : ""}">${maxLoss ? cur(maxLoss, market) : "–"}</b><span>Loss at your stop</span></div>
      <div><b>${rr ? rr.toFixed(1) + " : 1" : "–"}</b><span>Reward : risk</span></div>
    </div>
  </div>
  ${rr && rr < 2 ? `<p class="note warn">Reward : risk under 2 : 1 means you must be right more than a third of the time just to break even after losses.</p>` : ""}
  <button type="button" class="btn" data-act="log-calc">Log this trade in the journal</button>
  <p class="note">${esc(DISCLAIMER)}</p>`;
}
