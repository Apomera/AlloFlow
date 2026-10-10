import { test, expect, Page, Locator } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ deviceScaleFactor: 2, reducedMotion: 'reduce' });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-graph-navigation-2026-10-09');
type View = 'motion' | 'forces' | 'energy' | 'data';
type Graph = 'vx' | 'vy' | 'energy';

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
    w.__graphTick = () => {
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
    w.__setGraphTheme = (theme: string) => {
      const ctx = w.__ctx; ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__graphCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__graphCsv.push(text); return Promise.resolve(); };
  });
}

async function patch(page: Page, values: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), values);
  await page.waitForTimeout(40);
}

async function view(page: Page, name: View) {
  const tab = page.locator(`[data-physics-analysis-tab="${name}"]`);
  if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

function graph(page: Page, name: Graph) {
  return page.locator(name === 'energy' ? '[data-physics-energy-graph]' : `[data-physics-graph="${name}"]`);
}

async function redraw(page: Page) {
  await page.evaluate(() => {
    (document.getElementById('physicsCanvas') as any)._physScheduleFrame(); (window as any).__graphTick();
  });
}

async function launch(page: Page, values: object = {}, complete = true) {
  const count = await page.evaluate(() => ((window as any).__toolData.physics.runLog || []).length);
  await patch(page, { angle: 45, velocity: 30, gravity: 9.8, mass: 2, launchHeight: 12, airResist: false,
    simSpeed: complete ? 1 : 0, showGraphs: true, showFlightData: true, showEnergy: true, ...values });
  await page.locator('[data-physics-launch]').click();
  if (complete) {
    await page.evaluate(() => {
      const cv = document.getElementById('physicsCanvas') as any;
      let ticks = 0;
      while (cv._launched && ticks++ < 10000) (window as any).__graphTick();
      if (cv._launched) throw Error('The graph keyboard fixture did not land');
    });
    await page.waitForFunction(n => (window as any).__toolData.physics.runLog.length === n + 1, count, { polling: 20 });
    await patch(page, { simSpeed: 0 });
  }
  await redraw(page);
  await view(page, 'motion');
  await expect(graph(page, 'vx')).toBeVisible();
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
  const before = await page.evaluate(() => (window as any).__graphCsv.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__graphCsv.length)).toBe(before + 1);
  const csv = await page.evaluate(() => (window as any).__graphCsv.at(-1) as string);
  await view(page, previous);
  return csv;
}

async function assertSlider(el: Locator, count: number, index: number) {
  await expect(el).toHaveAttribute('role', 'slider');
  await expect(el).toHaveAttribute('tabindex', '0');
  await expect(el).toHaveAttribute('aria-orientation', 'horizontal');
  await expect(el).toHaveAttribute('aria-valuemin', '0');
  await expect(el).toHaveAttribute('aria-valuemax', String(count - 1));
  await expect(el).toHaveAttribute('aria-valuenow', String(index));
  await expect(el).toHaveAttribute('aria-describedby', /physics-graph-keyboard-help/);
  expect((await el.getAttribute('aria-label'))!.length).toBeGreaterThan(3);
}

