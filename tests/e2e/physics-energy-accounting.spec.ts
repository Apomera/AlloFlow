import { test, expect, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ deviceScaleFactor: 2, reducedMotion: 'reduce' });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-energy-accounting-2026-10-10');
type View = 'motion' | 'forces' | 'energy' | 'data';
type Part = 'ke' | 'pe' | 'dragLoss';
const parts: Part[] = ['ke', 'pe', 'dragLoss'];

test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__accountingTick = () => {
      now += 1000 / 60;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any, wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100%';
    const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__setAccountingTheme = (theme: string) => {
      const ctx = w.__ctx; ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__accountingCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__accountingCsv.push(text); return Promise.resolve(); };
  });
}

async function patch(page: Page, values: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({
    ...prev, physics: { ...prev.physics, ...p },
  })), values);
  await page.waitForTimeout(40);
}

async function view(page: Page, name: View) {
  const tab = page.locator(`[data-physics-analysis-tab="${name}"]`);
  if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function redraw(page: Page) {
  await page.evaluate(() => {
    (document.getElementById('physicsCanvas') as any)._physScheduleFrame(); (window as any).__accountingTick();
  });
}

async function launch(page: Page, drag = false, complete = true) {
  const count = await page.evaluate(() => ((window as any).__toolData.physics.runLog || []).length);
  await patch(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: drag,
    simSpeed: complete ? 1 : 0, showGraphs: true, showFlightData: true, showEnergy: true });
  await page.locator('[data-physics-launch]').click();
  if (complete) {
    await page.evaluate(() => {
      const cv = document.getElementById('physicsCanvas') as any;
      let ticks = 0;
      while (cv._launched && ticks++ < 10000) (window as any).__accountingTick();
      if (cv._launched) throw Error('The energy accounting fixture did not land');
    });
    await page.waitForFunction(n => (window as any).__toolData.physics.runLog.length === n + 1, count, { polling: 20 });
    await patch(page, { simSpeed: 0 });
  }
  await redraw(page); await view(page, 'energy');
  await expect(page.locator('[data-physics-energy-readings]')).toBeVisible();
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return { ball: cv._ball, trails: cv._trails.map((t: any) => ({ points: [...t], parameters: t.parameters,
      run: t.run, apex: t.apex, modelVersion: t.modelVersion })), runLog: d.runLog, lastFlight: d.lastFlight,
      recordedFlights: d.recordedFlights };
  });
}

async function copyCsv(page: Page) {
  const previous = await page.locator('[data-physics-analysis-workspace]').getAttribute('data-physics-analysis-view') as View;
  await view(page, 'data');
  try {
    const before = await page.evaluate(() => (window as any).__accountingCsv.length);
    await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__accountingCsv.length)).toBe(before + 1);
    return await page.evaluate(() => (window as any).__accountingCsv.at(-1) as string);
  } finally { await view(page, previous); }
}

function formatted(value: number) {
  return value !== 0 && Math.abs(value) < .01 ? value.toPrecision(3) : value.toFixed(2);
}

