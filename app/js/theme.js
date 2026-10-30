// Dark / light choice for this device. A plain (non-module) script in <head>, so the saved choice applies before the
// first paint instead of flashing the other theme. Dark is the default; "system" follows the device setting.
(() => {
  const KEY = "trade-notebook-theme-v2", BAR = { light: "#F5F7FA", dark: "#0B0E14" };
  const apply = t => {
    t = t === "light" || t === "system" ? t : "dark";
    document.documentElement.dataset.theme = t;
    // browser toolbar color: the chosen theme's, or each media variant's own when following the device
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = BAR[t] || (m.media.includes("dark") ? BAR.dark : BAR.light); });
  };
  let saved = "";
  try { saved = localStorage.getItem(KEY) || ""; } catch {}
  apply(saved);
  window.tradeTheme = {
    get: () => document.documentElement.dataset.theme || "dark",
    set: t => { try { if (t === "light" || t === "system") localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch {} apply(t); }
  };
})();
