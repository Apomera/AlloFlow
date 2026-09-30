import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ deviceScaleFactor: 2 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});

test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type DrawnText = {
  text: string; fontSize: number; x: number; y: number;
  left: number; right: number; top: number; bottom: number;
};

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__tickClarityPhysics = (ms: number) => {
      now += ms;
      const pending = [...frames.values()]; frames.clear();
      pending.forEach(fn => fn(now));
    };

    // Measure the actual glyph bounds, including alignment, the canvas transform,
    // and DPR. Correct metadata alone cannot prove that a reading fits on screen.
    w.__captureClarityText = false;
    w.__clarityText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth?) {
      if (this.canvas.id === 'physicsCanvas' && w.__captureClarityText) {
        const metrics = this.measureText(String(text)), transform = this.getTransform();
        const ratioX = this.canvas.width / this.canvas.getBoundingClientRect().width;
        const ratioY = this.canvas.height / this.canvas.getBoundingClientRect().height;
        const squeeze = maxWidth !== undefined && maxWidth > 0 && metrics.width > maxWidth ? maxWidth / metrics.width : 1;
        const left = x - metrics.actualBoundingBoxLeft * squeeze;
        const right = x + metrics.actualBoundingBoxRight * squeeze;
        const top = y - metrics.actualBoundingBoxAscent, bottom = y + metrics.actualBoundingBoxDescent;
        const corners = [[left, top], [right, top], [left, bottom], [right, bottom]].map(([px, py]) => ({
          x: (transform.a * px + transform.c * py + transform.e) / ratioX,
          y: (transform.b * px + transform.d * py + transform.f) / ratioY,
        }));
        const font = this.font.match(/([\d.]+)px/);
        w.__clarityText.push({
          text: String(text), fontSize: font ? Number(font[1]) * Math.hypot(transform.c, transform.d) / ratioY : 0,
          x: (transform.a * x + transform.c * y + transform.e) / ratioX,
          y: (transform.b * x + transform.d * y + transform.f) / ratioY,
          left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)),
          top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)),
        });
      }
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  await page.waitForTimeout(50);
}

async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((previous: any) => ({
    ...previous, physics: { ...previous.physics, ...p },
  })), patch);
  await page.waitForTimeout(40);
}

async function readDraw(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__clarityText = []; w.__captureClarityText = true;
    try { cv._physScheduleFrame(); w.__tickClarityPhysics(1000 / 60); }
    finally { w.__captureClarityText = false; }
    const rect = cv.getBoundingClientRect();
    return {
      text: w.__clarityText as DrawnText[], width: rect.width, height: rect.height,
      selected: cv._inspection?.snapshot || null, preview: cv._visualPreview,
      launched: cv._launched, ball: cv._ball,
      pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
    };
  });
}

function expectTextFits(draw: Awaited<ReturnType<typeof readDraw>>) {
  expect(draw.text.length).toBeGreaterThan(5);
  for (const item of draw.text) {
    expect(item.fontSize, item.text + ' font size').toBeGreaterThanOrEqual(11.99);
    expect(item.left, item.text + ' left clipping').toBeGreaterThanOrEqual(-1);
    expect(item.right, item.text + ' right clipping').toBeLessThanOrEqual(draw.width + 1);
    expect(item.top, item.text + ' top clipping').toBeGreaterThanOrEqual(-1);
    expect(item.bottom, item.text + ' bottom clipping').toBeLessThanOrEqual(draw.height + 1);
  }
  expect(draw.pageWidth).toBeLessThanOrEqual(draw.viewportWidth + 1);
}

function header(draw: Awaited<ReturnType<typeof readDraw>>) {
  return draw.text.filter(item => item.y < 100).map(item => item.text).join('\n');
}

function footer(draw: Awaited<ReturnType<typeof readDraw>>) {
  return draw.text.filter(item => item.y >= draw.height - 74).map(item => item.text);
}

async function finish(page: Page) {
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 2500) w.__tickClarityPhysics(1000 / 60);
    if (cv._launched) throw new Error('The clarity fixture did not land');
  });
  await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return {
      ball: cv._ball,
      trails: cv._trails.map((trail: any) => ({ points: [...trail], parameters: trail.parameters, modelVersion: trail.modelVersion, run: trail.run })),
      records: d.runLog, lastFlight: d.lastFlight,
    };
  });
}

