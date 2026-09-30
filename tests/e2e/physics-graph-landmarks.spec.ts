import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
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
    w.__tickGraphLandmarks = () => {
      now += 1000 / 60;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any, wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100%';
    const main = document.createElement('main');
    wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div');
    main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__setGraphLandmarkTheme = (theme: string) => {
      const ctx = w.__ctx;
      ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__graphLandmarkCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__graphLandmarkCsv.push(text); return Promise.resolve(); };
  });
  await redraw(page);
}

async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({
    ...prev, physics: { ...prev.physics, ...p },
  })), patch);
  await page.waitForTimeout(40);
}

async function redraw(page: Page) {
  await page.evaluate(() => {
    (document.getElementById('physicsCanvas') as any)._physScheduleFrame();
    (window as any).__tickGraphLandmarks();
  });
}

async function launch(page: Page, drag = false, run = 1) {
  await setState(page, {
    angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: drag,
    simSpeed: 1, showGraphs: true, showEnergy: true, showFlightData: true,
  });
  await page.locator('[data-physics-launch]').click();
  await finish(page, run);
}

async function finish(page: Page, run = 1) {
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) (window as any).__tickGraphLandmarks();
    if (cv._launched) throw new Error('The graph-landmark fixture did not land');
  });
  await page.waitForFunction(n => (window as any).__toolData.physics.runLog?.length === n, run, { polling: 20 });
  await setState(page, { simSpeed: 0 });
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return { body: cv._ball, trails: cv._trails.map((trail: any) => ({
      points: [...trail], parameters: trail.parameters, apex: trail.apex, run: trail.run, modelVersion: trail.modelVersion,
    })), runLog: w.__toolData.physics.runLog, lastFlight: w.__toolData.physics.lastFlight };
  });
}

async function copyCsv(page: Page) {
  const before = await page.evaluate(() => (window as any).__graphLandmarkCsv.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__graphLandmarkCsv.length)).toBe(before + 1);
  return page.evaluate(() => (window as any).__graphLandmarkCsv.at(-1) as string);
}

function apexIndex(trail: any) {
  return trail.apex ? trail.points.findIndex((point: any) => point.t === trail.apex.tSec && point.mX === trail.apex.mX &&
    point.mY === trail.apex.mY && point.mVx === trail.apex.vx && point.mVy === 0) : -1;
}

function formatted(value: number) {
  return value !== 0 && Math.abs(value) < .01 ? value.toPrecision(3) : value.toFixed(2);
}

async function guideState(page: Page, trail: any) {
  const index = apexIndex(trail), result: string[] = [];
  if (index < 0) {
    await expect(page.locator('[data-physics-graph-apex-guide]')).toHaveCount(0);
    return result;
  }
  for (const field of ['vx', 'vy']) {
    const guide = page.locator(`[data-physics-graph-apex-guide="${field}"]`);
    await expect(guide).toHaveAttribute('data-sample-index', String(index));
    await expect(guide).toHaveAttribute('data-time', String(trail.apex.tSec));
    expect(await guide.evaluate(node => node.tagName)).toBe('line');
    const x = (await guide.getAttribute('x1'))!;
    expect(await guide.getAttribute('x2')).toBe(x);
    expect(Math.abs(Number(x) - (48 + trail.apex.tSec / (trail.points.at(-1).t || 1) * 200))).toBeLessThan(1e-8);
    result.push(x);
  }
  expect(result[0]).toBe(result[1]);
  return result;
}

