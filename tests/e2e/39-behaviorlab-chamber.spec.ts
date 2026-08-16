/**
 * Behavior Lab — chamber contrast and the 3D observation view.
 *
 * Two classes of defect live here that no static gate and no jsdom test can see.
 *
 * 1. COLOUR CONTRAST needs the real stylesheet AND the real theme variables, and
 *    the second half of that is easy to get wrong: `--allo-stem-*` is injected at
 *    runtime by app_styles_module.js, not compiled into the Tailwind bundle, so a
 *    spec that loads only the bundle grades var() FALLBACKS and every result is
 *    meaningless. This tool shipped with its text bound to the app theme while its
 *    panels were hardcoded dark navy: in the light theme that resolved to #0f172a
 *    on rgba(30,41,59,.55), about 1.2:1. The palette is pinned to the tool now, and
 *    these assertions are what keeps the two halves from drifting apart again.
 *
 * 2. THE 3D CHAMBER only exists once there is a GL context and an animation loop.
 *    The thing worth pinning is not that it draws — it is that it draws the SAME
 *    simulation the diagram does. A second view that quietly invents its own
 *    positions is worse than no second view, and that is exactly the bug this work
 *    fixed in the 2D chamber, where the drawn lever, the shaping rule and the
 *    proximity meter each had their own idea of where the lever was.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_behaviorlab.js',
  toolId: 'behaviorLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  appStyles: true,
  width: 1180,
  height: 1400,
  extraScripts: ['app_styles_module.js', 'desktop/web-app/node_modules/axe-core/axe.min.js'],
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Theme = 'default' | 'dark' | 'contrast';

const RUNNING = {
  blPhase: 'running', blLevel: 5, blTick: 22, blLevelScore: 3,
  blRecentActions: ['explore', 'sniff', 'approachLever', 'halfTurn', 'pressLever'],
  blShowHints: true, blLightColor: 'green',
  blMouseX: 300, blMouseY: 200, blTargetX: 330, blTargetY: 205,
  blMouseAction: 'approachLever',
};

async function mount(page: import('@playwright/test').Page, data: Record<string, unknown>, theme: Theme) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.behaviorLab, null, { timeout: 30000 });
  // Render the app's style component so --allo-stem-* actually exists. Without
  // this every var() in the tool falls back and the theme under test is a fiction.
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.display = 'none';
    document.body.appendChild(host);
    const AppStyles = (window as any).AlloModules.AppStyles.AppStyles;
    (window as any).ReactDOM.createRoot(host).render((window as any).React.createElement(AppStyles, {}));
  });
  await page.waitForTimeout(300);
  await page.evaluate((t: string) => {
    // Themes are applied to <main> in the app, so the harness reproduces that
    // rather than stamping the class somewhere the descendant selectors miss.
    const m = document.createElement('main');
    m.className = 'theme-' + t;
    const wrap = document.getElementById('wrap')!;
    wrap.parentNode!.insertBefore(m, wrap);
    m.appendChild(wrap);
    document.documentElement.className = 'theme-' + t;
  }, theme);
  await page.evaluate((d: any) => {
    (window as any).__mount(d);
    const ctx = (window as any).__ctx;
    ctx.isContrast = document.documentElement.className.indexOf('contrast') >= 0;
    ctx.isDark = document.documentElement.className.indexOf('dark') >= 0;
    (window as any).__rerender();
  }, data);
  await page.waitForTimeout(900);
}

async function contrastViolations(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const res = await (window as any).axe.run('#wrap', {
      runOnly: ['color-contrast'], resultTypes: ['violations'],
    });
    return res.violations.flatMap((v: any) => v.nodes.map((n: any) => ({
      why: String(n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 220),
      html: String(n.html).replace(/\s+/g, ' ').slice(0, 140),
    })));
  });
}

test.describe('colour contrast', () => {
  test('the theme variables are really applied', async ({ page }) => {
    // Guard on the guard: if this is empty, every other assertion in the file is
    // grading fallback colours instead of the ones a student sees.
    await mount(page, RUNNING, 'default');
    const v = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--allo-stem-text').trim());
    expect(v, '--allo-stem-text is unset: app_styles_module did not render').toBe('#0f172a');
  });

  const SURFACES: Array<[string, Record<string, unknown>]> = [
    ['intro', { blPhase: 'intro', blLevel: 1 }],
    ['running', RUNNING],
    ['extinction', Object.assign({}, RUNNING, { blLevel: 3, blExtinctionPhase: true, blExtinctionStart: 4 })],
    ['pavlov', Object.assign({}, RUNNING, { blLevel: 9, blCcPhase: 'acquisition', blAssocStrength: 55, blBellRinging: true })],
    ['expanded panels', Object.assign({}, RUNNING, { blShowBeyond: true, blShowFunctions: true, blMatrixIdx: 'spPlus' })],
    ['schedule sleuth', Object.assign({}, RUNNING, { blShowSleuth: true, blSleuthIdx: 0, blSleuthSeed: 19, blSleuthRounds: 1 })],
    ['sleuth answered', Object.assign({}, RUNNING, { blShowSleuth: true, blSleuthIdx: 2, blSleuthSeed: 19, blSleuthRounds: 2, blSleuthAnswered: true, blSleuthPick: 0 })],
  ];

  for (const theme of ['default', 'dark', 'contrast'] as Theme[]) {
    for (const [name, data] of SURFACES) {
      test(`${name} / ${theme}`, async ({ page }) => {
        await mount(page, data, theme);
        const bad = await contrastViolations(page);
        const detail = bad.length ? '\n' + bad.map((b: any) => `    ${b.why}\n      ${b.html}`).join('\n') : '';
        expect(bad, `${name}/${theme}: ${bad.length} contrast violation(s)${detail}`).toEqual([]);
      });
    }
  }

  test('the locked level badges are dimmed but still legible', async ({ page }) => {
    // opacity-50 on the badge tile put its label at 4.33:1. The lock glyph and the
    // greyscale carry the state; the alpha does not have to.
    await mount(page, RUNNING, 'dark');
    const op = await page.evaluate(() => {
      const lock = [...document.querySelectorAll('[role="button"]')]
        .find((e) => (e.getAttribute('aria-label') || '').indexOf('Locked') >= 0);
      return lock ? getComputedStyle(lock).opacity : null;
    });
    expect(op, 'no locked badge found').not.toBeNull();
    expect(Number(op)).toBeGreaterThanOrEqual(0.75);
  });
});

test.describe('schedule sleuth', () => {
  test('the curve stays inside its chart and carries reinforcement marks', async ({ page }) => {
    // The old generator drew VR and VI straight out of the top of the viewBox —
    // more than half of each line was rendered where nothing is visible. A unit
    // test pins the numbers; this pins that the RENDERER agrees with them.
    for (const idx of [0, 1, 2, 3]) {
      await mount(page, Object.assign({}, RUNNING, {
        blShowSleuth: true, blSleuthIdx: idx, blSleuthSeed: 19, blSleuthRounds: 1,
      }), 'dark');
      const box = await page.evaluate(() => {
        const svg = document.querySelector('svg[role="img"]') as SVGSVGElement | null;
        if (!svg) return null;
        const poly = svg.querySelector('polyline') as SVGPolylineElement;
        const vb = svg.getAttribute('viewBox')!.split(' ').map(Number);
        const ys = poly.getAttribute('points')!.split(' ').map((p) => Number(p.split(',')[1]));
        return { top: Math.min(...ys), bottom: Math.max(...ys), h: vb[3], marks: svg.querySelectorAll('line').length };
      });
      expect(box, `no sleuth chart for schedule ${idx}`).not.toBeNull();
      expect(box!.top, `schedule ${idx} drew above the chart`).toBeGreaterThanOrEqual(0);
      expect(box!.bottom, `schedule ${idx} drew below the chart`).toBeLessThanOrEqual(box!.h);
      // 6 grid lines plus one per reinforcer.
      expect(box!.marks, `schedule ${idx} has no reinforcement marks`).toBeGreaterThan(8);
    }
  });

  test('a screen reader can attempt the puzzle', async ({ page }) => {
    // The activity was a picture with "cumulative-response curve" for alt text —
    // literally unattemptable without sight. The numeric record is the same
    // information a sighted student reads off the shape.
    await mount(page, Object.assign({}, RUNNING, {
      blShowSleuth: true, blSleuthIdx: 0, blSleuthSeed: 19, blSleuthRounds: 1,
    }), 'dark');
    const table = await page.evaluate(() => {
      const t = document.querySelector('table');
      if (!t) return null;
      const rows = [...t.querySelectorAll('tbody tr')];
      return {
        rows: rows.length,
        headers: [...t.querySelectorAll('th[scope="col"]')].length,
        rowHeaders: [...t.querySelectorAll('tbody th[scope="row"]')].length,
        totals: rows.map((r) => Number(r.children[1].textContent)),
        hasCaption: !!t.querySelector('caption'),
      };
    });
    expect(table, 'the numeric record is missing').not.toBeNull();
    expect(table!.rows).toBe(10);
    expect(table!.headers).toBe(4);
    expect(table!.rowHeaders, 'time blocks are not row headers').toBe(10);
    expect(table!.hasCaption).toBe(true);
    // It must describe a session with responding in it, not a flat line.
    expect(table!.totals.reduce((a, b) => a + b, 0)).toBeGreaterThan(20);
    expect(table!.totals[table!.totals.length - 1], 'nothing happened in the last block').toBeGreaterThan(0);
  });
});

test.describe('one lever, one position', () => {
  test('the drawn lever, the shaping rule and the meter agree', async ({ page }) => {
    // The simulation walks the mouse to (340, 210) and reinforces approach to it.
    // Park the mouse exactly there and the proximity meter must read full — it used
    // to measure (350, 225), and the chamber used to DRAW the lever at
    // canvasWidth - 66, which on a ~1000px canvas was nowhere near either.
    await mount(page, Object.assign({}, RUNNING, {
      blLevel: 1, blMouseX: 340, blMouseY: 210, blTargetX: 340, blTargetY: 210,
    }), 'dark');
    const width = await page.evaluate(() => {
      // Anchored on the meter's own label, not on "first gradient bar in the tool" —
      // this tool has several gradient bars and picking the wrong one measures
      // nothing while looking like it passed.
      const label = [...document.querySelectorAll('span')]
        .find((e) => (e.textContent || '').indexOf('Lever proximity') >= 0);
      const bar = label ? label.parentElement!.querySelector('div') as HTMLElement | null : null;
      return bar ? bar.style.width : null;
    });
    expect(width, 'proximity meter not found').not.toBeNull();
    expect(Number(String(width).replace('%', '')),
      'the mouse is standing on the lever and the meter disagrees').toBeGreaterThanOrEqual(99);
  });
});

test.describe('3D chamber', () => {
  test('renders a live scene and stays in step with the simulation', async ({ page }) => {
    await mount(page, Object.assign({}, RUNNING, { blChamberView: '3d' }), 'dark');
    await page.locator('[data-behaviorlab-3d]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);

    const gl = await page.evaluate(() => (window as any).__glLive('#wrap'));
    expect(gl, 'no WebGL canvas in the bay').not.toBeNull();
    expect(gl!.lost, 'the GL context was lost').toBe(false);
    expect(gl!.box.h).toBeGreaterThan(200);
    expect(await page.evaluate(() => (window as any).__toolData.bl3dStatus)).toBe('ready');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);

    // The subject follows the simulation's world coordinates. Two very different
    // positions must land the mesh in two very different places — this is what
    // stops the 3D view drifting into a decorative animation of its own.
    const at = (x: number, y: number) => page.evaluate(({ x, y }) => {
      const d = (window as any).__toolData;
      d.blMouseX = x; d.blMouseY = y; d.blTargetX = x; d.blTargetY = y;
      (window as any).__rerender();
      // The chamber lerps the subject toward its target, so give it time to arrive
      // rather than sampling mid-travel.
      return new Promise((r) => setTimeout(r, 1800));
    }, { x, y });

    // Read the viewer's own label chip rather than the framebuffer: the renderer is
    // created without preserveDrawingBuffer, so readPixels after a frame returns a
    // cleared buffer and every colour test silently measures nothing. The chip is
    // positioned by projecting the subject mesh through the live camera, so its
    // left offset IS the mesh's screen position.
    await page.evaluate(() => { (window as any).__toolData.bl3dSel = 'subject'; (window as any).__rerender(); });
    await page.waitForTimeout(600);
    const chipX = () => page.evaluate(() => {
      const chip = [...document.querySelectorAll('[data-behaviorlab-3d] div')]
        .find((e) => (e as HTMLElement).textContent === 'Subject') as HTMLElement | undefined;
      return chip && chip.style.opacity !== '0' ? parseFloat(chip.style.left) : null;
    });

    await at(60, 200);
    const xLeft = await chipX();
    await at(345, 200);
    const xRight = await chipX();

    expect(xLeft, 'the subject has no projected label — the mesh is not in the scene').not.toBeNull();
    expect(xRight).not.toBeNull();
    expect(xRight! - xLeft!,
      'moving the subject across the chamber did not move it in the 3D view').toBeGreaterThan(60);
  });

  test('the diagram keeps the whole lesson when 3D is unavailable', async ({ page }) => {
    // Every 3D affordance is duplicated as a button, and the canvas the keyboard
    // shortcut depends on is never unmounted — a filtered school network must not
    // cost a student the simulation.
    await mount(page, Object.assign({}, RUNNING, { blChamberView: '3d' }), 'dark');
    expect(await page.locator('#bl-chamber-canvas').count(),
      'the 2D canvas was unmounted; Space-to-reinforce gates on it').toBe(1);
    const parts = await page.locator('.behaviorlab-3d-part').count();
    expect(parts, 'the parts are pickable in the scene but not reachable by keyboard').toBeGreaterThan(4);
    await page.locator('.behaviorlab-3d-part').first().click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => (window as any).__toolData.bl3dSel)).toBeTruthy();
    expect(await page.locator('[role="status"]').filter({ hasText: '—' }).count()).toBeGreaterThan(0);
  });

  test('switching back to the diagram resumes drawing', async ({ page }) => {
    await mount(page, Object.assign({}, RUNNING, { blChamberView: '3d' }), 'dark');
    await page.getByRole('button', { name: /Diagram/ }).click();
    await page.waitForTimeout(600);
    const painted = await page.evaluate(() => {
      const c = document.getElementById('bl-chamber-canvas') as HTMLCanvasElement;
      const g = c.getContext('2d')!;
      const px = g.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] > 60) lit++;
      return lit;
    });
    expect(painted, 'the 2D chamber stayed blank after leaving the 3D view').toBeGreaterThan(1000);
  });
});
