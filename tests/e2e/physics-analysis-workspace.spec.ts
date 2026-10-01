import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
const views = ['motion', 'forces', 'energy', 'data'] as const;
type View = typeof views[number];

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
    w.__tickAnalysis = () => {
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
    w.__setAnalysisTheme = (theme: string) => {
      const ctx = w.__ctx;
      ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__analysisCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__analysisCsv.push(text); return Promise.resolve(); };
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
    (window as any).__tickAnalysis();
  });
}

async function launch(page: Page, drag = false, run = 1, patch: object = {}) {
  await setState(page, {
    angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: drag,
    simSpeed: 1, showGraphs: true, showEnergy: true, showFlightData: true, ...patch,
  });
  await page.locator('[data-physics-launch]').click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) (window as any).__tickAnalysis();
    if (cv._launched) throw new Error('The analysis-workspace fixture did not land');
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

async function selected(page: Page) {
  return page.evaluate(() => (document.getElementById('physicsCanvas') as any)._inspection?.snapshot || null);
}

async function assertView(page: Page, active: View) {
  const workspace = page.locator('[data-physics-analysis-workspace]');
  await expect(workspace).toHaveCount(1); await expect(workspace).toBeVisible();
  const tablist = workspace.getByRole('tablist', { name: 'Flight analysis views', exact: true });
  await expect(tablist).toHaveCount(1); await expect(tablist.getByRole('tab')).toHaveCount(4);
  await expect(workspace.locator('[data-physics-analysis-panel]')).toHaveCount(4);
  for (const view of views) {
    const tab = workspace.locator(`[data-physics-analysis-tab="${view}"]`);
    const panel = workspace.locator(`[data-physics-analysis-panel="${view}"]`);
    await expect(tab).toHaveAttribute('role', 'tab');
    await expect(tab).toHaveAttribute('aria-selected', String(view === active));
    await expect(tab).toHaveAttribute('tabindex', view === active ? '0' : '-1');
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    await expect(panel).toHaveAttribute('id', (await tab.getAttribute('aria-controls'))!);
    await expect(panel).toHaveAttribute('aria-labelledby', (await tab.getAttribute('id'))!);
    await expect(panel).toHaveJSProperty('hidden', view !== active);
    if (view === active) await expect(panel).toBeVisible(); else await expect(panel).toBeHidden();
  }
  if (active === 'forces') await expect(workspace.locator('[data-physics-sample-forces]')).toHaveJSProperty('open', true);
}

async function selectView(page: Page, view: View) {
  await page.locator(`[data-physics-analysis-tab="${view}"]`).click();
  await assertView(page, view);
}

async function copyCsv(page: Page) {
  const active = (await page.locator('[data-physics-analysis-tab][aria-selected="true"]').getAttribute('data-physics-analysis-tab')) as View;
  await selectView(page, 'data');
  const before = await page.evaluate(() => (window as any).__analysisCsv.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__analysisCsv.length)).toBe(before + 1);
  const csv = await page.evaluate(() => (window as any).__analysisCsv.at(-1) as string);
  await selectView(page, active);
  return csv;
}

async function pinIdentity(page: Page) {
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__analysisIdentity = { canvas: cv, launch: cv._launch, body: cv._ball,
      trails: cv._trails, recorded: [...cv._trails],
      panels: [...document.querySelectorAll('[data-physics-analysis-panel]')] };
  });
}

async function assertIdentity(page: Page) {
  expect(await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, pinned = (window as any).__analysisIdentity;
    return cv === pinned.canvas && cv._launch === pinned.launch && cv._ball === pinned.body &&
      cv._trails === pinned.trails && pinned.recorded.every((trail: any, index: number) => trail === cv._trails[index]) &&
      pinned.panels.every((node: Element, index: number) => node === document.querySelectorAll('[data-physics-analysis-panel]')[index]);
  })).toBe(true);
}

async function assertSelection(page: Page, expected: any) {
  expect(await selected(page)).toEqual(expected);
  const phase = page.locator('[data-physics-analysis-phase]');
  await expect(phase).toHaveCount(1); await expect(phase).toBeVisible();
  await expect(phase).toHaveAttribute('data-physics-analysis-phase', expected.phase);
  const labels: Record<string, string> = { rising: 'Rising', falling: 'Falling', impact: 'Ground impact',
    level: 'Vertical velocity is zero', apex: expected.t === 0 ? 'Highest point at release' : 'At apex' };
  await expect(phase).toHaveText(labels[expected.phase]);
  await expect(page.locator('[data-physics-sample-slider]')).toHaveCount(1);
  await expect(page.locator('[data-physics-graph-time-slider]')).toHaveCount(1);
  await expect(page.locator('[data-physics-sample-slider]')).toHaveAttribute('data-physics-graph-time-slider');
  await expect(page.locator('[data-physics-sample-slider]')).toHaveValue(String(expected.index));
  for (const field of ['vx', 'vy']) {
    await expect(page.locator(`[data-physics-graph-marker="${field}"]`)).toHaveAttribute('data-sample-index', String(expected.index));
    await expect(page.locator(`[data-physics-graph-marker="${field}"]`)).toHaveAttribute('data-time', String(expected.t));
  }
  await expect(page.locator(`[data-physics-flight-table] tr[data-selected="true"] [data-physics-sample-index="${expected.index}"]`)).toHaveCount(1);
}

