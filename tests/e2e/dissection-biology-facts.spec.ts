import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_BIOLOGY_FACTS_OUTPUT || 'test-results/dissection-biology-facts';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
let themeEffects: { id: string; body: string }[];
const errors = new WeakMap<Page, string[]>();
const fact = (page: Page) => page.locator('.diss-biology-fact');
const next = (page: Page) => fact(page).getByRole('button', { name: /Next.*fact/i });
const previous = (page: Page) => fact(page).getByRole('button', { name: /Previous.*fact/i });
const count = (page: Page) => fact(page).getByText(/^Fact \d+ of \d+$/);
const content = (page: Page) => fact(page).locator('[role="status"] p:not(.diss-biology-fact__position)');

test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => {
  await mkdir(out, { recursive: true });
  const host = await readFile('stem_lab/stem_lab_module.js', 'utf8');
  themeEffects = ['stem-theme-overrides', 'stem-contrast-fix'].map(id => {
    const site = host.indexOf("var id = '" + id + "'"), start = host.lastIndexOf('React.useEffect(', site);
    const open = host.indexOf('{', start), end = host.indexOf('}, [isDark, isContrast]);', site);
    if (site < 0 || start < 0 || end < 0) throw new Error('Missing host theme effect: ' + id);
    return { id, body: host.slice(open + 1, end) };
  });
  await writeFile(`${out}/sources.json`, JSON.stringify({ sourceSha256: createHash('sha256').update(await readFile('stem_lab/stem_tool_dissection.js')).digest('hex'), themeEffects: themeEffects.map(effect => ({ id: effect.id, sha256: createHash('sha256').update(effect.body).digest('hex') })) }, null, 2));
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

async function mount(page: Page, state: Record<string, unknown> = {}, width = 1280, dark = false, hostContrast = false) {
  await page.setViewportSize({ width, height: 900 });
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false, sceneDetail: false, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(({ dark, hostContrast, effects }) => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.cssText = 'width:100%;max-width:1180px;position:relative;display:block;margin:auto'; wrap.setAttribute('data-stem-lab', '');
    document.body.className = dark ? 'theme-dark' : 'theme-default';
    for (const effect of effects) new Function('isDark', 'isContrast', effect.body)(dark, hostContrast);
    (window as any).__ctx.isDark = dark; (window as any).__ctx.isContrast = hostContrast; (window as any).__rerender();
  }, { dark, hostContrast, effects: themeEffects });
  await fact(page).locator('summary').press('Enter');
  await expect(fact(page)).toHaveAttribute('open', '');
}
async function activate(page: Page, button: ReturnType<typeof next>, key = 'Enter') {
  await button.focus(); await page.keyboard.press(key); await expect(button).toBeFocused();
}
async function savedWork(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['exploredOrgans', 'organNotes', 'organConfidence', 'verifiedIdentifications', 'procedureByLayer', 'annotations', 'quizScore', 'quizTotal'].map(key => [key, d[key]]));
  });
}
function contrast(first: string, second: string) {
  const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
async function focusAppearance(page: Page) {
  const button = next(page); await button.scrollIntoViewIfNeeded(); await button.focus();
  await expect.poll(() => button.evaluate(node => {
    getComputedStyle(node).outlineColor;
    return node.getAnimations().filter(animation => animation.playState === 'running').length;
  })).toBe(0);
  const appearance = await button.evaluate(node => { const s = getComputedStyle(node); return { visible: node.matches(':focus-visible'), outline: s.outlineColor, width: parseFloat(s.outlineWidth), background: s.backgroundColor, text: s.color }; });
  expect(appearance.visible).toBe(true); expect(appearance.width).toBeGreaterThanOrEqual(3);
  expect(contrast(appearance.outline, appearance.background)).toBeGreaterThanOrEqual(3);
  expect(contrast(appearance.text, appearance.background)).toBeGreaterThanOrEqual(4.5);
  return appearance;
}

test('expanded reading stays stable through idle activity updates and ordinary filter interaction', async ({ page }) => {
  // Install before navigation so the tool's existing 30-second activity timer is
  // controlled too. Installing after mount would miss that timer and false-pass.
  await page.clock.install({ time: new Date('2026-10-23T12:00:00Z') });
  await mount(page);
  await expect(count(page)).toHaveText('Fact 1 of 5');
  const reading = await content(page).textContent(), work = await savedWork(page);
  await page.locator('#diss-canvas').scrollIntoViewIfNeeded();
  const beforeTime = await page.evaluate(() => Number((window as any).__ctx.toolData.dissection.timeSpent) || 0);
  await page.clock.fastForward(31_000);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.timeSpent)).toBeGreaterThan(beforeTime);
  await expect(content(page)).toHaveText(reading!); await expect(count(page)).toHaveText('Fact 1 of 5');
  await page.locator('[data-directory-filter="unviewed"]').focus(); await page.keyboard.press('Enter');
  await expect(content(page)).toHaveText(reading!); await expect(count(page)).toHaveText('Fact 1 of 5');
  expect(await savedWork(page)).toEqual(work);
  await fact(page).screenshot({ path: `${out}/stable-after-idle-and-filter.png` });
});

