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
    w.__tickSamplePhysics = (ms: number) => {
      now += ms;
      const pending = [...frames.values()]; frames.clear();
      pending.forEach(fn => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any;
    w.__sampleCsvCopies = [];
    w.StemLab.writeClipboard = (text: string) => {
      w.__sampleCsvCopies.push(text);
      return Promise.resolve();
    };
  });
}

async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({
    ...prev, physics: { ...prev.physics, ...p },
  })), patch);
  await page.waitForTimeout(40);
}

async function redraw(page: Page) {
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    cv._physScheduleFrame();
    (window as any).__tickSamplePhysics(1000 / 60);
  });
}

async function finish(page: Page) {
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) w.__tickSamplePhysics(1000 / 60);
    if (cv._launched) throw new Error('The sample-inspection fixture did not land');
  });
  await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return {
      ball: cv._ball,
      trails: cv._trails.map((trail: any) => ({
        points: [...trail], parameters: trail.parameters,
        run: trail.run, modelVersion: trail.modelVersion,
      })),
      records: w.__toolData.physics.runLog,
      lastFlight: w.__toolData.physics.lastFlight,
    };
  });
}

async function copyCsv(page: Page) {
  const before = await page.evaluate(() => (window as any).__sampleCsvCopies.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__sampleCsvCopies.length)).toBe(before + 1);
  return page.evaluate(() => (window as any).__sampleCsvCopies.at(-1) as string);
}

async function assertSelected(page: Page, index: number) {
  await expect(page.locator('[data-physics-sample-slider]')).toHaveValue(String(index));
  await redraw(page);
  const result = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    const sample = cv._inspection.snapshot;
    const recorded = cv._trails.at(-1)[sample.index];
    return {
      sample, recorded, view: cv._launchView, canvasMarker: cv._visualInspection,
      graphs: ['vx', 'vy'].map(field => {
        const marker = document.querySelector(`[data-physics-graph-marker="${field}"]`)!;
        const cursor = document.querySelector(`[data-physics-graph-cursor="${field}"]`)!;
        return {
          field, index: Number(marker.getAttribute('data-sample-index')),
          time: Number(marker.getAttribute('data-time')), value: Number(marker.getAttribute('data-value')),
          x: Number(marker.getAttribute('cx')), y: Number(marker.getAttribute('cy')),
          cursorX: Number(cursor.getAttribute('x1')),
        };
      }),
    };
  });
  expect(result.sample.index).toBe(index);
  expect(result.sample).toMatchObject({
    t: result.recorded.t, x: result.recorded.mX, y: result.recorded.mY,
    vx: result.recorded.mVx, vy: result.recorded.mVy,
  });
  for (const graph of result.graphs) {
    expect(graph.index).toBe(index);
    expect(graph.time).toBe(result.recorded.t);
    expect(graph.value).toBe(graph.field === 'vx' ? result.recorded.mVx : result.recorded.mVy);
    expect(graph.x).toBe(graph.cursorX);
    expect(Number.isFinite(graph.y)).toBe(true);
    await expect(page.locator(`[data-physics-graph-selected="${graph.field}"]`)).toContainText(result.recorded.t.toFixed(3) + ' s');
  }
  expect(result.graphs[0].x).toBe(result.graphs[1].x);
  expect(result.canvasMarker).toMatchObject({ index, t: result.recorded.t });
  expect(result.canvasMarker.x).toBeCloseTo(result.view.x + result.recorded.mX * result.view.scale, 8);
  expect(result.canvasMarker.y).toBeCloseTo(result.view.groundY - result.recorded.mY * result.view.scale, 8);
  const inspector = page.locator('[data-physics-sample-inspector]');
  for (const [key, unit] of [['x', 'm'], ['y', 'm'], ['vx', 'm/s'], ['vy', 'm/s']] as const) {
    await expect(inspector.locator(`[data-physics-measurement="${key}"] dd`)).toHaveText(result.sample[key].toFixed(2) + ' ' + unit);
  }
  return result;
}

async function expectSelectionCleared(page: Page) {
  await expect(page.locator('[data-physics-sample-inspector]')).toHaveCount(0);
  await expect(page.locator('[data-physics-graph-marker]')).toHaveCount(0);
  await redraw(page);
  expect(await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    return { selection: cv._inspection, marker: cv._visualInspection };
  })).toEqual({ selection: null, marker: null });
}

