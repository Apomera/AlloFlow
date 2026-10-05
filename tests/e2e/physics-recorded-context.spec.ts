import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
const views = ['motion', 'forces', 'energy', 'data'] as const;
type View = typeof views[number];
const keys = ['angle', 'velocity', 'gravity', 'mass', 'launchHeight', 'airResist'] as const;
const original = { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true };
const nextLaunch = { angle: 80, velocity: 5, gravity: 25, mass: 9, launchHeight: 30, airResist: false };

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
    w.__tickContext = () => {
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
    const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__setContextTheme = (theme: string) => {
      const ctx = w.__ctx;
      ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__contextCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__contextCsv.push(text); return Promise.resolve(); };
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
    (window as any).__tickContext();
  });
}

async function finishFlight(page: Page, run: number) {
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) (window as any).__tickContext();
    if (cv._launched) throw new Error('The recorded-context fixture did not land');
  });
  await page.waitForFunction(n => (window as any).__toolData.physics.runLog?.length === n, run, { polling: 20 });
  await setState(page, { simSpeed: 0 });
}

async function launch(page: Page, run = 1, patch: object = {}) {
  await setState(page, { ...original, simSpeed: 1, showGraphs: true, showEnergy: true, showFlightData: true, ...patch });
  await page.locator('[data-physics-launch]').click();
  await finishFlight(page, run);
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return { body: cv._ball, trails: cv._trails.map((trail: any) => ({
      points: [...trail], parameters: trail.parameters, apex: trail.apex, run: trail.run, modelVersion: trail.modelVersion,
    })), runLog: w.__toolData.physics.runLog, lastFlight: w.__toolData.physics.lastFlight,
      recordings: w.__toolData.physics.recordedFlights };
  });
}

async function selected(page: Page) {
  return page.evaluate(() => (document.getElementById('physicsCanvas') as any)._inspection?.snapshot || null);
}

async function settings(page: Page) {
  return page.evaluate(fields => Object.fromEntries(fields.map(key => [key, (window as any).__toolData.physics[key]])), keys);
}

async function protectedState(page: Page) {
  return page.evaluate(fields => Object.fromEntries(Object.entries((window as any).__toolData.physics)
    .filter(([key]) => !fields.includes(key))), [...keys] as string[]);
}

async function selectView(page: Page, view: View) {
  const tab = page.locator(`[data-physics-analysis-tab="${view}"]`);
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator(`[data-physics-analysis-panel="${view}"]`)).toBeVisible();
}

async function copyCsv(page: Page) {
  const active = await page.locator('[data-physics-analysis-tab][aria-selected="true"]').getAttribute('data-physics-analysis-tab') as View;
  await selectView(page, 'data');
  const before = await page.evaluate(() => (window as any).__contextCsv.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__contextCsv.length)).toBe(before + 1);
  const csv = await page.evaluate(() => (window as any).__contextCsv.at(-1) as string);
  await selectView(page, active);
  return csv;
}

async function pinIdentity(page: Page) {
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__contextIdentity = { canvas: cv, launch: cv._launch, body: cv._ball,
      trails: cv._trails, recorded: [...cv._trails],
      panels: [...document.querySelectorAll('[data-physics-analysis-panel]')] };
  });
}

async function assertIdentity(page: Page) {
  expect(await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, pinned = (window as any).__contextIdentity;
    return cv === pinned.canvas && cv._launch === pinned.launch && cv._ball === pinned.body &&
      cv._trails === pinned.trails && pinned.recorded.every((trail: any, index: number) => trail === cv._trails[index]) &&
      pinned.panels.every((node: Element, index: number) => node === document.querySelectorAll('[data-physics-analysis-panel]')[index]);
  })).toBe(true);
}

async function assertSample(page: Page, sample: any) {
  expect(await selected(page)).toEqual(sample);
  await expect(page.locator('[data-physics-time-sample]')).toHaveText(`Sample ${sample.index + 1} / ${sample.count}`);
  await expect(page.locator('[data-physics-graph-time-slider]')).toHaveValue(String(sample.index));
  await expect(page.locator(`[data-physics-flight-table] tr[data-selected="true"] [data-physics-sample-index="${sample.index}"] [data-physics-row-sample]`))
    .toHaveText('Sample ' + (sample.index + 1));
  for (const field of ['vx', 'vy']) {
    await expect(page.locator(`[data-physics-graph-marker="${field}"]`)).toHaveAttribute('data-sample-index', String(sample.index));
    await expect(page.locator(`[data-physics-graph-marker="${field}"]`)).toHaveAttribute('data-time', String(sample.t));
  }
}

