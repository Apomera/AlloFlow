// Catalog smoke test: load EVERY pack in allopacks/ into the deployed AlloFlow and check it
// arrives whole. Route-injects each pack over the catalog's illustrated-pilot entry, one page
// load per pack, and asserts:
//   - the toast does not say the load failed
//   - the history holds exactly the pack's resource count
//   - every resource title from the file is present in the history list
//   - no page errors, and no "Component Error" boundary anywhere
//
// Why this exists: the vitest suite validates SHAPES against the renderers' contracts, which is
// not the same as the app accepting the file. The illustrated pilot was rejected in July by the
// Agent Core depth limit while passing every shape check.
//
//   node dev-tools/smoke_allopacks_live.mjs                  # all packs
//   node dev-tools/smoke_allopacks_live.mjs water_cycle      # only slugs containing this
//   node dev-tools/smoke_allopacks_live.mjs --deep           # also OPEN every resource (QA step 2)
//
// Needs network. Takes roughly a minute per pack: the host drains ~140 deferred modules before
// handleLoadProject exists, and clicking during that starves the queue, so the wait is real.
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const APP = 'https://alloflow-cdn.pages.dev/app/';
const CATALOG_URL = '**/raw.githubusercontent.com/Apomera/AlloFlow/main/catalog/index.json*';
const PACK_URL = '**/raw.githubusercontent.com/Apomera/AlloFlow/main/allopacks/illustrated/water_cycle_grade6.allopack.json*';
const CARD = 'Illustrated Grade 6 Pilot';

const deep = process.argv.includes('--deep');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--')) || '';
const dir = path.join(ROOT, 'allopacks');
const slugs = fs.readdirSync(dir).filter((f) => f.endsWith('.allopack.json')).map((f) => f.replace('.allopack.json', ''))
  .filter((s) => !filter || s.includes(filter)).sort();
const catalog = fs.readFileSync(path.join(ROOT, 'catalog/index.json'), 'utf8');

const browser = await chromium.launch({ headless: true });