async function assertAccounting(page: Page, phase?: string) {
  await redraw(page);
  const captured = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, inspection = cv._inspection;
    const trail = inspection ? inspection.trail : cv._trails.at(-1), index = inspection ? inspection.index : trail.length - 1;
    const point = trail[index], p = trail.parameters, speed = Math.hypot(point.mVx, point.mVy);
    const ke = .5 * p.mass * speed * speed, pe = p.mass * p.gravity * point.mY;
    const mechanical = ke + pe, initialEnergy = .5 * p.mass * p.velocity * p.velocity + p.mass * p.gravity * p.launchHeight;
    const dragLoss = p.drag ? Math.max(0, initialEnergy - ke - pe) : 0, accounted = mechanical + dragLoss;
    return { point, index, run: trail.run ?? null, parameters: p, phase: inspection?.snapshot.phase,
      values: { ke, pe, dragLoss, totalEnergy: mechanical, initialEnergy }, accounted, scale: Math.max(initialEnergy, accounted) };
  });
  const card = page.locator('[data-physics-energy-readings]'), figure = card.locator('[data-physics-energy-accounting]');
  const values = captured.values, scale = captured.scale;
  await expect(figure).toBeVisible();
  await expect(figure).toHaveAttribute('data-run', captured.run == null ? 'unfinished' : String(captured.run));
  await expect(figure).toHaveAttribute('data-sample-index', String(captured.index));
  await expect(figure).toHaveAttribute('data-time', String(captured.point.t));
  await expect(figure).toHaveAttribute('data-initial-energy', String(values.initialEnergy));
  await expect(figure).toHaveAttribute('data-accounted-energy', String(captured.accounted));
  await expect(figure).toHaveAttribute('data-scale-energy', String(scale));
  expect(await figure.getAttribute('tabindex')).toBeNull();
  const labelledBy = await figure.getAttribute('aria-labelledby');
  expect(labelledBy).toBeTruthy(); await expect(page.locator('#' + labelledBy)).toHaveCount(1);
  const describedBy = (await figure.getAttribute('aria-describedby') || '').split(/\s+/);
  for (const id of ['physics-energy-accounting-help', 'physics-energy-accounting-scale-help']) {
    expect(describedBy).toContain(id); await expect(page.locator('#' + id)).toHaveCount(1);
    await expect(page.locator('#' + id)).toBeVisible();
  }
  await expect(figure.locator('[data-physics-energy-accounting-time]')).toContainText('t = ' + captured.point.t.toFixed(3) + ' s');
  if (phase) expect(captured.phase).toBe(phase);
  const reference = figure.locator('[data-physics-energy-reference]');
  await expect(reference).toHaveCount(1);
  await expect(reference).toHaveAttribute('data-value', String(values.initialEnergy));
  const referenceGeometry = await reference.evaluate(node => ({
    x: Number(node.getAttribute('x')), y: Number(node.getAttribute('y')),
    width: Number(node.getAttribute('width')), height: Number(node.getAttribute('height')),
    viewBox: node.closest('svg')!.getAttribute('viewBox'), hidden: node.closest('svg')!.getAttribute('aria-hidden'),
  }));
  expect(referenceGeometry).toMatchObject({ x: 0, y: 4, height: 28, viewBox: '0 0 300 36', hidden: 'true' });
  expect(referenceGeometry.width).toBeCloseTo(scale > 0 ? 300 * values.initialEnergy / scale : 0, 12);
  const allocation = figure.locator('[data-physics-energy-allocation]');
  await expect(allocation).toHaveAttribute('viewBox', '0 0 300 36');
  await expect(allocation).toHaveAttribute('aria-hidden', 'true');
  await expect(allocation.locator('text')).toHaveCount(0);
  await expect(allocation.locator('rect[data-physics-energy-budget]')).toHaveCount(3);
  // The replaced miniature timeline budget must not silently satisfy an empty loop.
  await expect(page.locator('[data-physics-energy-panel] [data-physics-energy-budget]')).toHaveCount(0);
  const bars = await allocation.locator('rect[data-physics-energy-budget]').evaluateAll(nodes => nodes.map(node => ({
    key: node.getAttribute('data-physics-energy-budget'), value: Number(node.getAttribute('data-value')),
    x: Number(node.getAttribute('x')), y: Number(node.getAttribute('y')),
    width: Number(node.getAttribute('width')), height: Number(node.getAttribute('height')),
  })));
  let previous = 0;
  for (const [index, key] of parts.entries()) {
    const bar = bars[index], value = values[key], width = scale > 0 ? 300 * value / scale : 0;
    expect(bar.key).toBe(key); expect(bar.value).toBe(value); expect(bar.y).toBe(4); expect(bar.height).toBe(28);
    expect(Number.isFinite(bar.x) && Number.isFinite(bar.width)).toBe(true);
    expect(bar.x).toBeCloseTo(previous, 12); expect(bar.width).toBeCloseTo(width, 12);
    expect(bar.x + bar.width).toBeLessThanOrEqual(300 + 1e-10); previous += width;
    await expect(figure.locator(`[data-physics-energy-zero="${key}"]`)).toHaveCount(value === 0 ? 1 : 0);
    const tiny = value > 0 && scale > 0 && value / scale < .01;
    await expect(figure.locator(`[data-physics-energy-tiny="${key}"]`)).toHaveCount(tiny ? 1 : 0);
    if (value === 0) await expect(figure.locator(`[data-physics-energy-zero="${key}"]`)).toBeVisible();
    if (tiny) await expect(figure.locator(`[data-physics-energy-tiny="${key}"]`)).toBeVisible();
  }
  expect(previous).toBeCloseTo(scale > 0 ? 300 * captured.accounted / scale : 0, 12);
  const bracket = figure.locator('[data-physics-energy-mechanical-bracket]');
  await expect(bracket).toHaveCount(values.totalEnergy > 0 ? 1 : 0);
  if (values.totalEnergy > 0) {
    await expect(bracket).toHaveAttribute('data-value', String(values.totalEnergy));
    expect(Number(await bracket.getAttribute('data-width'))).toBeCloseTo(300 * values.totalEnergy / scale, 12);
    const bracketBounds = await bracket.evaluate(node => { const b = (node as SVGGraphicsElement).getBBox(); return { x: b.x, width: b.width }; });
    expect(bracketBounds.x).toBe(0); expect(bracketBounds.width).toBeCloseTo(300 * values.totalEnergy / scale, 4);
  }
  for (const [key, value] of Object.entries(values)) {
    const reading = card.locator(`[data-physics-measurement="${key}"] dd`);
    await expect(reading).toHaveText(formatted(value) + ' J');
  }
  for (const [key, value] of Object.entries({ initialEnergy: values.initialEnergy, accounted: captured.accounted })) {
    const reading = figure.locator(`[data-physics-energy-accounting-value="${key}"]`);
    await expect(reading).toHaveAttribute('data-value', String(value)); await expect(reading).toHaveText(formatted(value) + ' J');
  }
  const equation = card.locator('[data-physics-energy-accounting-equation]');
  await expect(equation).toHaveAttribute('data-mechanical', String(values.totalEnergy));
  await expect(equation).toHaveAttribute('data-transferred', String(values.dragLoss));
  await expect(equation).toHaveAttribute('data-accounted', String(captured.accounted));
  await expect(equation).toContainText(formatted(values.totalEnergy) + ' J + ' + formatted(values.dragLoss) + ' J ≈ ' + formatted(captured.accounted) + ' J');
  const difference = captured.accounted - values.initialEnergy, showDifference = Math.abs(difference) > values.initialEnergy * 1e-6;
  const differenceNote = figure.locator('[data-physics-energy-difference]');
  await expect(differenceNote).toHaveCount(showDifference ? 1 : 0);
  if (showDifference) {
    await expect(differenceNote).toBeVisible(); await expect(differenceNote).toHaveAttribute('data-value', String(difference));
    await expect(differenceNote).toContainText(formatted(difference) + ' J');
  }
  await expect(page.locator('#physics-energy-accounting-help')).toContainText(captured.parameters.drag
    ? 'estimates energy transferred to the air from the decrease in mechanical energy'
    : 'No energy transfer to the air is counted');
  return { ...captured, bars, referenceWidth: referenceGeometry.width };
}

