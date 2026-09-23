// Diagnosis only (no reported timings come from this sampling): what is on screen
// between "core boot modules registered" and "launch pad shown" on Fast 3G?
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const NET = process.argv[2] || 'fast3g';
const OUT = 'C:/tmp/alloflow_dispatch/wave1/K4_scratch/film-' + NET;
fs.mkdirSync(OUT, { recursive: true });
const NETS = { fast3g: { latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 }, wifi: { latency: 40, downloadThroughput: 1250000, uploadThroughput: 1250000 } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS[NET] });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const t0 = Date.now();
const reqs = [];
page.on('requestfinished', (r) => reqs.push([Date.now() - t0, r.url().replace(/^https?:\/\/[^/]+/, '').split('?')[0]]));
await page.goto('https://alloflow-cdn.pages.dev/app/', { waitUntil: 'commit' });
const frames = [];
for (let i = 0; i < 45; i++) {
  const st = await page.evaluate(() => ({
    t: Math.round(performance.now()),
    text: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 160),
    lp: !!document.body && document.body.classList.contains('alloflow-launchpad-active'),
    modules: window.AlloModules ? Object.keys(window.AlloModules).length : 0,
    lpView: !!(window.AlloModules && window.AlloModules.LaunchPadView),
  })).catch((e) => ({ err: String(e).slice(0, 80) }));
  frames.push(st);
  if (i % 3 === 0) await page.screenshot({ path: `${OUT}/f${String(i).padStart(2, '0')}.png` }).catch(() => {});
  if (st.lp) break;
  await page.waitForTimeout(2000);
}
fs.writeFileSync(`${OUT}/frames.json`, JSON.stringify({ frames, reqs }, null, 1));
for (const f of frames) console.log(f.t, f.lp ? 'LP' : '  ', 'mods=' + f.modules, f.lpView ? 'lpView' : '', '|', f.text);
await browser.close();
