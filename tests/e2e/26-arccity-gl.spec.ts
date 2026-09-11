// Arc City — the optional Three.js views, driven in a real (SwiftShader) Chromium.
//
// The mock-React harness (tests/arc_city_*.test.js) proves the 3D components mount
// only on request and receive plain data; it never runs their GL. This spec does:
// the Play "City view" gets a live context, rasterises, orbits on drag, draws the
// fired beam, and releases when toggled off; the Circuit Clash arena still mounts.
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Screenshots for eyeballing: test-results/ is wiped between runs, so allow an override.
const SHOT_DIR = process.env.ARC_SHOT_DIR || 'test-results';

test.describe.configure({ timeout: 150_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_arccity.js',
  toolId: 'arccity',
  width: 1100,
  height: 1200,
});

const PLAY = { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], fired: false, city3d: true };

function trackErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  return errs;
}

async function cityCanvas(page: Page) {
  await page.waitForFunction(() => {
    const box = document.querySelector('.arc-city3d');
    return !!box && !box.querySelector('[role="status"]');
  }, null, { timeout: 45000 });
  return page.locator('.arc-city3d canvas');
}

test.describe('Arc City — Play 3D city view', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('mounts a live scene that rasterises and orbits on drag', async ({ page }) => {
    const errs = trackErrors(page);
    await harness.mount(page, { _arccity: PLAY });
    const canvas = await cityCanvas(page);
    const live = await page.evaluate(() => (window as any).__glLive('.arc-city3d'));
    expect(live).not.toBeNull();
    expect(live.lost).toBe(false);
    expect(live.box.w).toBeGreaterThan(300);
    expect(live.box.h).toBeGreaterThan(200);

    const before = await canvas.screenshot();
    // Not a blank canvas: a solid fill compresses to almost nothing.
    expect(before.length).toBeGreaterThan(4000);

    const bb = (await canvas.boundingBox())!;
    await page.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height * 0.4, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);

    const postfx = await page.evaluate(() => !!((window as any).THREE && (window as any).THREE.UnrealBloomPass));
    console.log('[arccity-gl] bloom addons loaded: ' + postfx);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('firing draws the beam into the scene', async ({ page }) => {
    const errs = trackErrors(page);
    await harness.mount(page, { _arccity: PLAY });
    const canvas = await cityCanvas(page);
    await page.waitForTimeout(600);
    const before = await canvas.screenshot();
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(1200); // draw-on completes in ~520ms
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
    const fired = await page.evaluate(() => (window as any).__toolData._arccity.fired);
    expect(fired).toBe(true);
    await canvas.screenshot({ path: SHOT_DIR + '/arccity-city3d-fired.png' });
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('a hit celebrates when the beam reaches the node', async ({ page }) => {
    const errs = trackErrors(page);
    // L3 "Clear the Wall": a=-0.5,h=5,k=5 is a known hit (pinned in arc_city_golden); the default is blocked by the wall.
    const L3 = { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true }, L3: { params: { a: -0.5, h: 5, k: 5 } } }, tier: 'practice', badges: [], fired: false, city3d: true };
    await harness.mount(page, { _arccity: L3 });
    const canvas = await cityCanvas(page);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(650); // draw-on done, burst in flight
    await canvas.screenshot({ path: SHOT_DIR + '/arccity-city3d-hit.png' });
    const st = await page.evaluate(() => (window as any).__toolData._arccity);
    expect(st.fired).toBe(true);
    expect(st.byLevel.L3.solved).toBe(true);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('a blocked shot shows its impact at the wall', async ({ page }) => {
    const errs = trackErrors(page);
    const blocked = { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [], fired: false, city3d: true };
    await harness.mount(page, { _arccity: blocked });
    const canvas2 = await cityCanvas(page);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(700);
    await canvas2.screenshot({ path: SHOT_DIR + '/arccity-city3d-blocked.png' });
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('the camera can be driven from the keyboard, not only by dragging', async ({ page }) => {
    // Orbiting used to be pointer-drag only, so a keyboard-only or switch user could
    // open this view and never move it. Each button is exercised by PRESSING it with
    // the keyboard, which is the thing that was missing — a click would not prove it.
    const errs = trackErrors(page);
    await harness.mount(page, { _arccity: PLAY });
    const canvas = await cityCanvas(page);
    await page.waitForTimeout(600);

    const turn = page.getByRole('button', { name: /Turn the city view right/ });
    await expect(turn).toBeEnabled();
    const before = await canvas.screenshot();
    await turn.press('Enter');
    await page.waitForTimeout(400);
    expect(Buffer.compare(before, await canvas.screenshot()), 'keyboard orbit must move the camera').not.toBe(0);
    // The pressed control keeps focus, so a second press does not need re-navigation.
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toMatch(/Turn the city view right/);

    for (const name of [/Turn the city view left/, /Raise the city view/, /Lower the city view/, /Reset the city view angle/]) {
      const shot = await canvas.screenshot();
      await page.getByRole('button', { name }).press('Enter');
      await page.waitForTimeout(350);
      expect(Buffer.compare(shot, await canvas.screenshot()), String(name)).not.toBe(0);
    }
    await canvas.screenshot({ path: SHOT_DIR + '/arccity-city3d-camera.png' });
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('toggling the view off unmounts the canvas', async ({ page }) => {
    await harness.mount(page, { _arccity: PLAY });
    await cityCanvas(page);
    await page.getByRole('button', { name: /3D city view is on/ }).click();
    await page.waitForFunction(() => !document.querySelector('.arc-city3d'), null, { timeout: 10000 });
    expect(await page.evaluate(() => (window as any).__toolData._arccity.city3d)).toBe(false);
    await page.getByRole('button', { name: /Show the 3D city view/ }).click();
    await cityCanvas(page);
  });
});

test.describe('Arc City — 3D city view on the contrast theme', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  // The scene used to be hard-wired to the dark palette, so a student on the contrast
  // theme got the neon-haze build: atmosphere over edges, which is backwards for that
  // audience. This proves the contrast scene reaches a live context AND rasterises to
  // something genuinely different, rather than merely receiving a different flag.
  test('renders a live scene that differs from the dark-theme one', async ({ page }) => {
    const errs = trackErrors(page);
    const L3 = { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [], fired: false, city3d: true };

    async function shoot(themeClass: string, file: string) {
      await page.goto(`${harness.url}/__harness`);
      if (themeClass) await page.evaluate((c) => { document.body.classList.add(c); }, themeClass);
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
      await page.evaluate((d) => (window as any).__mount(d), { _arccity: L3 });
      const canvas = await cityCanvas(page);
      await page.waitForTimeout(1000);
      const live = await page.evaluate(() => (window as any).__glLive('.arc-city3d'));
      expect(live, themeClass || 'dark').not.toBeNull();
      expect(live.lost, 'context must be live on ' + (themeClass || 'default')).toBe(false);
      const shot = await canvas.screenshot(file ? { path: SHOT_DIR + '/' + file } : {});
      await harness.destroy(page);
      return shot;
    }

    const contrast = await shoot('theme-contrast', 'arccity-city3d-contrast.png');
    const dark = await shoot('theme-dark', '');
    expect(contrast.length).toBeGreaterThan(4000);
    expect(Buffer.compare(contrast, dark), 'the contrast scene must not be the dark scene').not.toBe(0);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });
});

test.describe('Arc City — Circuit Clash arena on the contrast theme', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  // Same defect the city view had: hard-wired to the dark palette, so the contrast
  // theme got haze, bloom and neon lane colours. Two-player mode is where lane colour
  // carries meaning, so the substitute triple has to survive to the rasteriser.
  test('renders a live arena that differs from the dark-theme one', async ({ page }) => {
    const errs = trackErrors(page);
    const BATTLE = { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle3d: true };

    async function shoot(themeClass: string, file: string) {
      await page.goto(`${harness.url}/__harness`);
      await page.evaluate((c) => { document.body.classList.add(c); }, themeClass);
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
      await page.evaluate((d) => (window as any).__mount(d), { _arccity: BATTLE });
      await page.waitForFunction(() => {
        const st = Array.from(document.querySelectorAll('[role="status"]')).map((n) => n.textContent || '');
        return document.querySelector('#wrap canvas') && !st.some((s) => /Loading the optional 3D arena|3D unavailable/.test(s));
      }, null, { timeout: 45000 });
      await page.waitForTimeout(900);
      const live = await page.evaluate(() => (window as any).__glLive());
      expect(live, themeClass).not.toBeNull();
      expect(live.lost, 'context must be live on ' + themeClass).toBe(false);
      const shot = await page.locator('#wrap canvas').first().screenshot(file ? { path: SHOT_DIR + '/' + file } : {});
      await harness.destroy(page);
      return shot;
    }

    const contrast = await shoot('theme-contrast', 'arccity-battle3d-contrast.png');
    const dark = await shoot('theme-dark', '');
    expect(contrast.length).toBeGreaterThan(4000);
    expect(Buffer.compare(contrast, dark), 'the contrast arena must not be the dark arena').not.toBe(0);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });
});

test.describe('Arc City — 2D board (dark theme polish)', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  // Idle GPU cost. The city view's frame loop is supposed to render ONLY when something
  // moved or changed (motion || dirty) — the reason it can be left open on a Chromebook.
  // That was asserted in a comment and never measured. Count real renderer.render
  // calls: with Calm on (idle motion off) and nothing happening, the count must stay
  // near zero; firing must produce a burst; the loop must go quiet again afterwards;
  // and — the control — with Calm off the same scene DOES render continuously.
  test('the 3D loop renders only when something changes', async ({ page }) => {
    const errs = trackErrors(page);

    async function mountCounting(calm: boolean) {
      await page.goto(`${harness.url}/__harness`);
      await page.evaluate(() => {
        document.body.classList.add('theme-dark');
        document.documentElement.style.background = '#0f172a';
        document.body.style.background = '#0f172a';
        // Wrap the renderer BEFORE the tool builds one. The bloom composer's RenderPass
        // calls renderer.render internally, so this counts both the plain and the
        // post-processed paths. NOTE: in three r128 `render` is assigned on the INSTANCE
        // inside the constructor, not on the prototype — a prototype patch counts
        // nothing and silently made the first version of this test report 0 everywhere.
        // So wrap the constructor and patch each instance as it is built.
        const T = (window as any).THREE;
        const Orig = T.WebGLRenderer;
        (window as any).__renders = 0;
        const Wrapped = function (this: unknown, ...a: unknown[]) {
          const r = new Orig(...a);
          const o = r.render;
          r.render = function (...b: unknown[]) { (window as any).__renders++; return o.apply(r, b); };
          return r;
        } as unknown as typeof Orig;
        (Wrapped as any).prototype = Orig.prototype;
        T.WebGLRenderer = Wrapped;
      });
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
      await page.evaluate((c) => (window as any).__mount({ _arccity: { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true }, L3: { params: { a: -0.5, h: 5, k: 5 } } }, tier: 'practice', badges: [], city3d: true, calm: c } }), calm);
      await cityCanvas(page);
      await page.waitForTimeout(2500); // bloom addons arrive and trigger one re-render; let that pass
    }
    const renders = () => page.evaluate(() => (window as any).__renders as number);
    const inView = () => page.locator('.arc-city3d canvas').scrollIntoViewIfNeeded().then(() => page.waitForTimeout(400));

    // 0. Scrolled OUT of view — which is where the canvas sits in this viewport, under
    //    the board — the loop must not render at all, even with idle motion ON. This is
    //    the IntersectionObserver gate, and it is the bigger Chromebook win: a student
    //    reading the sliders with the city off-screen pays nothing for it. (It also
    //    explains why a naive version of this test read 0 renders and looked broken:
    //    the pause was working.)
    await mountCounting(false);
    const o0 = await renders();
    await page.waitForTimeout(2000);
    const offscreen = (await renders()) - o0;
    expect(offscreen, 'off-screen, the loop must be paused (2s window)').toBeLessThanOrEqual(2);

    // 4 (control, moved up). Scroll it into view with Calm OFF: the idle sway is live,
    //    so now the same window must be busy. Without this, a loop that never renders
    //    would pass every "quiet" assertion below.
    await inView();
    const c0 = await renders();
    await page.waitForTimeout(2000);
    const busy = (await renders()) - c0;
    expect(busy, 'in view with idle motion on, the loop renders continuously').toBeGreaterThan(20);
    await harness.destroy(page);

    // 1. Calm on, in view, nothing happening: the loop must be idle.
    await mountCounting(true);
    await inView();
    const t0 = await renders();
    await page.waitForTimeout(2000);
    const idle = (await renders()) - t0;
    expect(idle, 'an idle calm scene must not keep re-rendering (2s window)').toBeLessThanOrEqual(3);

    // 2. Firing animates the draw-on, so it must render a burst of frames...
    const t1 = await renders();
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await inView();
    await page.waitForTimeout(700);
    const burst = (await renders()) - t1;
    expect(burst, 'the draw-on must actually render frames').toBeGreaterThan(10);

    // 3. ...and then go quiet again.
    await page.waitForTimeout(1500);
    const t2 = await renders();
    await page.waitForTimeout(2000);
    const after = (await renders()) - t2;
    expect(after, 'the loop must settle after the shot, not keep spinning').toBeLessThanOrEqual(3);
    await harness.destroy(page);

    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  // Reduced motion. Every animated thing added to this tool is supposed to be gated on
  // prefers-reduced-motion, and that claim had never actually been RUN — only asserted.
  // Two things have to hold at once, and they pull in opposite directions: an idle
  // scene must be genuinely still, and a fired shot must still SHOW its beam. "No
  // animation" must not quietly become "no information".
  test('honours prefers-reduced-motion without losing information', async ({ page }) => {
    const errs = trackErrors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const seed = { _arccity: { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true }, L3: { params: { a: -0.5, h: 5, k: 5 } } }, tier: 'practice', badges: [], city3d: true } };
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(() => {
      document.body.classList.add('theme-dark');
      document.documentElement.style.background = '#0f172a';
      document.body.style.background = '#0f172a';
    });
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
    await page.evaluate((d) => (window as any).__mount(d), seed);

    const canvas = await cityCanvas(page);
    await page.waitForTimeout(1200); // let anything that WOULD drift start drifting

    // 1. An idle 3D scene must be still. Camera sway, motes, traffic, beacon blink and
    //    the node ping are all idle-only motion, so two frames a second apart must be
    //    byte-identical. This is the assertion that actually tests the gate.
    const a = await canvas.screenshot();
    await page.waitForTimeout(1100);
    const b = await canvas.screenshot();
    expect(Buffer.compare(a, b), 'an idle scene must not move under reduced motion').toBe(0);

    // 2. Firing must still change the scene: the beam is drawn immediately instead of
    //    animating on, and the node still lights.
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(900);
    const fired = await canvas.screenshot();
    expect(Buffer.compare(b, fired), 'a fired shot must still be drawn').not.toBe(0);
    await page.screenshot({ path: SHOT_DIR + '/arccity-reduced-motion.png', fullPage: false });

    // 3. ...and having fired, the scene must settle again rather than keep animating.
    await page.waitForTimeout(1000);
    const settled1 = await canvas.screenshot();
    await page.waitForTimeout(1100);
    const settled2 = await canvas.screenshot();
    expect(Buffer.compare(settled1, settled2), 'the scene must settle after the shot').toBe(0);

    // 4. The 2D board must still carry the outcome in marks and words, not motion:
    //    the node lights, the gates turn, and the result is stated in text.
    const board = await page.evaluate(() => {
      const svg = document.querySelector('#wrap svg');
      return {
        celebration: !!svg?.querySelector('.arccity-pop'),
        beam: !!svg?.querySelector('polyline[class*="beam"]'),
        text: (document.getElementById('wrap')?.innerText || '')
      };
    });
    expect(board.beam, 'the beam is on the board').toBe(true);
    expect(board.celebration, 'the celebration mark is present, it simply does not animate').toBe(true);
    expect(board.text, 'and the outcome is stated in words').toMatch(/Lit!|reached the node/i);

    await harness.destroy(page);

    // 5. The control. "Two identical frames" would also be satisfied by a scene that
    //    never renders at all, so prove the stillness comes from the PREFERENCE: the
    //    same scene, same waits, without it — and this time the frames must differ.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(() => {
      document.body.classList.add('theme-dark');
      document.documentElement.style.background = '#0f172a';
      document.body.style.background = '#0f172a';
    });
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
    await page.evaluate((d) => (window as any).__mount(d), seed);
    const liveCanvas = await cityCanvas(page);
    await page.waitForTimeout(1200);
    const m1 = await liveCanvas.screenshot();
    await page.waitForTimeout(1100);
    const m2 = await liveCanvas.screenshot();
    expect(Buffer.compare(m1, m2), 'without the preference the same idle scene DOES animate').not.toBe(0);

    await harness.destroy(page);
    await page.emulateMedia({ reducedMotion: null });
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  // Rendered text contrast. The tool pins its own --allo-stem-* tokens for all three
  // themes, so unlike most STEM tools its text IS measurable in this harness without
  // the host stylesheet. Lots of secondary text here is dimmed with opacity (0.7-0.85),
  // and opacity multiplies against whatever is behind it — which is exactly the kind of
  // thing a palette review misses, because the token itself passes.
  test('rendered text meets contrast in every theme', async ({ page }) => {
    const errs = trackErrors(page);

    async function audit(themeClass: string, bg: string, seed: Record<string, unknown>) {
      await page.goto(`${harness.url}/__harness`);
      await page.evaluate(([c, b]) => {
        if (c) document.body.classList.add(c);
        document.documentElement.style.background = b;
        document.body.style.background = b;
        document.body.style.height = 'auto';
        const wrap = document.getElementById('wrap');
        if (wrap) { wrap.style.height = 'auto'; wrap.style.display = 'block'; wrap.style.background = b; }
      }, [themeClass, bg]);
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
      await page.evaluate((d) => (window as any).__mount(d), seed);
      await page.waitForTimeout(400);

      return page.evaluate(() => {
        const parse = (c: string) => {
          const m = c.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const p = m[1].split(',').map((x) => parseFloat(x));
          return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
        };
        const over = (fg: any, bg: any, alpha: number) => ({
          r: fg.r * alpha + bg.r * (1 - alpha),
          g: fg.g * alpha + bg.g * (1 - alpha),
          b: fg.b * alpha + bg.b * (1 - alpha)
        });
        const lum = (c: any) => {
          const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
          return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
        };
        const ratio = (a: any, b: any) => {
          const l1 = lum(a), l2 = lum(b);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        };

        const out: Array<Record<string, unknown>> = [];
        let checked = 0;
        const root = document.getElementById('wrap')!;
        root.querySelectorAll('*').forEach((el) => {
          const e = el as HTMLElement;
          // Only elements with their OWN visible text, so a wrapper is not blamed
          // for its children's colours.
          const own = Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent || '').join('').trim();
          if (!own) return;
          if (e.closest('svg')) return;              // the board is graphics, judged elsewhere
          const r = e.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          const cs = getComputedStyle(e);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          // WCAG 1.4.3 exempts text that is part of an INACTIVE control. Locked level
          // tiles and other disabled controls are dimmed on purpose, so measuring them
          // against the active-text threshold would report a rule that does not apply.
          // (Their legibility is still worth improving — that is a design call, made
          // separately, not something to launder through a contrast assertion.)
          if (e.closest('button:disabled,select:disabled,input:disabled')) return;

          // Accumulated opacity down the ancestor chain, then the first opaque backdrop.
          let alpha = 1;
          for (let n: HTMLElement | null = e; n; n = n.parentElement) {
            alpha *= parseFloat(getComputedStyle(n).opacity);
            if (n === document.body) break;
          }
          // Find the first opaque backdrop. If anything in the chain paints a gradient
          // or image, stop and treat the element as UNMEASURABLE rather than walking
          // past it to a deeper background — doing that reported the Fire button, whose
          // dark label sits on a bright cyan gradient, as 1.12:1. A wrong number is
          // worse than no number, because it gets filed as a defect.
          let backdrop = null as any;
          let unmeasurable = false;
          for (let n: HTMLElement | null = e; n; n = n.parentElement) {
            const ncs = getComputedStyle(n);
            if (ncs.backgroundImage && ncs.backgroundImage !== 'none') { unmeasurable = true; break; }
            const c = parse(ncs.backgroundColor);
            if (c && c.a > 0.92) { backdrop = c; break; }
            if (n === document.body) break;
          }
          if (unmeasurable || !backdrop) return;     // cannot know what is behind it
          const fg = parse(cs.color);
          if (!fg) return;
          checked++;
          const size = parseFloat(cs.fontSize);
          const bold = parseInt(cs.fontWeight, 10) >= 700;
          const large = size >= 24 || (bold && size >= 18.66);
          const need = large ? 3 : 4.5;
          const got = ratio(over(fg, backdrop, alpha * fg.a), backdrop);
          if (got < need - 0.05) {
            out.push({ text: own.slice(0, 34), size: Math.round(size), need, got: Math.round(got * 100) / 100, color: cs.color, alpha: Math.round(alpha * 100) / 100 });
          }
        });
        return { out, checked };
      });
    }

    const play = { _arccity: { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [] } };
    for (const [cls, bg] of [['', '#ffffff'], ['theme-dark', '#0f172a'], ['theme-contrast', '#000000']] as const) {
      const { out, checked } = await audit(cls, bg, play);
      expect(checked, (cls || 'light') + ' must have text to measure').toBeGreaterThan(10);
      expect(out, (cls || 'light') + ': text below its WCAG minimum').toEqual([]);
      await harness.destroy(page);
    }
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  // Two things a keyboard or screen-reader user depends on, neither previously checked
  // beyond this tool's default view: every control must SAY what it is, and the focused
  // control must be visibly marked. Several controls here are a bare glyph — 🏙️, 🌙,
  // 🔇, ◀ — so their names live entirely in aria-label and nothing was guarding that.
  test('every control names itself, and focus is visible when tabbing', async ({ page }) => {
    const errs = trackErrors(page);

    async function mount(seed: Record<string, unknown>) {
      await page.goto(`${harness.url}/__harness`);
      await page.evaluate(() => {
        document.body.classList.add('theme-dark');
        document.documentElement.style.background = '#0f172a';
        document.body.style.background = '#0f172a';
        document.body.style.height = 'auto';
        const wrap = document.getElementById('wrap');
        if (wrap) { wrap.style.height = 'auto'; wrap.style.display = 'block'; }
      });
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
      await page.evaluate((d) => (window as any).__mount(d), seed);
      await page.waitForTimeout(400);
    }

    const views: Array<[string, Record<string, unknown>]> = [
      ['play', { _arccity: { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [], city3d: true } }],
      ['battle', { _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle' } }],
      ['teacher', { _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: { L1: { solved: true } }, tier: 'practice', badges: [], view: 'teacher' } }]
    ];

    for (const [name, seed] of views) {
      await mount(seed);
      const nameless = await page.evaluate(() => {
        const out: Array<Record<string, unknown>> = [];
        let seen = 0;
        document.querySelectorAll('button,select,summary,[role="button"]').forEach((el) => {
          const e = el as HTMLElement;
          const r = e.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          seen++;
          // What assistive tech would announce: the label, else the visible text, else
          // the title. A control whose only content is a glyph has no usable name.
          const aria = (e.getAttribute('aria-label') || '').trim();
          const text = (e.textContent || '').trim();
          const title = (e.getAttribute('title') || '').trim();
          const spoken = aria || text || title;
          const wordish = spoken.replace(/[^\p{L}\p{N}]/gu, '');
          if (!wordish) out.push({ tag: e.tagName, key: e.getAttribute('data-k') || '', text: text.slice(0, 20) });
        });
        return { out, seen };
      });
      expect(nameless.seen, name + ' must have controls to check').toBeGreaterThan(3);
      expect(nameless.out, name + ': every control needs a name a screen reader can speak').toEqual([]);
      await harness.destroy(page);
    }

    // Focus: tab through the play view and require each stop to be visibly marked.
    // Measured against the control's own unfocused appearance, because "has an outline"
    // is not the same as "looks different once focused".
    await mount(views[0][1]);
    const focusReport = await page.evaluate(() => {
      const marks = (el: Element) => {
        const cs = getComputedStyle(el as HTMLElement);
        return cs.outlineStyle + '|' + cs.outlineWidth + '|' + cs.outlineColor + '|' + cs.boxShadow + '|' + cs.borderColor;
      };
      return { baseline: marks(document.querySelector('.arc-fire-btn')!) };
    });
    let stops = 0, unmarked: string[] = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate((base) => {
        const el = document.activeElement as HTMLElement;
        if (!el || el === document.body || !document.getElementById('wrap')?.contains(el)) return null;
        const cs = getComputedStyle(el);
        const marked = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
        return { marked, label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40), base };
      }, focusReport.baseline);
      if (!r) continue;
      stops++;
      if (!r.marked) unmarked.push(r.label);
    }
    expect(stops, 'tabbing must reach the tool controls').toBeGreaterThan(5);
    expect(unmarked, 'a focused control must be visibly marked').toEqual([]);
    await harness.destroy(page);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  // Touch targets. This tool is used on touchscreen Chromebooks and tablets, and one
  // control already carries a deliberate 44px min-height, so the concern is established
  // — it just was never checked anywhere else. WCAG 2.2 SC 2.5.8 sets the floor at
  // 24x24 CSS px. Measure every visible interactive control in the main views.
  test('every interactive control meets the minimum touch target', async ({ page }) => {
    const errs = trackErrors(page);
    const MIN = 24;

    async function measure(label: string, seed: Record<string, unknown>) {
      await page.goto(`${harness.url}/__harness`);
      await page.evaluate(() => {
        document.body.classList.add('theme-dark');
        document.documentElement.style.background = '#0f172a';
        document.body.style.background = '#0f172a';
        document.body.style.height = 'auto';
        const wrap = document.getElementById('wrap');
        if (wrap) { wrap.style.height = 'auto'; wrap.style.display = 'block'; }
      });
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
      await page.evaluate((d) => (window as any).__mount(d), seed);
      await page.waitForTimeout(400);

      return page.evaluate((min) => {
        const small: Array<Record<string, unknown>> = [];
        let checked = 0;
        document.querySelectorAll('button,select,summary,[role="button"],input[type="checkbox"],input[type="radio"]').forEach((el) => {
          const e = el as HTMLElement;
          // A checkbox or radio is sized by the user agent (13x13 in Chromium) and is
          // exempt from SC 2.5.8 on that basis — but what a finger actually hits is the
          // wrapping <label>, so measure that instead of special-casing the exemption
          // away. If there is no label, the bare control is the target and is measured.
          const tag = e.tagName;
          const isBox = tag === 'INPUT' && /^(checkbox|radio)$/.test((e as HTMLInputElement).type);
          const target = (isBox && e.closest('label')) ? (e.closest('label') as HTMLElement) : e;
          const r = target.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;           // not rendered
          if ((e as HTMLInputElement).disabled) return;           // an inert control is not a tap target
          checked++;
          if (r.width < min || r.height < min) {
            small.push({
              tag: e.tagName,
              label: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 45),
              w: Math.round(r.width), h: Math.round(r.height)
            });
          }
        });
        return { small, checked };
      }, MIN);
    }

    const views: Array<[string, Record<string, unknown>]> = [
      ['play', { _arccity: { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [] } }],
      ['battle', { _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle' } }],
      ['teacher', { _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: { L1: { solved: true } }, tier: 'practice', badges: [], view: 'teacher' } }]
    ];

    for (const [name, seed] of views) {
      const { small, checked } = await measure(name, seed);
      expect(checked, name + ' must actually have controls to measure').toBeGreaterThan(3);
      expect(small, name + ': controls below ' + MIN + 'x' + MIN + ' CSS px are hard to hit on a touchscreen').toEqual([]);
      await harness.destroy(page);
    }
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  // "Disabled but looks enabled" has now been found three times in this tool: the
  // match-options disclosure with no marker, the relay selector during a handoff, and
  // the equation slider after the match ends. Rather than keep finding them one at a
  // time, sweep every disabled control in the states that produce them and require
  // each to LOOK unavailable — dimmed, or visibly greyed, or at minimum wearing a
  // not-allowed cursor. A control that is inert but indistinguishable from a working
  // one is a small lie told to the player.
  test('no disabled control renders as though it were operable', async ({ page }) => {
    const errs = trackErrors(page);
    const cases: Array<[string, () => unknown]> = [];

    async function sweep(label: string, seed: string) {
      await page.goto(`${harness.url}/__harness`);
      await page.evaluate(() => {
        document.body.classList.add('theme-dark');
        document.documentElement.style.background = '#0f172a';
        document.body.style.background = '#0f172a';
        document.body.style.height = 'auto';
        const wrap = document.getElementById('wrap');
        if (wrap) { wrap.style.height = 'auto'; wrap.style.display = 'block'; }
      });
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
      await page.evaluate((s) => { (window as any).__mount(JSON.parse(s)); }, seed);
      await page.waitForTimeout(400);

      const offenders = await page.evaluate(() => {
        const out: Array<Record<string, unknown>> = [];
        document.querySelectorAll('button,input,select,textarea').forEach((el) => {
          const e = el as HTMLInputElement;
          if (!e.disabled) return;
          // An element inherits opacity from an ancestor, so measure what is actually
          // painted rather than the element's own declaration.
          let faded = false;
          for (let n: HTMLElement | null = e; n; n = n.parentElement) {
            if (Number(getComputedStyle(n).opacity) < 0.95) { faded = true; break; }
            if (n.id === 'wrap') break;
          }
          const cs = getComputedStyle(e);
          if (faded || cs.cursor === 'not-allowed') return;
          out.push({ tag: e.tagName, label: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 60), cursor: cs.cursor });
        });
        return out;
      });
      expect(offenders, label + ': disabled controls must be visually distinguishable').toEqual([]);
      const count = await page.evaluate(() => document.querySelectorAll('button:disabled,input:disabled,select:disabled').length);
      await harness.destroy(page);
      return count;
    }

    // Each seed is chosen because it is a state that DISABLES something.
    const wonSeed = JSON.stringify({ _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle: { mode: 'cpu', status: 'won', winner: 0, round: 3, shields: [[true, true, true], [false, false, false]] } } });
    const freshSeed = JSON.stringify({ _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [] } });
    const teacherSeed = JSON.stringify({ _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'teacher' } });

    const wonCount = await sweep('battle won', wonSeed);
    expect(wonCount, 'a finished match really does disable controls').toBeGreaterThan(0);
    const freshCount = await sweep('fresh play view (locked levels)', freshSeed);
    expect(freshCount, 'a fresh save really does lock later levels').toBeGreaterThan(0);
    const teacherCount = await sweep('teacher view (export off)', teacherSeed);
    expect(teacherCount, 'export is off by default, so its button is disabled').toBeGreaterThan(0);

    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
    expect(cases.length).toBe(0);
  });

  // Two battle states with their own rendering paths and no visual coverage: the win
  // (replay controls, comparison trail) and the hot-seat handoff (controls and preview
  // deliberately hidden until the next player confirms). Each capture asserts the state
  // it MEANT to reach before it is trusted — a hand-built battle object that
  // normalizeBattleState quietly rejected would otherwise be photographed as if real.
  test('renders the battle win and the hot-seat handoff', async ({ page }) => {
    const errs = trackErrors(page);

    async function mount(battle: Record<string, unknown>, file: string, mustSay: RegExp) {
      await page.goto(`${harness.url}/__harness`);
      await page.evaluate(() => {
        document.body.classList.add('theme-dark');
        document.documentElement.style.background = '#0f172a';
        document.body.style.background = '#0f172a';
        document.body.style.height = 'auto';
        const wrap = document.getElementById('wrap');
        if (wrap) { wrap.style.height = 'auto'; wrap.style.display = 'block'; }
      });
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
      await page.evaluate((b) => {
        const arc = (window as any).ArcCityCore;
        const base = arc.createBattleState('cpu');
        const patch: Record<string, unknown> = Object.assign({}, b);
        if (patch.__buildTrails) {
          delete patch.__buildTrails;
          // Real shot geometry from the tool's own sampler, not invented points.
          const lvl = arc.levelById('L1');
          patch.trails = [
            { seat: 0, lane: 0, weapon: 'standard', result: 'miss', samples: arc.sampleCurve(lvl, { m: 0.2, b: 0 }) },
            { seat: 0, lane: 0, weapon: 'standard', result: 'hit', samples: arc.sampleCurve(lvl, { m: 0.5, b: 0 }) }
          ];
        }
        (window as any).__mount({ _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle: Object.assign({}, base, patch) } });
      }, battle);
      await page.waitForTimeout(500);
      const text = await page.evaluate(() => (document.getElementById('wrap')?.innerText || ''));
      expect(text, 'the state under test must actually be reached').toMatch(mustSay);
      await page.screenshot({ path: SHOT_DIR + '/' + file, fullPage: true });
      await harness.destroy(page);
      return text;
    }

    // A real win always follows shots, so the replay panel needs trails to replay.
    // Build them from the tool's own sampler rather than inventing sample data.
    const wonBattle = {
      status: 'won', winner: 0, round: 3,
      shields: [[true, true, true], [false, false, false]],
      stats: [{ captures: 3, shots: 5 }, { captures: 0, shots: 4 }],
      __buildTrails: true
    };
    const won = await mount(wonBattle, 'arccity-battle-won.png', /won in round/i);
    expect(won, 'a finished match offers its replay').toMatch(/replay/i);

    // The same win with NO trails must NOT offer a replay — there is nothing to replay,
    // and battleReplayFrame returns null for it. Pinning the guard, since mistaking it
    // for a missing feature is exactly the wrong conclusion to draw.
    const wonNoTrails = await mount(
      { status: 'won', winner: 0, round: 3, shields: [[true, true, true], [false, false, false]] },
      'arccity-battle-won-notrails.png', /won in round/i);
    expect(wonNoTrails, 'nothing to replay, so nothing is offered').not.toMatch(/Replay shot/i);

    const handoff = await mount(
      { mode: 'hotseat', handoff: true, turn: 1, round: 2 },
      'arccity-battle-handoff.png', /Pass the device/i);
    // The whole point of the handoff is that the incoming player cannot see the
    // outgoing player's aim, so the firing control must not be sitting there.
    expect(handoff, 'controls stay hidden until the next player confirms').not.toMatch(/Fire function trail/i);

    // The relay selector is genuinely locked during a handoff (battleLocked), but it
    // used to look exactly like an operable control: only CAPTURED relays were dimmed.
    // A disabled control that reads as enabled is a small lie, so the lock is visible now.
    await page.goto(`${harness.url}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
    await page.evaluate(() => {
      const arc = (window as any).ArcCityCore;
      const base = arc.createBattleState('cpu');
      (window as any).__mount({ _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle: Object.assign({}, base, { mode: 'hotseat', handoff: true, turn: 1 }) } });
    });
    await page.waitForTimeout(400);
    const lanes = await page.evaluate(() => Array.from(document.querySelectorAll('.arc-battle-lanes button')).map((b) => ({
      disabled: (b as HTMLButtonElement).disabled,
      opacity: Number(getComputedStyle(b).opacity),
      cursor: getComputedStyle(b).cursor
    })));
    expect(lanes.length, 'the relay selector is on screen').toBeGreaterThan(0);
    for (const l of lanes) {
      expect(l.disabled, 'locked during handoff').toBe(true);
      expect(l.opacity, 'and it must LOOK locked, not merely be locked').toBeLessThan(1);
      expect(l.cursor).toBe('not-allowed');
    }
    await harness.destroy(page);

    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  // Three rendering paths nothing had exercised visually: the Transformations goal
  // (match a ghost, no node to light), the Gauntlet capstone, and the guarded state
  // where the Gauntlet is reachable but no family has been solved standalone yet —
  // that last one crashed once before it was guarded, so it is worth watching.
  test('renders the Transformations board, the Gauntlet, and the empty-Gauntlet guard', async ({ page }) => {
    const errs = trackErrors(page);
    // Four families solved standalone: enough to unlock the capstone and the yards.
    const fourFamilies = {
      L1: { solved: true, independent: true }, L3: { solved: true, independent: true },
      L4: { solved: true, independent: true }, L5: { solved: true, independent: true }
    };
    const cases: Array<[string, Record<string, unknown>]> = [
      ['transformations', { levelId: 'L11', byLevel: fourFamilies }],
      ['gauntlet', { levelId: 'L10', byLevel: fourFamilies }],
      ['gauntlet-empty', { levelId: 'L10', byLevel: {} }]
    ];

    for (const [name, extra] of cases) {
      await page.goto(`${harness.url}/__harness`);
      await page.evaluate(() => {
        document.body.classList.add('theme-dark');
        document.documentElement.style.background = '#0f172a';
        document.body.style.background = '#0f172a';
        document.body.style.height = 'auto';
        const wrap = document.getElementById('wrap');
        if (wrap) { wrap.style.height = 'auto'; wrap.style.display = 'block'; }
      });
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
      await page.evaluate((d) => (window as any).__mount(d), {
        _arccity: { schemaVersion: 2, tier: 'practice', badges: [], fired: false, ...extra }
      });
      await page.waitForTimeout(500);
      // Every one of these must render actual content, not a fallback or a blank pane.
      const text = await page.evaluate(() => (document.getElementById('wrap')?.innerText || '').trim());
      expect(text.length, name + ' must render something').toBeGreaterThan(80);
      expect(text, name + ' must not fall back to an error').not.toMatch(/could not render|something went wrong/i);
      await page.screenshot({ path: SHOT_DIR + '/arccity-' + name + '.png', fullPage: true });
      await harness.destroy(page);
    }
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  // The last two surfaces nothing in this pass had looked at. The tool pins its own
  // --allo-stem-* tokens for all three themes now, so a capture here is faithful
  // without the harness having to stand in for the shell.
  test('renders the teacher view and the Circuit Clash setup panel', async ({ page }) => {
    const errs = trackErrors(page);
    const solved = { L1: { solved: true, independent: true, shots: 2, misses: 0, flawless: true }, L2: { solved: true, shots: 4, misses: 3 }, L3: { solved: true, independent: true, shots: 1, misses: 0, flawless: true } };
    const base3 = { schemaVersion: 2, levelId: 'L3', byLevel: solved, tier: 'practice', badges: ['first-light', 'window-threader', 'arc-architect'] };

    for (const [theme, bg] of [['', '#ffffff'], ['theme-dark', '#0f172a']] as const) {
      await page.goto(`${harness.url}/__harness`);
      await page.evaluate(([c, b]) => {
        if (c) document.body.classList.add(c);
        // The harness paints html AND body #0f172a and caps body at height:100%. On a
        // full-page capture of light-theme content taller than the viewport, the html
        // background shows through below the body box — which reads as "the footer
        // controls are invisible" when it is only the rig. Neutralise both, and let
        // the body grow with its content.
        document.documentElement.style.background = b;
        document.body.style.background = b;
        document.body.style.height = 'auto';
        const wrap = document.getElementById('wrap');
        if (wrap) { wrap.style.height = 'auto'; wrap.style.display = 'block'; }
      }, [theme, bg]);
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });

      await page.evaluate((d) => (window as any).__mount(d), { _arccity: { ...base3, view: 'teacher' } });
      await page.waitForTimeout(400);
      await page.screenshot({ path: SHOT_DIR + '/arccity-teacher-' + (theme || 'light') + '.png', fullPage: true });

      await page.evaluate((d) => (window as any).__mount(d), { _arccity: { ...base3, view: 'battle' } });
      await page.waitForTimeout(400);
      await page.screenshot({ path: SHOT_DIR + '/arccity-battlepanel-' + (theme || 'light') + '.png', fullPage: true });

      // "Match options" is collapsed by default and holds EVERY match setup control.
      // Its summary is display:flex for a 44px touch target, which stops the browser
      // drawing the disclosure triangle — the panel read as an inert heading. The
      // marker is drawn explicitly now; assert the rendered pseudo-element, since a
      // CSS-source check would not notice the browser refusing to paint it.
      const marker = await page.evaluate(() => {
        const s = document.querySelector('.arc-battle-options > summary');
        if (!s) return null;
        const before = getComputedStyle(s, '::before');
        const det = s.parentElement as HTMLDetailsElement;
        return { content: before.content, open: det.open, minH: getComputedStyle(s).minHeight };
      });
      expect(marker, 'the match-options disclosure exists').not.toBeNull();
      expect(marker!.open, 'it starts collapsed').toBe(false);
      expect(marker!.content, 'a collapsed panel must show it can open').not.toBe('none');
      expect(marker!.content.length, 'the marker must not be an empty string').toBeGreaterThan(2);
      expect(marker!.minH, 'the 44px touch target is why flex was used; keep it').toBe('44px');

      // And it must still actually open — from the keyboard, not just a click.
      await page.locator('.arc-battle-options > summary').press('Enter');
      await page.waitForTimeout(200);
      const opened = await page.evaluate(() => {
        const det = document.querySelector('.arc-battle-options') as HTMLDetailsElement;
        const s = det.querySelector('summary')!;
        return { open: det.open, content: getComputedStyle(s, '::before').content };
      });
      expect(opened.open, 'Enter opens the panel').toBe(true);
      expect(opened.content, 'the marker flips when open').not.toBe(marker!.content);
      await harness.destroy(page);
    }
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  // Surfaces this pass had never once looked at. Captures exist to be EXAMINED, not
  // only to assert a non-empty PNG: the light-board smudge was invisible to every
  // test and obvious in one screenshot.
  test('renders the contrast board, the battle board, and a narrow viewport', async ({ page }) => {
    const errs = trackErrors(page);
    const play = { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [], fired: false };

    // Contrast is the accessibility theme, and the filter work just changed per theme.
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(() => { document.body.classList.add('theme-contrast'); document.body.style.background = '#000'; });
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
    await page.evaluate((d) => (window as any).__mount(d), { _arccity: play });
    await page.waitForSelector('#wrap svg', { timeout: 30000 });
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(700);
    await page.locator('#wrap svg').first().screenshot({ path: SHOT_DIR + '/arccity-2d-contrast.png' });
    await harness.destroy(page);

    // Circuit Clash's 2D board is the authoritative surface for two-player mode and
    // has never been captured in any theme.
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(() => { document.body.classList.add('theme-dark'); document.body.style.background = '#0f172a'; });
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
    await page.evaluate((d) => (window as any).__mount(d), { _arccity: { ...play, view: 'battle' } });
    await page.waitForSelector('#wrap svg', { timeout: 30000 });
    await page.waitForTimeout(500);
    await page.locator('#wrap svg').first().screenshot({ path: SHOT_DIR + '/arccity-2d-battle.png' });
    await harness.destroy(page);

    // A phone-width viewport: the stylesheet has a 520px branch nothing has exercised.
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto(`${harness.url}/__harness`);
    // The harness hard-codes an 1100px mount box, so measuring overflow without
    // collapsing it would measure the RIG, not the tool — it reported 700px of
    // overflow that had nothing to do with Arc City.
    // The harness also paints the body dark navy. With no theme class the tool renders
    // its LIGHT theme, whose ink is near-black — so the default capture showed dark text
    // on a dark ground and looked like an unreadable tool. That is the rig, not Arc City:
    // the real light host surface is white. Paint it white so the capture is judgeable.
    await page.evaluate(() => {
      const wrap = document.getElementById('wrap');
      if (wrap) { wrap.style.width = '100%'; wrap.style.height = 'auto'; wrap.style.display = 'block'; }
      document.body.style.background = '#ffffff';
    });
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
    await page.evaluate((d) => (window as any).__mount(d), { _arccity: play });
    await page.waitForSelector('#wrap svg', { timeout: 30000 });
    await page.waitForTimeout(500);
    // The board must never force the page to scroll sideways on a phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.screenshot({ path: SHOT_DIR + '/arccity-narrow.png', fullPage: false });
    expect(overflow, 'no horizontal overflow at 400px').toBeLessThanOrEqual(0);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  // The light theme is the DEFAULT, so it is what most students actually see. The
  // visual work has leaned dark, so this capture exists to be looked at.
  test('renders the light-theme board', async ({ page }) => {
    const errs = trackErrors(page);
    await page.goto(`${harness.url}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
    await page.evaluate((d) => (window as any).__mount(d), { _arccity: { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [], fired: false } });
    await page.waitForSelector('#wrap svg', { timeout: 30000 });
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(900);
    await page.locator('#wrap svg').first().screenshot({ path: SHOT_DIR + '/arccity-2d-light.png' });
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('renders the dark-theme board with skyline, stars and a lit node', async ({ page }) => {
    const errs = trackErrors(page);
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(() => { document.body.classList.add('theme-dark'); document.body.style.background = '#0f172a'; });
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
    // L3 "Clear the Wall" fired on its DEFAULT parabola (a miss): wall, gate, node, beam and
    // the denied remainder are all on the board, which is what this capture is for.
    await page.evaluate((d) => (window as any).__mount(d), { _arccity: { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [], fired: false } });
    await page.waitForSelector('#wrap svg', { timeout: 30000 });
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(900);
    const svg = page.locator('#wrap svg').first();
    await svg.screenshot({ path: SHOT_DIR + '/arccity-2d-dark.png' });
    const counts = await page.evaluate(() => ({
      stars: document.querySelectorAll('#wrap svg .arccity-star').length,
      windows: document.querySelectorAll('#wrap svg g[aria-hidden] rect[width="3"]').length,
      beamCore: document.querySelectorAll('#wrap svg polyline[stroke="#ffffff"]').length,
    }));
    expect(counts.stars).toBe(34);
    expect(counts.windows).toBeGreaterThan(10);
    expect(counts.beamCore).toBe(1);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });
});

test.describe('Arc City — Circuit Clash 3D arena', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('arena mounts a live scene with the skyline and relays', async ({ page }) => {
    const errs = trackErrors(page);
    await harness.mount(page, { _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle3d: true } });
    await page.waitForFunction(() => {
      const st = Array.from(document.querySelectorAll('[role="status"]')).map((n) => n.textContent || '');
      return document.querySelector('#wrap canvas') && !st.some((s) => /Loading the optional 3D arena|3D unavailable/.test(s));
    }, null, { timeout: 45000 });
    const live = await page.evaluate(() => (window as any).__glLive());
    expect(live).not.toBeNull();
    expect(live.lost).toBe(false);
    const shot = await page.locator('#wrap canvas').first().screenshot({ path: SHOT_DIR + '/arccity-battle3d.png' });
    expect(shot.length).toBeGreaterThan(4000);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });
});