async function assertSelection(page: Page, index: number, run: number | null = 1) {
  await page.waitForFunction(i => (document.getElementById('physicsCanvas') as any)._inspection?.index === i, index, { polling: 20 });
  await redraw(page);
  const selected = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, inspection = cv._inspection;
    return { point: inspection.trail[inspection.index], sample: inspection.snapshot, count: inspection.trail.length,
      marker: cv._visualInspection, simSpeed: (window as any).__toolData.physics.simSpeed };
  });
  expect(selected.sample).toMatchObject({ index, run, t: selected.point.t, x: selected.point.mX,
    y: selected.point.mY, vx: selected.point.mVx, vy: selected.point.mVy });
  expect(selected.simSpeed).toBe(0);
  expect(selected.marker).toMatchObject({ index, t: selected.point.t });
  await expect(page.locator('[data-physics-sample-slider]')).toHaveValue(String(index));
  await expect(page.locator('[data-physics-sample-status]')).toContainText('Sample ' + (index + 1));
  for (const field of ['vx', 'vy'] as const) {
    const svg = graph(page, field), marker = page.locator(`[data-physics-graph-marker="${field}"]`);
    await assertSlider(svg, selected.count, index);
    await expect(marker).toHaveAttribute('data-sample-index', String(index));
    await expect(marker).toHaveAttribute('data-time', String(selected.point.t));
    await expect(marker).toHaveAttribute('data-value', String(selected.sample[field]));
    await expect(page.locator(`[data-physics-graph-reading="${field}"]`)).toHaveAttribute('data-value', String(selected.sample[field]));
    const valueText = await svg.getAttribute('aria-valuetext');
    expect(valueText).toContain(selected.point.t.toFixed(3));
    expect(valueText!.toLowerCase()).toContain('sample ' + (index + 1));
    expect(valueText).toContain(field === 'vx' ? 'Vx' : 'Vy');
    const value = selected.sample[field], formatted = value !== 0 && Math.abs(value) < .01 ? value.toPrecision(3) : value.toFixed(2);
    expect(valueText).toContain(formatted + ' m/s');
    const retained = await svg.evaluate((el, wanted) => {
      const indices = el.getAttribute('data-plotted-indices')!.split(',').map(Number), vertex = indices.indexOf(wanted);
      const curve = [...el.querySelectorAll('path')].find(p => p.getAttribute('fill') === 'none')!;
      const pairs = [...curve.getAttribute('d')!.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
      const marker = el.querySelector('[data-physics-graph-marker]')!;
      return { retained: vertex >= 0, error: vertex < 0 ? Infinity : Math.hypot(pairs[vertex][0] - Number(marker.getAttribute('cx')), pairs[vertex][1] - Number(marker.getAttribute('cy'))) };
    }, index);
    expect(retained.retained).toBe(true); expect(retained.error).toBeLessThan(.08);
  }
  for (const field of ['x', 'y', 'vx', 'vy'] as const) {
    const value = selected.sample[field], formatted = value !== 0 && Math.abs(value) < .01 ? value.toPrecision(3) : value.toFixed(2);
    await expect(page.locator(`[data-physics-measurement="${field}"] dd`)).toHaveText(formatted + (field === 'x' || field === 'y' ? ' m' : ' m/s'));
  }
  await expect(page.locator(`[data-physics-flight-table] tr[data-selected="true"] [data-physics-sample-index="${index}"]`)).toHaveCount(1);
  await expect(page.locator('[data-physics-energy-panel]')).toHaveAttribute('data-sample-index', String(index));
  for (const field of ['ke', 'pe', 'totalEnergy'] as const) {
    await expect(page.locator(`[data-physics-energy-value="${field}"]`)).toHaveAttribute('data-value', String(selected.sample[field]));
  }
  if (selected.count > 1) {
    await assertSlider(graph(page, 'energy'), selected.count, index);
    const energyText = await graph(page, 'energy').getAttribute('aria-valuetext');
    expect(energyText).toContain(selected.point.t.toFixed(3));
    expect(energyText).toContain('sample ' + (index + 1));
    for (const field of ['ke', 'pe', 'dragLoss']) expect(energyText).toContain(selected.sample[field].toFixed(2) + ' J');
    await expect(page.locator('[data-physics-energy-cursor]')).toHaveAttribute('data-time', String(selected.point.t));
    await expect(page.locator('[data-physics-energy-cursor]')).toHaveAttribute('data-sample-index', String(index));
  }
  return selected;
}

async function key(page: Page, name: Graph, value: string, index: number, run: number | null = 1) {
  const el = graph(page, name);
  await el.press(value);
  await assertSelection(page, index, run);
  await expect(el).toBeFocused();
}

