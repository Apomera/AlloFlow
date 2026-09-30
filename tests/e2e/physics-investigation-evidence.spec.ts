import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, data: object = {}) {
  await page.addInitScript(() => {
    const w = window as any; let id = 0, now = 1000; const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__investigationTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
  });
  await harness.mount(page, { physics: data }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
}
async function patch(page: Page, values: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), values);
  await page.waitForTimeout(40);
}
async function launch(page: Page, velocity: number) {
  const count = await page.evaluate(() => ((window as any).__toolData.physics.runLog || []).length);
  await patch(page, { angle: 45, velocity, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false, simSpeed: 2 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any; let count = 0;
    while (cv._launched && count++ < 10000) (window as any).__investigationTick();
    if (cv._launched) throw Error('Investigation flight did not land');
  });
  await page.waitForFunction(n => (window as any).__toolData.physics.runLog.length === n + 1, count, { polling: 20 });
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return { ball: cv._ball, log: d.runLog, lastFlight: d.lastFlight, trails: (cv._trails || []).map((t: any) => ({ points: [...t], run: t.run, parameters: t.parameters, modelVersion: t.modelVersion, apex: t.apex })) };
  });
}
async function collect(page: Page) {
  await mount(page);
  for (const speed of [15, 30, 45]) await launch(page, speed);
  await patch(page, { investigationOpen: true, investigationDraft: { title: 'Speed and range', question: 'How does speed change range?', prediction: 'Doubling speed should quadruple range.', selectedRunIds: [1, 2, 3] } });
}
async function assertMeasures(root: Locator, a: any, b: any) {
  for (const key of ['range', 'maxH', 'time']) {
    const card = root.locator(`[data-physics-investigation-measure="${key}"]`);
    const ratio = a[key] === 0 ? null : b[key] / a[key];
    const rawRatio = await card.locator('[data-physics-investigation-ratio]').getAttribute('data-value');
    if (ratio == null) {
      expect(rawRatio).toBeNull();
      await expect(card.locator('[data-physics-investigation-ratio]')).toHaveText('—');
    } else expect(Number(rawRatio)).toBeCloseTo(ratio, 10);
    expect(Number(await card.locator('[data-physics-investigation-delta]').getAttribute('data-value'))).toBeCloseTo(b[key] - a[key], 10);
    const bars = await card.locator('[data-physics-investigation-bar]').evaluateAll(els => els.map(el => {
      const parent = el.parentElement!, style = getComputedStyle(parent);
      return { kind: (el as HTMLElement).dataset.physicsInvestigationBar, width: el.getBoundingClientRect().width, total: parent.getBoundingClientRect().width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth) };
    }));
    for (const bar of bars) {
      const max = Math.max(a[key], b[key]), value = bar.kind === 'reference' ? a[key] : b[key];
      expect(Math.abs(bar.width - (max > 0 ? bar.total * value / max : 0))).toBeLessThan(.05);
    }
  }
}

test('every selected run compares with the first selection without mutating completed flights', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await collect(page);
  const original = await evidence(page), root = page.locator('[data-physics-investigation-comparison]');
  await expect(root).toHaveAttribute('data-reference-run', '1');
  await assertMeasures(root, original.log[0], original.log[1]);
  await expect(root.locator('[data-physics-investigation-setting="vel"]')).toContainText('15 m/s → 30 m/s');
  await root.locator('[data-physics-investigation-held]').click();
  await expect(root.locator('[data-physics-investigation-setting][data-changed="false"]')).toHaveCount(5);
  await expect(root.locator('[data-physics-investigation-setting="launchHeight"]')).toContainText('0 m');
  await root.locator('[data-physics-investigation-compare-run]').selectOption('3');
  await assertMeasures(root, original.log[0], original.log[2]);
  await expect(root.locator('[data-physics-investigation-measure="range"] [data-physics-investigation-ratio]')).toHaveText('9.000×');
  await page.getByRole('checkbox', { name: 'Run 3', exact: true }).uncheck();
  await expect(root).toHaveAttribute('data-compared-run', '2');
  await expect(root.locator('[data-physics-investigation-compare-run]')).toHaveCount(0);
  await patch(page, { angle: 80, velocity: 5, gravity: 1, mass: 9, launchHeight: 30, airResist: true, investigationDraft: { title: 'Order matters', selectedRunIds: [3, 1, 2] } });
  await expect(root).toHaveAttribute('data-reference-run', '3');
  await root.locator('[data-physics-investigation-compare-run]').selectOption('1');
  await assertMeasures(root, original.log[2], original.log[0]);
  expect(await evidence(page)).toEqual(original);
  expect(errors).toEqual([]);
});

test('archived comparisons survive log clearing and restoration without altering exported text', async ({ page }) => {
  await collect(page);
  const original = await evidence(page);
  await page.locator('[data-physics-investigation-save]').click();
  const report = await page.locator('[data-physics-investigation-report]').innerText();
  const archive = page.locator('[data-physics-investigation-archived-evidence]');
  await archive.locator('[data-physics-investigation-compare-run]').selectOption('3');
  await assertMeasures(archive, original.log[0], original.log[2]);
  await page.getByRole('button', { name: 'Clear the experiment log', exact: true }).click();
  await patch(page, { velocity: 5, gravity: 1, mass: 10, launchHeight: 40, airResist: true });
  await assertMeasures(archive, original.log[0], original.log[2]);
  await expect(page.locator('[data-physics-investigation-comparison]')).toHaveCount(0);
  await expect(page.locator('[data-physics-investigation-report]')).toHaveText(report);
  const restored = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  await page.evaluate(d => (window as any).__mount(d), restored);
  await expect(page.locator('[data-physics-investigation-archived-evidence]')).toBeVisible();
  await archive.locator('[data-physics-investigation-compare-run]').selectOption('3');
  await assertMeasures(archive, original.log[0], original.log[2]);
  await expect(page.locator('[data-physics-investigation-report]')).toHaveText(report);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).__investigationCopied = text; } } }));
  await page.locator('[data-physics-investigation-copy]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__investigationCopied)).toBe(report);
});