test('table and keyboard selection synchronize recorded views without changing flight evidence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await setState(page, {
    angle: 35, velocity: 30, gravity: 9.8, launchHeight: 12, mass: 2,
    airResist: true, simSpeed: 1, showFlightData: true, showGraphs: true,
  });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await finish(page);
  const before = await evidence(page);
  const points = before.trails[0].points;
  expect(points.length).toBeGreaterThan(80);
  const csv = await copyCsv(page);
  const table = page.locator('[data-physics-flight-table]');
  await expect(table.locator('[data-physics-sample-index="0"]')).toHaveCount(1);
  await expect(table.locator(`[data-physics-sample-index="${points.length - 1}"]`)).toHaveCount(1);
  const headings = await table.locator('th').allTextContents();
  expect(headings.filter(text => text.includes('m/s'))).toHaveLength(3);

  const tablePoint = table.locator('[data-physics-sample-index]').nth(3);
  const tableIndex = Number(await tablePoint.getAttribute('data-physics-sample-index'));
  await tablePoint.click();
  await assertSelected(page, tableIndex);
  await expect(table.locator(`tr[data-selected="true"] [data-physics-sample-index="${tableIndex}"]`)).toHaveCount(1);

  const slider = page.locator('[data-physics-sample-slider]');
  await slider.focus();
  await slider.press('Home');
  await assertSelected(page, 0);
  await expect(page.locator('[data-physics-sample-prev]')).toBeDisabled();
  await slider.press('ArrowRight');
  const selected = await assertSelected(page, 1);
  await expect(table.locator('tr[data-selected="true"] [data-physics-sample-index="1"]')).toHaveCount(1);
  await expect(slider).toHaveAttribute('aria-valuetext', new RegExp('t = ' + selected.sample.t.toFixed(3).replace('.', '\\.') + ' s'));
  await page.locator('[data-physics-sample-next]').click();
  await assertSelected(page, 2);
  await page.locator('[data-physics-sample-prev]').click();
  await assertSelected(page, 1);

  await setState(page, { angle: 80, velocity: 5, gravity: 1, launchHeight: 0, mass: 9, airResist: false });
  const retained = await assertSelected(page, 1);
  expect(retained.sample.parameters).toMatchObject({
    angle: 35, velocity: 30, gravity: 9.8, launchHeight: 12, mass: 2,
    airResist: true, modelVersion: 'projectile-v3',
  });
  await expect(page.locator('[data-physics-sample-inspector]')).toContainText('h₀ = 12 m');
  await expect(page.locator('[data-physics-graph="range"]')).toHaveAttribute('data-launch-height', '0');

  await page.locator('[data-physics-sample-jump="highest"]').click();
  const highest = points.reduce((best: number, point: any, i: number) => point.mY > points[best].mY ? i : best, 0);
  await assertSelected(page, highest);
  await page.locator('[data-physics-sample-jump="latest"]').click();
  await assertSelected(page, points.length - 1);
  await expect(page.locator('[data-physics-sample-next]')).toBeDisabled();
  await expect(page.locator('[data-physics-sample-inspector]')).toContainText('Ground impact');
  expect(await evidence(page)).toEqual(before);
  expect(await copyCsv(page)).toBe(csv);
  expect(errors).toEqual([]);
});

test('launch, clear, resume, and single-step dismiss historical selection', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 30, velocity: 25, launchHeight: 10, simSpeed: 0 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.locator('[data-physics-inspect]').click();
  await assertSelected(page, 0);
  await page.locator('[data-physics-sample-close]').click();
  await expectSelectionCleared(page);
  await expect(page.locator('[data-physics-inspect]')).toBeFocused();
  await page.locator('[data-physics-inspect]').press('Enter');
  await assertSelected(page, 0);
  await page.locator('[data-physics-step]').click();
  await expectSelectionCleared(page);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._ball.t)).toBeGreaterThan(0);

  await page.locator('[data-physics-inspect]').click();
  await expect(page.locator('[data-physics-sample-inspector]')).toBeVisible();
  await page.locator('[data-physics-playback-rate="1"]').click();
  await expectSelectionCleared(page);
  await page.locator('[data-physics-playback-rate="0"]').click();
  await page.locator('[data-physics-inspect]').click();
  await expect(page.locator('[data-physics-sample-inspector]')).toBeVisible();
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await expectSelectionCleared(page);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._trails.at(-1).length)).toBe(1);

  await page.locator('[data-physics-inspect]').click();
  await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click();
  await expectSelectionCleared(page);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._trails.length)).toBe(0);
});