test('keyboard fact navigation keeps focus and presents one complete polite reading region', async ({ page }) => {
  await mount(page);
  const first = await content(page).textContent(), work = await savedWork(page);
  const live = fact(page).locator('[aria-live="polite"]');
  await expect(live).toHaveCount(1); await expect(live).toHaveAttribute('aria-atomic', 'true');
  await expect(live).toContainText('Fact 1 of 5'); await expect(live).toContainText(first!);
  await activate(page, next(page));
  await expect(count(page)).toHaveText('Fact 2 of 5'); expect(await content(page).textContent()).not.toBe(first);
  await expect(live).toContainText('Fact 2 of 5'); await expect(live).toContainText((await content(page).textContent())!);
  await activate(page, previous(page), 'Space');
  await expect(count(page)).toHaveText('Fact 1 of 5'); await expect(content(page)).toHaveText(first!);
  await activate(page, previous(page)); await expect(count(page)).toHaveText('Fact 5 of 5');
  await activate(page, next(page), 'Space'); await expect(count(page)).toHaveText('Fact 1 of 5');
  expect(await savedWork(page)).toEqual(work);
  await writeFile(`${out}/keyboard-ax.yml`, await fact(page).ariaSnapshot());
  await fact(page).screenshot({ path: `${out}/keyboard-next-focus.png` });
});

test('each specimen retains its chosen reading independently', async ({ page }) => {
  await mount(page);
  await activate(page, next(page)); const frog = await content(page).textContent();
  await page.locator('.diss-specimen-tab').filter({ hasText: 'Earthworm' }).click();
  if (await fact(page).getAttribute('open') === null) await fact(page).locator('summary').press('Enter');
  await expect(count(page)).toHaveText('Fact 1 of 5');
  await activate(page, next(page)); await activate(page, next(page)); const worm = await content(page).textContent();
  await page.locator('.diss-specimen-tab').filter({ hasText: 'Frog' }).click();
  if (await fact(page).getAttribute('open') === null) await fact(page).locator('summary').press('Enter');
  await expect(count(page)).toHaveText('Fact 2 of 5'); await expect(content(page)).toHaveText(frog!);
  await page.locator('.diss-specimen-tab').filter({ hasText: 'Earthworm' }).click();
  if (await fact(page).getAttribute('open') === null) await fact(page).locator('summary').press('Enter');
  await expect(count(page)).toHaveText('Fact 3 of 5'); await expect(content(page)).toHaveText(worm!);
});

test('manual reading controls retain contrast in light/dark hosts across three tool modes', async ({ page }) => {
  for (const dark of [false, true]) for (const mode of ['default', 'accessible', 'high-contrast']) {
    const name = `${dark ? 'dark' : 'light'}-${mode}`;
    await mount(page, { highContrast: mode === 'high-contrast', visualRealism: mode === 'accessible' ? 'accessible' : 'realistic' }, 1280, dark);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const axe = await page.evaluate(async () => (window as any).axe.run('.diss-biology-fact', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
    await writeFile(`${out}/${name}-axe.json`, JSON.stringify(axe, null, 2)); expect(axe.violations, name).toEqual([]);
    await writeFile(`${out}/${name}-focus.json`, JSON.stringify(await focusAppearance(page), null, 2));
    await fact(page).screenshot({ path: `${out}/${name}.png` });
    await harness.destroy(page);
  }
});

test('320px controls and reading reflow with required text spacing and forced colors', async ({ page }) => {
  for (const forced of [false, true]) {
    await page.emulateMedia({ forcedColors: forced ? 'active' : 'none' });
    await mount(page, { largeText: true }, 320, forced);
    await page.addStyleTag({ content: '[data-dissection-root] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-dissection-root] p{margin-bottom:2em!important}' });
    await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
    const metrics = await fact(page).evaluate(node => {
      const root = document.querySelector('[data-dissection-root]')!, panel = node.getBoundingClientRect();
      return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, rootWidth: root.scrollWidth, panel: { width: panel.width, scroll: node.scrollWidth, client: node.clientWidth }, controls: [...node.querySelectorAll('button')].map(button => { const r = button.getBoundingClientRect(); return { text: button.textContent, width: r.width, height: r.height, client: button.clientWidth, scroll: button.scrollWidth, left: r.left, right: r.right }; }), text: [...node.querySelectorAll('p,summary,[aria-live]')].map(text => ({ content: text.textContent, client: text.clientWidth, scroll: text.scrollWidth })) };
    });
    await writeFile(`${out}/320-spacing-${forced ? 'forced' : 'default'}.json`, JSON.stringify(metrics, null, 2));
    expect(metrics.pageWidth).toBeLessThanOrEqual(321); expect(metrics.rootWidth).toBeLessThanOrEqual(321);
    expect(metrics.panel.scroll).toBeLessThanOrEqual(metrics.panel.client + 1);
    for (const button of metrics.controls) { expect(button.height).toBeGreaterThanOrEqual(43.9); expect(button.scroll).toBeLessThanOrEqual(button.client + 1); expect(button.left).toBeGreaterThanOrEqual(0); expect(button.right).toBeLessThanOrEqual(321); }
    for (const text of metrics.text) expect(text.scroll).toBeLessThanOrEqual(text.client + 1);
    await activate(page, next(page)); await expect(count(page)).toHaveText('Fact 2 of 5');
    await expect(next(page)).toBeInViewport();
    await focusAppearance(page);
    await fact(page).screenshot({ path: `${out}/320-spacing-${forced ? 'forced' : 'default'}.png` });
    await harness.destroy(page);
  }
});

test('host high contrast keeps the authored fact button boundary and focus visible', async ({ page }) => {
  await mount(page, {}, 1280, false, true);
  const appearance = await focusAppearance(page);
  const boundary = await next(page).evaluate(node => { const s = getComputedStyle(node); return { border: s.borderColor, background: s.backgroundColor }; });
  expect(contrast(boundary.border, boundary.background)).toBeGreaterThanOrEqual(3);
  await writeFile(`${out}/host-high-contrast-palette.json`, JSON.stringify({ ...appearance, ...boundary }, null, 2));
  await fact(page).screenshot({ path: `${out}/host-high-contrast.png` });
});