test('velocity and energy graphs navigate every original point and retain focus across recorded runs', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page);
  const first = await evidence(page), count = first.trails[0].points.length, csv = await copyCsv(page);
  expect(count).toBeGreaterThan(80);
  const initiallyPlotted = (await graph(page, 'vx').getAttribute('data-plotted-indices'))!.split(',').map(Number);
  const unplotted = first.trails[0].points.findIndex((_: any, i: number) => i > 0 && !initiallyPlotted.includes(i));
  expect(unplotted).toBeGreaterThan(0);
  await graph(page, 'vx').focus(); await page.keyboard.press('Tab'); await expect(graph(page, 'vy')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(graph(page, 'vx')).toBeFocused();
  await key(page, 'vx', 'Home', 0);
  await graph(page, 'vx').evaluate(el => {
    for (let i = 0; i < 3; i++) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  });
  await assertSelection(page, 3); await expect(graph(page, 'vx')).toBeFocused();
  for (const name of ['vx', 'vy', 'energy'] as const) {
    await view(page, name === 'energy' ? 'energy' : 'motion');
    const el = graph(page, name); await el.focus();
    await key(page, name, 'Home', 0);
    await key(page, name, 'ArrowRight', 1);
    await key(page, name, 'ArrowUp', 2);
    await key(page, name, 'ArrowLeft', 1);
    await key(page, name, 'ArrowDown', 0);
    await key(page, name, 'PageUp', 10);
    await key(page, name, 'PageDown', 0);
    await key(page, name, 'End', count - 1);
    await key(page, name, 'ArrowRight', count - 1);
    await key(page, name, 'ArrowLeft', count - 2);
    await key(page, name, 'Enter', count - 2);
    await key(page, name, 'Space', count - 2);
    await key(page, name, 'Home', 0);
    await key(page, name, 'ArrowLeft', 0);
  }
  await view(page, 'motion'); await graph(page, 'vy').focus();
  for (let i = 1; i <= unplotted; i++) await key(page, 'vy', 'ArrowRight', i);
  expect(await copyCsv(page)).toBe(csv); expect(await evidence(page)).toEqual(first);
  await launch(page, { angle: 35, velocity: 40, launchHeight: 20, mass: 3, airResist: true });
  const both = await evidence(page), secondCount = both.trails[1].points.length;
  await patch(page, { angle: 80, velocity: 5, mass: 9, launchHeight: 30, gravity: 1, airResist: false });
  await page.locator('[data-physics-history-select]').selectOption('0');
  await graph(page, 'vx').focus(); await key(page, 'vx', 'Home', 0, 1);
  const old = await assertSelection(page, 0, 1);
  expect(old.sample.parameters).toMatchObject({ angle: 45, velocity: 30, mass: 2, gravity: 9.8, launchHeight: 12, airResist: false });
  expect(await copyCsv(page)).toBe(csv);
  await page.locator('[data-physics-history-select]').selectOption('1');
  await view(page, 'energy'); await graph(page, 'energy').focus();
  await key(page, 'energy', 'End', secondCount - 1, 2);
  await key(page, 'energy', 'PageDown', secondCount - 11, 2);
  expect((await assertSelection(page, secondCount - 11, 2)).sample.parameters).toMatchObject({ mass: 3, velocity: 40, airResist: true });
  expect(await evidence(page)).toEqual(both);
  await launch(page, { angle: 5, velocity: 5, gravity: 25, mass: 2, launchHeight: 0, airResist: false });
  const short = await evidence(page); expect(short.trails[2].points).toHaveLength(3);
  const impact = short.trails[2].points[2]; expect(impact.t).toBeLessThan(.035); expect(impact.mY).toBe(0);
  await graph(page, 'vy').focus(); await key(page, 'vy', 'Home', 0, 3);
  await key(page, 'vy', 'PageUp', 2, 3); expect((await assertSelection(page, 2, 3)).sample.phase).toBe('impact');
  await key(page, 'vy', 'ArrowLeft', 1, 3); expect((await assertSelection(page, 1, 3)).sample.phase).toBe('apex');
  expect(await evidence(page)).toEqual(short); expect(errors).toEqual([]);
});