async function assertRecordedSettings(page: Page) {
  const context = page.locator('[data-physics-recorded-context]');
  await expect(context).toHaveCount(1); await expect(context).toBeVisible();
  await expect(context.getByRole('heading', { name: 'Recorded launch settings', exact: true })).toBeVisible();
  await expect(context).toContainText('Run 1');
  await expect(context.locator('[data-physics-recorded-setting]')).toHaveCount(6);
  for (const [key, value] of [
    ['angle', /35\s*°/], ['velocity', /35\s*m\/s/], ['gravity', /9\.8\s*m\/s²/],
    ['mass', /2\s*kg/], ['launchHeight', /10\s*m/], ['airResist', /\bon\b/i],
  ] as const) await expect(context.locator(`[data-physics-recorded-setting="${key}"] [data-physics-graph-setting]`)).toHaveText(value);
}

async function olderRun(page: Page) {
  await launch(page);
  await launch(page, 2, { angle: 50, velocity: 20, mass: 4, gravity: 1.62, launchHeight: 25, airResist: false });
  await setState(page, nextLaunch);
  await page.locator('[data-physics-history-select]').selectOption('0');
  await page.locator('[data-physics-sample-jump="highest"]').click();
}

test('an older run keeps its six recorded settings through every view and restores only those settings atomically', async ({ page }) => {
  await mount(page); await olderRun(page);
  const sample = await selected(page), before = await evidence(page), csv = await copyCsv(page);
  expect(sample.run).toBe(1); expect(sample.parameters).toMatchObject(original);
  await expect(page.locator('[data-physics-history-run]')).toHaveText('Run 1');
  for (const view of views) {
    await selectView(page, view); await assertRecordedSettings(page); await assertSample(page, sample);
    const context = page.locator('[data-physics-recorded-context]');
    await expect(context.locator('[data-physics-settings-comparison]')).toContainText(/settings differ/i);
    await expect(context.locator('[data-physics-next-setting]')).toHaveCount(6);
    for (const [key, value] of [
      ['angle', /80\s*°/], ['velocity', /5\s*m\/s/], ['gravity', /25\s*m\/s²/],
      ['mass', /9\s*kg/], ['launchHeight', /30\s*m/], ['airResist', /\boff\b/i],
    ] as const) await expect(context.locator(`[data-physics-next-setting="${key}"]`)).toContainText(value);
  }
  await selectView(page, 'energy'); await pinIdentity(page);
  const protectedBefore = await protectedState(page);
  await page.evaluate(fields => {
    const w = window as any, apply = w.__ctx.setToolData;
    w.__contextSettingTransitions = [];
    w.__ctx.setToolData = (next: any) => apply((prev: any) => {
      const result = typeof next === 'function' ? next(prev) : next;
      if (fields.some(key => result.physics[key] !== prev.physics[key])) {
        w.__contextSettingTransitions.push(Object.fromEntries(fields.map(key => [key, result.physics[key]])));
      }
      return result;
    });
    w.__rerender();
  }, keys);
  await expect(page.locator('[data-physics-reuse-settings]')).toBeEnabled();
  await page.locator('[data-physics-reuse-settings]').click();
  expect(await settings(page)).toEqual(original);
  expect(await page.evaluate(() => (window as any).__contextSettingTransitions)).toEqual([original]);
  expect(await protectedState(page)).toEqual(protectedBefore);
  await expect(page.locator('[data-physics-settings-comparison]')).toContainText('The next launch matches this recording.');
  await expect(page.locator('[data-physics-next-setting]')).toHaveCount(0);
  await expect(page.locator('[data-physics-reuse-settings]')).toBeDisabled();
  await expect(page.locator('[data-physics-settings-comparison]')).toBeFocused();
  await expect(page.locator('[data-physics-analysis-tab="energy"]')).toHaveAttribute('aria-selected', 'true');
  await assertSample(page, sample); await assertIdentity(page);
  expect(await evidence(page)).toEqual(before); expect(await copyCsv(page)).toBe(csv);
  await setState(page, { mass: 9 });
  await expect(page.locator('[data-physics-settings-comparison]')).toContainText('One setting differs for the next launch.');
  await expect(page.locator('[data-physics-next-setting]')).toHaveCount(1);
  await expect(page.locator('[data-physics-next-setting="mass"]')).toContainText(/9\s*kg/);
  await expect(page.locator('[data-physics-recorded-setting="mass"] [data-physics-graph-setting]')).toContainText(/2\s*kg/);
  await assertSample(page, sample); await assertIdentity(page); expect(await evidence(page)).toEqual(before);
});