test('recorded energy accounting follows vacuum and drag moments and older flights without changing evidence or CSV', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  let firstCsv = '', firstInitial = 0;
  for (const drag of [false, true]) {
    await launch(page, drag);
    const before = await evidence(page), csv = await copyCsv(page);
    await page.locator('[data-physics-inspect]').click(); await view(page, 'energy');
    const moments: Awaited<ReturnType<typeof assertAccounting>>[] = [];
    for (const [jump, phase] of [['launch', 'rising'], ['highest', 'apex'], ['latest', 'impact']] as const) {
      await page.locator(`[data-physics-sample-jump="${jump}"]`).click();
      const selected = await assertAccounting(page, phase); moments.push(selected);
      expect(selected.run).toBe(drag ? 2 : 1);
      if (jump === 'launch') expect(selected.values.dragLoss).toBeCloseTo(0, 8);
      if (phase === 'impact') expect(selected.values.pe).toBe(0);
      if (!drag) {
        expect(selected.values.dragLoss).toBe(0); expect(selected.values.totalEnergy).toBeCloseTo(selected.values.initialEnergy, 8);
      }
    }
    expect(new Set(moments.map(moment => moment.values.initialEnergy)).size).toBe(1);
    expect(moments[1].values.pe).toBeGreaterThan(moments[0].values.pe);
    if (drag) {
      expect(moments[1].values.dragLoss).toBeGreaterThan(0);
      expect(moments[2].values.dragLoss).toBeGreaterThan(moments[1].values.dragLoss);
      expect(moments[2].values.totalEnergy).toBeLessThan(moments[0].values.totalEnergy);
    }
    await patch(page, { angle: 80, velocity: 5, mass: 9, gravity: 25, launchHeight: 30, airResist: !drag });
    await page.locator('[data-physics-sample-jump="launch"]').click();
    const captured = await assertAccounting(page, 'rising'); expect(captured.values.initialEnergy).toBe(moments[0].values.initialEnergy);
    expect(await copyCsv(page)).toBe(csv); expect(await evidence(page)).toEqual(before);
    if (!drag) { firstCsv = csv; firstInitial = captured.values.initialEnergy; }
  }
  const both = await evidence(page);
  await page.locator('[data-physics-history-select]').selectOption('0'); await view(page, 'energy');
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const older = await assertAccounting(page, 'apex'); expect(older.run).toBe(1); expect(older.values.initialEnergy).toBe(firstInitial);
  expect(await copyCsv(page)).toBe(firstCsv); expect(await evidence(page)).toEqual(both); expect(errors).toEqual([]);
});

