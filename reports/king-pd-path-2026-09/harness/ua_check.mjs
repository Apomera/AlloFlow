// Observer-effect check: does the harness's in-page instrumentation slow the boot?
// Variant "full" injects the exact INSTR from measure.mjs; variant "min" injects only
// a MutationObserver on <body> class (no subtree, no text scans). Both record the
// launch-pad time the same way (body gets alloflow-launchpad-active).
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const src = fs.readFileSync('C:/tmp/alloflow_dispatch/wave1/K4_scratch/measure.mjs', 'utf8');
const a = src.indexOf('const INSTR = String.raw`') + 'const INSTR = String.raw`'.length;
const b = src.indexOf('})();`;', a) + '})();'.length;
const INSTR = src.slice(a, b);
const MIN = `(() => { const rec = window.__min = {}; const now = () => Math.round(performance.now());
  const watch = () => { const mo = new MutationObserver(() => { if (rec.lp == null && document.body.classList.contains('alloflow-launchpad-active')) rec.lp = now(); });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] }); };
  if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch); })();`;
const NET = { latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 };
const rounds = Number(process.argv[2] || 3);
const out = [];
for (let i = 0; i < rounds; i++) {
  for (const variant of (i % 2 ? ['full', 'fullcros'] : ['fullcros', 'full'])) {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block', ...(variant === 'fullcros' ? { userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', locale: 'en-US' } : {}) });
    await ctx.addInitScript(variant === 'min' ? MIN : INSTR);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NET });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto('https://alloflow-cdn.pages.dev/app/', { waitUntil: 'commit' });
    const lp = await page.waitForFunction((v) => { const x = v !== 'min' ? (window.__k4 && window.__k4.marks.launchpad) : (window.__min && window.__min.lp); return x || null; }, variant, { timeout: 180000, polling: 250 }).then((h) => h.jsonValue()).catch(() => null);
    const core = await page.evaluate(() => { const m = window.AlloModules || {}; return ['LaunchPadView', 'HistoryPanel', 'SidebarTabsNav'].map((k) => !!m[k]); }).catch(() => null);
    out.push({ round: i + 1, variant, lp });
    console.log(`round ${i + 1} ${variant.padEnd(4)} launchpad ${lp} ms`, core);
    await browser.close();
  }
}
fs.writeFileSync('C:/tmp/alloflow_dispatch/wave1/K4_scratch/ua_check.json', JSON.stringify(out, null, 1));