const legacy = { n: 1, angle: 45, vel: 15, grav: 9.8, mass: 1, drag: false, range: 0, maxH: 0, time: 2 };
test('zero references stay undefined and tiny measured changes keep their sign', async ({ page }) => {
  const tiny = { ...legacy, n: 2, range: .0001, maxH: .0001, time: 1.99999 };
  await mount(page, { investigationOpen: true, runLog: [legacy, tiny], investigationDraft: { title: 'Legacy measurements', selectedRunIds: [1, 2] } });
  const root = page.locator('[data-physics-investigation-comparison]');
  await expect(root.locator('[data-physics-investigation-model-warning]')).toBeVisible();
  await assertMeasures(root, legacy, tiny);
  for (const key of ['range', 'maxH']) {
    const card = root.locator(`[data-physics-investigation-measure="${key}"]`);
    await expect(card).toContainText('The reference is zero');
    await expect(card.locator('[data-physics-investigation-delta]')).toHaveText('+<0.001 m');
  }
  await expect(root.locator('[data-physics-investigation-measure="time"] [data-physics-investigation-delta]')).toHaveText('−<0.001 s');
  expect(await root.innerText()).not.toMatch(/NaN|Infinity|−0\.000|\+0\.000/);
  await patch(page, { runLog: [legacy, { ...legacy, n: 2 }] });
  await assertMeasures(root, legacy, { ...legacy, n: 2 });
});

test('each comparison retains its own confounding and model provenance warnings', async ({ page }) => {
  const a = { ...legacy, range: 20, maxH: 5, modelVersion: 'projectile-v3' };
  const b = { ...a, n: 2, vel: 30, range: 80, maxH: 20, time: 4 };
  const c = { ...b, n: 3, angle: 60, launchHeight: 10, drag: true, modelVersion: 'older-model' };
  await mount(page, { investigationOpen: true, runLog: [a, b, c], investigationDraft: { title: 'Compare models', selectedRunIds: [1, 2, 3] } });
  const root = page.locator('[data-physics-investigation-comparison]');
  await expect(root.locator('[data-physics-investigation-model-warning]')).toHaveCount(0);
  await root.locator('[data-physics-investigation-compare-run]').selectOption('3');
  await expect(root).toContainText('cannot isolate one cause');
  await expect(root.locator('[data-physics-investigation-model-warning]')).toContainText('missing or different');
  await expect(root.locator('[data-physics-investigation-setting][data-changed="true"]')).toHaveCount(4);
  await expect(root.locator('[data-physics-investigation-setting="drag"]')).toContainText('off → on');
  await expect(root.locator('[data-physics-investigation-setting="launchHeight"]')).toContainText('0 m → 10 m');
  await assertMeasures(root, a, c);
});

for (const theme of ['default', 'dark', 'contrast']) for (const width of [1100, 375, 320]) test(`${width}px ${theme} evidence stays readable and supports keyboard comparison`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await collect(page);
  await page.evaluate(t => {
    const wrap = document.getElementById('wrap')!, main = document.createElement('main'), card = document.createElement('div');
    wrap.parentElement!.insertBefore(main, wrap); main.append(card); card.append(wrap);
    main.className = 'main-content ' + (t === 'default' ? '' : 'theme-' + t); card.className = 'card';
    const ctx = (window as any).__ctx; ctx.isDark = t === 'dark'; ctx.isContrast = t === 'contrast'; ctx.theme = t; (window as any).__rerender();
  }, theme);
  const root = page.locator('[data-physics-investigation-comparison]'), picker = root.locator('[data-physics-investigation-compare-run]');
  await picker.focus(); await picker.press('ArrowDown'); await picker.press('Enter');
  await expect(root).toHaveAttribute('data-compared-run', '3');
  const held = root.locator('[data-physics-investigation-held]');
  await held.focus(); await held.press('Enter');
  await expect(root.locator('[data-physics-investigation-setting="mass"]')).toBeVisible();
  const layout = await root.evaluate(el => {
    const texts: { font: number; contrast: number }[] = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lum = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement!; if (!node.textContent?.trim() || !parent.getClientRects().length || parent.closest('[aria-hidden="true"]')) continue;
      const style = getComputedStyle(parent); let bg = 'rgb(255,255,255)';
      for (let ancestor: Element | null = parent; ancestor; ancestor = ancestor.parentElement) { const color = getComputedStyle(ancestor).backgroundColor; if (/^rgb\(/.test(color)) { bg = color; break; } }
      const a = lum(style.color), b = lum(bg); texts.push({ font: parseFloat(style.fontSize), contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) });
    }
    return { overflow: document.documentElement.scrollWidth - innerWidth, controls: [...el.querySelectorAll('summary,select')].map(n => n.getBoundingClientRect().height), texts };
  });
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.controls.every(h => h >= 44)).toBe(true);
  expect(layout.texts.length).toBeGreaterThan(25);
  expect(layout.texts.every(t => t.font >= 12 && t.contrast >= 4.5)).toBe(true);
  const original = await evidence(page); await assertMeasures(root, original.log[0], original.log[2]);
});
