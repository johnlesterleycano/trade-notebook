// Settings: trading money, risk limit, fee and tax rates, theme, backup.
import { S } from "../store.js";
import { esc } from "../format.js";
import { DISCLAIMER } from "./common.js";

// rates are stored as fractions (0.0025) and shown as percents (0.25)
const pctOut = v => String(Math.round(v * 1e6) / 1e4);
const f = (path, label, value, hint = "", step = "any") => `<div class="field"><label for="s-${path}">${label}</label><input id="s-${path}" data-set="${path}" type="number" inputmode="decimal" min="0" step="${step}" value="${esc(value)}">${hint ? `<small class="hint">${hint}</small>` : ""}</div>`;
const rate = (path, label, v, hint) => f(path, label + " (%)", pctOut(v), hint);

export function settingsView() {
  const s = S.settings, ph = s.rates.ph, us = s.rates.us, theme = window.tradeTheme?.get() || "dark";
  const main = `<section class="card sec"><div class="card-head"><h2>Your trading money</h2></div>
      <div class="form-grid">
        ${f("capital", "Trading money (₱)", s.capital || "", "Only money you can afford to lose. Used to size positions.")}
        ${f("riskPct", "Max risk per trade (%)", s.riskPct, "1% is a common limit for beginners.")}
        ${f("fx", "₱ per $1", s.fx || "", "Default rate for US trades.")}
      </div></section>
    <section class="card sec"><div class="card-head"><h2>PH stocks (COL Financial)</h2><button type="button" class="btn small ghost" data-act="reset-rates" data-market="ph">Use defaults</button></div>
      <div class="form-grid">
        ${rate("rates.ph.commission", "Commission", ph.commission, "COL: 0.25% of the trade value")}
        ${f("rates.ph.minCommission", "Minimum commission (₱)", ph.minCommission, "Check your broker's current minimum")}
        ${rate("rates.ph.vat", "VAT", ph.vat, "On the commission")}
        ${rate("rates.ph.pseFee", "PSE transaction fee", ph.pseFee)}
        ${rate("rates.ph.sccp", "Clearing fee (SCCP)", ph.sccp)}
        ${rate("rates.ph.salesTax", "Stock transaction tax on sells", ph.salesTax, "0.1% since July 2025 (was 0.6%)")}
      </div>
      <label class="toggle"><input type="checkbox" data-set="rates.ph.vatOnPseFee"${ph.vatOnPseFee ? " checked" : ""}><span>Add VAT to the PSE fee too (since September 2025)</span></label></section>
    <section class="card sec"><div class="card-head"><h2>US stocks (Gotrade)</h2><button type="button" class="btn small ghost" data-act="reset-rates" data-market="us">Use defaults</button></div>
      <div class="form-grid">
        ${rate("rates.us.commission", "Commission", us.commission, "0.15%–0.3%; check the app for your rate")}
        ${f("rates.us.minCommission", "Minimum commission ($)", us.minCommission)}
        ${rate("rates.us.fxSpread", "Currency conversion cost", us.fxSpread, "Gap between Gotrade's rate and the market rate")}
        ${rate("rates.us.withholding", "US dividend withholding", us.withholding, "25% for Philippine residents with a W-8BEN")}
      </div></section>`;
  const rail = `<section class="card panel"><h2>Appearance</h2><div class="field"><label for="theme">Theme</label><select id="theme" data-act="theme">${[["dark", "Dark"], ["light", "Light"], ["system", "Match device"]].map(([v, l]) => `<option value="${v}"${theme === v ? " selected" : ""}>${l}</option>`).join("")}</select></div></section>
    <section class="card panel"><h2>Your data</h2><p class="muted">Everything stays in this browser on this device. Download a backup now and then, and use it to move to another device.</p>
      <div class="btn-row"><button type="button" class="btn small" data-act="export">Download backup</button>
      <label class="btn small ghost file-btn">Restore backup<input type="file" accept="application/json,.json" data-act="import"></label></div>
      <button type="button" class="btn small danger" data-act="reset-all">Delete all data on this device</button></section>
    <p class="note">${esc(DISCLAIMER)}</p>`;
  return `<div class="st"><div class="st-main">${main}</div><aside class="st-rail static" aria-label="Data">${rail}</aside></div>`;
}