test('mobile guidance and sticky time cells keep launch and recorded measurements accessible', async ({ page }) => {
  // Opening inspection intentionally scrolls the page. Keep that transition
  // instantaneous so it cannot race the later, separate scrubbing assertion.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page);
  const toggle = page.locator('[data-physics-header-guidance-toggle]');
  const guidance = page.locator('[data-physics-header-guidance]');
  const launch = page.getByRole('button', { name: 'Launch!', exact: true });
  for (const width of [320, 720]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(guidance).toBeHidden();
    await expect(page.locator('[data-physics-next-cta]')).toHaveCount(1);
    await expect(page.locator('[data-physics-next-cta]')).toBeVisible();
    await expect(launch).toHaveCount(1);
    await expect(page.locator('[data-physics-primary-controls]').getByRole('button', { name: 'Launch!', exact: true })).toBeVisible();
    const launchBox = (await launch.boundingBox())!, canvasBox = (await page.locator('#physicsCanvas').boundingBox())!;
    expect(launchBox.y).toBeGreaterThanOrEqual(0);
    expect(launchBox.y + launchBox.height).toBeLessThanOrEqual(900);
    expect(launchBox.y + launchBox.height).toBeLessThanOrEqual(canvasBox.y);
    await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(guidance).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-controls', await guidance.getAttribute('id') as string);
    await expect(page.locator('[data-physics-next-cta]')).toHaveCount(1);
    await toggle.press('Enter');
    await expect(guidance).toBeHidden();
  }
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(toggle).toBeHidden();
  await expect(guidance).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  await setState(page, { angle: 35, velocity: 25, gravity: 9.8, launchHeight: 12, mass: 2, airResist: true, simSpeed: 1, showFlightData: true });
  await launch.click();
  await finish(page);

  const table = page.locator('[data-physics-flight-table]');
  const wrap = page.locator('[data-physics-flight-table-wrap]');
  const hint = page.locator('[data-physics-flight-scroll-hint]');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('Time stays visible');
  await expect(page.locator('[data-physics-flight-summary="latest"]')).toBeVisible();
  const beforeScroll = await wrap.evaluate(node => {
    const box = node.getBoundingClientRect();
    const first = node.querySelector('tbody th')!.getBoundingClientRect();
    const value = node.querySelector('tbody td')!.getBoundingClientRect();
    return { firstX: first.left, valueX: value.left, left: box.left, right: box.right, overflow: node.scrollWidth - node.clientWidth };
  });
  expect(beforeScroll.overflow).toBeGreaterThan(100);
  await wrap.evaluate(node => { node.scrollLeft = node.scrollWidth; });
  const afterScroll = await wrap.evaluate(node => {
    const first = node.querySelector('tbody th')!, heading = node.querySelector('thead th')!;
    const rect = first.getBoundingClientRect();
    return {
      firstX: rect.left, firstRight: rect.right, valueX: node.querySelector('tbody td')!.getBoundingClientRect().left,
      headerX: heading.getBoundingClientRect().left, position: getComputedStyle(first).position,
      background: getComputedStyle(first).backgroundColor, scrollLeft: node.scrollLeft,
    };
  });
  expect(afterScroll.position).toBe('sticky');
  expect(afterScroll.firstX).toBeCloseTo(beforeScroll.firstX, 0);
  expect(afterScroll.headerX).toBeCloseTo(afterScroll.firstX, 0);
  expect(afterScroll.firstRight).toBeLessThan(beforeScroll.right);
  expect(beforeScroll.valueX - afterScroll.valueX).toBeGreaterThan(100);
  expect(afterScroll.background).not.toMatch(/rgba\([^)]*,\s*0\s*\)/);

  await table.locator('[data-physics-sample-index]').nth(3).click();
  const selected = (await readDraw(page)).selected;
  const summary = page.locator('[data-physics-flight-summary="selected"]');
  await expect(summary).toBeVisible();
  await expect(summary).toHaveAttribute('data-sample-index', String(selected.index));
  for (const [key, value, unit] of [['height', selected.y, 'm'], ['vx', selected.vx, 'm/s'], ['vy', selected.vy, 'm/s'], ['speed', selected.speed, 'm/s']] as const) {
    await expect(summary.locator(`[data-physics-flight-summary-value="${key}"]`)).toHaveText(value.toFixed(2) + ' ' + unit);
  }
  // Scrubbing follows the selected row vertically, without losing the columns
  // the learner scrolled to or moving focus away from the timeline control.
  const slider = page.locator('[data-physics-sample-slider]');
  await expect(slider).toBeFocused();
  await slider.scrollIntoViewIfNeeded();
  await expect(slider).toBeInViewport();
  await wrap.evaluate(node => { node.scrollTop = node.scrollHeight; node.scrollLeft = node.scrollWidth; });
  const priorScroll = await page.evaluate(() => ({ y: window.scrollY, x: document.querySelector('[data-physics-flight-table-wrap]')!.scrollLeft }));
  await page.keyboard.press('Home');
  await expect(page.locator('[data-physics-flight-summary="selected"]')).toHaveAttribute('data-sample-index', '0');
  await expect(slider).toBeFocused();
  const followed = await wrap.evaluate(node => {
    const row = node.querySelector('tr[data-selected="true"]')!.getBoundingClientRect();
    return { top: row.top, bottom: row.bottom, headerBottom: node.querySelector('thead')!.getBoundingClientRect().bottom, bottomBound: node.getBoundingClientRect().bottom, x: node.scrollLeft, pageY: window.scrollY };
  });
  expect(followed.top).toBeGreaterThanOrEqual(followed.headerBottom - 1);
  expect(followed.bottom).toBeLessThanOrEqual(followed.bottomBound + 1);
  expect(followed.x).toBe(priorScroll.x);
  expect(followed.pageY).toBe(priorScroll.y);
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(hint).toBeHidden();
  await expect(summary).toBeHidden();
});

