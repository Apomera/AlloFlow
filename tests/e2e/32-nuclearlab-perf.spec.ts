import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Nuclear & Radiation Lab — render cost, measured.
 *
 * This tool grew from 14 sections to 18 across several passes and renders every
 * one at once: there are no tabs, so a state change anywhere re-runs the whole
 * component. That is deliberate — the topic index is navigation, not lazy
 * loading — but it means a slider drag costs a full document reconcile, and
 * nobody had put a number on it.
 *
 * The machine that matters is not this one, so everything below runs under a 6x
 * CPU throttle, which is roughly a school Chromebook against a dev laptop.
 *
 * What this found on its first run: the reactor panel was repainting at 60 fps
 * FOREVER — 121 full canvas redraws per two idle seconds, each a 240-point
 * polyline plus eleven text runs — on a section a student may never scroll to.
 * The animation loop was unconditional. That is now guarded, and the guard has
 * a test below, because it is invisible: nothing looks wrong, the battery just
 * goes.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_nuclearlab.js',
  toolId: 'nuclearLab',
  appStyles: true,
  width: 1100,
  height: 1400,
});

test.describe.configure({ timeout: 180_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

async function layout(page: any) {
  await page.evaluate(() => {
    const w = document.getElementById('wrap')!;
    w.style.display = 'block'; w.style.height = 'auto';
  });
  await page.waitForSelector('#wrap canvas', { timeout: 30000 });
}

async function mount2d(page: any, toolData: Record<string, unknown> = {}) {
  await harness.mount(page, toolData, undefined, { expectCanvas: false });
  await layout(page);
  await page.waitForTimeout(400);
}

/** Counts clearRect per canvas. Must be installed BEFORE mount: the reactor
 *  loop captures its 2D context once and never asks for it again. */
async function instrumentCanvases(page: any) {
  await page.evaluate(() => {
    (window as any).__clears = {};
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: any, ...a: any[]) {
      const real = orig.apply(this, a as any);
      if (!real || a[0] !== '2d') return real;
      const self = this;
      return new Proxy(real, {
        get(t: any, k) {
          if (k === 'clearRect') {
            const l = (self.getAttribute('aria-label') || 'unlabelled').slice(0, 24);
            (window as any).__clears[l] = ((window as any).__clears[l] || 0) + 1;
          }
          const v = t[k];
          return typeof v === 'function' ? v.bind(t) : v;
        },
        set(t: any, k, v) { t[k] = v; return true; },
      });
    } as any;
  });
}

test.describe('Nuclear Lab — render cost', () => {
  test('reports the size of what it renders', async ({ page }) => {
    await mount2d(page);
    const size = await page.evaluate(() => ({
      nodes: document.querySelectorAll('#wrap *').length,
      buttons: document.querySelectorAll('#wrap button').length,
      canvases: document.querySelectorAll('#wrap canvas').length,
      sections: document.querySelectorAll('#wrap [data-nk-sec]').length,
      heightPx: document.getElementById('wrap')!.scrollHeight,
    }));
    console.log('DOM size: ' + JSON.stringify(size));
    expect(size.sections).toBeGreaterThanOrEqual(18);
    // A guard rail, not a target: if this doubles, something is duplicating
    // rather than the tool having grown another section.
    expect(size.nodes, 'DOM node count has run away').toBeLessThan(6000);
  });

  test('the tool itself mounts quickly on a throttled CPU', async ({ page }) => {
    // Times the mount ALONE. An earlier version of this test timed
    // harness.mount, which also covers navigation, React UMD and parsing the
    // 3,400-line tool file — none of which is the tool's render cost, and all
    // of which made the number look far worse than it was.
    await harness.mount(page, {}, undefined, { expectCanvas: false });
    await layout(page);
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    const ms = await page.evaluate(async () => {
      (window as any).__destroy();
      const t = performance.now();
      (window as any).__mount({});
      // createRoot().render() is CONCURRENT: it schedules, it does not render.
      // Timing the call alone reported 1 ms and measured nothing but the
      // scheduling. Wait for the sections to actually exist in the document.
      for (let i = 0; i < 600; i++) {
        if (document.querySelectorAll('#wrap [data-nk-sec]').length >= 18) break;
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      return performance.now() - t;
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log('throttled mount (render + commit): ' + ms.toFixed(0) + ' ms');
    expect(ms, 'first render stalls on slow hardware').toBeLessThan(1500);
  });

  test('a slider drag stays responsive with every section on screen', async ({ page }) => {
    await mount2d(page);
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    const stats = await page.evaluate(async () => {
      const el = document.getElementById('nk-thick') as HTMLInputElement;
      if (!el) return null;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      const times: number[] = [];
      for (let i = 0; i < 12; i++) {
        const t = performance.now();
        setter.call(el, String(2 + i));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      return { median: Math.round(times[6]), worst: Math.round(times[times.length - 1]) };
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    expect(stats, 'shielding slider not found').toBeTruthy();
    console.log('throttled slider re-render ms: ' + JSON.stringify(stats));
    // At 6x this is roughly a Chromebook. Past ~150 ms a drag stops tracking
    // the thumb and starts feeling broken.
    expect(stats!.median, 'slider drag janks on slow hardware').toBeLessThan(150);
  });

  test('an untouched reactor panel does not repaint at all', async ({ page }) => {
    // The defect this suite was written to find. The loop must stay alive so
    // Start is instant, but a paused panel showing an unchanged picture has no
    // reason to redraw it sixty times a second.
    await page.goto(harness.url + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.nuclearLab);
    await instrumentCanvases(page);
    await page.evaluate(() => (window as any).__mount({}));
    await layout(page);
    await page.evaluate(() => { (window as any).__clears = {}; });
    await page.waitForTimeout(2000);
    const idle = await page.evaluate(() => (window as any).__clears);
    console.log('idle repaints over 2 s: ' + JSON.stringify(idle));
    const total = Object.values(idle).reduce((a: number, b: any) => a + b, 0);
    expect(total, 'something is repainting while nothing is happening').toBeLessThanOrEqual(2);
  });

  test('but it still redraws when the student changes something, and runs when started', async ({ page }) => {
    // The other half: an over-eager skip would freeze the panel. Moving the
    // rods while paused must repaint, and Start must restore 60 fps.
    await page.goto(harness.url + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.nuclearLab);
    await instrumentCanvases(page);
    await page.evaluate(() => (window as any).__mount({}));
    await layout(page);

    await page.evaluate(() => { (window as any).__clears = {}; });
    await page.locator('#rx-rods').fill('35');
    await page.waitForTimeout(500);
    const paused = await page.evaluate(() => (window as any).__clears);
    console.log('paused, rods moved: ' + JSON.stringify(paused));
    const pausedTotal = Object.values(paused).reduce((a: number, b: any) => a + b, 0);
    expect(pausedTotal, 'the panel froze — a rod move must still repaint it').toBeGreaterThanOrEqual(1);
    expect(pausedTotal, 'a single rod move should not restart the 60 fps loop').toBeLessThan(20);

    await page.evaluate(() => { (window as any).__clears = {}; });
    await page.getByLabel('Start the simulation').click();
    await page.waitForTimeout(2000);
    const running = await page.evaluate(() => (window as any).__clears);
    console.log('running for 2 s: ' + JSON.stringify(running));
    const key = Object.keys(running).find((k) => /Reactor/.test(k));
    expect(key, 'reactor panel never painted after Start').toBeTruthy();
    expect(running[key!], 'the simulation is not animating').toBeGreaterThan(50);
  });

  test('moving one slider does not repaint unrelated charts', async ({ page }) => {
    // Six chart canvases, each with its own effect and dep list. The shielding
    // slider feeds none of them.
    await page.goto(harness.url + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.nuclearLab);
    await instrumentCanvases(page);
    await page.evaluate(() => (window as any).__mount({}));
    await layout(page);
    await page.evaluate(() => { (window as any).__clears = {}; });
    await page.evaluate(async () => {
      const el = document.getElementById('nk-thick') as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, '9');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
    });
    const clears = await page.evaluate(() => (window as any).__clears);
    console.log('canvas clears after moving the SHIELDING slider: ' + JSON.stringify(clears));
    const total = Object.values(clears).reduce((a: number, b: any) => a + b, 0);
    expect(total, 'unrelated charts repainted: ' + JSON.stringify(clears)).toBeLessThanOrEqual(1);
  });
});

test.describe('Nuclear Lab — the sticky index must not eat the screen', () => {
  // Measured, not assumed. On a 390 px phone the expanded index took 48% of the
  // viewport before the question routes existed and 55% after — half the screen,
  // permanently, for navigation. It now defaults closed on a narrow viewport and
  // folds itself after a jump. This is the budget that keeps it that way.
  for (const [name, state, maxPct] of [
    ['default', {}, 20],
    ['on a route', { nkPath: 'safe' }, 20],
    ['forced open', { nkOpen: true }, 55],
  ] as const) {
    test(`phone, ${name}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await harness.mount(page, { _nuclearLab: state }, undefined, { expectCanvas: false });
      await page.evaluate(() => {
        const w = document.getElementById('wrap')!;
        w.style.display = 'block'; w.style.height = 'auto'; w.style.width = '390px';
      });
      await page.waitForSelector('#wrap canvas', { timeout: 30000 });
      const m = await page.evaluate(() => {
        const nav = document.querySelector('#wrap nav[aria-label="Nuclear lab topics"]') as HTMLElement;
        return { nav: Math.round(nav.getBoundingClientRect().height), vh: window.innerHeight };
      });
      const pct = Math.round((100 * m.nav) / m.vh);
      console.log(`phone ${name}: sticky index ${m.nav}px of ${m.vh}px = ${pct}%`);
      expect(pct, `sticky index takes ${pct}% of a phone screen`).toBeLessThanOrEqual(maxPct);
    });
  }
});

test.describe('Nuclear Lab — knowing where you are', () => {
  // The scroll-spy is written imperatively, outside React, so that crossing a
  // section boundary does not re-render nineteen sections. That means jsdom
  // never sees it (no effects, no IntersectionObserver, no layout) and this is
  // the only place it can be checked at all.
  test('marks the section being read, and only one', async ({ page }) => {
    await mount2d(page, { _nuclearLab: { nkOpen: true } });
    const readCurrent = () => page.evaluate(() => {
      const on = [...document.querySelectorAll('[data-nk-jump][aria-current]')];
      return on.map((e) => e.getAttribute('data-nk-jump'));
    });

    await page.evaluate(() => document.getElementById('nksec-halflife')!.scrollIntoView());
    await page.waitForTimeout(600);
    const first = await readCurrent();
    console.log('after scrolling to halflife: ' + JSON.stringify(first));
    expect(first.length, 'no section marked, or more than one').toBe(1);

    await page.evaluate(() => document.getElementById('nksec-waste')!.scrollIntoView());
    await page.waitForTimeout(600);
    const second = await readCurrent();
    console.log('after scrolling to waste: ' + JSON.stringify(second));
    expect(second.length).toBe(1);
    expect(second[0], 'the highlight did not follow the scroll').not.toBe(first[0]);
  });

  test('costs no re-render — the spy must not go through React', async ({ page }) => {
    // If the highlight were React state, every boundary crossed would rebuild
    // the document. Proxy the canvases: a full re-render re-runs the chart
    // effects, so any repaint here means the spy is doing far more than it
    // should.
    await page.goto(harness.url + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.nuclearLab);
    await instrumentCanvases(page);
    await page.evaluate(() => (window as any).__mount({ _nuclearLab: { nkOpen: true } }));
    await layout(page);
    await page.evaluate(() => { (window as any).__clears = {}; });
    await page.evaluate(async () => {
      for (const id of ['nksec-halflife', 'nksec-binding', 'nksec-waste', 'nksec-compare']) {
        document.getElementById(id)!.scrollIntoView();
        await new Promise((r) => setTimeout(r, 250));
      }
    });
    const clears = await page.evaluate(() => (window as any).__clears);
    console.log('canvas clears while scrolling four sections: ' + JSON.stringify(clears));
    const total = Object.values(clears).reduce((a: number, b: any) => a + b, 0);
    expect(total, 'scrolling triggered chart redraws — the spy is re-rendering').toBeLessThanOrEqual(1);
  });

  test('a route can be walked from the sections themselves', async ({ page }) => {
    await mount2d(page, { _nuclearLab: { nkPath: 'know', nkOpen: false } });
    const foot = page.locator('#nksec-detect').getByText(/STEP 1 OF 3/);
    await expect(foot).toBeVisible();
    // Follow the route forward without touching the index.
    await page.locator('#nksec-detect').getByRole('button', { name: /On to step 2/ }).click();
    await page.waitForTimeout(600);
    await expect(page.locator('#nksec-dating').getByText(/STEP 2 OF 3/)).toBeVisible();
    await page.locator('#nksec-dating').getByRole('button', { name: /On to step 3/ }).click();
    await page.waitForTimeout(600);
    await expect(page.locator('#nksec-chain').getByText(/End of this route/)).toBeVisible();
  });
});
