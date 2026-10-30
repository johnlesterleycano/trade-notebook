// Small HTML pieces shared by the views. Every interpolated value goes through esc() or a number formatter.
import { esc, cur, signed } from "../format.js";

// label / amount rows like a broker's confirmation slip; [label, amount, className?]
export const lines = (rows, market) => `<table class="lines"><tbody>${rows.filter(Boolean).map(([l, v, c]) =>
  `<tr${c ? ` class="${c}"` : ""}><th scope="row">${esc(l)}</th><td class="money">${typeof v === "number" ? cur(v, market) : esc(v)}</td></tr>`).join("")}</tbody></table>`;

export const pnlChip = (v, market = "PH") => `<span class="chip ${v > 0 ? "good" : v < 0 ? "bad" : "soft"} money">${esc(signed(v, market))}</span>`;
export const marketChip = m => `<span class="chip soft">${m === "US" ? "US" : "PH"}</span>`;

export const empty = (title, text, button = "") => `<div class="card empty"><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>${button}</div>`;

export const sectionHead = (title, extra = "") => `<div class="card-head"><h2>${esc(title)}</h2>${extra}</div>`;

export const DISCLAIMER = "For learning only, not financial advice. Fees and tax rates are defaults: check them against your broker.";
