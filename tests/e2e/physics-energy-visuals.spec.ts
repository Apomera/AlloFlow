import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; let id = 0, now = 1000; const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; }; window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__energyTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
}
async function patch(page: Page, values: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), values);
  await page.waitForTimeout(40);
}
async function launch(page: Page, values = {}) {
  const count = await page.evaluate(() => ((window as any).__toolData.physics.runLog || []).length);
  await patch(page, { angle: 35, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, simSpeed: 2, showGraphs: true, showFlightData: true, ...values });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any; let count = 0;
    while (cv._launched && count++ < 10000) (window as any).__energyTick();
    if (cv._launched) throw Error('Energy test flight did not land');
  });
  await page.waitForFunction(n => (window as any).__toolData.physics.runLog.length === n + 1, count, { polling: 20 });
  await expect(page.locator('[data-physics-energy-panel]')).toBeVisible();
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return { ball: cv._ball, trails: (cv._trails || []).map((t: any) => ({ points: [...t], parameters: t.parameters, run: t.run, apex: t.apex, modelVersion: t.modelVersion })), log: d.runLog, lastFlight: d.lastFlight };
  });
}
async function select(page: Page, index: number) {
  await page.locator('[data-physics-graph-time-slider]').evaluate((el, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true }));
  }, index);
  await page.waitForFunction(i => (document.getElementById('physicsCanvas') as any)._inspection?.index === i, index, { polling: 20 });
}
async function assertEnergy(page: Page, run: number) {
  const expected = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, trail = cv._inspection?.trail || cv._trails.at(-1);
    const index = cv._inspection?.index ?? trail.length - 1, point = trail[index], p = trail.parameters;
    const ke = .5 * p.mass * (point.mVx ** 2 + point.mVy ** 2), pe = p.mass * p.gravity * point.mY;
    const initialEnergy = .5 * p.mass * p.velocity ** 2 + p.mass * p.gravity * p.launchHeight;
    return { index, t: point.t, parameters: p, values: { ke, pe, totalEnergy: ke + pe, initialEnergy, dragLoss: p.drag ? Math.max(0, initialEnergy - ke - pe) : 0 } };
  });
  const panel = page.locator('[data-physics-energy-panel]');
  await expect(panel).toHaveAttribute('data-run', String(run));
  await expect(panel).toHaveAttribute('data-sample-index', String(expected.index));
  await expect(panel).toHaveAttribute('data-time', String(expected.t));
  for (const [key, value] of Object.entries(expected.values)) {
    const el = panel.locator(`[data-physics-energy-value="${key}"]`);
    expect(Number(await el.getAttribute('data-value'))).toBeCloseTo(value, 8);
    await expect(el).toHaveText(value.toFixed(2) + ' J');
  }
  const bars = await panel.locator('[data-physics-energy-budget]').evaluateAll(els => els.map(el => ({ key: (el as HTMLElement).dataset.physicsEnergyBudget!, width: el.getBoundingClientRect().width, total: el.parentElement!.getBoundingClientRect().width })));
  for (const bar of bars) expect(Math.abs(bar.width - bar.total * expected.values[bar.key as keyof typeof expected.values] / expected.values.initialEnergy)).toBeLessThan(.05);
  return expected;
}
async function assertBands(page: Page) {
  const result = await page.locator('[data-physics-energy-graph]').evaluate(svg => {
    const cv = document.getElementById('physicsCanvas') as any, trail = cv._inspection?.trail || cv._trails.at(-1), p = trail.parameters;
    const origin = svg.querySelector('[data-physics-energy-origin]')!, top = svg.querySelector('[data-physics-energy-initial]')!;
    const left = Number(origin.getAttribute('x1')), right = Number(origin.getAttribute('x2')), zero = Number(origin.getAttribute('y1')), maximum = Number(top.getAttribute('y1'));
    const e0 = .5 * p.mass * p.velocity ** 2 + p.mass * p.gravity * p.launchHeight, lastTime = trail.at(-1).t;
    const errors: number[] = [], counts: number[] = [], plottedTimes: number[] = [];
    for (const el of svg.querySelectorAll('[data-physics-energy-area]')) {
      const part = (el as HTMLElement).dataset.physicsEnergyArea, pairs = [...el.getAttribute('d')!.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
      const count = pairs.length / 2; counts.push(count);
      for (let i = 0; i < count; i++) {
        const [x, y] = pairs[i], time = (x - left) / (right - left) * lastTime;
        const point = trail.reduce((best: any, pt: any) => Math.abs(pt.t - time) < Math.abs(best.t - time) ? pt : best, trail[0]);
        const ke = .5 * p.mass * (point.mVx ** 2 + point.mVy ** 2), pe = p.mass * p.gravity * point.mY;
        const transferred = p.drag ? Math.max(0, e0 - ke - pe) : 0;
        const upper = part === 'ke' ? ke : part === 'pe' ? ke + pe : ke + pe + transferred;
        const lower = part === 'ke' ? 0 : part === 'pe' ? ke : ke + pe;
        errors.push(Math.abs(y - (zero - upper / e0 * (zero - maximum))));
        errors.push(Math.abs(pairs[pairs.length - 1 - i][1] - (zero - lower / e0 * (zero - maximum))));
        errors.push(Math.abs(x - (left + point.t / lastTime * (right - left))));
        if (part === 'ke') plottedTimes.push(point.t);
      }
    }
    return { maxError: Math.max(...errors), counts, plottedTimes, first: trail[0].t, last: lastTime, selected: cv._inspection?.snapshot.t };
  });
  expect(result.counts).toHaveLength(3);
  expect(result.counts.every(n => n >= 2 && n <= 81)).toBe(true);
  expect(result.maxError).toBeLessThan(.002);
  expect(result.plottedTimes[0]).toBe(result.first); expect(result.plottedTimes.at(-1)).toBe(result.last);
  if (result.selected != null) expect(result.plottedTimes).toContain(result.selected);
}

test('vacuum energy bands use recorded motion and height and preserve full-resolution keyboard selection', async ({ page }) => {
  await mount(page); await launch(page);
  const original = await evidence(page);
  const count = original.trails[0].points.length;
  await select(page, Math.floor(count * .37));
  const expected = await assertEnergy(page, 1); await assertBands(page);
  expect(expected.values.initialEnergy).toBe(821); expect(expected.values.totalEnergy).toBeCloseTo(821, 8); expect(expected.values.dragLoss).toBe(0);
  const slider = page.locator('[data-physics-graph-time-slider]'); await slider.focus(); await slider.press('ArrowRight');
  await expect(slider).toBeFocused(); const next = await assertEnergy(page, 1); expect(next.index).toBe(expected.index + 1);
  await expect(page.locator('[data-physics-energy-cursor]')).toHaveAttribute('data-sample-index', String(next.index));
  await expect(page.locator('[data-physics-graph-selected="vx"]')).toHaveAttribute('data-sample-index', String(next.index));
  await expect(page.locator('[data-physics-flight-summary]')).toHaveAttribute('data-sample-index', String(next.index));
  expect(await evidence(page)).toEqual(original);
});

test('drag transfers energy and tapping its timeline selects the nearest original observation after controls change', async ({ page }) => {
  await mount(page); await launch(page, { angle: 45, velocity: 40, mass: 3, launchHeight: 20, airResist: true });
  const original = await evidence(page), end = await assertEnergy(page, 1); expect(end.values.dragLoss).toBeGreaterThan(0);
  await expect(page.locator('[data-physics-energy-impact]')).toBeVisible();
  await patch(page, { angle: 80, velocity: 5, mass: 9, launchHeight: 30, gravity: 1, airResist: false });
  const svg = page.locator('[data-physics-energy-graph]'), box = (await svg.boundingBox())!;
  const position = await svg.evaluate(el => { const origin = el.querySelector('[data-physics-energy-origin]')!; return { left: Number(origin.getAttribute('x1')), right: Number(origin.getAttribute('x2')), width: (el as SVGSVGElement).viewBox.baseVal.width }; });
  const fraction = .367, wanted = original.trails[0].points.at(-1).t * fraction;
  const nearest = original.trails[0].points.reduce((best: number, pt: any, i: number, list: any[]) => Math.abs(pt.t - wanted) < Math.abs(list[best].t - wanted) ? i : best, 0);
  await svg.click({ position: { x: box.width * (position.left + (position.right - position.left) * fraction) / position.width, y: box.height * .6 } });
  const selected = await assertEnergy(page, 1); expect(selected.index).toBe(nearest); expect(selected.parameters.mass).toBe(3); expect(selected.parameters.launchHeight).toBe(20);
  await expect(page.locator('[data-physics-energy-settings]')).toContainText('m = 3 kg · v₀ = 40 m/s · g = 9.8 m/s² · h₀ = 20 m');
  await assertBands(page); expect(await evidence(page)).toEqual(original);
});

test('selecting an older flight switches the entire energy budget to its captured model', async ({ page }) => {
  await mount(page); await launch(page, { velocity: 30 }); await launch(page, { velocity: 40, mass: 3, launchHeight: 20, airResist: true });
  const original = await evidence(page); await page.locator('[data-physics-run-inspect="1"]').click();
  const old = await assertEnergy(page, 1); expect(old.values.initialEnergy).toBe(1096); expect(old.values.dragLoss).toBe(0);
  await page.locator('[data-physics-run-inspect="2"]').click(); const recent = await assertEnergy(page, 2); expect(recent.values.initialEnergy).toBe(2988); expect(recent.values.dragLoss).toBeGreaterThan(0);
  await assertBands(page); expect(await evidence(page)).toEqual(original);
});

test('paused launch has a truthful single-sample budget and a short flight keeps its exact impact time', async ({ page }) => {
  await mount(page); await patch(page, { angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, simSpeed: 0, showGraphs: true, showFlightData: true });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await expect(page.locator('[data-physics-energy-single-sample]')).toBeVisible(); await expect(page.locator('[data-physics-energy-graph]')).toHaveCount(0);
  const current = await page.locator('[data-physics-energy-value="initialEnergy"]').getAttribute('data-value'); expect(Number(current)).toBe(421);
  await page.getByRole('button', { name: 'Advance 0.035 seconds (available when paused)', exact: true }).click();
  await page.evaluate(() => (window as any).__energyTick());
  await expect(page.locator('[data-physics-energy-graph]')).toBeVisible();
  await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click();
  await page.evaluate(() => (window as any).__energyTick());
  await expect(page.locator('[data-physics-energy-panel]')).toHaveCount(0);
  await launch(page, { angle: 5, velocity: 5, gravity: 25, mass: 1, launchHeight: 0 });
  const result = await assertEnergy(page, 1); expect(result.t).toBeLessThan(.035); await assertBands(page);
  await expect(page.locator('[data-physics-energy-graph]')).toHaveAttribute('data-plotted-count', '2');
});

test('unsupported sample metadata does not borrow current controls for an energy timeline', async ({ page }) => {
  await mount(page); await launch(page);
  await page.evaluate(() => { (document.getElementById('physicsCanvas') as any)._trails[0].modelVersion = 'unknown-model'; });
  await patch(page, { mass: 9, gravity: 1, velocity: 5 });
  await expect(page.locator('[data-physics-energy-unavailable]')).toBeVisible();
  await expect(page.locator('[data-physics-energy-graph]')).toHaveCount(0); await expect(page.locator('[data-physics-energy-value]')).toHaveCount(0);
  await page.evaluate(() => { const trail = (document.getElementById('physicsCanvas') as any)._trails[0]; trail.modelVersion = (window as any).StemLab._physics.MODEL_VERSION; trail[0].mY = -1; });
  await patch(page, { velocity: 6 });
  await expect(page.locator('[data-physics-energy-unavailable]')).toBeVisible();
  await expect(page.locator('[data-physics-energy-value]')).toHaveCount(0);
});

test('fractional-joule and maximum energy axes fit a phone without clipping labels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await mount(page);
  for (const values of [{ velocity: 40, gravity: 9.81, mass: 1, launchHeight: 19 }, { angle: 85, velocity: 50, gravity: 25, mass: 10, launchHeight: 50 }]) {
    await launch(page, values);
    const bounds = await page.locator('[data-physics-energy-graph]').evaluate(el => {
      const svg = el as SVGSVGElement;
      return { width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, labels: [...svg.querySelectorAll('text')].map(text => { const b = text.getBBox(); return { text: text.textContent, left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height }; }) };
    });
    for (const label of bounds.labels) { expect(label.left, label.text!).toBeGreaterThanOrEqual(-1); expect(label.top, label.text!).toBeGreaterThanOrEqual(-1); expect(label.right, label.text!).toBeLessThanOrEqual(bounds.width + 1); expect(label.bottom, label.text!).toBeLessThanOrEqual(bounds.height + 1); }
    await assertBands(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
  await expect(page.locator('[data-physics-energy-value="initialEnergy"]')).toHaveText('25000.00 J');
});

for (const theme of ['default', 'dark', 'contrast']) test(`320px ${theme} energy readings and keyboard selection remain accessible`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  await page.evaluate(t => { const wrap = document.getElementById('wrap')!, main = document.createElement('main'), card = document.createElement('div'); wrap.parentElement!.insertBefore(main, wrap); main.append(card); card.append(wrap); main.className = 'main-content ' + (t === 'default' ? '' : 'theme-' + t); card.className = 'card'; const ctx = (window as any).__ctx; ctx.isDark = t === 'dark'; ctx.isContrast = t === 'contrast'; (window as any).__rerender(); }, theme);
  await launch(page, { angle: 45, velocity: 40, mass: 3, launchHeight: 20, airResist: true });
  const original = await evidence(page), slider = page.locator('[data-physics-graph-time-slider]'); await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
  await expect(slider).toBeFocused(); const result = await assertEnergy(page, 1); expect(result.index).toBe(1); await assertBands(page);
  await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
  const layout = await page.locator('[data-physics-energy-panel]').evaluate(root => ({ overflow: document.documentElement.scrollWidth - innerWidth, fonts: [...root.querySelectorAll('svg text')].map(el => { const matrix = (el as SVGTextElement).getScreenCTM()!; return parseFloat(getComputedStyle(el).fontSize) * Math.hypot(matrix.a, matrix.b); }), patterns: [...root.querySelectorAll('pattern')].map(el => el.id) }));
  expect(layout.overflow).toBe(0); expect(layout.fonts.every(v => v >= 11.99)).toBe(true); expect(layout.patterns).toHaveLength(2); expect(await evidence(page)).toEqual(original);
  const contrast = await page.locator('[data-physics-energy-graph]').evaluate(svg => {
    const lum = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const bands = [svg.querySelector('[data-physics-energy-area="ke"]')!, ...svg.querySelectorAll('pattern rect')].map(el => getComputedStyle(el).fill);
    const marks = [svg.querySelector('[data-physics-energy-cursor]')!, ...svg.querySelectorAll('[data-physics-energy-boundary]')].map(el => getComputedStyle(el).stroke);
    return marks.flatMap(mark => bands.map(band => { const a = lum(mark), b = lum(band); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }));
  });
  expect(contrast.every(value => value >= 3)).toBe(true);
});