async function assertSelected(page: Page, index: number) {
  await expect(page.locator('[data-physics-graph-time-slider]')).toHaveValue(String(index));
  await redraw(page);
  const result = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    const sample = cv._inspection.snapshot;
    return { sample, point: cv._inspection.trail[sample.index], marker: cv._visualInspection };
  });
  expect(result.sample).toMatchObject({ index, t: result.point.t, x: result.point.mX, y: result.point.mY,
    vx: result.point.mVx, vy: result.point.mVy });
  expect(result.marker).toMatchObject({ index, t: result.point.t });
  for (const field of ['vx', 'vy']) {
    const reading = page.locator(`[data-physics-graph-reading="${field}"]`);
    await expect(reading).toHaveAttribute('data-value', String(result.sample[field]));
    await expect(reading).toContainText(formatted(result.sample[field]));
    await expect(page.locator(`[data-physics-graph-reading-label="${field}"]`)).toContainText('Selected sample');
    const marker = page.locator(`[data-physics-graph-marker="${field}"]`);
    await expect(marker).toHaveAttribute('data-sample-index', String(index));
    await expect(marker).toHaveAttribute('data-time', String(result.point.t));
    await expect(marker).toHaveAttribute('data-value', String(result.sample[field]));
    expect(await marker.getAttribute('cx')).toBe(await page.locator(`[data-physics-graph-cursor="${field}"]`).getAttribute('x1'));
  }
  await expect(page.locator(`[data-physics-flight-table] tr[data-selected="true"] [data-physics-sample-index="${index}"]`)).toHaveCount(1);
  if (result.sample.count > 1) {
    await expect(page.locator('[data-physics-energy-cursor]')).toHaveAttribute('data-sample-index', String(index));
    await expect(page.locator('[data-physics-energy-cursor]')).toHaveAttribute('data-time', String(result.point.t));
  }
  return result.sample;
}

async function plotState(page: Page, field: string) {
  return page.locator(`[data-physics-graph="${field}"]`).evaluate(svg => ({
    indices: (svg.getAttribute('data-plotted-indices')?.match(/\d+/g) || []).map(Number),
    vertices: [...svg.querySelector('path')!.getAttribute('d')!.matchAll(/[ML](-?[\d.e+]+),(-?[\d.e+]+)/gi)]
      .map(match => ({ x: Number(match[1]), y: Number(match[2]) })),
    pathCount: svg.querySelectorAll('path').length,
    viewBox: svg.getAttribute('viewBox'),
  }));
}