test('zero, tiny and mismatched energy allocations keep their exact size instead of filling or clipping the reference', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page, false, false);
  const fixtures = [
    { name: 'all zero', initialVelocity: 0, vx: 0, height: 0, drag: false },
    { name: 'zero reference with positive recorded energy', initialVelocity: 0, vx: 1, height: 0, drag: false },
    { name: 'zero recorded sum with a positive reference', initialVelocity: 10, vx: 0, height: 0, drag: false },
    { name: 'tiny kinetic energy', initialVelocity: 10, vx: .001, height: 5, drag: false },
    { name: 'tiny potential energy', initialVelocity: 10, vx: 10, height: .0000001, drag: false },
    { name: 'tiny transfer', initialVelocity: 10, vx: Math.sqrt(99.5), height: 0, drag: true },
    { name: 'under allocation', initialVelocity: 10, vx: 5, height: 0, drag: false },
    { name: 'excess allocation', initialVelocity: 10, vx: 20, height: 0, drag: false },
    { name: 'three nonzero allocations', initialVelocity: 10, vx: 5, height: 1.25, drag: true },
  ];
  for (const fixture of fixtures) {
    if (await page.locator('[data-physics-sample-close]').count()) await page.locator('[data-physics-sample-close]').click();
    await page.evaluate(value => {
      const cv = document.getElementById('physicsCanvas') as any, trail = cv._trails.at(-1);
      if (trail.length !== 1 || trail.apex) throw Error('Synthetic energy fixture requires a paused launch record');
      // Isolate rendering with finite, supported captured parameters; these points are not a simulated flight.
      trail.parameters = { ...trail.parameters, velocity: value.initialVelocity, mass: 2, gravity: 10, launchHeight: 0, drag: value.drag };
      trail[0] = { ...trail[0], mVx: value.vx, mVy: 0, mY: value.height };
      (window as any).__rerender();
    }, fixture);
    await redraw(page); const before = await evidence(page);
    await page.locator('[data-physics-inspect]').click(); await view(page, 'energy');
    const selected = await assertAccounting(page);
    if (fixture.name === 'all zero') {
      expect(selected.scale).toBe(0); expect(selected.referenceWidth).toBe(0);
      expect(selected.bars.every(bar => bar.x === 0 && bar.width === 0)).toBe(true);
      await expect(page.locator('#physics-energy-accounting-scale-help')).toContainText('both zero');
    }
    if (fixture.name === 'under allocation') {
      expect(selected.referenceWidth).toBe(300); expect(selected.bars[0].width).toBe(75);
    }
    if (fixture.name === 'excess allocation') {
      expect(selected.referenceWidth).toBe(75); expect(selected.bars[0].width).toBe(300);
    }
    if (fixture.name === 'tiny kinetic energy') {
      expect(selected.bars[0].width).toBeLessThan(.00001);
      await expect(page.locator('[data-physics-measurement="ke"] dd')).not.toHaveText('0.00 J');
    }
    if (fixture.name === 'tiny potential energy') {
      expect(selected.bars[1].width).toBeLessThan(.00001);
      await expect(page.locator('[data-physics-measurement="pe"] dd')).not.toHaveText('0.00 J');
    }
    expect(await evidence(page), fixture.name).toEqual(before);
  }
  expect(errors).toEqual([]);
});

