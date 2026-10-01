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
    w.__tickForcePhysics = () => {
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
    w.__setForceTheme = (theme: string) => {
      const ctx = w.__ctx;
      ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__forceCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__forceCsv.push(text); return Promise.resolve(); };
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
    (window as any).__tickForcePhysics();
  });
}

async function launch(page: Page, drag = false, run = 1) {
  await setState(page, {
    angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: drag,
    simSpeed: 1, showGraphs: true, showEnergy: true, showFlightData: true,
  });
  await page.locator('[data-physics-launch]').click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) (window as any).__tickForcePhysics();
    if (cv._launched) throw new Error('The force fixture did not land');
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
  const before = await page.evaluate(() => (window as any).__forceCsv.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__forceCsv.length)).toBe(before + 1);
  return page.evaluate(() => (window as any).__forceCsv.at(-1) as string);
}

async function openForces(page: Page) {
  const details = page.locator('[data-physics-sample-forces]');
  if (!(await details.evaluate(node => (node as HTMLDetailsElement).open))) {
    const summary = details.locator('summary');
    await summary.focus(); await summary.press('Enter');
  }
  await expect(details).toHaveJSProperty('open', true);
  await expect(page.locator('[data-physics-force-balance]')).toBeVisible();
}

function formatted(value: number) {
  return value !== 0 && Math.abs(value) < .01 ? value.toPrecision(3) : value.toFixed(2);
}

async function assertForces(page: Page, phase?: string) {
  await redraw(page);
  const { sample, point, parameters } = await page.evaluate(() => {
    const inspection = (document.getElementById('physicsCanvas') as any)._inspection;
    return { sample: inspection.snapshot, point: inspection.trail[inspection.snapshot.index], parameters: inspection.trail.parameters };
  });
  const speed = Math.hypot(point.mVx, point.mVy), k = parameters.drag ? .004 : 0;
  const gravity = { x: 0, y: -parameters.mass * parameters.gravity, magnitude: parameters.mass * parameters.gravity };
  const drag = { x: -k * speed * point.mVx, y: -k * speed * point.mVy, magnitude: k * speed * speed };
  const net = { x: gravity.x + drag.x, y: gravity.y + drag.y, magnitude: Math.hypot(gravity.x + drag.x, gravity.y + drag.y) };
  const scale = Math.max(gravity.magnitude, drag.magnitude, net.magnitude);
  expect(scale).toBeGreaterThanOrEqual(0);
  for (const [field, value] of Object.entries({ gravityFx: gravity.x, gravityFy: gravity.y,
    dragFx: drag.x, dragFy: drag.y, fx: net.x, fy: net.y, ax: net.x / parameters.mass, ay: net.y / parameters.mass })) {
    expect(sample[field], field).toBeCloseTo(value, 12);
  }
  expect(sample.vx).toBe(point.mVx); expect(sample.vy).toBe(point.mVy);
  if (phase) {
    expect(sample.phase).toBe(phase);
    await expect(page.locator('[data-physics-motion-phase]')).toHaveAttribute('data-physics-motion-phase', phase);
  }
  await expect(page.locator('[data-physics-phase-help]')).toBeVisible();
  await expect(page.locator('[data-physics-phase-value="ay"]')).toHaveAttribute('data-value', String(sample.ay));
  await expect(page.locator('[data-physics-vertical-balance] strong')).toHaveText(
    formatted(gravity.y) + ' N + (' + formatted(drag.y) + ' N) = ' + formatted(net.y) + ' N');
  const balance = page.locator('[data-physics-force-balance]');
  await expect(balance).toHaveAttribute('data-force-scale', String(scale));
  await expect(balance.locator('[data-physics-force-card]')).toHaveCount(3);
  await expect(balance).toContainText('Recorded mass: ' + parameters.mass + ' kg');
  for (const [key, vector] of Object.entries({ gravity, drag, net })) {
    const card = balance.locator(`[data-physics-force-card="${key}"]`);
    await expect(card).toBeVisible();
    const svg = card.locator(`[data-physics-force-vector="${key}"]`);
    await expect(svg).toHaveAttribute('viewBox', '0 0 128 128');
    await expect(svg).toHaveAttribute('aria-hidden', 'true');
    await expect(svg).toHaveAttribute('focusable', 'false');
    for (const [field, value] of Object.entries(vector)) {
      const reading = card.locator(`[data-physics-force-component="${key}-${field}"]`);
      await expect(reading).toHaveAttribute('data-value', String(value));
      await expect(reading).toHaveText(formatted(value) + ' N');
      expect(await reading.evaluate(node => node.tagName)).toBe('DD');
    }
    const arrow = svg.locator(`[data-physics-force-arrow="${key}"]`);
    await expect(card.locator(`[data-physics-force-zero="${key}"]`)).toHaveCount(vector.magnitude === 0 ? 1 : 0);
    await expect(arrow).toHaveCount(vector.magnitude === 0 ? 0 : 1);
    if (vector.magnitude === 0) continue;
    for (const [field, value] of Object.entries({ fx: vector.x, fy: vector.y, magnitude: vector.magnitude, scale })) {
      await expect(arrow).toHaveAttribute('data-' + field, String(value));
    }
    const coordinates = await arrow.evaluate(node => Object.fromEntries(['x1', 'y1', 'x2', 'y2'].map(key => [key, Number(node.getAttribute(key))])));
    expect(coordinates.x1).toBe(64); expect(coordinates.y1).toBe(64);
    expect(coordinates.x2).toBeCloseTo(64 + 42 * (vector.x / scale), 12);
    expect(coordinates.y2).toBeCloseTo(64 - 42 * (vector.y / scale), 12);
    expect(Math.hypot(coordinates.x2 - 64, coordinates.y2 - 64)).toBeCloseTo(42 * (vector.magnitude / scale), 12);
  }
  return sample;
}