test('vacuum and drag graph shortcuts select exact landmarks and retain historical launch settings', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const csv: string[] = [];
  for (const [run, drag] of [[1, false], [2, true]] as const) {
    await launch(page, drag, run);
    const before = await evidence(page), trail = before.trails[run - 1], apex = apexIndex(trail);
    expect(apex).toBeGreaterThan(0);
    csv.push(await copyCsv(page));
    await expect(page.locator('[data-physics-graph-jump][aria-pressed="true"]')).toHaveCount(0);
    for (const field of ['vx', 'vy']) {
      await expect(page.locator(`[data-physics-graph-reading="${field}"]`)).toHaveAttribute('data-value', String(trail.points.at(-1)[field === 'vx' ? 'mVx' : 'mVy']));
      await expect(page.locator(`[data-physics-graph-reading-label="${field}"]`)).toContainText('Ground impact');
      const endpoints = page.locator(`[data-physics-graph="${field}"]`).locator('..').locator('.phys-graph-endpoints dt');
      await expect(endpoints).toHaveText(['Launch point', 'Ground impact']);
    }
    const guide = await guideState(page, trail);
    for (const [jump, index] of [['launch', 0], ['apex', apex], ['impact', trail.points.length - 1]] as const) {
      const button = page.locator(`[data-physics-graph-jump="${jump}"]`);
      await expect(button).toHaveAttribute('data-sample-index', String(index));
      await expect(button).toHaveAttribute('data-time', String(trail.points[index].t));
      await expect(button).toContainText(trail.points[index].t.toFixed(3) + ' s');
      await button.focus(); await button.press(jump === 'apex' ? 'Space' : 'Enter');
      const selected = await assertSelected(page, index);
      await expect(button).toBeFocused();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-physics-graph-jump][aria-pressed="true"]')).toHaveCount(1);
      if (jump === 'apex') expect(selected).toMatchObject({ apex: true, phase: 'apex', vy: 0, ay: -9.8 });
      expect(await guideState(page, trail)).toEqual(guide);
    }
    expect(await evidence(page)).toEqual(before);
    expect(await copyCsv(page)).toBe(csv[run - 1]);
  }
  const before = await evidence(page);
  await setState(page, { angle: 80, velocity: 5, gravity: 25, mass: 9, launchHeight: 30, airResist: false });
  for (const [run, drag] of [[1, false], [2, true]] as const) {
    await page.locator('[data-physics-history-select]').selectOption(String(run - 1));
    await page.locator('[data-physics-graph-jump="apex"]').click();
    const selected = await assertSelected(page, apexIndex(before.trails[run - 1]));
    expect(selected.parameters).toMatchObject({ angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: drag });
    await expect(page.locator('[data-physics-graph-flight]')).toHaveAttribute('data-physics-graph-flight', String(run));
    for (const [setting, value] of [['angle', 35], ['velocity', 35], ['gravity', 9.8], ['mass', 2], ['launchHeight', 10]] as const) {
      await expect(page.locator(`[data-physics-graph-setting="${setting}"]`)).toContainText(String(value));
    }
    expect(await copyCsv(page)).toBe(csv[run - 1]);
    await guideState(page, before.trails[run - 1]);
  }
  expect(await evidence(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('the representative path and table retain exact apex and arbitrary selected records, and table reveal restores focus repeatedly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page); await launch(page, true);
  await page.evaluate(() => {
    const w = window as any, original = Element.prototype.scrollIntoView;
    w.__graphDataScroll = [];
    Element.prototype.scrollIntoView = function(options?: boolean | ScrollIntoViewOptions) {
      if (this.matches('[data-physics-flight-data]')) w.__graphDataScroll.push(options);
      original.call(this, options);
    };
  });
  const before = await evidence(page), trail = before.trails[0], apex = apexIndex(trail), csv = await copyCsv(page);
  expect(trail.points.length).toBeGreaterThan(80);
  await expect(page.locator(`[data-physics-flight-table] [data-physics-sample-index="${apex}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-physics-flight-table] [data-physics-sample-index="${apex}"] [data-physics-table-moment]`)).toHaveText('Apex');
  expect(await page.locator('[data-physics-flight-table] [data-physics-sample-index]').count()).toBeLessThanOrEqual(12);
  const first = await plotState(page, 'vx');
  expect(first.viewBox).toBe('0 0 260 210');
  expect(first.pathCount).toBe(1); expect(first.indices).toContain(apex);
  expect(first.indices.length).toBeLessThanOrEqual(81); expect(first.vertices).toHaveLength(first.indices.length);
  const unplotted = trail.points.findIndex((_: any, index: number) => index > trail.points.length / 3 && !first.indices.includes(index));
  expect(unplotted).toBeGreaterThan(0);
  const graph = page.locator('[data-physics-graph="vx"]');
  await graph.scrollIntoViewIfNeeded();
  const box = (await graph.boundingBox())!;
  await graph.click({ position: { x: (48 + 200 * trail.points[unplotted].t / trail.points.at(-1).t) / 260 * box.width, y: 90 / 210 * box.height } });
  await assertSelected(page, unplotted);
  for (const field of ['vx', 'vy']) {
    const plotted = await plotState(page, field);
    expect(plotted.pathCount).toBe(1); expect(plotted.indices).toContain(apex); expect(plotted.indices).toContain(unplotted);
    expect(plotted.indices.length).toBeLessThanOrEqual(82); expect(plotted.vertices).toHaveLength(plotted.indices.length);
    expect(new Set(plotted.indices).size).toBe(plotted.indices.length);
    if (field === 'vy') expect(plotted.vertices[plotted.indices.indexOf(apex)].y).toBe(88);
    const vertex = plotted.vertices[plotted.indices.indexOf(unplotted)];
    const marker = page.locator(`[data-physics-graph-marker="${field}"]`);
    expect(Math.abs(vertex.x - Number(await marker.getAttribute('cx')))).toBeLessThanOrEqual(.051);
    expect(Math.abs(vertex.y - Number(await marker.getAttribute('cy')))).toBeLessThanOrEqual(.051);
  }
  await expect(page.locator(`[data-physics-flight-table] [data-physics-sample-index="${apex}"]`)).toHaveCount(1);
  expect(await page.locator('[data-physics-flight-table] [data-physics-sample-index]').count()).toBeLessThanOrEqual(13);
  for (let attempt = 0; attempt < 2; attempt++) {
    await setState(page, { showFlightData: false });
    await expect(page.locator('[data-physics-flight-data]')).toHaveCount(0);
    const open = page.locator('[data-physics-graph-open-data]');
    await open.focus(); await open.press('Enter');
    const table = page.locator('[data-physics-flight-data]');
    await expect(table).toBeVisible(); await expect(table).toHaveAttribute('tabindex', '-1'); await expect(table).toBeFocused();
    expect(await page.evaluate(() => {
      const rect = document.querySelector('[data-physics-flight-data]')!.getBoundingClientRect(); return rect.top < innerHeight && rect.bottom > 0;
    })).toBe(true);
    await assertSelected(page, unplotted);
  }
  expect(await page.evaluate(() => (window as any).__graphDataScroll)).toEqual([
    { behavior: 'auto', block: 'start' }, { behavior: 'auto', block: 'start' },
  ]);
  expect(await evidence(page)).toEqual(before); expect(await copyCsv(page)).toBe(csv);
});

test('single and unfinished flights expose actual latest values, including a tiny nonzero vertical velocity', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
    simSpeed: 0, showGraphs: true, showEnergy: true, showFlightData: false });
  await page.locator('[data-physics-launch]').click(); await redraw(page);
  await expect(page.locator('[data-physics-graph-time-slider]')).toBeDisabled();
  await expect(page.locator('[data-physics-graph-jump="impact"],[data-physics-graph-jump="apex"]')).toHaveCount(0);
  await expect(page.locator('[data-physics-graph-jump="latest"]')).toHaveAttribute('data-time', '0');
  await expect(page.locator('[data-physics-graph-jump][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('[data-physics-graph-reading="vx"]')).toHaveAttribute('data-value', '15');
  await expect(page.locator('[data-physics-graph-reading="vy"]')).toHaveAttribute('data-value', '0');
  for (const field of ['vx', 'vy']) {
    const plotted = await plotState(page, field); expect(plotted.indices).toEqual([0]); expect(plotted.vertices).toHaveLength(1);
  }
  await page.locator('[data-physics-graph-jump="launch"]').click();
  expect((await assertSelected(page, 0)).phase).toBe('level');
  await page.locator('[data-physics-step]').click(); await redraw(page);
  const stepped = (await evidence(page)).trails[0];
  expect(stepped.points).toHaveLength(2); expect(apexIndex(stepped)).toBe(0);
  await guideState(page, stepped);
  await expect(page.locator('[data-physics-graph-jump="impact"]')).toHaveCount(0);
  await page.locator('[data-physics-graph-jump="latest"]').click();
  expect((await assertSelected(page, 1)).phase).toBe('falling');

  await setState(page, { angle: 30, velocity: 7, gravity: 9.999999, launchHeight: 10, simSpeed: 0 });
  await page.locator('[data-physics-launch]').click(); await redraw(page);
  for (let step = 0; step < 10; step++) { await page.locator('[data-physics-step]').click(); await redraw(page); }
  const before = await evidence(page), trail = before.trails.at(-1), latest = trail.points.at(-1);
  expect(latest.t).toBeCloseTo(.35, 10); expect(latest.mVy).toBeGreaterThan(0); expect(latest.mVy).toBeLessThan(.000001);
  await expect(page.locator('[data-physics-graph-reading="vy"]')).toHaveAttribute('data-value', String(latest.mVy));
  await expect(page.locator('[data-physics-graph-reading="vy"]')).toContainText(latest.mVy.toPrecision(3));
  expect(latest.mVy.toPrecision(3)).toMatch(/e-/);
  await expect(page.locator('[data-physics-graph-apex-guide],[data-physics-graph-jump="apex"],[data-physics-graph-jump="impact"]')).toHaveCount(0);
  await expect(page.locator('[data-physics-graph-flight]')).toHaveAttribute('data-physics-graph-flight', 'unfinished');
  await page.locator('[data-physics-graph-jump="latest"]').click();
  expect((await assertSelected(page, trail.points.length - 1)).phase).toBe('rising');
  expect(await evidence(page)).toEqual(before);
});