test('graph activation pauses live playback, keeps one-sample evidence, and ignores modified keys and unsupported records', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page, { angle: 0, velocity: 15, launchHeight: 10 }, false);
  const single = await evidence(page); expect(single.trails[0].points).toHaveLength(1); expect(single.ball.t).toBe(0);
  const vx = graph(page, 'vx'); await assertSlider(vx, 1, 0); await vx.focus();
  for (const value of ['Home', 'End', 'Enter', 'Space', 'ArrowRight', 'PageUp']) await key(page, 'vx', value, 0, null);
  await view(page, 'energy'); await expect(graph(page, 'energy')).toHaveCount(0);
  await expect(page.locator('[data-physics-energy-single-sample]')).toBeVisible();
  expect(await evidence(page)).toEqual(single);
  await view(page, 'motion');
  const prediction = page.locator('[data-physics-graph="range"]');
  await expect(prediction).toHaveAttribute('role', 'img');
  expect(await prediction.getAttribute('tabindex')).toBeNull();
  await page.locator('[data-physics-playback-rate="1"]').click();
  await page.evaluate(() => { for (let i = 0; i < 12; i++) (window as any).__graphTick(); });
  await patch(page, { liveTick: 1 });
  const live = await evidence(page), last = live.trails[0].points.length - 1; expect(last).toBeGreaterThan(1);
  await vx.focus(); await vx.press('Enter'); await assertSelection(page, last, null); await expect(vx).toBeFocused();
  const pinned = await evidence(page);
  for (const name of ['vx', 'vy', 'energy'] as const) {
    await view(page, name === 'energy' ? 'energy' : 'motion'); const el = graph(page, name); await el.focus();
    for (const modified of ['Control+ArrowLeft', 'Alt+ArrowDown', 'Meta+ArrowRight']) {
      await el.press(modified); await assertSelection(page, last, null); await expect(el).toBeFocused();
    }
  }
  expect(await evidence(page)).toEqual(pinned);
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    cv._inspection = null; cv._trails[0].modelVersion = 'unsupported-test-record';
    (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, inspectionSnapshot: '', liveTick: 2 } }));
  });
  await view(page, 'motion');
  const unsupported = await evidence(page);
  for (const name of ['vx', 'vy'] as const) {
    const el = graph(page, name); await expect(el).toHaveAttribute('role', 'img');
    expect(await el.getAttribute('tabindex')).toBeNull(); expect(await el.getAttribute('aria-valuenow')).toBeNull();
    await el.dispatchEvent('keydown', { key: 'Home', bubbles: true });
  }
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._inspection)).toBeNull();
  await view(page, 'energy'); await expect(graph(page, 'energy')).toHaveCount(0);
  await expect(page.locator('[data-physics-energy-unavailable]')).toBeVisible();
  expect(await evidence(page)).toEqual(unsupported); expect(errors).toEqual([]);
});