test('vacuum and drag forces follow recorded rising, apex, falling, and impact motion on one shared scale', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  for (const [run, drag] of [[1, false], [2, true]] as const) {
    await launch(page, drag, run);
    const before = await evidence(page);
    await page.locator('[data-physics-inspect]').click();
    await expect(page.locator('[data-physics-sample-forces]')).toHaveJSProperty('open', false);
    await openForces(page);
    await page.locator('[data-physics-sample-jump="launch"]').click();
    const rising = await assertForces(page, 'rising');
    expect(rising.vy).toBeGreaterThan(0); expect(rising.dragFy).toBeLessThanOrEqual(0);
    await expect(page.locator('[data-physics-phase-help]')).toContainText(drag
      ? 'gravity and vertical air drag act downward' : 'gravity changes its vertical velocity downward');
    await page.locator('[data-physics-sample-jump="highest"]').click();
    const apex = await assertForces(page, 'apex');
    expect(apex).toMatchObject({ apex: true, vy: 0, ay: -9.8, gravityFy: -19.6 });
    expect(apex.dragFy === 0).toBe(true);
    await expect(page.locator('[data-physics-phase-help]')).toContainText('Gravity still acts downward');
    if (drag) {
      expect(apex.dragFx).toBeLessThan(0);
      await expect(page.locator('[data-physics-phase-help]')).toContainText('Horizontal motion still produces air drag');
    }
    await page.locator('[data-physics-sample-next]').click();
    const falling = await assertForces(page, 'falling');
    expect(falling.vy).toBeLessThan(0); expect(falling.dragFy).toBeGreaterThanOrEqual(0);
    if (drag) await expect(page.locator('[data-physics-phase-help]')).toContainText('vertical air drag acts upward');
    await page.locator('[data-physics-sample-jump="latest"]').click();
    const impact = await assertForces(page, 'impact');
    expect(impact.y).toBe(0); expect(impact.vy).toBeLessThan(0);
    await expect(page.locator('[data-physics-phase-help]')).toContainText('just before contact');
    await expect(page.locator('[data-physics-phase-help]')).toContainText('collision force is not simulated');
    expect(await evidence(page)).toEqual(before);
  }
  expect(errors).toEqual([]);
});