test('reusing an older recording prepares a repeat launch with the same captured parameters and measurements', async ({ page }) => {
  await mount(page); await olderRun(page);
  const before = await evidence(page), first = before.trails[0];
  await page.locator('[data-physics-reuse-settings]').click();
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-physics-launch]').click();
  const paused = await evidence(page), current = paused.trails.at(-1);
  expect(current.parameters).toEqual(first.parameters);
  expect(current.points).toHaveLength(1); expect(current.points[0].t).toBe(0);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._launched)).toBe(true);
  expect(await selected(page)).toBeNull();
  await setState(page, { simSpeed: 1 }); await finishFlight(page, 3);
  const after = await evidence(page), repeated = after.trails.at(-1);
  expect(repeated.run).toBe(3); expect(repeated.parameters).toEqual(first.parameters);
  expect(repeated.points).toEqual(first.points); expect(repeated.apex).toEqual(first.apex);
  expect(after.trails.slice(0, 2)).toEqual(before.trails);
  expect(after.runLog.slice(0, 2)).toEqual(before.runLog);
});

test('reuse stays disabled for matching settings, every active mode, a pending demo, and an unfinished paused launch', async ({ page }) => {
  await mount(page); await launch(page);
  await page.locator('[data-physics-inspect]').click();
  const reuse = page.locator('[data-physics-reuse-settings]');
  await expect(reuse).toBeDisabled();
  await setState(page, nextLaunch); await expect(reuse).toBeEnabled();
  const sample = await selected(page), before = await evidence(page);
  for (const key of ['targetMode', 'challengeActive', 'battleMode']) {
    await setState(page, { [key]: true });
    await expect(reuse).toBeDisabled();
    const protectedSettings = await settings(page);
    await reuse.evaluate(button => (button as HTMLButtonElement).click());
    expect(await settings(page)).toEqual(protectedSettings); await assertSample(page, sample);
    expect(await evidence(page)).toEqual(before);
    await setState(page, { [key]: false }); await expect(reuse).toBeEnabled();
  }
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    cv._demoTimer = -1; (window as any).__rerender();
  });
  await expect(reuse).toBeDisabled();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    cv._demoTimer = null; (window as any).__rerender();
  });
  await expect(reuse).toBeEnabled();
  await page.locator('[data-physics-launch]').click();
  await page.locator('[data-physics-history-select]').selectOption('0');
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._launched)).toBe(true);
  expect(await page.evaluate(() => (window as any).__toolData.physics.simSpeed)).toBe(0);
  await expect(reuse).toBeDisabled();
  const paused = await evidence(page), protectedSettings = await settings(page);
  await reuse.evaluate(button => (button as HTMLButtonElement).click());
  expect(await settings(page)).toEqual(protectedSettings); expect(await evidence(page)).toEqual(paused);
});

test('sparse Data rows name original samples and Show on trajectory keeps their exact evidence and active view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page); await launch(page);
  await page.locator('[data-physics-inspect]').click(); await selectView(page, 'data');
  const rows = page.locator('[data-physics-flight-table] tbody [data-physics-sample-index]');
  const indices = await rows.evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('data-physics-sample-index'))));
  const count = (await evidence(page)).trails[0].points.length;
  expect(indices.length).toBeLessThan(count);
  expect(indices.some((index, position) => position > 0 && index > indices[position - 1] + 1)).toBe(true);
  for (const index of indices) {
    await expect(page.locator(`[data-physics-sample-index="${index}"] [data-physics-row-sample]`)).toHaveText('Sample ' + (index + 1));
  }
  const target = indices.find(index => index > 1 && index < count - 1)!;
  await page.locator(`[data-physics-sample-index="${target}"]`).click();
  const sample = await selected(page), before = await evidence(page), csv = await copyCsv(page);
  expect(sample.index).toBe(target);
  expect(sample).toMatchObject({ t: before.trails[0].points[target].t, x: before.trails[0].points[target].mX,
    y: before.trails[0].points[target].mY, vx: before.trails[0].points[target].mVx, vy: before.trails[0].points[target].mVy });
  await pinIdentity(page);
  const context = page.locator('[data-physics-recorded-context]');
  await context.scrollIntoViewIfNeeded();
  await page.locator('[data-physics-show-trajectory]').click();
  await expect(page.locator('#physicsCanvas')).toBeFocused();
  expect(await page.locator('#physicsCanvas').evaluate(canvas => {
    const bounds = canvas.getBoundingClientRect(); return bounds.bottom > 0 && bounds.top < innerHeight;
  })).toBe(true);
  await expect(page.locator('[data-physics-analysis-tab="data"]')).toHaveAttribute('aria-selected', 'true');
  await assertSample(page, sample); await assertIdentity(page);
  expect(await page.evaluate(() => (window as any).__toolData.physics.simSpeed)).toBe(0);
  expect(await evidence(page)).toEqual(before); expect(await copyCsv(page)).toBe(csv);
});