test('analysis tabs automatically activate with arrows, Home, and End while preserving persistent panels and exact selection', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page);
  await page.locator('[data-physics-inspect]').click();
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const sample = await selected(page), before = await evidence(page);
  expect(sample).toMatchObject({ phase: 'apex', vy: 0, ay: -9.8 });
  await assertView(page, 'motion'); await pinIdentity(page);
  await page.locator('[data-physics-analysis-tab="motion"]').focus();
  for (const [key, view] of [
    ['ArrowRight', 'forces'], ['ArrowRight', 'energy'], ['ArrowRight', 'data'],
    ['ArrowRight', 'motion'], ['ArrowLeft', 'data'], ['Home', 'motion'], ['End', 'data'], ['ArrowLeft', 'energy'],
  ] as const) {
    await page.locator('[data-physics-analysis-tab][aria-selected="true"]').press(key);
    await assertView(page, view);
    await expect(page.locator(`[data-physics-analysis-tab="${view}"]`)).toBeFocused();
    await assertSelection(page, sample); await assertIdentity(page);
  }
  expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
});

test('view changes retain an older run, its captured force settings, synchronized readings, and unchanged flight CSV', async ({ page }) => {
  await mount(page); await launch(page, true);
  const originalCsv = await copyCsv(page);
  await launch(page, false, 2, { angle: 50, velocity: 20, mass: 4, gravity: 1.62, launchHeight: 25 });
  await setState(page, { angle: 80, velocity: 5, gravity: 25, mass: 9, launchHeight: 30, airResist: false });
  expect(await selected(page)).toBeNull();
  const history = page.locator('[data-physics-history-select]');
  await page.evaluate(() => {
    (window as any).__analysisHistoryNode = document.querySelector('[data-physics-history-select]');
    (window as any).__analysisWorkspaceNode = document.querySelector('[data-physics-analysis-workspace]');
  });
  await history.focus(); await history.selectOption('0');
  await expect(history).toBeFocused();
  expect(await page.evaluate(() => (window as any).__analysisHistoryNode === document.querySelector('[data-physics-history-select]') &&
    (window as any).__analysisWorkspaceNode === document.querySelector('[data-physics-analysis-workspace]'))).toBe(true);
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const sample = await selected(page), before = await evidence(page);
  expect(sample).toMatchObject({ run: 1, phase: 'apex', vy: 0, gravityFy: -19.6,
    parameters: { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true } });
  await pinIdentity(page);
  for (const view of views) {
    await selectView(page, view); await assertSelection(page, sample);
    if (view === 'forces') {
      await expect(page.locator('[data-physics-force-balance]')).toBeVisible();
      await expect(page.locator('[data-physics-force-balance]')).toContainText('Recorded mass: 2 kg');
      await expect(page.locator('[data-physics-force-component="gravity-y"]')).toHaveAttribute('data-value', '-19.6');
      await expect(page.locator('[data-physics-force-component="drag-x"]')).toHaveAttribute('data-value', String(sample.dragFx));
    }
    if (view === 'motion') {
      await expect(page.locator('[data-physics-graph-setting="gravity"]')).toContainText('9.8');
      await expect(page.locator('[data-physics-graph-setting="mass"]')).toContainText('2');
    }
    expect(await copyCsv(page)).toBe(originalCsv);
    await assertView(page, view); await assertIdentity(page);
  }
  expect(await evidence(page)).toEqual(before);
});

