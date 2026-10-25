import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Range explorer in real React and real layout: predict-then-reveal, the sweep
// against flights the canvas actually flies, the gravity fit, every theme, and
// a phone-width column.
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1000, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, gradeLevel = '10th Grade') {
  await page.addInitScript(() => {
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    (window as any).__tick = (ms: number) => {
      now += ms;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(g => { (window as any).__ctx.gradeLevel = g; (window as any).__rerender(); }, gradeLevel);
}
async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), patch);
  await page.waitForTimeout(60);
}
async function launchAndLand(page: Page) {
  await page.getByRole('button', { name: 'Launch!' }).click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    let count = 0;
    while (cv._launched && count++ < 20000) (window as any).__tick(1000 / 60);
  });
  await page.waitForTimeout(80);
}

test('prediction gates the curve, and the curve matches flights the canvas flies', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false, simSpeed: 1 });
  await page.locator('[data-physics-view="range"]').click();
  const panel = page.locator('[data-physics-range-explorer]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-physics-range-chart]')).toHaveCount(0);
  await expect(page.locator('[data-physics-view="range"]')).toBeFocused();
  await panel.locator('[data-physics-range-submit]').isDisabled().then(v => expect(v).toBe(true));
  await page.locator('#physics-range-prediction').fill('40');
  await page.keyboard.press('Enter');
  await expect(panel.locator('[data-physics-range-chart]')).toBeVisible();
  await expect(panel.locator('[data-physics-range-feedback]')).toContainText('You predicted 40°');
  await expect(panel.locator('[data-physics-range-feedback]')).toContainText('45.0°');
  await expect(panel.locator('[data-physics-range-curve]')).toHaveCount(1);

  // Inspect 32°, send it to the launcher, fly it: the logged range equals the curve.
  const slider = panel.locator('[data-physics-range-inspect-slider]');
  // Locking in 40° puts the inspector on the predicted angle.
  await expect(slider).toHaveValue('40');
  await slider.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
  await expect(panel.locator('[data-physics-range-reading]')).toContainText('At 32°');
  await panel.locator('[data-physics-range-apply]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.physics.angle)).toBe(32);
  await launchAndLand(page);
  const check = await page.evaluate(() => {
    const p = (window as any).__ctx.toolData.physics;
    const sweep = (window as any).StemLab._physics.rangeSweep(25, 9.8, false, 1, 0);
    return { logged: p.lastFlight.range, curve: sweep.points.find((q: any) => q.angle === 32).range };
  });
  expect(Math.abs(check.logged - check.curve)).toBeLessThan(1e-6);
  await expect(panel.locator('[data-physics-range-run]')).toHaveCount(1);

  // Drag on: new settings ask for a new prediction; skipping shows both curves.
  await setState(page, { airResist: true });
  await expect(panel.locator('[data-physics-range-chart]')).toHaveCount(0);
  await panel.locator('[data-physics-range-skip]').click();
  await expect(panel.locator('[data-physics-range-curve]')).toHaveCount(2);
  await expect(panel.locator('[data-physics-range-findings]')).toContainText('Air drag moves the peak lower');
});

test('fits g from three logged vacuum flights and explains a drag flight it leaves out', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 45, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false, simSpeed: 1, showRangeExplorer: true });
  for (const velocity of [15, 25, 35]) { await setState(page, { velocity }); await launchAndLand(page); }
  await setState(page, { velocity: 30, airResist: true });
  await launchAndLand(page);
  await setState(page, { airResist: false, velocity: 25 });
  const panel = page.locator('[data-physics-range-explorer]');
  await panel.locator('[data-physics-range-skip]').click();
  await expect(panel.locator('[data-physics-range-fit-result]')).toContainText('g = 1 ÷ slope = 9.80 m/s²');
  await expect(panel.locator('[data-physics-range-fit-point][data-in-fit="true"]')).toHaveCount(3);
  await expect(panel.locator('[data-physics-range-fit-point][data-in-fit="false"]')).toHaveCount(1);
  await expect(panel.locator('[data-physics-range-fit-excluded]')).toContainText('air drag was on');
});