test('recorded context, sample identity, and actions fit desktop and phones in all three themes', async ({ page }) => {
  test.setTimeout(300_000);
  const report = 'reports/physics-recorded-context-2026-10-02';
  mkdirSync(report, { recursive: true });
  const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
  const sourceSha256 = digest(readFileSync('stem_lab/stem_tool_physics.js'));
  const configurations: any[] = [];
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page); await launch(page); await setState(page, nextLaunch);
  await page.locator('[data-physics-inspect]').click();
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const sample = await selected(page), before = await evidence(page); await pinIdentity(page);
  for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(t => (window as any).__setContextTheme(t), theme);
    await page.waitForTimeout(40); await redraw(page);
    for (const view of width === 320 ? views : ['motion'] as const) {
      await selectView(page, view); await assertRecordedSettings(page); await assertSample(page, sample);
      for (const selector of ['[data-physics-reuse-settings]', '[data-physics-show-trajectory]']) {
        const button = page.locator(selector); await button.focus(); await expect(button).toBeFocused();
        expect(await button.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
      }
      const metrics = await page.locator('[data-physics-analysis-workspace]').evaluate(context => {
        const rgb = (color: string) => {
          const match = color.match(/^rgba?\(([^)]+)\)$/); if (!match) throw Error('Unresolved context color: ' + color);
          return match[1].split(',').map(Number);
        };
        const lum = (color: string) => rgb(color).slice(0, 3).map(value => {
          const unit = value / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const nodes = [...context.querySelectorAll('[data-physics-recorded-setting] dt,[data-physics-recorded-setting] dd,[data-physics-settings-comparison],.phys-recorded-help,[data-physics-reuse-settings],[data-physics-show-trajectory],[data-physics-time-sample]')];
        const targets = nodes.map(node => {
          const bounds = node.getBoundingClientRect(), style = getComputedStyle(node);
          let background: string | null = null;
          for (let parent: Element | null = node; parent; parent = parent.parentElement) {
            const color = getComputedStyle(parent).backgroundColor, channels = rgb(color);
            if (channels.length === 3 || channels[3] >= .99) { background = color; break; }
          }
          if (!background) throw Error('Recorded context has no resolved surface');
          const ink = lum(style.color), surface = lum(background);
          return { left: bounds.left, right: bounds.right, width: bounds.width, height: bounds.height,
            button: node.tagName === 'BUTTON', font: parseFloat(style.fontSize),
            contrast: (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05) };
        });
        return { targets, width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth };
      });
      const message = theme + ' / ' + width + ' / ' + view;
      expect(metrics.scroll, message).toBeLessThanOrEqual(metrics.width + 1);
      expect(metrics.targets.filter(target => target.button)).toHaveLength(2);
      for (const target of metrics.targets) {
        expect(target.left, message).toBeGreaterThanOrEqual(0); expect(target.right, message).toBeLessThanOrEqual(metrics.width + 1);
        expect(target.font, message).toBeGreaterThanOrEqual(12);
        expect(target.contrast, message).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
        if (target.button) { expect(target.width, message).toBeGreaterThanOrEqual(44); expect(target.height, message).toBeGreaterThanOrEqual(44); }
      }
      await assertIdentity(page);
      if (view === 'motion') {
        const screenshot = 'context-' + theme + '-' + width + '.png';
        await page.locator('[data-physics-recorded-context]').screenshot({ path: report + '/' + screenshot, animations: 'disabled' });
        configurations.push({ theme, width, screenshot, pageOverflow: metrics.scroll - metrics.width,
          minFont: Math.min(...metrics.targets.map(target => target.font)),
          minContrast: Math.min(...metrics.targets.map(target => target.contrast)),
          targets: metrics.targets.filter(target => target.button), selectedRun: sample.run,
          selectedIndex: sample.index, originalPoints: sample.count });
      }
      if (width === 320 && theme === 'default' && view === 'data') {
        await page.locator('[data-physics-flight-table-wrap]').screenshot({ path: report + '/context-data-320.png', animations: 'disabled' });
      }
    }
  }
  expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  const mirrorSha256 = digest(readFileSync('desktop/web-app/public/stem_lab/stem_tool_physics.js'));
  const sourceUnchanged = digest(readFileSync('stem_lab/stem_tool_physics.js')) === sourceSha256;
  expect(sourceUnchanged).toBe(true); expect(mirrorSha256).toBe(sourceSha256);
  writeFileSync(report + '/visual-results.json', JSON.stringify({ passed: true, sourceSha256, mirrorSha256,
    sourceUnchanged, configurations, errors }, null, 2) + '\n');
});