test('force readings retain captured mass, gravity, and drag after control edits and when reopening an older run', async ({ page }) => {
  await mount(page); await launch(page, true);
  const original = await evidence(page), csv = await copyCsv(page);
  await page.locator('[data-physics-inspect]').click(); await openForces(page);
  await page.locator('[data-physics-sample-jump="launch"]').click();
  const rising = await assertForces(page, 'rising');
  await setState(page, { angle: 80, velocity: 5, gravity: 25, mass: 9, launchHeight: 30, airResist: false });
  expect(await assertForces(page, 'rising')).toEqual(rising);
  for (const jump of ['highest', 'latest']) {
    await page.locator(`[data-physics-sample-jump="${jump}"]`).click();
    const sample = await assertForces(page, jump === 'highest' ? 'apex' : 'impact');
    expect(sample.parameters).toMatchObject({ angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true });
    expect(sample.gravityFy).toBe(-19.6);
  }
  expect(await evidence(page)).toEqual(original); expect(await copyCsv(page)).toBe(csv);
  await launch(page, false, 2);
  await setState(page, { gravity: 25, mass: 9, airResist: false });
  const twoRuns = await evidence(page);
  await page.locator('[data-physics-history-select]').selectOption('0');
  await openForces(page);
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const sample = await assertForces(page, 'apex');
  expect(sample.run).toBe(1); expect(sample.parameters.airResist).toBe(true);
  expect(sample.gravityFy).toBe(-19.6); expect(sample.dragFx).toBeLessThan(0);
  expect(await copyCsv(page)).toBe(csv); expect(await evidence(page)).toEqual(twoRuns);
});

test('synthetic tiny, minimum positive, and zero forces retain exact geometry and accessible numeric readings', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10,
    airResist: true, simSpeed: 0, showFlightData: true });
  await page.locator('[data-physics-launch]').click();
  for (const fixture of [
    { vx: .001, mass: 2, gravity: 9.8, drag: true },
    { vx: 0, mass: 2, gravity: 9.8, drag: true },
    { vx: 0, mass: Number.MIN_VALUE, gravity: 1, drag: false },
    { vx: 0, mass: 2, gravity: 0, drag: false },
  ]) {
    if (await page.locator('[data-physics-sample-close]').count()) await page.locator('[data-physics-sample-close]').click();
    await page.evaluate(value => {
      const cv = document.getElementById('physicsCanvas') as any, trail = cv._trails.at(-1);
      if (trail.length !== 1 || trail.apex) throw Error('Tiny-force fixture requires a paused launch record');
      trail[0] = { ...trail[0], mVx: value.vx, mVy: 0 };
      trail.parameters = { ...trail.parameters, velocity: value.vx, mass: value.mass, gravity: value.gravity, drag: value.drag };
      (window as any).__rerender();
    }, fixture);
    const before = await evidence(page);
    await page.locator('[data-physics-inspect]').click(); await openForces(page);
    const sample = await assertForces(page, 'level');
    const card = page.locator('[data-physics-force-card="drag"]');
    expect(sample.dragFy === 0).toBe(true);
    expect(sample.ay).toBeCloseTo(-fixture.gravity, 12);
    if (fixture.vx) {
      expect(sample.dragForce).toBeGreaterThan(0); expect(sample.dragForce).toBeLessThan(1e-8);
      await expect(card.locator('[data-physics-force-component="drag-x"]')).toHaveText('-4.00e-9 N');
      await expect(card.locator('[data-physics-force-component="drag-magnitude"]')).toHaveText('4.00e-9 N');
      await expect(card).toContainText('the values above retain its size');
      const arrow = card.locator('[data-physics-force-arrow="drag"]');
      const length = Math.abs(Number(await arrow.getAttribute('x2')) - 64);
      expect(length).toBeGreaterThan(0); expect(length).toBeLessThan(1e-6);
      const narrative = page.locator('[data-physics-sample-inspector] p.sr-only').filter({ hasText: 'Captured flight state at' });
      await expect(narrative).toContainText('Drag force opposite velocity: 4.00e-9 N');
      await expect(narrative).toContainText('Fx = -4.00e-9 N');
    } else {
      expect(sample.dragForce === 0).toBe(true);
      await expect(card.locator('[data-physics-force-zero="drag"]')).toHaveText('Zero force: no arrow.');
      await expect(card.locator('[data-physics-force-component="drag-magnitude"]')).toHaveText('0.00 N');
    }
    if (fixture.mass === Number.MIN_VALUE) {
      expect(sample.gravityForce).toBe(Number.MIN_VALUE); expect(sample.gravityFy).toBe(-Number.MIN_VALUE);
      await expect(page.locator('[data-physics-force-arrow="gravity"]')).toHaveAttribute('y2', '106');
      await expect(page.locator('[data-physics-force-arrow="net"]')).toHaveAttribute('y2', '106');
      await expect(page.locator('[data-physics-force-component="gravity-magnitude"]')).toHaveText('4.94e-324 N');
    }
    if (fixture.gravity === 0) {
      await expect(page.locator('[data-physics-force-arrow]')).toHaveCount(0);
      await expect(page.locator('[data-physics-force-zero]')).toHaveCount(3);
      await expect(page.locator('[data-physics-force-balance]')).toHaveAttribute('data-force-scale', '0');
      await expect(page.locator('[data-physics-phase-help]')).toContainText('velocity stays unchanged');
    }
    expect(await evidence(page)).toEqual(before);
  }
  await page.locator('[data-physics-sample-close]').click();
  await setState(page, { angle: 45, velocity: 25, mass: 10, gravity: 9.8, launchHeight: 10,
    airResist: true, simSpeed: 0 });
  await page.locator('[data-physics-launch]').click();
  // Settle the paused frame's cached speed before comparing inspection evidence.
  await redraw(page);
  const before = await evidence(page);
  await page.locator('[data-physics-inspect]').click(); await openForces(page);
  const sample = await assertForces(page, 'rising');
  expect(sample.parameters).toMatchObject({ angle: 45, velocity: 25, mass: 10, gravity: 9.8, launchHeight: 10, airResist: true });
  expect(sample.dragForce).toBeCloseTo(2.5, 12);
  const card = page.locator('[data-physics-force-card="drag"]');
  await expect(card.locator('[data-physics-force-component="drag-magnitude"]')).toHaveText('2.50 N');
  const arrow = card.locator('[data-physics-force-arrow="drag"]');
  const length = await arrow.evaluate(node => Math.hypot(Number(node.getAttribute('x2')) - 64, Number(node.getAttribute('y2')) - 64));
  expect(length).toBeGreaterThan(1); expect(length).toBeLessThan(4.5);
  await expect(card).toContainText('the values above retain its size');
  expect(await evidence(page)).toEqual(before);
});

