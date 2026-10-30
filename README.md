# Trade Notebook

A dark, trading-desk-style calculator and journal for learning to invest and trade **Philippine stocks** (PSE, for example through COL Financial) and **US stocks** (for example through Gotrade). It shows the true cost of a trade before you place it, sizes the position from your risk limit, and keeps a journal so your own history becomes the teacher.

> For learning only, not financial advice. Fee and tax rates are defaults: check them against your broker and change them in Settings.

New to investing? Start with the **[learning roadmap](docs/LEARN.md)**, then the **[how-to guide](docs/HOW-TO.md)**.

## What it does

| Section | What you see and do |
| --- | --- |
| **Calculator** | Type a price, shares, stop-loss and target. See the PSE tick size and board lot, every fee line (commission, VAT, PSE fee, clearing fee, sales tax), the break-even sell price, the loss if the stop is hit, reward : risk, and how many shares keep your loss within your risk limit. US mode adds fractional shares, the peso cost of funding and dividend withholding. |
| **Journal** | Every trade with its plan (a stop-loss and a reason are required), how you felt, and once sold, the result and a lesson. Tick "Practice" for paper trades. Open positions and the total planned loss sit on the side. |
| **Review** | Win rate, average win and loss, expectancy, average R, profit factor, a running-total chart, results by month, by mood and by setup, and habits to watch (stops ignored, missing lessons). |
| **Learn** | The roadmap as a checklist: foundation, market basics, accounts, investing first, analysis, then practice and small trades. |
| **Settings** | Trading money, max risk per trade, the peso–dollar rate, every fee and tax rate, theme (dark by default, light or match device), and backup / restore. |

Your data stays in your browser (localStorage). Download a backup from Settings to keep it safe or move it to another device.

## Project layout

| Path | What it is |
| --- | --- |
| `app/` | The website (plain HTML, CSS and JavaScript modules, no build step). GitHub Pages serves this folder. |
| `app/js/fees.js` | PSE price bands, PH and US fees, break-even. Pure functions. |
| `app/js/risk.js` | Position sizing and reward : risk. |
| `app/js/journal.js` | Trade validation, results, open positions and stats. |
| `app/js/store.js` | Saved state, backup export and import. |
| `app/js/views/*.js` | One file per section; each returns an HTML string. |
| `tests/` | Node tests with synthetic numbers only. |
| `scripts/scan.sh` | Blocks backups, spreadsheets and private words from ever being committed. |

## Run it locally

```sh
cd app && python3 -m http.server 8000   # then open http://localhost:8000
npm test                                 # node 20+; no dependencies to install
sh scripts/scan.sh                       # personal-data check
git config core.hooksPath scripts/hooks  # once per clone: runs the scan before every commit
```

## Deploy

Pushing to `main` runs the scan and the tests, then deploys `app/` to GitHub Pages (Settings › Pages › Source: GitHub Actions).

## Fee defaults (check them)

| PH (COL Financial) | Default | US (Gotrade) | Default |
| --- | --- | --- | --- |
| Commission | 0.25%, min ₱20 | Commission | 0.3%, min $0.10 |
| VAT on commission | 12% | Currency conversion | 0.5% |
| PSE transaction fee | 0.005% (+12% VAT) | Dividend withholding | 25% |
| Clearing fee (SCCP) | 0.01% | | |
| Stock transaction tax (sells) | 0.1% (CMEPA, from July 2025) | | |
