import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_WCAG_ACCESS_OUTPUT || 'test-results/dissection-wcag-access';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
  workspaceMode: 'advanced', techniquePanelOpen: true, toolbarViewOpen: true,
  selectedOrgan: null, exploredOrgans: {},
  organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2,
  reducedMotion: true, soundEnabled: false, sceneDetail: false,
};
let hostThemeEffects: { id: string; body: string }[];
const pageErrors = new WeakMap<Page, string[]>();
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => {
  await mkdir(out, { recursive: true });
  const host = await readFile('stem_lab/stem_lab_module.js', 'utf8');
  // Use the exact two host effects that run when the student changes theme. Loading
  // the registry alone does not mount the host component or execute these effects.
  hostThemeEffects = ['stem-theme-overrides', 'stem-contrast-fix'].map(id => {
    const site = host.indexOf("var id = '" + id + "'"), start = host.lastIndexOf('React.useEffect(', site);
    const open = host.indexOf('{', start), end = host.indexOf('}, [isDark, isContrast]);', site);
    if (site < 0 || start < 0 || end < 0) throw new Error('Host theme effect not found: ' + id);
    return { id, body: host.slice(open + 1, end) };
  });
  await writeFile(`${out}/sources.json`, JSON.stringify({
    toolSha256: createHash('sha256').update(await readFile('stem_lab/stem_tool_dissection.js')).digest('hex'),
    hostThemeEffects: hostThemeEffects.map(effect => ({ id: effect.id, sha256: createHash('sha256').update(effect.body).digest('hex') })),
  }, null, 2));
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { pageErrors.set(page, []); page.on('pageerror', error => pageErrors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }) => {
  await harness.destroy(page);
  expect(pageErrors.get(page)).toEqual([]);
});