test('the sole launch sample displays horizontal velocity and gravitational energy', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 0, velocity: 15, gravity: 9.8, launchHeight: 10, mass: 2, airResist: false, simSpeed: 0 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await redraw(page);
  await page.locator('[data-physics-inspect]').click();
  const selected = await assertSelected(page, 0);
  expect(selected.sample).toMatchObject({ count: 1, t: 0, x: 0, y: 10, vx: 15, vy: 0 });
  expect(selected.sample.pe).toBeCloseTo(196, 10);
  expect(selected.sample.ke).toBeCloseTo(225, 10);
  expect(selected.sample.initialEnergy).toBeCloseTo(421, 10);
  await expect(page.locator('[data-physics-measurement="pe"] dd')).toHaveText('196.00 J');
  await expect(page.locator('[data-physics-sample-slider]')).toBeDisabled();
  await expect(page.locator('[data-physics-sample-prev]')).toBeDisabled();
  await expect(page.locator('[data-physics-sample-next]')).toBeDisabled();
  await expect(page.locator('[data-physics-flight-table] [data-physics-sample-index]')).toHaveCount(1);
  await expect(page.locator('[data-physics-graph]')).toHaveCount(3);
  for (const field of ['vx', 'vy']) {
    const curve = page.locator(`[data-physics-graph="${field}"] path`);
    await expect(curve).toHaveCount(1);
    expect(await curve.getAttribute('d')).not.toContain('L');
  }
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._ball.t)).toBe(0);
});

test('sample inspection remains readable without page overflow at 320px in all themes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page);
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100%';
    const main = document.createElement('main');
    wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div');
    main.insertBefore(card, wrap); card.appendChild(wrap);
    (window as any).__setSampleTheme = (theme: string) => {
      const ctx = (window as any).__ctx;
      ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      (window as any).__rerender();
    };
  });
  await setState(page, { angle: 35, velocity: 25, gravity: 9.8, launchHeight: 12, mass: 2, airResist: true, showFlightData: true });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await finish(page);
  await page.locator('[data-physics-flight-table] [data-physics-sample-index]').nth(2).click();
  await page.locator('[data-physics-sample-forces] summary').click();

  for (const theme of ['default', 'dark', 'contrast']) {
    await page.evaluate(t => (window as any).__setSampleTheme(t), theme);
    await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
    await redraw(page);
    const layout = await page.evaluate(() => {
      const panel = document.querySelector('[data-physics-sample-inspector]')!;
      const rect = panel.getBoundingClientRect();
      const texts = [...panel.querySelectorAll<HTMLElement>('dt,dd,label,summary,h3,h4')].filter(node => node.getClientRects().length > 0);
      const rgb = (value: string) => {
        const match = value.match(/^rgba?\(([^)]+)\)$/);
        if (!match) throw new Error('Cannot resolve inspector color: ' + value);
        return match[1].split(',').map(Number);
      };
      const luminance = (channels: number[]) => {
        const linear = channels.slice(0, 3).map(value => {
          const unit = value / 255;
          return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
        });
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      };
      const contrasts = texts.map(node => {
        let ancestor: Element | null = node;
        let background: number[] | null = null;
        while (ancestor) {
          const paint = rgb(getComputedStyle(ancestor).backgroundColor);
          if (paint.length === 3 || paint[3] >= 0.99) { background = paint; break; }
          ancestor = ancestor.parentElement;
        }
        if (!background) throw new Error('Inspector text has no resolved surface');
        const foreground = luminance(rgb(getComputedStyle(node).color));
        const surface = luminance(background);
        return { text: node.textContent, ratio: (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05) };
      });
      const graphFonts = [...document.querySelectorAll<SVGTextElement>('[data-physics-component-graphs] text')].map(node => {
        const matrix = node.getScreenCTM();
        return parseFloat(getComputedStyle(node).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0);
      });
      return {
        width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
        panel: { left: rect.left, right: rect.right },
        textSizes: texts.map(node => parseFloat(getComputedStyle(node).fontSize)),
        contrasts,
        graphFonts,
        tableWrap: document.querySelector('[data-physics-flight-table-wrap]')!.getBoundingClientRect().width,
      };
    });
    expect(layout.scroll, theme + ' page overflow').toBeLessThanOrEqual(layout.width + 1);
    expect(layout.panel.left).toBeGreaterThanOrEqual(0);
    expect(layout.panel.right).toBeLessThanOrEqual(layout.width + 1);
    expect(layout.textSizes.length).toBeGreaterThan(20);
    for (const size of layout.textSizes) expect(size, theme + ' inspector text').toBeGreaterThanOrEqual(12);
    for (const mark of layout.contrasts) expect(mark.ratio, theme + ': ' + mark.text).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
    expect(layout.graphFonts.length).toBeGreaterThan(5);
    for (const size of layout.graphFonts) expect(size, theme + ' graph text').toBeGreaterThanOrEqual(11.99);
    expect(layout.tableWrap).toBeLessThan(layout.width);
  }
  expect(errors).toEqual([]);
});