test('text and chart marks stay readable in default, dark and contrast themes', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: true, showRangeExplorer: true, rangeExplorer: { revealedFor: '25|9.8|drag|1|0', prediction: 40, predictedFor: '25|9.8|drag|1|0' } });
  await expect(page.locator('[data-physics-range-chart]')).toBeVisible();
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap') as HTMLElement;
    const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap);
    const card = document.createElement('div'); main.appendChild(card); card.appendChild(wrap);
    (window as any).__setTheme = (t: string) => {
      const ctx = (window as any).__ctx;
      ctx.isDark = t === 'dark'; ctx.isContrast = t === 'contrast';
      main.className = t === 'default' ? '' : 'theme-' + t;
      card.setAttribute('style', t === 'dark' ? 'background:#ffffff;color:#0f172a;color-scheme:light' : t === 'contrast' ? 'background:#000000;color:#ffffff' : '');
      (window as any).__rerender();
    };
  });
  for (const theme of ['default', 'dark', 'contrast']) {
    await page.evaluate(t => (window as any).__setTheme(t), theme);
    await page.waitForTimeout(250);
    const result = await page.evaluate(() => {
      const rgb = (s: string) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return p.length > 3 && p[3] < .9 ? null : p.slice(0, 3); };
      const lum = (c: number[]) => { const v = c.map(x => { x /= 255; return x <= .04045 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
      const ratio = (a: number[], b: number[]) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); };
      const bgOf = (el: Element | null): number[] | null => { while (el && el !== document.documentElement) { const c = rgb(getComputedStyle(el).backgroundColor); if (c) return c; el = el.parentElement; } return null; };
      const root = document.querySelector('[data-physics-range-explorer]')!;
      const failures: string[] = []; let text = 0, marks = 0;
      root.querySelectorAll('p,li,span,label,summary,h4,h5,button,th,td').forEach(el => {
        if (!(el.textContent || '').trim() || el.closest('svg')) return;
        const fg = rgb(getComputedStyle(el).color), bg = bgOf(el); if (!fg || !bg) return;
        text++; const r = ratio(fg, bg); if (r < 4.5) failures.push(`${(el.textContent || '').slice(0, 30)} ${r.toFixed(2)}`);
      });
      root.querySelectorAll('svg[data-physics-range-chart] text, svg[data-physics-range-chart] path, svg[data-physics-range-chart] circle').forEach(el => {
        const cs = getComputedStyle(el), bg = bgOf(el.closest('svg'));
        // A hollow marker (fill = the surface) is drawn by its ring.
        const hollow = el.tagName === 'circle' && (cs.fill === 'none' || String(rgb(cs.fill)) === String(bg));
        const fg = rgb(el.tagName === 'path' || hollow ? cs.stroke : cs.fill);
        if (!fg || !bg) return;
        marks++; const r = ratio(fg, bg); const need = el.tagName === 'text' ? 4.5 : 3;
        // A filled marker ringed in the surface colour is judged by its fill.
        if (r < need) failures.push(`${el.tagName} ${(el.textContent || '').slice(0, 20)} ${r.toFixed(2)}`);
      });
      return { failures, text, marks };
    });
    expect(result.text, `${theme}: measurable text`).toBeGreaterThan(10);
    expect(result.marks, `${theme}: measurable chart marks`).toBeGreaterThan(8);
    expect(result.failures, theme).toEqual([]);
  }
});

test('fits a phone-width column without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page);
  await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '358px'; });
  await setState(page, { showRangeExplorer: true, airResist: true, rangeExplorer: { revealedFor: '25|9.8|drag|1|0' } });
  const panel = page.locator('[data-physics-range-explorer]');
  await expect(panel.locator('[data-physics-range-chart]')).toBeVisible();
  const box = await panel.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, width: el.getBoundingClientRect().width }));
  expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
  expect(box.width).toBeLessThanOrEqual(360);
  const target = await panel.locator('[data-physics-range-apply]').boundingBox();
  expect(target!.height).toBeGreaterThanOrEqual(44);
  // The chart scales down to the column; its labels must not shrink below 11 px.
  const smallest = await panel.locator('[data-physics-range-chart] text').evaluateAll(nodes =>
    Math.min(...nodes.map(n => n.getBoundingClientRect().height)));
  expect(smallest).toBeGreaterThanOrEqual(11);
});