function rgb(color: string): [number, number, number] {
  const match = color.match(/^rgba?\(([^)]+)\)$/);
  if (!match) throw Error('Unresolved energy accounting color: ' + color);
  const channels = match[1].split(',').map(Number); return [channels[0], channels[1], channels[2]];
}

async function capture(page: Page, file: string, theme: string) {
  const card = page.locator('[data-physics-energy-readings]');
  const measured = await card.evaluate(node => {
    const figure = node.querySelector('[data-physics-energy-accounting]')!, svg = figure.querySelector('[data-physics-energy-allocation]') as SVGSVGElement;
    const cardBox = node.getBoundingClientRect(), bounds = svg.getBoundingClientRect(), matrix = svg.getScreenCTM()!;
    const point = (x: number, y: number) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x - cardBox.left, y: p.y - cardBox.top }; };
    const surface = (element: Element) => {
      for (let parent: Element | null = element; parent; parent = parent.parentElement) {
        const color = getComputedStyle(parent).backgroundColor, channels = color.match(/^rgba?\(([^)]+)\)$/)?.[1].split(',').map(Number);
        if (channels && (channels.length === 3 || channels[3] >= .99)) return color;
      }
      throw Error('Energy content has no resolved surface');
    };
    const barBackground = getComputedStyle(svg.querySelector(':scope > rect:not([data-physics-energy-budget])')!).fill;
    const bars = [...svg.querySelectorAll('rect[data-physics-energy-budget]')].map(rect => {
      const field = rect.getAttribute('data-physics-energy-budget')!, x = Number(rect.getAttribute('x')), width = Number(rect.getAttribute('width'));
      const pattern = field === 'ke' ? null : svg.querySelector('#physics-energy-accounting-' + field + '-pattern');
      const paint = pattern?.querySelector('rect') || rect;
      return { field, value: Number(rect.getAttribute('data-value')), width, color: getComputedStyle(paint).fill, background: barBackground,
        pattern: pattern ? { id: pattern.id, path: pattern.querySelector('path')!.getAttribute('d'), gap: getComputedStyle(pattern.querySelector('path')!).stroke } : null,
        witnesses: [.15, .3, .45, .6, .75, .9].flatMap(t => [8, 13, 18, 23, 28].map(y => point(x + width * t, y))) };
    });
    const texts: Array<{ text: string; font: number; color: string; background: string; left: number; right: number }> = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const element = text.parentElement!;
      if (!text.textContent?.trim() || !element.getClientRects().length || element.closest('svg,.sr-only')) continue;
      const style = getComputedStyle(element), range = document.createRange(); range.selectNodeContents(text);
      for (const rect of range.getClientRects()) texts.push({ text: text.textContent.trim(), font: parseFloat(style.fontSize),
        color: style.color, background: surface(element), left: rect.left, right: rect.right });
    }
    return { width: bounds.width, height: bounds.height, pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth, card: { left: cardBox.left, right: cardBox.right, width: cardBox.width }, bars, texts };
  });
  const palette = theme === 'contrast' ? { ke: [255, 255, 0], pe: [255, 255, 255], dragLoss: [255, 255, 0] }
    : theme === 'dark' ? { ke: [103, 184, 255], pe: [207, 180, 255], dragLoss: [251, 191, 36] }
      : { ke: [23, 103, 178], pe: [121, 61, 187], dragLoss: [169, 91, 5] };
  expect(measured.width).toBeGreaterThan(150); expect(measured.pageWidth).toBeLessThanOrEqual(measured.viewportWidth + 1);
  expect(measured.card.left).toBeGreaterThanOrEqual(0); expect(measured.card.right).toBeLessThanOrEqual(measured.viewportWidth + 1);
  expect(measured.bars).toHaveLength(3); expect(measured.texts.length).toBeGreaterThan(6);
  for (const text of measured.texts) {
    expect(text.font, text.text).toBeGreaterThanOrEqual(12); expect(text.left).toBeGreaterThanOrEqual(measured.card.left - .5);
    expect(text.right).toBeLessThanOrEqual(measured.card.right + .5);
    expect(contrastRatio(rgb(text.color), rgb(text.background)), text.text).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
  }
  for (const bar of measured.bars) {
    expect(rgb(bar.color)).toEqual(palette[bar.field as Part]);
    expect(contrastRatio(rgb(bar.color), rgb(bar.background)), bar.field).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 3);
    if (bar.pattern) {
      expect(bar.pattern.id).toBe('physics-energy-accounting-' + bar.field + '-pattern');
      expect(bar.pattern.path).toBe(bar.field === 'pe' ? 'M0 5H6' : 'M-1 1L1-1M0 6L6 0M5 7L7 5');
      expect(rgb(bar.pattern.gap)).toEqual(rgb(bar.background));
    }
  }
  mkdirSync(reports, { recursive: true });
  const buffer = await card.screenshot({ path: path.join(reports, file) }), pixels = readPng(buffer);
  const box = (await card.boundingBox())!, ratioX = pixels.width / box.width, ratioY = pixels.height / box.height;
  const witnesses = measured.bars.filter(bar => bar.value > 0).map(bar => {
    const wanted = rgb(bar.color); let best = { error: Infinity, x: -1, y: -1, actual: [] as number[] };
    for (const point of bar.witnesses) {
      const x = Math.round(point.x * ratioX), y = Math.round(point.y * ratioY);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (x + dx < 0 || y + dy < 0 || x + dx >= pixels.width || y + dy >= pixels.height) continue;
        const actual = pixels.at(x + dx, y + dy), error = Math.max(...actual.map((channel, i) => Math.abs(channel - wanted[i])));
        if (error < best.error) best = { error, x: x + dx, y: y + dy, actual };
      }
    }
    expect(best.error, bar.field + ' must paint in the saved PNG').toBeLessThanOrEqual(8);
    return { field: bar.field, wanted, ...best };
  });
  expect(witnesses).toHaveLength(measured.bars.filter(bar => bar.value > 0).length);
  return { file, measured, pixels: { width: pixels.width, height: pixels.height, witnesses } };
}