test('graph time control selects full-resolution records and keeps keyboard focus', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true, simSpeed: 1, showGraphs: true, showFlightData: true });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await finish(page);
  const before = await evidence(page), csv = await copyCsv(page);
  const slider = page.locator('[data-physics-graph-time-slider]');
  await expect(slider).toBeEnabled();
  await slider.focus();
  await slider.press('Home');
  await assertSelected(page, 0);
  await expect(slider).toBeFocused();
  await slider.press('ArrowRight');
  await slider.press('ArrowRight');
  await assertSelected(page, 2);
  await expect(slider).toHaveAttribute('aria-valuetext', /sample 3 /);
  await expect(slider).toBeFocused();
  await slider.press('End');
  const last = before.trails.at(-1).points.length - 1;
  await assertSelected(page, last);
  await expect(page.locator('[data-physics-impact-note]')).toBeVisible();
  await setState(page, { angle: 80, velocity: 50, gravity: 25, mass: 9, launchHeight: 50, airResist: false });
  await slider.press('ArrowLeft');
  await assertSelected(page, last - 1);
  await expect(slider).toBeFocused();
  expect(await evidence(page)).toEqual(before);
  expect(await copyCsv(page)).toBe(csv);
});

test('tapping either scaled graph chooses the nearest actual observation, including impact', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  await setState(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true, simSpeed: 1, showGraphs: true, showFlightData: true });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await finish(page);
  const before = await evidence(page), points = before.trails.at(-1).points;
  expect(points.length).toBeGreaterThan(80);
  const plotted = new Set(Array.from({ length: 80 }, (_, i) => Math.floor(i / 79 * (points.length - 1))));
  const unplotted = points.findIndex((_: unknown, i: number) => i > points.length / 3 && !plotted.has(i));
  expect(unplotted).toBeGreaterThan(0);
  for (const [field, index] of [['vx', unplotted], ['vy', points.length - 1], ['vx', 0]] as const) {
    const graph = page.locator('[data-physics-graph="' + field + '"]');
    await graph.scrollIntoViewIfNeeded();
    const box = (await graph.boundingBox())!;
    const fraction = points[index].t / points.at(-1).t;
    await graph.click({ position: { x: (48 + 200 * fraction) / 260 * box.width, y: 90 / 210 * box.height } });
    await assertSelected(page, index);
    await expect(page.locator('[data-physics-graph-time-value]')).toHaveText('t = ' + points[index].t.toFixed(3) + ' s');
  }
  // The last interval is shorter than a full tick: selection uses actual time.
  expect(points.at(-1).t - points.at(-2).t).toBeLessThan(.035);
  expect(await evidence(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('a paused launch exposes its sole graph sample before any simulation step', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, simSpeed: 0, showGraphs: true, showEnergy: true });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await expect(page.locator('[data-physics-component-graphs] [data-physics-graph]')).toHaveCount(2);
  await expect(page.locator('[data-physics-graph-time-slider]')).toBeDisabled();
  await expect(page.locator('[data-physics-graph-time-value]')).toHaveText('t = 0.000 s');
  const before = await evidence(page);
  await page.locator('[data-physics-graph-inspect]').click();
  const result = await assertSelected(page, 0);
  expect(result.sample).toMatchObject({ t: 0, vx: 15, vy: 0, y: 10, ke: 225, pe: 196 });
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-physics-step]').click();
  await redraw(page);
  await expect(page.locator('[data-physics-graph-time-slider]')).toBeEnabled();
  await expect(page.locator('[data-physics-graph-marker]')).toHaveCount(0);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._ball.t)).toBeCloseTo(.035, 10);
});
