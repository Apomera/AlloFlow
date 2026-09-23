// K4 touch check: can a student drag a concept-sort card into a bucket with a finger?
// Trusted touch input via CDP Input.dispatchTouchEvent (touchStart/Move/End), the same
// pipeline a touchscreen uses. The page records what the gesture turned into:
// dragstart/drop (DragDropTouch polyfill -> HTML5 DnD), touchcancel, or a scroll.
// node touch_sort.mjs --target=live|local --device=chromebook|phone
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const A = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || '1']; }));
const TARGET = A.target || 'live';
const DEVICE = A.device || 'chromebook';
const BUCKET = A.bucket || 'first';
const OUT = A.out || 'C:/tmp/alloflow_dispatch/wave1/K4_scratch/touch';
fs.mkdirSync(OUT, { recursive: true });
const URLS = { live: 'https://alloflow-cdn.pages.dev/app/', local: 'http://127.0.0.1:3000/app/' };
const PACK = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/allopacks/crew_norms_grade6_8.allopack.json';
const DEV = {
  chromebook: { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false,
    userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' },
}[DEVICE];
const tag = `${TARGET}-${DEVICE}${BUCKET === 'last' ? '-lastbucket' : ''}`;
const log = (...a) => console.log(`[${tag}]`, ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...DEV, serviceWorkers: 'block', locale: 'en-US' });
await ctx.addInitScript(() => {
  const E = window.__touchlog = [];
  const now = () => Math.round(performance.now());
  const d = (el) => el && el.closest ? ((el.closest('[data-help-key="concept_sort_bucket"]') ? 'bucket' : '') + (el.closest('[draggable="true"]') ? 'card' : '') || el.tagName) : '';
  ['dragstart', 'dragenter', 'drop', 'dragend'].forEach((t) => document.addEventListener(t, (e) => E.push([now(), t, d(e.target), e.isTrusted]), true));
  ['touchstart', 'touchend', 'touchcancel'].forEach((t) => document.addEventListener(t, (e) => E.push([now(), t, d(e.target), e.defaultPrevented]), true));
  let moves = 0, prevented = 0;
  document.addEventListener('touchmove', (e) => { moves++; setTimeout(() => { if (e.defaultPrevented) prevented++; window.__touchmoves = [moves, prevented]; }, 0); }, true);
  let scrolls = 0; document.addEventListener('scroll', () => { scrolls++; window.__scrolls = scrolls; }, true);
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const requests = [];
page.on('response', (r) => { if (/drag-drop-touch/.test(r.url())) requests.push({ url: r.url(), status: r.status(), ct: r.headers()['content-type'] }); });
const result = { tag, target: TARGET, device: DEVICE, viewport: DEV.viewport, steps: [], drag: null, tap: null, polyfill: requests };
const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) }).catch(() => {});