test('legacy metadata-only apex keeps the highest sample fallback without inventing a guide or observation', async ({ page }) => {
  await mount(page); await launch(page, true);
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, original = cv._trails[0];
    const legacy = original.filter((point: any) => point.t !== original.apex.tSec);
    Object.keys(original).filter(key => !/^\d+$/.test(key)).forEach(key => { (legacy as any)[key] = original[key]; });
    cv._trails[0] = legacy; (window as any).__rerender();
  });
  const before = await evidence(page), trail = before.trails[0], csv = await copyCsv(page);
  expect(apexIndex(trail)).toBe(-1);
  const highest = trail.points.reduce((best: number, point: any, index: number) => point.mY > trail.points[best].mY ? index : best, 0);
  await expect(page.locator('[data-physics-graph-jump="apex"],[data-physics-graph-apex-guide]')).toHaveCount(0);
  const button = page.locator('[data-physics-graph-jump="highest"]');
  await expect(button).toHaveAttribute('data-sample-index', String(highest));
  await button.focus(); await button.press('Enter');
  expect((await assertSelected(page, highest)).apex).toBe(false); await expect(button).toBeFocused();
  await guideState(page, trail);
  expect(await evidence(page)).toEqual(before); expect(await copyCsv(page)).toBe(csv);
});