test('near-apex canvas precision agrees with the selected record after launch controls change', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page);
  await setState(page, {
    angle: 45, velocity: 15, gravity: 9.8, launchHeight: 0, mass: 1, airResist: false,
    simSpeed: 1, showVectors: true, showEnergy: true, showFlightData: true, showGraphs: true,
  });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await finish(page);
  const before = await evidence(page);
  await page.locator('[data-physics-flight-table] [data-physics-sample-index]').first().click();
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const exactApex = (await readDraw(page)).selected;
  expect(exactApex).toMatchObject({ apex: true, phase: 'apex', vy: 0 });
  // Check the neighboring falling observation as well as the exact event.
  await page.locator('[data-physics-sample-next]').click();
  let draw = await readDraw(page);
  const selected = draw.selected;
  expect(Math.abs(selected.vy)).toBeGreaterThan(0.005);
  expect(Math.abs(selected.vy)).toBeLessThan(0.05);
  expect(selected.vy).toBeCloseTo(15 * Math.sin(Math.PI / 4) - 9.8 * selected.t, 9);
  expect(header(draw)).toContain('Recorded point');
  expect(header(draw)).toContain('t ' + selected.t.toFixed(3) + ' s');
  for (const [field, label] of [['vx', 'Vx'], ['vy', 'Vy']] as const) {
    const reading = selected[field].toFixed(2) + ' m/s';
    expect(header(draw)).toContain(label + ' ' + reading);
    await expect(page.locator(`[data-physics-measurement="${field}"] dd`)).toHaveText(reading);
    await expect(page.locator(`[data-physics-graph-selected="${field}"]`)).toContainText(reading);
  }
  expect(footer(draw)).toContain('Selected point');
  expectTextFits(draw);

  await setState(page, { angle: 80, velocity: 50, gravity: 25, launchHeight: 50, mass: 9, airResist: true });
  draw = await readDraw(page);
  expect(header(draw)).toContain('45°');
  expect(header(draw)).toContain('15 m/s');
  expect(header(draw)).toContain('Vy ' + selected.vy.toFixed(2) + ' m/s');
  expect(footer(draw)).toContain('Initial energy · ' + selected.initialEnergy.toFixed(0) + ' J');
  expect(draw.selected).toEqual(selected);
  expectTextFits(draw);
  await setState(page, { showVectors: false });
  draw = await readDraw(page);
  expect(header(draw)).toContain('x ' + selected.x.toFixed(2) + ' m');
  expect(header(draw)).toContain('y ' + selected.y.toFixed(2) + ' m');
  expectTextFits(draw);
  await page.locator('[data-physics-sample-close]').click();
  draw = await readDraw(page);
  expect(header(draw)).toContain('Next launch');
  expect(header(draw)).toContain('80°');
  expect(header(draw)).toContain('50 m/s');
  expect(footer(draw)).toContain('Latest flight · At impact');
  expect(footer(draw)).toContain('Initial energy · ' + selected.initialEnergy.toFixed(0) + ' J');
  expect(draw.preview).toMatchObject({ kind: 'preview', angle: 80, velocity: 50, gravity: 25, launchHeight: 50 });
  expect(draw.selected).toBeNull();
  expectTextFits(draw);
  expect(await evidence(page)).toEqual(before);
});

