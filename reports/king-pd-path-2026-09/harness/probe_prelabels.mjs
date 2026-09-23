// Labels on the King PD path BEFORE the remote strings arrive (ui_strings.js blocked).
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
const PACK = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/allopacks/crew_norms_grade6_8.allopack.json';
const flow = process.argv[2] || 'teacher';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
await ctx.route((u) => ['/ui_strings.js', '/help_strings.js'].some((b) => u.href.includes(b)), (rt) => rt.abort());
const page = await ctx.newPage();
const dump = async (tag, sel) => console.log(tag, JSON.stringify(await page.evaluate((s) => [...document.querySelectorAll(s)].slice(0, 14).map((b) => ({ aria: b.getAttribute('aria-label'), text: b.textContent.trim().slice(0, 50) })), sel)));
await page.goto('https://alloflow-cdn.pages.dev/app/', { waitUntil: 'commit' });
await page.locator('[data-alloflow-launch-pad] button').filter({ hasText: /Full (Platform|AlloFlow)/ }).first().click({ timeout: 120000 });
if (flow === 'teacher') {
  await page.locator('button').filter({ hasText: /^\s*Teacher\s*Build/ }).first().click({ timeout: 60000 });
  await page.locator('[aria-labelledby="quickstart-wizard-title"] button.rounded-full.p-2').first().click({ timeout: 60000 });
  await page.locator('#tab-history').click({ timeout: 60000 });
  await page.waitForFunction(() => window.AlloModules && window.AlloModules.MiscHandlers, null, { timeout: 180000, polling: 250 });
  await dump('history-panel-buttons', '#tour-history-panel button');
  await page.locator('#tour-history-panel button[aria-haspopup="menu"]').first().click({ timeout: 60000 });
  await page.waitForTimeout(800);
  await dump('menu-items', '[role=menu] button, [role=menuitem]');
  const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 30000 }), page.locator('[role=menu] button, [role=menuitem]').nth(1).click()]);
  await fc.setFiles(PACK);
} else {
  await page.locator('button').filter({ hasText: /^\s*Student\s*Join/ }).first().click({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await dump('codename-modal', '[role=dialog] button');
  await page.waitForFunction(() => window.AlloModules && window.AlloModules.MiscHandlers, null, { timeout: 180000, polling: 250 });
}
await page.waitForTimeout(4000);
await dump('history-items', '#tour-history-panel button[aria-label*="Crew Launch"], #tour-history-panel button');
console.log('link present:', await page.locator('a[href^="#sel-hub/crewProtocols"]').count());
await browser.close();
