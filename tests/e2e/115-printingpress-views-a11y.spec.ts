/**
 * Printing Press — every view in a real browser, at desktop and phone widths.
 *
 * The jsdom suite (tests/printingpress_all_views_wcag.test.js) cannot lay
 * anything out, so it is blind to what this one catches:
 *
 * 1. TARGET SIZE (WCAG 2.5.8). The Before & After timeline dots were 22 px.
 * 2. RENDERED CONTRAST. An 11 px caption on a gold tint measured 4.2:1.
 * 3. REFLOW (WCAG 1.4.10). At 320 px, a `gridColumn: 'span 2'` card added an
 *    implicit second column (192 px of sideways scroll), and the 13-key
 *    Linotype row was 436 px of fixed-width keys.
 * 4. CONSOLE ERRORS, e.g. an <svg height="auto"> attribute React passes through.
 * 5. THE APP'S HIGH-CONTRAST THEME. Its global rules (AppStyles) turn all text
 *    yellow and every button green-on-black. Over the tool's cream cards that was
 *    yellow on cream (54 failures in Typography Today alone), and a selected choice
 *    looked exactly like the others in 82 views.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const SOURCE = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_printingpress.js'), 'utf8');
const VIEWS = [...SOURCE.matchAll(/view === '([A-Za-z0-9]+)'\)\s+content = h\(_ViewWrapper/g)].map((m) => m[1]);

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_printingpress.js',
  toolId: 'printingPress',
  appStyles: true,
  layout: 'document',
  width: 1200,
  height: 900,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js', 'desktop/web-app/public/app_styles_module.js'],
});

test.describe.configure({ mode: 'default', timeout: 600_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('the view list is the one the tool dispatches', () => {
  expect(VIEWS.length).toBeGreaterThanOrEqual(100);
  expect(VIEWS).toContain('pressMechanism');
});

for (const width of [1200, 390, 320]) {
  test(`every view passes axe, fits, and logs no errors at ${width} px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${harness.url}/__harness`);
    await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.printingPress));
    // #wrap is block flow; let it take the viewport width like the app's tool pane.
    await page.locator('#wrap').evaluate((wrap) => { (wrap as HTMLElement).style.width = '100%'; });
    await page.evaluate(() => (window as any).__mount({ printingPress: { view: 'menu' } }));

    const problems: string[] = [];
    for (const view of VIEWS) {
      errors.length = 0;
      await page.evaluate((v) => {
        const w = window as any;
        w.__toolData.printingPress = { view: v };
        w.__rerender();
      }, view);
      await page.waitForTimeout(200);
      const violations = await page.evaluate(async () => {
        const res = await (window as any).axe.run('#wrap', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
          resultTypes: ['violations'],
        });
        return res.violations.map((v: any) => `${v.id} x${v.nodes.length} (${v.nodes[0].target.join(' ')})`);
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      for (const v of violations) problems.push(`${view}: ${v}`);
      if (overflow > 1) problems.push(`${view}: scrolls sideways by ${overflow}px`);
      for (const e of new Set(errors)) problems.push(`${view}: console ${e}`);
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
}

test('every view stays readable, and shows its selected choice, in the app high-contrast theme', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.printingPress && (window as any).AlloModules?.AppStyles));
  await page.locator('#wrap').evaluate((wrap) => { (wrap as HTMLElement).style.width = '100%'; });
  await page.evaluate(() => {
    const w = window as any;
    document.body.classList.add('theme-contrast');
    const styles = document.createElement('div');
    document.body.appendChild(styles);
    w.ReactDOM.createRoot(styles).render(w.React.createElement(w.AlloModules.AppStyles.AppStyles, {}));
    w.__mount({ printingPress: { view: 'menu' } });
    Object.assign(w.__ctx, { isContrast: true, theme: 'contrast' });
    w.__rerender();
  });
  const problems: string[] = [];
  if (await page.locator('#wrap [data-pp-contrast="true"]').count() !== 1) problems.push('the tool did not mark itself for the contrast theme');
  for (const view of VIEWS) {
    await page.evaluate((v) => {
      const w = window as any;
      w.__toolData.printingPress = { view: v };
      w.__rerender();
    }, view);
    await page.waitForTimeout(150);
    const found = await page.evaluate(async () => {
      const res = await (window as any).axe.run('#wrap', { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations'] });
      const out = res.violations.map((v: any) => `${v.id} x${v.nodes.length} (${v.nodes[0].target.join(' ')})`);
      const look = (el: Element) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.borderTopColor, s.borderTopWidth].join('|'); };
      const on = document.querySelector('#wrap button[aria-pressed="true"]');
      const off = document.querySelector('#wrap button[aria-pressed="false"]');
      if (on && off && look(on) === look(off)) out.push('a pressed button looks like an unpressed one: ' + look(on));
      const step = document.querySelector('#wrap [aria-current="step"]');
      const other = step && [...step.parentElement!.children].find((c) => c !== step);
      if (step && other && look(step) === look(other)) out.push('the current step looks like the others');
      return out;
    });
    for (const f of found) problems.push(`${view}: ${f}`);
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

// What axe cannot see, on every view and section tab, with the app's styles loaded:
// WCAG 1.4.12 text spacing at 320 px, 1.3.1 heading levels, 1.4.11 input boundaries,
// 1.4.13 hover-only text and 2.2.2 endless motion.
test('every view keeps its structure and reflow under the WCAG text-spacing override', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.printingPress));
  await page.locator('#wrap').evaluate((wrap) => { (wrap as HTMLElement).style.width = '100%'; });
  await page.evaluate(() => (window as any).__mount({ printingPress: { view: 'menu' } }));
  await page.addStyleTag({ content: '*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}' });
  const problems: string[] = [];
  const check = (view: string) => page.evaluate((v) => {
    const out: string[] = [];
    const host = document.querySelector('#wrap') as HTMLElement;
    const levels = Array.from(host.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter((h) => (h as HTMLElement).offsetParent !== null).map((h) => Number(h.tagName[1]));
    if (levels.filter((n) => n === 1).length !== 1) out.push(`${v}: h1 count, levels ${levels.join('')}`);
    levels.forEach((n, i) => { if (i && n > levels[i - 1] + 1) out.push(`${v}: skipped heading, levels ${levels.join('')}`); });
    const over = document.documentElement.scrollWidth - window.innerWidth;
    if (over > 1) out.push(`${v}: scrolls sideways by ${over}px under text spacing`);
    if (host.querySelector('button[title], a[title], span[title], div[title]')) out.push(`${v}: hover-only title text`);
    host.querySelectorAll('svg').forEach((svg) => {
      if (svg.getAttribute('aria-hidden') === 'true' || svg.closest('[aria-hidden="true"]') || getComputedStyle(svg).overflow === 'visible') return;
      const box = svg.getBoundingClientRect();
      if (box.width < 40) return;
      svg.querySelectorAll('text').forEach((t) => {
        const r = t.getBoundingClientRect();
        if (r.width && t.textContent!.trim() && Math.max(box.left - r.left, r.right - box.right, box.top - r.top, r.bottom - box.bottom) > 1.5) out.push(`${v}: SVG text cut off: ${t.textContent!.slice(0, 24)}`);
      });
    });
    const lum = (c: string) => { const m = c.match(/[\d.]+/g); if (!m || (m.length > 3 && Number(m[3]) === 0)) return null; const f = (x: string) => { const s = Number(x) / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    host.querySelectorAll('input:not([type=range]):not([type=checkbox]):not([type=radio]),select,textarea').forEach((el) => {
      if ((el as HTMLElement).offsetParent === null) return;
      let bg = 1; for (let p = el.parentElement; p; p = p.parentElement) { const l = lum(getComputedStyle(p).backgroundColor); if (l !== null) { bg = l; break; } }
      const cs = getComputedStyle(el), border = lum(cs.borderTopColor), fill = lum(cs.backgroundColor);
      const best = Math.max(border === null || !parseFloat(cs.borderTopWidth) ? 1 : ratio(border, bg), fill === null ? 1 : ratio(fill, bg));
      if (best < 3) out.push(`${v}: input boundary ${best.toFixed(2)}:1 (${(el as HTMLElement).id || el.tagName})`);
    });
    return out;
  }, view);
  for (const view of VIEWS) {
    await page.evaluate((v) => { const w = window as any; w.__toolData.printingPress = { view: v }; w.__rerender(); }, view);
    await page.waitForTimeout(80);
    problems.push(...await check(view));
    const endless = await page.evaluate(() => document.getAnimations().filter((a) => a.effect && (a.effect as any).getTiming().iterations === Infinity && a.playState === 'running').length);
    if (endless) problems.push(`${view}: ${endless} endless animations`);
    const tabs = await page.evaluate(() => {
      const bar = document.querySelector('.printingpress-back-bar'); if (!bar) return 0;
      let g = bar.nextElementSibling;
      for (let i = 0; g && i < 3; i++, g = g.nextElementSibling) { const b = g.querySelectorAll(':scope > button[aria-pressed]'); if (b.length >= 2) { g.setAttribute('data-audit-tabs', '1'); return b.length; } }
      return 0;
    });
    for (let t = 1; t < tabs; t++) {
      await page.locator('[data-audit-tabs] > button').nth(t).click();
      await page.waitForTimeout(30);
      problems.push(...await check(`${view} tab ${t}`));
    }
  }
  expect(problems, problems.join('\n')).toEqual([]);
});