async function mount(page: Page, state: Record<string, unknown> = {}, dark = false, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(({ dark, effects }) => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
    document.body.className = dark ? 'theme-dark' : 'theme-default';
    document.body.style.background = dark ? '#0f172a' : '#f8fafc';
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.cssText = 'width:100%;max-width:1180px;position:relative;display:block;margin:auto';
    wrap.setAttribute('data-stem-lab', '');
    for (const effect of effects) new Function('isDark', 'isContrast', effect.body)(dark, false);
    (window as any).__ctx.isDark = dark; (window as any).__ctx.theme = dark ? 'dark' : 'default';
    (window as any).__rerender();
  }, { dark, effects: hostThemeEffects });
  await expect(page.locator('[data-dissection-root]')).toBeVisible();
}
async function work(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['exploredOrgans', 'organNotes', 'organConfidence', 'verifiedIdentifications', 'quizScore', 'quizTotal', 'revealedLayers', 'procedureByLayer'].map(key => [key, d[key]]));
  });
}
async function patch(page: Page, state: Record<string, unknown>) {
  await page.evaluate(state => (window as any).__ctx.updateMulti('dissection', state), state);
}
function ratio(first: number[], second: number[]) {
  const luminance = (rgb: number[]) => rgb.slice(0, 3).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

test('authored controls and biology facts retain contrast in light/dark hosts across three tool modes', async ({ page }) => {
  for (const dark of [false, true]) for (const mode of ['default', 'accessible', 'high-contrast']) {
    const name = `${dark ? 'dark' : 'light'}-${mode}`;
    await mount(page, { highContrast: mode === 'high-contrast', visualRealism: mode === 'accessible' ? 'accessible' : 'realistic' }, dark);
    const summary = page.locator('summary').filter({ hasText: /^Biology fact$/ });
    await summary.press('Enter');
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const axe = await page.evaluate(async () => (window as any).axe.run('[data-dissection-root]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
    await writeFile(`${out}/${name}-axe.json`, JSON.stringify(axe, null, 2));
    expect(axe.violations, name).toEqual([]);
    // axe reports gradients as incomplete; explicitly check both authored stops.
    const fact = page.locator('.diss-biology-fact');
    const palette = await fact.evaluate(node => ({ text: getComputedStyle(node.querySelector('p')!).color, gradient: getComputedStyle(node).backgroundImage, background: getComputedStyle(node).backgroundColor }));
    const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const stops = palette.gradient === 'none' ? [palette.background] : palette.gradient.match(/rgba?\([^)]+\)/g)!;
    expect(stops.length).toBeGreaterThan(0);
    for (const stop of stops) expect(ratio(rgb(palette.text), rgb(stop)), `${name}: ${palette.text} on ${stop}`).toBeGreaterThanOrEqual(4.5);
    await writeFile(`${out}/${name}-fact-palette.json`, JSON.stringify(palette, null, 2));
    await page.locator('.diss-directory-browser').screenshot({ path: `${out}/${name}-directory.png` });
    await fact.screenshot({ path: `${out}/${name}-fact.png` });
    await harness.destroy(page);
  }
});

test('recovery is announced as enabled and Escape returns removed-card focus without stealing persistent focus', async ({ page }) => {
  await mount(page);
  const before = await work(page), recovery = page.locator('#diss-organ-ventral_skin');
  await expect(recovery).toHaveAttribute('data-directory-action', 'recover');
  await expect(recovery).toBeEnabled();
  await expect(recovery).not.toHaveAttribute('aria-disabled', 'true');
  await expect(recovery).toHaveAccessibleName(/Show recovery guidance/);
  const accessibility = await recovery.ariaSnapshot();
  expect(accessibility).not.toContain('[disabled]');
  await writeFile(`${out}/recovery-ax.yml`, accessibility);
  await recovery.focus(); await page.keyboard.press('Enter');
  await expect(recovery).toBeFocused();
  expect(await work(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBeNull();
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback.message)).toMatch(/occluded|not yet exposed/);

  // A saved visible record lets navigation be exercised without awarding credit.
  const saved = { 'frog|nictitating': true };
  await patch(page, { selectedOrgan: 'nictitating', exploredOrgans: saved });
  const savedWork = await work(page), back = page.getByRole('button', { name: 'Back to structure directory', exact: true });
  await back.focus(); await page.keyboard.press('Escape');
  await expect(page.locator('[data-dissection-selection]')).toHaveCount(0);
  const result = page.locator('#diss-organ-nictitating');
  await expect(result).toBeFocused();
  await expect(result).toBeInViewport({ ratio: 1 });
  await expect.poll(() => result.evaluate(node => {
    const r = node.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!top && (node.contains(top) || top.contains(node));
  })).toBe(true);
  expect(await result.evaluate(node => node.matches(':focus-visible'))).toBe(true);
  expect(await work(page)).toEqual(savedWork);
  await writeFile(`${out}/escape-focus-visibility.json`, JSON.stringify(await result.evaluate(node => {
    const r = node.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { id: node.id, active: document.activeElement === node, rect: r.toJSON(), viewport: { width: innerWidth, height: innerHeight }, centerElement: top?.tagName, unobscured: !!top && (node.contains(top) || top.contains(node)) };
  }), null, 2));
  await page.screenshot({ path: `${out}/escape-directory-viewport.png` });
  await result.screenshot({ path: `${out}/escape-directory-focus.png` });
  for (const selector of ['#diss-canvas', 'button[aria-label="Advanced workspace"]']) {
    await patch(page, { selectedOrgan: 'nictitating' });
    const persistent = page.locator(selector); await persistent.focus(); await page.keyboard.press('Escape');
    await expect(persistent).toBeFocused();
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBeNull();
    expect(await work(page)).toEqual(savedWork);
  }
});

test('layer review only references an existing panel and opens its heading without changing saved work', async ({ page }) => {
  await mount(page, { revealedLayers: { skin: true } });
  const review = page.getByRole('button', { name: 'Review layer', exact: true });
  await expect(page.locator('#diss-layer-review')).toHaveCount(0);
  await expect(review).not.toHaveAttribute('aria-controls');
  const before = await work(page);
  await review.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-layer-review')).toBeVisible();
  await expect(page.locator('#diss-layer-review-title')).toBeFocused();
  await expect(review).toHaveAttribute('aria-controls', 'diss-layer-review');
  expect(await work(page)).toEqual(before);
});

test('all navigation paths respect app or OS reduced motion including a live OS change', async ({ page }) => {
  for (const app of [false, true]) for (const os of [false, true]) {
    await page.emulateMedia({ reducedMotion: os ? 'reduce' : 'no-preference' });
    await mount(page, { reducedMotion: app, selectedOrgan: 'nictitating', exploredOrgans: { 'frog|nictitating': true } });
    const before = await work(page), behavior = app || os ? 'auto' : 'smooth';
    await page.evaluate(() => {
      (window as any).__scrollCalls = [];
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (options) {
        (window as any).__scrollCalls.push({ id: this.id, options });
        return original.call(this, options);
      };
    });
    await page.locator('a[href="#diss-structure-directory"]').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#diss-structure-directory')).toBeFocused();
    await page.locator('button[aria-controls="diss-scenario-select"]').click();
    await expect(page.locator('#diss-scenario-select')).toBeFocused();
    await page.getByRole('button', { name: 'Back to structure directory', exact: true }).click();
    await expect(page.locator('#diss-organ-nictitating')).toBeFocused();
    const calls = await page.evaluate(() => (window as any).__scrollCalls);
    for (const id of ['diss-structure-directory', 'diss-scenario-select', 'diss-organ-nictitating']) {
      expect(calls.some((call: any) => call.id === id && call.options.behavior === behavior), `${app}/${os} ${id}`).toBe(true);
    }
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.reducedMotion)).toBe(app);
    await expect(page.getByRole('button', { name: /^Toggle additional reduced motion/ })).toHaveAttribute('aria-pressed', String(app));
    expect(await work(page)).toEqual(before);
    await writeFile(`${out}/motion-app-${app}-os-${os}.json`, JSON.stringify(calls, null, 2));
    await harness.destroy(page);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mount(page, { reducedMotion: false, livingFunctionEnabled: true });
  await expect(page.locator('.diss-living-function')).toHaveAttribute('data-motion', 'playing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.diss-living-function')).toHaveAttribute('data-motion', 'static');
  await page.evaluate(() => {
    (window as any).__scrollCalls = [];
    Element.prototype.scrollIntoView = function (options) { (window as any).__scrollCalls.push({ id: this.id, options }); };
  });
  await page.locator('a[href="#diss-structure-directory"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-structure-directory')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__scrollCalls)).toContainEqual({ id: 'diss-structure-directory', options: { block: 'center', behavior: 'auto' } });
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.reducedMotion)).toBe(false);
});