test('the live latest timeline selects an actual record and pauses playback without remounting the canvas or advancing evidence', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 45, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true,
    simSpeed: 1, showGraphs: true, showFlightData: false, analysisView: 'motion' });
  await page.locator('[data-physics-launch]').click();
  const status = page.locator('[data-physics-sample-status]');
  await expect(status).toHaveCount(1); await expect(status).toHaveText('');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  await page.evaluate(() => { (window as any).__analysisStatusNode = document.querySelector('[data-physics-sample-status]'); });
  await page.evaluate(() => {
    for (let tick = 0; tick < 40; tick++) (window as any).__tickAnalysis();
    (window as any).__rerender();
  });
  await assertView(page, 'motion');
  expect(await selected(page)).toBeNull();
  await expect(status).toHaveText('');
  await expect(page.locator('[data-physics-analysis-phase]')).toBeVisible();
  await expect(page.locator('[data-physics-analysis-phase]')).toHaveAttribute('data-physics-analysis-phase', 'rising');
  expect(await page.evaluate(() => (window as any).__analysisStatusNode === document.querySelector('[data-physics-sample-status]'))).toBe(true);
  const before = await evidence(page), points = before.trails.at(-1).points;
  expect(points.length).toBeGreaterThan(5); expect(before.body.t).toBeGreaterThan(0);
  const slider = page.locator('[data-physics-graph-time-slider]');
  await expect(slider).toHaveCount(1); await expect(slider).toBeEnabled();
  await expect(slider).toHaveValue(String(points.length - 1));
  await pinIdentity(page);
  await slider.focus(); await slider.press('Home');
  const sample = await selected(page);
  expect(sample).toMatchObject({ index: 0, t: points[0].t, x: points[0].mX, y: points[0].mY,
    vx: points[0].mVx, vy: points[0].mVy, phase: 'rising' });
  await expect(slider).toBeFocused(); await assertSelection(page, sample);
  await expect(status).toContainText('Sample 1 / ' + points.length);
  await expect(status).toContainText('t = ' + sample.t.toFixed(3) + ' s');
  await expect(status).toContainText('Rising');
  expect(await page.evaluate(() => (window as any).__analysisStatusNode === document.querySelector('[data-physics-sample-status]'))).toBe(true);
  expect(await page.evaluate(() => (window as any).__toolData.physics.simSpeed)).toBe(0);
  await page.evaluate(() => { for (let tick = 0; tick < 5; tick++) (window as any).__tickAnalysis(); });
  await selectView(page, 'forces'); await selectView(page, 'energy'); await selectView(page, 'motion');
  await assertSelection(page, sample); await assertIdentity(page);
  expect(await evidence(page)).toEqual(before);
});

test('the shared timeline and tabs stay usable at 320 pixels in default, dark, and contrast themes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page); await launch(page, true);
  await page.locator('[data-physics-inspect]').click();
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const sample = await selected(page), before = await evidence(page);
  await pinIdentity(page);
  for (const theme of ['default', 'dark', 'contrast']) {
    await page.evaluate(t => (window as any).__setAnalysisTheme(t), theme);
    await page.waitForTimeout(40); await redraw(page);
    for (const view of views) {
      await selectView(page, view); await assertSelection(page, sample);
      const tab = page.locator(`[data-physics-analysis-tab="${view}"]`);
      await tab.focus(); await tab.press('Enter'); await expect(tab).toBeFocused();
      const metrics = await page.locator('[data-physics-analysis-workspace]').evaluate(workspace => {
        const rgb = (color: string) => {
          const match = color.match(/^rgba?\(([^)]+)\)$/); if (!match) throw Error('Unresolved workspace color: ' + color);
          return match[1].split(',').map(Number);
        };
        const lum = (color: string) => rgb(color).slice(0, 3).map(value => {
          const unit = value / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const targets = [...workspace.querySelectorAll('[data-physics-analysis-tab],[data-physics-graph-time-slider]')].map(node => {
          const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
          let background: string | null = null;
          for (let parent: Element | null = node; parent; parent = parent.parentElement) {
            const color = getComputedStyle(parent).backgroundColor, channels = rgb(color);
            if (channels.length === 3 || channels[3] >= .99) { background = color; break; }
          }
          if (!background) throw Error('Workspace control has no resolved surface');
          const ink = lum(style.color), surface = lum(background);
          return { left: rect.left, right: rect.right, width: rect.width, height: rect.height,
            font: parseFloat(style.fontSize), tab: node.hasAttribute('data-physics-analysis-tab'),
            contrast: (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05) };
        });
        const focused = workspace.querySelector('[data-physics-analysis-tab][aria-selected="true"]')!;
        return { targets, width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
          outline: parseFloat(getComputedStyle(focused).outlineWidth) };
      });
      const context = theme + ' / ' + view;
      expect(metrics.scroll, context + ' overflow').toBeLessThanOrEqual(metrics.width + 1);
      expect(metrics.targets).toHaveLength(5);
      for (const target of metrics.targets) {
        expect(target.left, context).toBeGreaterThanOrEqual(0); expect(target.right, context).toBeLessThanOrEqual(metrics.width + 1);
        expect(target.width, context).toBeGreaterThanOrEqual(44); expect(target.height, context).toBeGreaterThanOrEqual(44);
        if (target.tab) {
          expect(target.font, context).toBeGreaterThanOrEqual(12);
          expect(target.contrast, context).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
        }
      }
      expect(metrics.outline, context).toBeGreaterThanOrEqual(2);
      await assertIdentity(page);
    }
  }
  expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
});