test('energy labels distinguish captured initial energy, live motion, impact, and an interrupted flight', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page);
  await setState(page, {
    angle: 35, velocity: 30, gravity: 9.8, launchHeight: 12, mass: 2, airResist: true,
    simSpeed: 0, showEnergy: true, showVectors: true, showFlightData: true,
  });
  const key = page.locator('[data-physics-plot-key]');
  await expect(key).toBeVisible();
  await expect(key).toContainText(/latest trail speed/i);
  await expect(key).toContainText(/white dashed.*vacuum reference/i);
  await expect(key).toContainText('60 m/s');
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  let draw = await readDraw(page);
  expect(header(draw)).toContain('Current flight');
  expect(header(draw)).toContain('Paused');
  expect(footer(draw)).toContain('Current flight');
  const initialEnergy = .5 * 2 * 30 ** 2 + 2 * 9.8 * 12;
  const initialLabel = 'Initial energy · ' + initialEnergy.toFixed(0) + ' J';
  expect(footer(draw)).toContain(initialLabel);
  expectTextFits(draw);
  await setState(page, { simSpeed: 1 });
  await finish(page);
  const landed = await evidence(page);
  expect(.5 * landed.ball.mass * landed.ball.speed ** 2).toBeLessThan(initialEnergy * .9);
  await setState(page, { angle: 80, velocity: 50, gravity: 25, launchHeight: 50, mass: 9, airResist: false });
  draw = await readDraw(page);
  expect(header(draw)).toContain('Next launch');
  expect(header(draw)).toContain('50 m/s');
  expect(footer(draw)).toContain('Latest flight · At impact');
  expect(footer(draw)).toContain(initialLabel);
  expectTextFits(draw);
  expect(await evidence(page)).toEqual(landed);

  // The next flight produces large signed readouts before ground contact.
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && cv._ball.mVy > -55 && ticks++ < 1000) w.__tickClarityPhysics(1000 / 60);
    if (!cv._launched || cv._ball.mVy > -55) throw new Error('The large signed-readout fixture was not reached');
  });
  await setState(page, { simSpeed: 0 });
  await page.locator('[data-physics-inspect]').click();
  draw = await readDraw(page);
  expect(draw.selected.vy).toBeLessThan(-55);
  expect(header(draw)).toContain('Vy ' + draw.selected.vy.toFixed(2) + ' m/s');
  expect(footer(draw)).toContain('Initial energy · 22500 J');
  expect(footer(draw)).toContain('Selected point');
  expectTextFits(draw);
  const interrupted = await evidence(page);
  await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._cancelFlight());
  draw = await readDraw(page);
  expect(draw.launched).toBe(false);
  expect(draw.ball.landed).toBe(false);
  expect(header(draw)).toContain('Next launch');
  expect(footer(draw)).toContain('Latest flight · Last recorded state');
  expect(footer(draw)).not.toContain('Latest flight · At impact');
  expect(footer(draw)).toContain('Initial energy · 22500 J');
  expectTextFits(draw);
  expect(await evidence(page)).toEqual(interrupted);
});