test('320px large-text layouts reflow and existing protocol focus remains visible in four states', async ({ page }) => {
  for (const workspaceMode of ['essentials', 'advanced']) {
    await mount(page, { workspaceMode, largeText: true }, false, 320);
    const metrics = await page.evaluate(() => {
      const root = document.querySelector('[data-dissection-root]')!;
      return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, rootWidth: root.getBoundingClientRect().width, rootScroll: root.scrollWidth };
    });
    expect(metrics.pageWidth).toBeLessThanOrEqual(321); expect(metrics.rootScroll).toBeLessThanOrEqual(321);
    await writeFile(`${out}/320-${workspaceMode}-metrics.json`, JSON.stringify(metrics, null, 2));
    await page.screenshot({ path: `${out}/320-${workspaceMode}.png`, fullPage: true });
    await harness.destroy(page);
  }
  await mount(page, { anatomicalView: 'dorsal' });
  for (const mode of ['enabled', 'aligned', 'high-contrast', 'forced-colors']) {
    await page.emulateMedia({ forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
    await patch(page, { anatomicalView: mode === 'aligned' ? 'ventral' : 'dorsal', highContrast: mode === 'high-contrast' });
    const align = page.locator('#diss-protocol-align');
    await expect(align).toHaveAttribute('aria-disabled', String(mode === 'aligned'));
    await align.scrollIntoViewIfNeeded();
    await align.focus();
    // Even the host's 0.01ms reduced-motion transition can retain its starting
    // color until Chromium paints. Measure the settled ring students see.
    await expect.poll(() => align.evaluate(node => {
      getComputedStyle(node).outlineColor;
      return node.getAnimations().filter(animation => animation.playState === 'running').length;
    })).toBe(0);
    const appearance = await align.evaluate(node => { const s = getComputedStyle(node); return { visible: node.matches(':focus-visible'), width: parseFloat(s.outlineWidth), style: s.outlineStyle, outline: s.outlineColor, background: s.backgroundColor }; });
    expect(appearance.visible).toBe(true); expect(appearance.width).toBeGreaterThanOrEqual(3); expect(appearance.style).toBe('solid');
    const rgb = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    expect(ratio(rgb(appearance.outline), rgb(appearance.background)), mode).toBeGreaterThanOrEqual(3);
    await writeFile(`${out}/focus-${mode}.json`, JSON.stringify(appearance, null, 2));
    await align.screenshot({ path: `${out}/focus-${mode}.png` });
    if (mode === 'forced-colors') {
      const palette = await page.evaluate(() => {
        const probe = document.createElement('span'); probe.style.cssText = 'background:Canvas;color:CanvasText'; document.body.appendChild(probe);
        const expected = { background: getComputedStyle(probe).backgroundColor, color: getComputedStyle(probe).color }; probe.remove();
        const row = document.querySelector('#diss-organ-ventral_skin')!, name = row.querySelector('.diss-directory-item__name')!;
        return { expected, row: { background: getComputedStyle(row).backgroundColor, color: getComputedStyle(name).color } };
      });
      expect(palette.row).toEqual(palette.expected);
      await writeFile(`${out}/forced-colors-recovery-palette.json`, JSON.stringify(palette, null, 2));
    }
  }
});