test('energy references, allocations, legends and readings remain visible and readable in twelve saved layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page, true); await page.locator('[data-physics-inspect]').click();
  const original = await evidence(page), captures: any[] = [];
  try {
    for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(value => (window as any).__setAccountingTheme(value), theme);
      await view(page, 'energy'); await page.locator('[data-physics-sample-jump="highest"]').click();
      const apex = await assertAccounting(page, 'apex'); expect(parts.every(key => apex.values[key] > 0)).toBe(true);
      captures.push({ width, theme, phase: 'apex', ...(await capture(page, `energy-accounting-${theme}-${width}.png`, theme)) });
      if (width === 320) {
        await page.locator('[data-physics-sample-jump="latest"]').click(); await assertAccounting(page, 'impact');
        captures.push({ width, theme, phase: 'impact', ...(await capture(page, `energy-accounting-impact-${theme}-${width}.png`, theme)) });
      }
    }
    expect(captures).toHaveLength(12); expect(await evidence(page)).toEqual(original); expect(errors).toEqual([]);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error)); throw error;
  } finally {
    mkdirSync(reports, { recursive: true });
    writeFileSync(path.join(reports, 'energy-accounting-visual-results.json'), JSON.stringify({ captures, errors }, null, 2) + '\n');
  }
});
