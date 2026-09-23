// Markup of the Quick Start wizard's close button before the remote strings arrive.
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
await ctx.route((u) => ['/ui_strings.js', '/help_strings.js'].some((b) => u.href.includes(b)), (rt) => rt.abort());
const page = await ctx.newPage();
await page.goto('https://alloflow-cdn.pages.dev/app/', { waitUntil: 'commit' });
await page.locator('button').filter({ hasText: /Full (Platform|AlloFlow)/ }).first().click({ timeout: 120000 });
await page.locator('button').filter({ hasText: /^\s*Teacher/ }).first().click({ timeout: 60000 });
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const near = [...document.querySelectorAll('button')].filter((x) => { const r = x.getBoundingClientRect(); return r.x > 860 && r.x < 940 && r.y > 120 && r.y < 190; });
  const dlg = [...document.querySelectorAll('[role=dialog]')].map((d) => (d.id || '') + ' ' + (d.getAttribute('aria-labelledby') || '') + ' ' + (d.getAttribute('aria-label') || '') + ' ' + String(d.className).slice(0, 60));
  return { near: near.map((x) => x.outerHTML.slice(0, 300)), dialogs: dlg };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