// A FRESH CONTEXT PER PACK, not a shared one. The app stores the chosen role and the
// wizard-dismissed flag in localStorage, so a second page in the same context skips the launch
// pad entirely: "Full Platform" and "Teacher" are simply not on the page, and every click below
// times out. Verified 2026-09-05 \u2014 a reused context left 42 localStorage keys and failed 25 of
// 26 packs with click timeouts that looked like pack failures and were nothing of the kind.
const results = [];
for (const slug of slugs) {
  const file = path.join(dir, slug + '.allopack.json');
  const served = fs.readFileSync(file, 'utf8');
  const pack = JSON.parse(served.replace(/^\ufeff/, ''));
  const titles = pack.history.map((r) => r.title);
  // ONE retry, and only for a THROWN error. Navigating the real app over the network under load
  // times out occasionally, and a timeout inside a content loop reads like a broken pack \u2014 the
  // failure mode impersonates the thing under test. A failed ASSERTION (wrong count, missing
  // resource, page error) is never retried: that is a real finding and must not be papered over.
  let attempt = 0;
  while (++attempt <= 2) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, serviceWorkers: 'block' });
  await ctx.route(CATALOG_URL, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: catalog }));
  await ctx.route(PACK_URL, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: served }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const fail = (why) => { results.push({ slug, ok: false, why }); console.log('FAIL  ' + slug.padEnd(36) + why); };
  // Tolerant: if a launch step is already past (or the shell changes), carry on rather than die.
  const step = async (fn) => { try { await fn(); } catch (_) {} };
  try {
    await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3500);
    await step(() => page.getByText('Full Platform', { exact: false }).first().click({ timeout: 20000 }));
    await page.waitForTimeout(2500);
    await step(() => page.getByText('Teacher', { exact: true }).first().click({ timeout: 20000 }));
    await page.waitForTimeout(2500);
    await step(() => page.getByRole('button', { name: /Close Wizard/i }).first().click({ timeout: 8000 }));
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Educator Tools', exact: true }).first().click();
    await page.waitForTimeout(2000);
    await page.locator('[data-hub-id="community-catalog"]').first().click();
    await page.waitForTimeout(6000);
    await page.getByText(CARD, { exact: false }).first().waitFor({ timeout: 30000 });
    // handleLoadProject only exists once the deferred module queue has drained.
    await page.waitForFunction(() => window.AlloModules && window.AlloModules.MiscHandlers
      && typeof window.AlloModules.MiscHandlers.handleLoadProject === 'function', null, { timeout: 240000 });
    const card = page.getByText(CARD, { exact: false }).first()
      .locator('xpath=ancestor::*[.//button[contains(., "Load in AlloFlow")]][1]');
    await card.getByRole('button', { name: 'Load in AlloFlow' }).click();
    await page.waitForTimeout(6500);
    // The History panel is closed after a load; both the count and the title lookup live in it.
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Close" && x.closest("[role=dialog], .fixed")); if (b) b.click(); });
    await page.waitForTimeout(900);
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "History"); if (b) b.click(); });
    await page.waitForTimeout(1600);
    const body = await page.evaluate(() => document.body.innerText);
    // break, not continue: these are real findings, so they must not enter the retry.
    if (/Failed to load lesson/i.test(body)) { fail('toast: failed to load lesson'); await ctx.close(); break; }
    if (/Component Error/i.test(body)) { fail('Component Error on screen after load'); await ctx.close(); break; }
    const count = await page.evaluate(() => {
      const m = document.body.innerText.match(/Resource Pack History\s+(\d+)/);
      return m ? Number(m[1]) : -1;
    });
    const missing = await page.evaluate((ts) => ts.filter((t) => !document.querySelector('div[title="' + t.replace(/"/g, '\\"') + '"]')), titles);
    if (count !== titles.length) fail('history shows ' + count + ' resources, file has ' + titles.length);
    else if (missing.length) fail('missing from history: ' + missing.join('; '));
    else if (errors.length) fail('page errors: ' + errors.slice(0, 2).join(' | '));
    else if (deep) {
      // QA plan step 2 in full: open EVERY resource and confirm it renders something rather
      // than a blank panel or the error boundary. Costs ~4s per resource on top of the load.
      const broken = [];
      for (const title of titles) {
        await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'History'); if (b) b.click(); });
        await page.waitForTimeout(700);
        await page.evaluate((t) => { const d = document.querySelector('div[title="' + t.replace(/"/g, '\\"') + '"]'); if (d) d.click(); }, title);
        await page.waitForTimeout(3200);
        const state = await page.evaluate(() => {
          const main = document.querySelector('#screenshot-target') || document.querySelector('main');
          const text = main ? main.innerText.replace(/\s+/g, ' ').trim() : '';
          return { err: /Component Error/i.test(document.body.innerText), len: text.length };
        });
        if (state.err) broken.push(title + ' (Component Error)');
        else if (state.len < 40) broken.push(title + ' (rendered ' + state.len + ' chars)');
      }
      // The ONE assertion here that is allowed a retry, against the rule stated at the top. A
      // Component Error in this loop is not reliably a pack defect: the host drains ~140 deferred
      // view modules one at a time, so a view can render before its own module has arrived. That
      // race impersonates a broken resource exactly the way a network timeout impersonates a
      // broken pack. Verified 2026-09-06 — theme_development_grade8 failed on its reading, then
      // opened all 12 resources on a clean retry with no change to the pack in between.
      // A pack that only passes the second time is reported FLAKY and never as ok, so the race
      // stays visible instead of being papered over by the retry that revealed it.
      if (broken.length && attempt < 2) { await ctx.close(); continue; }
      if (broken.length) fail('resources did not render twice: ' + broken.join('; '));
      else if (attempt > 1) {
        results.push({ slug, ok: true, flaky: true, n: count });
        console.log('FLAKY ' + slug.padEnd(36) + count + ' resources, all opened on the retry');
      } else { results.push({ slug, ok: true, n: count }); console.log('ok    ' + slug.padEnd(36) + count + ' resources, all opened'); }
    }
    else { results.push({ slug, ok: true, n: count }); console.log('ok    ' + slug.padEnd(36) + count + ' resources'); }
  } catch (e) {
    if (attempt < 2) { await ctx.close(); continue; } // transient: try once more, clean context
    fail('threw twice: ' + String(e).split('\n')[0].slice(0, 140));
  }
  await ctx.close();
  break; // reached only when the pack was judged, pass or fail — never retry a verdict
  }
}
await browser.close();
const bad = results.filter((r) => !r.ok);
const flaky = results.filter((r) => r.ok && r.flaky);
console.log('\n' + (results.length - bad.length) + ' of ' + results.length + ' packs loaded clean'
  + (flaky.length ? ' (' + flaky.length + ' only on a retry)' : ''));
for (const f of flaky) console.log('  FLAKY ' + f.slug + ': first attempt hit a Component Error, clean on the retry');
if (bad.length) { for (const b of bad) console.log('  FAIL ' + b.slug + ': ' + b.why); process.exitCode = 1; }
