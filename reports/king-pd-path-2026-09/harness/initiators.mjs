// Who requests the heavy and the HTML-fallback URLs? CDP Network.requestWillBeSent
// carries the initiator (parser / script stack). Unthrottled, live, teacher shell.
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const URL_ = process.argv[2] || 'https://alloflow-cdn.pages.dev/app/';
const WATCH = /ui_strings\.js|help_strings\.js|word_audio_kokoro_bank|phonemes\.json|audio_bank|vendor\/|fonts\/|allo-shell-config|cdnjs|jsdelivr|unpkg|googleapis|gstatic|release\.json|chart\.umd/;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
const out = [];
cdp.on('Network.requestWillBeSent', (e) => {
  if (!WATCH.test(e.request.url)) return;
  const st = e.initiator && e.initiator.stack;
  const frames = [];
  for (let s = st; s && frames.length < 6; s = s.parent) for (const f of s.callFrames || []) { if (frames.length < 6) frames.push(`${f.functionName || '(anon)'} @ ${f.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]}:${f.lineNumber + 1}`); }
  out.push({ t: Math.round(e.timestamp * 1000), url: e.request.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 100), host: new URL(e.request.url).host, type: e.initiator.type, initUrl: (e.initiator.url || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0], line: e.initiator.lineNumber, frames });
});
await page.goto(URL_, { waitUntil: 'commit' });
await page.getByRole('button', { name: /Full Platform/ }).click({ timeout: 90000 });
await page.getByRole('button', { name: /Build accessible lessons/ }).click({ timeout: 60000 });
await page.getByRole('button', { name: 'Close Wizard', exact: true }).click({ timeout: 60000 });
await page.waitForTimeout(75000);
const t0 = out.length ? out[0].t : 0;
for (const o of out) o.t -= t0;
fs.writeFileSync('C:/tmp/alloflow_dispatch/wave1/K4_scratch/initiators.json', JSON.stringify(out, null, 1));
for (const o of out) console.log(`${String(o.t).padStart(6)} ${o.host.padEnd(24)} ${o.url.padEnd(60)} ${o.type} ${o.initUrl}:${o.line ?? ''}\n        ${o.frames.slice(0, 3).join(' <- ')}`);
await browser.close();