test('graph landmarks, readings, and data reveal stay readable and usable in nine width and theme layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page, true);
  await page.locator('[data-physics-graph-jump="apex"]').click();
  const before = await evidence(page), trail = before.trails[0];
  for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(t => (window as any).__setGraphLandmarkTheme(t), theme);
    await page.waitForTimeout(40); await redraw(page);
    const result = await page.locator('[data-physics-motion-panel]').evaluate(panel => {
      const rgb = (color: string) => {
        const match = color.match(/^rgba?\(([^)]+)\)$/); if (!match) throw Error('Unresolved graph color: ' + color);
        return match[1].split(',').map(Number);
      };
      const lum = (color: string) => rgb(color).slice(0, 3).map(value => {
        const unit = value / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const text: Array<{ content: string; font: number; contrast: number }> = [], walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const element = node.parentElement!;
        if (!node.textContent?.trim() || !element.getClientRects().length || element.closest('.sr-only,svg')) continue;
        let background: string | null = null;
        for (let parent: Element | null = element; parent; parent = parent.parentElement) {
          const color = getComputedStyle(parent).backgroundColor, channels = rgb(color);
          if (channels.length === 3 || channels[3] >= .99) { background = color; break; }
        }
        if (!background) throw Error('Graph text has no resolved surface');
        const style = getComputedStyle(element), ink = lum(style.color), surface = lum(background);
        text.push({ content: node.textContent.trim(), font: parseFloat(style.fontSize), contrast: (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05) });
      }
      const rect = panel.getBoundingClientRect();
      return {
        width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
        panel: { left: rect.left, right: rect.right }, text,
        targets: [...panel.querySelectorAll('[data-physics-graph-jump],[data-physics-graph-time-slider],[data-physics-graph-open-data]')].map(node => {
          const box = node.getBoundingClientRect(); return { width: box.width, height: box.height, left: box.left, right: box.right };
        }),
        svgFonts: [...panel.querySelectorAll<SVGTextElement>('[data-physics-component-graphs] text')].map(node => {
          const matrix = node.getScreenCTM(); return parseFloat(getComputedStyle(node).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0);
        }),
      };
    });
    const context = width + 'px ' + theme;
    expect(result.scroll, context + ' overflow').toBeLessThanOrEqual(result.width + 1);
    for (const box of [result.panel, ...result.targets]) {
      expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(result.width + 1);
    }
    expect(result.targets).toHaveLength(5);
    for (const target of result.targets) { expect(target.width, context).toBeGreaterThanOrEqual(44); expect(target.height, context).toBeGreaterThanOrEqual(44); }
    expect(result.text.length).toBeGreaterThan(20);
    for (const reading of result.text) {
      expect(reading.font, context + ': ' + reading.content).toBeGreaterThanOrEqual(12);
      expect(reading.contrast, context + ': ' + reading.content).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
    }
    expect(result.svgFonts.length).toBeGreaterThan(5);
    for (const size of result.svgFonts) expect(size, context + ' SVG font').toBeGreaterThanOrEqual(11.99);
    const button = page.locator('[data-physics-graph-jump="apex"]');
    await button.focus(); await button.press('Enter'); await expect(button).toBeFocused();
    await assertSelected(page, apexIndex(trail)); await guideState(page, trail);
  }
  expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
});