test('native force details open and close with Enter and Space while retaining focus, DOM nodes, and flight evidence', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10,
    airResist: false, simSpeed: 0, showFlightData: true });
  await page.locator('[data-physics-launch]').click();
  const before = await evidence(page), csv = await copyCsv(page);
  await page.locator('[data-physics-inspect]').click();
  const details = page.locator('[data-physics-sample-forces]'), summary = details.locator('summary');
  expect(await details.evaluate(node => node.tagName)).toBe('DETAILS');
  await expect(details).toHaveJSProperty('open', false);
  await expect(page.locator('[data-physics-force-balance]')).toBeHidden();
  await page.evaluate(() => {
    const w = window as any;
    w.__forceDetailsNode = document.querySelector('[data-physics-sample-forces]');
    w.__forceBalanceNode = document.querySelector('[data-physics-force-balance]');
  });
  await summary.focus(); await summary.press('Enter');
  await expect(details).toHaveJSProperty('open', true); await expect(summary).toBeFocused();
  await assertForces(page, 'level');
  await expect(page.locator('[data-physics-phase-help]')).toContainText('Vertical velocity is zero at this moment');
  await summary.press('Space');
  await expect(details).toHaveJSProperty('open', false); await expect(summary).toBeFocused();
  await expect(page.locator('[data-physics-force-card="gravity"]')).toBeHidden();
  await summary.press('Enter');
  await expect(details).toHaveJSProperty('open', true); await expect(summary).toBeFocused();
  await assertForces(page, 'level');
  expect(await page.evaluate(() => {
    const w = window as any;
    return w.__forceDetailsNode === document.querySelector('[data-physics-sample-forces]') &&
      w.__forceBalanceNode === document.querySelector('[data-physics-force-balance]');
  })).toBe(true);
  expect(await summary.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
  expect(await evidence(page)).toEqual(before); expect(await copyCsv(page)).toBe(csv);
});

