# Trade Notebook: notes for Claude

A trade calculator and journal for learning PH (PSE via COL Financial) and US (via Gotrade) stocks. Static site on GitHub Pages (`app/`), data in the browser's localStorage with a JSON backup. Sister project of Payday Money Plan (finance-tracker): same stack and rules, its own "trading desk" look.

## Hard rules
- **This repo is public. Never commit personal data**: no real trades, amounts, names, backups or exports. Tests use synthetic fixtures only (made-up symbols like ABC, XYZ). Run `sh scripts/scan.sh` before committing; CI runs it too.
- For learning only: the app never tells someone what to buy. Keep the disclaimer on Calculator, Review and Settings.
- Work autonomously and note decisions in this file or the README.

## Layout
- `app/js/fees.js`: PSE price bands (`PH_BANDS`), tick/lot helpers, `phBuy` / `phSell` / `phBreakEven`, `usBuy` / `usSell` / `usBreakEven`, `usFunding`, `usDividendNet`, `DEFAULT_RATES`. All pure; change fee rules here, not in views.
- `app/js/risk.js`: `positionSize` (board lots for PH, 0.0001 fractions for US, capped by cash after fees), `rewardRisk`.
- `app/js/journal.js`: `normalizeTrade` (source of truth for a trade's shape), `checkTrade` (errors block a save, warnings need "Save anyway"), `result`, `positions`, `stats`, `monthly`, `equity`, `byField`.
- `app/js/store.js`: state `S` {settings, trades, learn}, `normalizeData`, localStorage key `trade-notebook-v1`, backup export/import.
- `app/js/views/*.js`: return HTML strings. **Every interpolated value goes through `esc()` or a number formatter.**
- `app/js/main.js`: sections, event delegation (`data-act`, `data-set`, `data-learn`), keys 1–5. `app/js/forms.js`: the trade form on a native `<dialog>`.
- `app/js/theme.js`: plain script in `<head>` (CSP forbids inline scripts); always sets `data-theme` to `dark` (default), `light` or `system`; localStorage `trade-notebook-theme-v2`.

## Design
- Desktop-first. From 900px: sidebar, statement + rail (`.st > .st-main + .st-rail`), centered dialog. From 1100px the rail sits on the right, its first panel sticky (`.st-rail.static` opts out). Below 900px: bottom tab bar, cards, bottom sheet.
- Trading desk look (chosen 2026-10-30, replacing the pink Payday Money Plan palette): navy-black panels, electric-blue accent `--accent` #2962FF, `--gain` green, `--loss` red, `--warn` amber; tokens on `:root` in `app/css/app.css`. Dark is the default; light tokens apply under `[data-theme="light"]` and under `[data-theme="system"]` on a light device.
- Green/red only for gains and losses (and amber for warnings); blue is the only accent. White text sits on `--accent`; accent-colored text uses `--accent-ink`. Every text/background pair is ≥ 4.5:1 in both themes: re-check when changing a token.
- Fonts: Inter for text, JetBrains Mono for amounts, prices, share counts and symbols (`.money`, fee tables, decimal inputs, `.hero-big`).

## Decisions
- One journal entry per round trip (buy, later sell), not separate fills: simpler for a beginner and enough for R-multiples. Adding to a position = a new entry; open positions average them.
- Money stays in the trade's currency; US results convert to pesos at the sell-date rate. The FX spread is shown in the Calculator as a funding cost, not deducted from trade results.
- Results use the current fee settings, not a snapshot. Rates change rarely; if they do, old results shift by centavos.
- A stop-loss and a reason are required to save a trade (journal discipline). Risk over the limit is a warning only.
- "Stops ignored" = a loss worse than −1.25R.
- Fee defaults checked October 2026: COL 0.25% (broker minimums are broker-set since SEC MC No. 7, 2024; ₱20 default), 12% VAT, PSE 0.005% with VAT since Sept 2025, SCCP 0.01%, sales tax 0.1% under CMEPA (July 2025). Gotrade 0.15–0.3% min $0.10, FX 0.3–1%. US treaty withholding 25%.

## Commands
`npm test` · `sh scripts/scan.sh` · `cd app && python3 -m http.server 8000` · `git config core.hooksPath scripts/hooks`

## Next milestones
1. Portfolio tracker (holdings, typed-in prices, unrealized P/L in pesos).
2. Payday investing plan (fixed amount every 15th/30th, contributions log).
3. Optional price data behind a toggle.
