// Does the 9.4 MB remote UI-strings refresh ever land in the localStorage cache the shell writes?
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { const t = m.text(); if (/UI_STRINGS|HELP_STRINGS|QuotaExceeded|quota/i.test(t)) logs.push(t.slice(0, 160)); });
await page.goto('https://alloflow-cdn.pages.dev/app/', { waitUntil: 'commit' });
await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => e.name.includes('/ui_strings.js') && e.responseEnd > 0), null, { timeout: 120000, polling: 500 });
await page.waitForTimeout(8000);
const r = await page.evaluate(() => {
  const k = localStorage.getItem('alloflow_ui_strings_cache');
  let used = 0; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); used += key.length + (localStorage.getItem(key) || '').length; }
  let probe = 'n/a';
  try { localStorage.setItem('__k4_probe', 'x'.repeat(6 * 1024 * 1024)); probe = 'accepted 6M chars'; localStorage.removeItem('__k4_probe'); } catch (e) { probe = 'rejected 6M chars: ' + e.name; }
  return { cachedChars: k ? k.length : 0, localStorageChars: used, probe };
});
console.log(JSON.stringify(r), '\n', logs.join('\n'));
await browser.close();