test('force cards and phase explanations retain readable contrast, focus, touch size, and geometry in nine layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page, true);
  await page.locator('[data-physics-inspect]').click(); await openForces(page);
  await page.locator('[data-physics-sample-jump="highest"]').click();
  await page.locator('[data-physics-sample-next]').click();
  const before = await evidence(page);
  for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(t => (window as any).__setForceTheme(t), theme);
    await page.waitForTimeout(40); await openForces(page); await assertForces(page, 'falling');
    const summary = page.locator('[data-physics-sample-forces] > summary');
    await summary.focus(); await summary.press('Space'); await summary.press('Enter');
    await expect(summary).toBeFocused();
    await expect(page.locator('[data-physics-sample-forces]')).toHaveJSProperty('open', true);
    const result = await page.locator('[data-physics-sample-inspector]').evaluate(inspector => {
      const rgb = (color: string) => {
        const match = color.match(/^rgba?\(([^)]+)\)$/); if (!match) throw Error('Unresolved force color: ' + color);
        return match[1].split(',').map(Number);
      };
      const lum = (color: string) => rgb(color).slice(0, 3).map(value => {
        const unit = value / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const contrast = (ink: string, background: string) => {
        const a = lum(ink), b = lum(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      };
      const surface = (element: Element) => {
        for (let parent: Element | null = element; parent; parent = parent.parentElement) {
          const color = getComputedStyle(parent).backgroundColor, channels = rgb(color);
          if (channels.length === 3 || channels[3] >= .99) return color;
        }
        throw Error('Force content has no resolved surface');
      };
      const box = (node: Element) => {
        const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      };
      const text: Array<{ content: string; font: number; contrast: number }> = [];
      const regions = inspector.querySelectorAll('[data-physics-force-balance],[data-physics-phase-help],[data-physics-vertical-balance],[data-physics-sample-forces] > summary');
      for (const region of regions) {
        const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const element = node.parentElement!;
          if (!node.textContent?.trim() || !element.getClientRects().length || element.closest('.sr-only,svg')) continue;
          const style = getComputedStyle(element);
          text.push({ content: node.textContent.trim(), font: parseFloat(style.fontSize), contrast: contrast(style.color, surface(element)) });
        }
      }
      const summary = inspector.querySelector('[data-physics-sample-forces] > summary')!;
      return {
        width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
        text, summary: box(summary), focus: parseFloat(getComputedStyle(summary).outlineWidth),
        cards: [...inspector.querySelectorAll('[data-physics-force-card]')].map(box),
        vectors: [...inspector.querySelectorAll('[data-physics-force-vector]')].map(box),
        strokes: [...inspector.querySelectorAll('[data-physics-force-arrow]')].map(node => contrast(getComputedStyle(node).stroke, surface(node))),
      };
    });
    const context = width + 'px ' + theme;
    expect(result.scroll, context + ' overflow').toBeLessThanOrEqual(result.width + 1);
    expect(result.cards).toHaveLength(3); expect(result.vectors).toHaveLength(3);
    for (const box of [result.summary, ...result.cards, ...result.vectors]) {
      expect(box.left, context).toBeGreaterThanOrEqual(0); expect(box.right, context).toBeLessThanOrEqual(result.width + 1);
      expect(box.width, context).toBeGreaterThan(0); expect(box.height, context).toBeGreaterThan(0);
    }
    for (let a = 0; a < result.cards.length; a++) for (let b = a + 1; b < result.cards.length; b++) {
      const first = result.cards[a], second = result.cards[b];
      expect(first.right <= second.left || second.right <= first.left || first.bottom <= second.top || second.bottom <= first.top, context + ' card overlap').toBe(true);
    }
    expect(result.summary.width, context).toBeGreaterThanOrEqual(44);
    expect(result.summary.height, context).toBeGreaterThanOrEqual(44);
    expect(result.focus, context).toBeGreaterThanOrEqual(2);
    expect(result.text.length).toBeGreaterThan(20);
    for (const reading of result.text) {
      expect(reading.font, context + ': ' + reading.content).toBeGreaterThanOrEqual(12);
      expect(reading.contrast, context + ': ' + reading.content).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
    }
    expect(result.strokes).toHaveLength(3);
    for (const ratio of result.strokes) expect(ratio, context + ' vector contrast').toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 3);
  }
  expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
});