function rgb(value: string): number[] {
  if (value.startsWith('#')) return [1, 3, 5].map(offset => parseInt(value.slice(offset, offset + 2), 16));
  const channels = value.match(/[\d.]+/g); if (!channels || channels.length < 3) throw Error('Unresolved SVG color: ' + value);
  return channels.slice(0, 3).map(Number);
}
function contrast(a: string, b: string) {
  const luminance = (color: string) => rgb(color).map(value => {
    const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const first = luminance(a), second = luminance(b); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

async function capture(page: Page, name: Graph, file: string) {
  const el = graph(page, name), card = name === 'energy' ? page.locator('[data-physics-energy-panel]') : el.locator('..');
  await el.focus(); await el.press('ArrowRight'); await el.press('ArrowLeft'); await expect(el).toBeFocused();
  const measured = await el.evaluate((node, isEnergy) => {
    const svg = node as SVGSVGElement, bounds = svg.getBoundingClientRect(), style = getComputedStyle(svg);
    const card = isEnergy ? svg.closest('[data-physics-energy-panel]')! : svg.parentElement!;
    const cardBox = card.getBoundingClientRect(), matrix = svg.getScreenCTM()!;
    const project = (x: number, y: number) => { const point = new DOMPoint(x, y).matrixTransform(matrix); return { x: point.x - cardBox.left, y: point.y - cardBox.top }; };
    const cursor = svg.querySelector(isEnergy ? '[data-physics-energy-cursor]' : '[data-physics-graph-cursor]')!;
    const cursorStyle = getComputedStyle(cursor), x = Number(cursor.getAttribute('x1'));
    const y1 = Number(cursor.getAttribute('y1')), y2 = Number(cursor.getAttribute('y2'));
    const texts = [...svg.querySelectorAll('text')].map(text => {
      const box = text.getBBox(), transform = text.getScreenCTM()!, corners = [new DOMPoint(box.x, box.y), new DOMPoint(box.x + box.width, box.y + box.height)].map(p => p.matrixTransform(transform));
      return { text: text.textContent, left: corners[0].x - bounds.left, top: corners[0].y - bounds.top,
        right: corners[1].x - bounds.left, bottom: corners[1].y - bounds.top,
        fontSize: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(transform.c, transform.d),
        fill: getComputedStyle(text).fill };
    });
    const guide = svg.querySelector('[data-physics-graph-value-guide]'), marker = svg.querySelector('[data-physics-graph-marker]');
    const center = svg.querySelector('[data-physics-graph-marker-center]'), apex = svg.querySelector('[data-physics-graph-apex-guide]');
    const outline = svg.querySelector('[data-physics-energy-cursor-outline]');
    return { width: bounds.width, height: bounds.height, pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
      texts, background: style.backgroundColor, outline: { color: style.outlineColor, width: parseFloat(style.outlineWidth), style: style.outlineStyle,
        offset: parseFloat(style.outlineOffset), point: { x: bounds.left - cardBox.left - parseFloat(style.outlineOffset) - parseFloat(style.outlineWidth) / 2, y: bounds.top - cardBox.top + bounds.height / 2 } },
      cursor: { color: cursorStyle.stroke, dash: cursorStyle.strokeDasharray,
        witnesses: [.15, .45, .85].map(fraction => project(x, y1 + (y2 - y1) * fraction)) },
      guide: guide ? { x1: guide.getAttribute('x1'), x2: guide.getAttribute('x2'), y1: guide.getAttribute('y1'), y2: guide.getAttribute('y2') } : null,
      marker: marker ? { x: marker.getAttribute('cx'), y: marker.getAttribute('cy'), fill: getComputedStyle(marker).fill, stroke: getComputedStyle(marker).stroke } : null,
      center: center ? { x: center.getAttribute('cx'), y: center.getAttribute('cy'), fill: getComputedStyle(center).fill } : null,
      apexDash: apex ? getComputedStyle(apex).strokeDasharray : null,
      energyOutline: outline ? { color: getComputedStyle(outline).stroke, width: parseFloat(getComputedStyle(outline).strokeWidth), x: outline.getAttribute('x1'), foregroundWidth: parseFloat(cursorStyle.strokeWidth) } : null };
  }, name === 'energy');
  expect(measured.width).toBeGreaterThan(150); expect(measured.pageWidth).toBeLessThanOrEqual(measured.viewportWidth + 1);
  expect(measured.outline).toMatchObject({ width: 3, offset: 3, style: 'solid' });
  expect(contrast(measured.outline.color, measured.background)).toBeGreaterThanOrEqual(3);
  expect(measured.cursor.dash).toBe('none'); expect(contrast(measured.cursor.color, measured.background)).toBeGreaterThanOrEqual(3);
  for (const text of measured.texts) {
    expect(text.fontSize).toBeGreaterThanOrEqual(12); expect(text.left).toBeGreaterThanOrEqual(-.5);
    expect(text.top).toBeGreaterThanOrEqual(-.5); expect(text.right).toBeLessThanOrEqual(measured.width + .5);
    expect(text.bottom).toBeLessThanOrEqual(measured.height + .5); expect(contrast(text.fill, measured.background)).toBeGreaterThanOrEqual(4.5);
  }
  if (name === 'energy') {
    expect(measured.energyOutline!.width).toBeGreaterThan(measured.energyOutline!.foregroundWidth);
    expect(contrast(measured.energyOutline!.color, measured.cursor.color)).toBeGreaterThanOrEqual(3);
    await expect(page.locator('[data-physics-energy-selection-key]')).toBeVisible();
  } else {
    expect(measured.apexDash).not.toBe('none'); expect(measured.guide!.y1).toBe(measured.marker!.y); expect(measured.guide!.y2).toBe(measured.marker!.y);
    expect(Number(measured.guide!.x2)).toBeGreaterThan(Number(measured.guide!.x1));
    expect(measured.center).toMatchObject({ x: measured.marker!.x, y: measured.marker!.y });
    expect(measured.marker!.fill).toBe(measured.background); expect(measured.center!.fill).toBe(measured.cursor.color);
    await expect(page.locator(`[data-physics-graph-selection-key="${name}"]`)).toBeVisible();
  }
  mkdirSync(reports, { recursive: true });
  const buffer = await card.screenshot({ path: path.join(reports, file) }), pixels = readPng(buffer);
  const box = (await card.boundingBox())!, ratioX = pixels.width / box.width, ratioY = pixels.height / box.height;
  const witnesses = [{ point: measured.outline.point, color: measured.outline.color, kind: 'focus' },
    ...measured.cursor.witnesses.map(point => ({ point, color: measured.cursor.color, kind: 'selection' }))].map(witness => {
    const wanted = rgb(witness.color), x = Math.round(witness.point.x * ratioX), y = Math.round(witness.point.y * ratioY);
    let best = { error: Infinity, x: -1, y: -1, actual: [] as number[] };
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (x + dx < 0 || y + dy < 0 || x + dx >= pixels.width || y + dy >= pixels.height) continue;
      const actual = pixels.at(x + dx, y + dy), error = Math.max(...actual.map((channel, i) => Math.abs(channel - wanted[i])));
      if (error < best.error) best = { error, x: x + dx, y: y + dy, actual };
    }
    expect(best.error, witness.kind + ' must paint in the saved PNG').toBeLessThanOrEqual(5);
    return { ...witness, wanted, ...best };
  });
  return { file, graph: name, measured, pixels: { width: pixels.width, height: pixels.height, witnesses } };
}

test('focused graph selections have distinct solid guides, rings and readable labels across widths and themes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page);
  const original = await evidence(page), count = original.trails[0].points.length, captures: any[] = [];
  await graph(page, 'vy').focus(); await graph(page, 'vy').press('Home'); await graph(page, 'vy').press('PageUp');
  await assertSelection(page, 10);
  try {
    for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(value => (window as any).__setGraphTheme(value), theme);
      await view(page, 'motion');
      await graph(page, 'vx').focus(); await graph(page, 'vx').press('ArrowRight'); await graph(page, 'vx').press('ArrowLeft');
      await assertSelection(page, 10); await expect(graph(page, 'vx')).toBeFocused();
      await expect(graph(page, 'vx')).toHaveCSS('outline-width', '3px');
      captures.push({ width, theme, ...(await capture(page, 'vy', `motion-${theme}-${width}.png`)) });
      if (width === 320) {
        await view(page, 'energy');
        captures.push({ width, theme, ...(await capture(page, 'energy', `energy-${theme}-${width}.png`)) });
      }
      await assertSelection(page, 10);
    }
    expect(captures).toHaveLength(12); expect(await evidence(page)).toEqual(original);
    expect(count).toBeGreaterThan(80); expect(errors).toEqual([]);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    mkdirSync(reports, { recursive: true });
    writeFileSync(path.join(reports, 'graph-visual-results.json'), JSON.stringify({ captures, errors }, null, 2) + '\n');
  }
});
