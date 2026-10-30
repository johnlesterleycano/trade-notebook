// Learn: the roadmap from docs/LEARN.md as a checklist. Ticks are saved with your data.
import { S } from "../store.js";
import { esc } from "../format.js";

// [id, text]; ids are stable keys in S.learn, so don't renumber them
export const ROADMAP = [
  { title: "1. Foundation first", when: "Weeks 0–2", items: [
    ["emergency", "Have 3–6 months of expenses in an emergency fund (track it in your budget app)."],
    ["debt", "Pay off credit cards and other high-interest debt."],
    ["tuition", "Pick a small “tuition” amount for trading that you can afford to lose."],
    ["horizon", "Only invest money you won't need for 5 years or more."]
  ] },
  { title: "2. Market basics", when: "Weeks 1–4", items: [
    ["stock-index", "Know what a stock, an index (PSEi, S&P 500), an ETF and a dividend are."],
    ["lots-ticks", "Understand PSE board lots and tick sizes (the Calculator shows them)."],
    ["orders", "Know order types: limit, market and stop orders."],
    ["hours", "Know trading hours and T+2 settlement (cash arrives 2 trading days after a sale)."],
    ["fees", "Work out the full fee stack for a buy and a sell in the Calculator."]
  ] },
  { title: "3. Open your accounts", when: "When ready", items: [
    ["col", "Open a COL Financial account for Philippine stocks."],
    ["eip", "Look at COL's Easy Investment Program for regular peso-cost averaging."],
    ["gotrade", "Open a Gotrade account for US stocks; fill in the W-8BEN tax form."],
    ["fx", "Compare Gotrade's peso–dollar rate with the market rate before funding."]
  ] },
  { title: "4. Invest first", when: "Months 1–3", items: [
    ["payday", "Set a fixed amount to invest every 15th and 30th."],
    ["index", "Buy an index ETF or blue chips with it, whatever the price that day."],
    ["no-check", "Resist checking prices every hour. Write down how the ups and downs feel."]
  ] },
  { title: "5. Learn to analyse", when: "Ongoing", items: [
    ["fundamentals", "Fundamentals: P/E ratio, dividend yield, debt, earnings growth."],
    ["annual-report", "Read one company's annual report end to end."],
    ["technicals", "Technicals: support and resistance, trend, moving averages, volume."],
    ["sources", "Use free learning pages from COL Financial, PSE Academy and Investopedia."]
  ] },
  { title: "6. Practice, then trade small", when: "Months 3+", items: [
    ["paper", "Log 10+ practice (paper) trades in the Journal with a full plan."],
    ["one-pct", "Risk at most 1% of your trading money per trade (the Calculator sizes it)."],
    ["real-small", "Start real trades small, and journal every one."],
    ["review", "Review your numbers every month in Review."],
    ["scale", "Add money only after 30+ trades with positive expectancy."]
  ] }
];

export function learnView() {
  const total = ROADMAP.reduce((n, s) => n + s.items.length, 0), done = ROADMAP.reduce((n, s) => n + s.items.filter(([id]) => S.learn[id]).length, 0);
  const steps = ROADMAP.map(s => {
    const n = s.items.filter(([id]) => S.learn[id]).length;
    return `<section class="card sec"><div class="card-head"><h2>${esc(s.title)}</h2><span class="chip ${n === s.items.length ? "good" : "soft"}">${esc(s.when)} · ${n}/${s.items.length}</span></div>
      <ul class="checklist" role="list">${s.items.map(([id, text]) => `<li><label class="toggle"><input type="checkbox" data-learn="${esc(id)}"${S.learn[id] ? " checked" : ""}><span>${esc(text)}</span></label></li>`).join("")}</ul></section>`;
  }).join("");
  const rail = `<div class="hero"><div class="eyebrow">Your progress</div><div class="hero-big">${done}/${total}</div><div class="progress light" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-label="Roadmap progress"><i style="width:${Math.round(done / total * 100)}%"></i></div><p class="hero-sub">Investing first, trading later. There's no rush.</p></div>
    <section class="card panel"><h2>Where to learn</h2><ul class="tips">
      <li><a href="https://www.colfinancial.com/" target="_blank" rel="noopener noreferrer">COL Financial</a>: free seminars and research for account holders.</li>
      <li><a href="https://www.pse.com.ph/" target="_blank" rel="noopener noreferrer">Philippine Stock Exchange</a>: PSE Academy courses, board lot table, company disclosures.</li>
      <li><a href="https://www.investopedia.com/" target="_blank" rel="noopener noreferrer">Investopedia</a>: plain-English definitions of every term.</li>
      <li><a href="https://www.heygotrade.com/" target="_blank" rel="noopener noreferrer">Gotrade</a>: fee page and help centre for US stocks.</li></ul></section>
    <section class="card panel"><h2>Three rules to keep</h2><ul class="tips"><li>Never trade money you need for bills.</li><li>Every trade has a stop-loss before you buy.</li><li>If you can't explain why you're buying, don't.</li></ul></section>`;
  return `<div class="st"><div class="st-main">${steps}</div><aside class="st-rail" aria-label="Progress">${rail}</aside></div>`;
}