const tapOn = async (locator) => { await locator.first().scrollIntoViewIfNeeded({ timeout: 180000 }); await locator.first().tap({ timeout: 60000 }); };
try {
  await page.goto(URLS[TARGET], { waitUntil: 'commit' });
  await tapOn(page.getByRole('button', { name: /Full Platform/ }));
  await tapOn(page.getByRole('button', { name: /Join your class and learn/ }));
  // Avoid the separately-measured Load Project race: wait for the handler module first.
  await page.waitForFunction(() => window.AlloModules && window.AlloModules.MiscHandlers, null, { timeout: 240000, polling: 250 });
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), tapOn(page.getByRole('button', { name: /Load Saved File/ }))]);
  await fc.setFiles(PACK);
  await page.getByRole('button', { name: /Rule, Norm, or Just Polite\?/ }).first().waitFor({ state: 'attached', timeout: 60000 });
  // On a phone the History list may sit in a drawer or below the fold.
  const open = page.getByRole('button', { name: /Open: Rule, Norm, or Just Polite\?/ });
  if (await open.count()) await tapOn(open);
  await tapOn(page.getByRole('button', { name: 'Start game', exact: true }));
  await page.locator('[data-help-key="concept_sort_bucket"]').first().waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(1500);
  await shot('1-game');
  const polyfillLoaded = await page.evaluate(() => [...document.scripts].some((s) => /drag-drop-touch/.test(s.src)));
  result.polyfillScriptTag = polyfillLoaded;

  // Geometry: first draggable card in the deck, first bucket.
  const geo = async () => page.evaluate((which) => {
    const card = [...document.querySelectorAll('[draggable="true"][role="button"]')].find((c) => !c.closest('[data-help-key="concept_sort_bucket"]'));
    const bs = document.querySelectorAll('[data-help-key="concept_sort_bucket"]'); const bucket = which === 'last' ? bs[bs.length - 1] : bs[0];
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + Math.min(b.height / 2, 60), top: b.top, bottom: b.bottom, w: b.width, h: b.height }; };
    return { card: r(card), cardText: card ? card.textContent.trim().slice(0, 60) : null, bucket: r(bucket), vh: innerHeight, vw: innerWidth,
      touchAction: card ? getComputedStyle(card).touchAction : null, deckCards: document.querySelectorAll('[draggable="true"][role="button"]').length, buckets: bs.length };
  }, BUCKET);
  let g = await geo();
  result.geometry = g;
  log('geometry', JSON.stringify(g));
  const inView = (p) => p && p.y > 0 && p.y < g.vh && p.x > 0 && p.x < g.vw;
  const owner = (p) => page.evaluate(([x, y]) => { const h = document.elementFromPoint(x, y); if (!h) return 'none'; if (h.closest('[data-help-key="concept_sort_bucket"]')) return 'bucket'; if (h.closest('[draggable="true"]')) return 'card deck'; return h.tagName + '.' + String(h.className).slice(0, 50); }, [p.x, p.y]);
  result.bothInView = inView(g.card) && inView(g.bucket);
  result.dropPointOwnerBeforeScroll = g.bucket ? await owner(g.bucket) : null;
  log('drop point owner before scroll:', result.dropPointOwnerBeforeScroll);
  if (!result.bothInView || result.dropPointOwnerBeforeScroll !== 'bucket') {
    // Scroll the game so the bucket is visible, then re-measure: a finger cannot drag to what is off-screen.
    await (BUCKET === 'last' ? page.locator('[data-help-key="concept_sort_bucket"]').last() : page.locator('[data-help-key="concept_sort_bucket"]').first()).scrollIntoViewIfNeeded();
    // A student would keep scrolling until the bucket sits clear of the pinned deck.
    await page.evaluate((which) => { const bs = document.querySelectorAll('[data-help-key="concept_sort_bucket"]'); const b = which === 'last' ? bs[bs.length - 1] : bs[0]; b.scrollIntoView({ block: 'start' }); }, BUCKET);
    await page.waitForTimeout(400);
    g = await geo(); result.geometryAfterScroll = g; result.bothInViewAfterScroll = inView(g.card) && inView(g.bucket);
    result.dropPointOwner = await page.evaluate(([x, y]) => { const h = document.elementFromPoint(x, y); if (!h) return 'none'; if (h.closest('[data-help-key="concept_sort_bucket"]')) return 'bucket'; if (h.closest('[draggable="true"]')) return 'card (deck covers the bucket)'; return h.tagName + '.' + String(h.className).slice(0, 50); }, [g.bucket.x, g.bucket.y]);
    log('after scroll', JSON.stringify(g.bucket), 'drop point owner:', result.dropPointOwner);
  }
  const inBucket = (text) => page.evaluate(([t, which]) => { const bs = document.querySelectorAll('[data-help-key="concept_sort_bucket"]'); const b = which === 'last' ? bs[bs.length - 1] : bs[0]; return !!b && [...b.querySelectorAll('[role="button"]')].some((c) => c.textContent.trim().slice(0, 60) === t); }, [text, BUCKET]);

  // 1) Touch drag.
  const from = g.card, to = g.bucket;
  if (from && to) {
    await page.evaluate(() => { window.__touchlog.length = 0; window.__scrolls = 0; window.__touchmoves = [0, 0]; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
    await page.waitForTimeout(120);
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }] });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(800);
    const moved = await inBucket(g.cardText);
    result.drag = { moved, events: await page.evaluate(() => window.__touchlog.slice(0, 40)), scrolls: await page.evaluate(() => window.__scrolls || 0), touchmoves: await page.evaluate(() => window.__touchmoves) };
    log('drag moved=', moved, JSON.stringify(result.drag.events.map((e) => e[1] + ':' + e[2]).slice(0, 14)), 'scrolls', result.drag.scrolls);
    await shot('2-after-drag');
  }
  // 2) Tap to select, then tap "Move here" in the bucket.
  g = await geo();
  if (g.card) {
    const text = g.cardText;
    const card = page.locator('[draggable="true"][role="button"]').filter({ hasText: text.slice(0, 30) }).first();
    await tapOn(card);
    const moveHere = (BUCKET === 'last' ? page.locator('[data-help-key="concept_sort_bucket"]').last() : page.locator('[data-help-key="concept_sort_bucket"]').first()).locator('[data-move-here="true"]');
    const shown = await moveHere.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (shown) { await tapOn(moveHere); await page.waitForTimeout(600); }
    result.tap = { moveHereShown: shown, moved: await inBucket(text), taps: shown ? 2 : 1 };
    log('tap moved=', result.tap.moved, 'moveHereShown', shown);
    await shot('3-after-tap');
  }
} catch (e) {
  result.failure = String(e).slice(0, 300);
  log('FAILED', result.failure);
  await shot('FAIL');
}
fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(result, null, 1));
await browser.close();
