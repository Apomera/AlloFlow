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

test.describe('level 4 actually runs an FR-3 schedule', () => {
  // The level is titled "On Schedule", its contingency card says "Every 3rd press",
  // its hint says "count them!" and its quiz asks when an FR-3 delivers — but the
  // level accepted reinforcement on any press and scored identically whether the
  // student followed the schedule or reinforced continuously. These assertions are
  // the difference between the level teaching FR-3 and merely mentioning it.

  async function reinforce(page: import('@playwright/test').Page) {
    // The Deliver Food control is the same path the Space shortcut uses.
    await page.evaluate(() => {
      const fn = (window as any)._blReinforceFn;
      if (typeof fn === 'function') fn();
    });
    await page.waitForTimeout(180);
  }

  test('an early press is refused and delivers nothing', async ({ page }) => {
    await mount(page, Object.assign({}, RUNNING, {
      blLevel: 4, blLevelScore: 0, blFrPresses: 1,
      blLastAction: 'pressLever', blMouseAction: 'pressLever',
    }), 'dark');
    await reinforce(page);
    const st = await page.evaluate(() => {
      const d = (window as any).__toolData;
      return {
        score: d.blLevelScore || 0,
        food: !!d.blFoodVisible,
        reinforcements: d.blReinforcements || 0,
        lastLog: (d.blAbcLog || [])[0] || null,
        toasts: (window as any).__events.toasts.length,
      };
    });
    expect(st.score, 'an off-schedule press scored').toBe(0);
    expect(st.food, 'food was delivered off schedule').toBe(false);
    expect(st.reinforcements, 'an off-schedule delivery was counted').toBe(0);
    expect(st.toasts, 'the student got no feedback about the schedule').toBeGreaterThan(0);
    // The ABC log must record what happened, not what was attempted.
    expect(String(st.lastLog?.c || ''), 'the log claims food that was never delivered').toContain('No food');
  });

  test('the third press is reinforced and resets the ratio', async ({ page }) => {
    await mount(page, Object.assign({}, RUNNING, {
      blLevel: 4, blLevelScore: 0, blFrPresses: 3,
      blLastAction: 'pressLever', blMouseAction: 'pressLever',
    }), 'dark');
    await reinforce(page);
    const st = await page.evaluate(() => {
      const d = (window as any).__toolData;
      return {
        score: d.blLevelScore || 0,
        food: !!d.blFoodVisible,
        presses: d.blFrPresses,
        lastLog: (d.blAbcLog || [])[0] || null,
      };
    });
    expect(st.score, 'the on-schedule press did not score').toBe(1);
    expect(st.food, 'no pellet on the third press').toBe(true);
    expect(st.presses, 'the ratio did not reset after delivery').toBe(0);
    expect(String(st.lastLog?.c || '')).toContain('Food');
  });

  test('shaping an approach is still allowed — only presses are on the schedule', async ({ page }) => {
    // Press weight starts at 3 in ~110. If the ratio gate also blocked approaches,
    // a student could never shape a press to put on the schedule in the first place.
    await mount(page, Object.assign({}, RUNNING, {
      blLevel: 4, blLevelScore: 0, blFrPresses: 0,
      blLastAction: 'approachLever', blMouseAction: 'approachLever',
    }), 'dark');
    await reinforce(page);
    const st = await page.evaluate(() => {
      const d = (window as any).__toolData;
      return { food: !!d.blFoodVisible, weight: (d.blWeights || {}).approachLever };
    });
    expect(st.food, 'shaping an approach was blocked by the ratio').toBe(true);
    expect(st.weight, 'the approach was not strengthened').toBeGreaterThan(10);
  });

  test('the ratio counter counts presses, not pellets', async ({ page }) => {
    // It used to read `reinforcementsDelivered % 3` while labelled as progress
    // toward the next pellet — the wrong events, under a caption that made the
    // number look like the right ones.
    await mount(page, Object.assign({}, RUNNING, {
      blLevel: 4, blFrPresses: 2, blScheduleCount: 7,
    }), 'dark');
    const text = await page.evaluate(() =>
      [...document.querySelectorAll('p')].map((p) => p.textContent || '')
        .find((t) => /\d\s*\/\s*3/.test(t) && /press/i.test(t)) || null);
    expect(text, 'no ratio readout found').not.toBeNull();
    expect(text).toContain('2 / 3');
  });
});

test.describe('Free Lab honours its own target selector', () => {
  test('reinforcing the chosen behaviour scores', async ({ page }) => {
    // Level 6 offers a dropdown to pick the behaviour you are shaping, and its
    // level record has `target: null`. Everything that MEASURED the target read
    // `currentLevel.target || 'pressLever'` and fell through to lever pressing, so
    // picking "Spin" and reinforcing spins scored nothing, plotted the wrong
    // behaviour on the cumulative record and announced the wrong prompt. The
    // sandbox measured a behaviour the student had not chosen.
    await mount(page, Object.assign({}, RUNNING, {
      blLevel: 6, blLevelScore: 0, blSandboxTarget: 'spin',
      blLastAction: 'spin', blMouseAction: 'spin',
    }), 'dark');
    await page.evaluate(() => {
      const fn = (window as any)._blReinforceFn;
      if (typeof fn === 'function') fn();
    });
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => {
      const d = (window as any).__toolData;
      return { score: d.blLevelScore || 0, food: !!d.blFoodVisible };
    });
    expect(st.food, 'no reinforcement was delivered at all').toBe(true);
    expect(st.score, 'the chosen sandbox target did not score').toBe(1);
  });

  test('reinforcing a different behaviour does not score', async ({ page }) => {
    // The other half: if everything scored, the selector would look like it works
    // while measuring nothing.
    await mount(page, Object.assign({}, RUNNING, {
      blLevel: 6, blLevelScore: 0, blSandboxTarget: 'spin',
      blLastAction: 'groom', blMouseAction: 'groom',
    }), 'dark');
    await page.evaluate(() => {
      const fn = (window as any)._blReinforceFn;
      if (typeof fn === 'function') fn();
    });
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => {
      const d = (window as any).__toolData;
      return { score: d.blLevelScore || 0, food: !!d.blFoodVisible };
    });
    expect(st.food, 'shaping a non-target should still deliver').toBe(true);
    expect(st.score, 'a non-target behaviour scored').toBe(0);
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

test.describe('idle cost', () => {
  test('the chamber stops redrawing when it is scrolled away, and resumes', async ({ page }) => {
    // This tool is ~3800px tall. A student reading the glossary at the bottom used
    // to leave a 60fps canvas redraw running for the rest of the session. The two
    // failure modes to guard are opposite: never pausing (wasted battery on the
    // Chromebooks this is piloted on) and pausing wrongly (a blank chamber, which
    // is far worse).
    await mount(page, RUNNING, 'dark');

    const frames = () => page.evaluate(() => new Promise<number>((resolve) => {
      // Count how many times the canvas contents actually change over ~700ms.
      const c = document.getElementById('bl-chamber-canvas') as HTMLCanvasElement;
      const g = c.getContext('2d')!;
      // Sample the WHOLE canvas on a stride, not a corner. An earlier version read
      // the top-left 300x40 strip, which holds the score and tick readouts — those
      // only change once per simulation tick (up to 5s apart), so the test was
      // asserting "is a tick due right now" rather than "is the chamber animating".
      const sample = () => {
        const px = g.getImageData(0, 0, c.width, c.height).data;
        let sum = 0;
        for (let i = 0; i < px.length; i += 997) sum += px[i];
        return sum;
      };
      let last = sample();
      let changes = 0;
      const t = setInterval(() => { const now = sample(); if (now !== last) changes += 1; last = now; }, 40);
      setTimeout(() => { clearInterval(t); resolve(changes); }, 700);
    }));

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const visibleChanges = await frames();
    expect(visibleChanges, 'the chamber is not animating while it is on screen').toBeGreaterThan(0);

    // Scroll the chamber well out of view.
    await page.evaluate(() => {
      const c = document.getElementById('bl-chamber-canvas')!;
      const bottom = document.querySelector('#wrap > div:last-child') || document.body;
      bottom.scrollIntoView({ block: 'end' });
      c.getBoundingClientRect();
    });
    await page.waitForTimeout(600);
    const offScreen = await page.evaluate(() => {
      const r = document.getElementById('bl-chamber-canvas')!.getBoundingClientRect();
      return r.bottom < 0 || r.top > window.innerHeight;
    });
    // Only meaningful if the scroll actually moved it away; the harness page may
    // be short enough that it cannot.
    if (offScreen) {
      expect(await frames(), 'the chamber kept redrawing while off screen').toBe(0);
    }

    // Back into view: it must start drawing again, and the canvas must not be blank.
    await page.evaluate(() => document.getElementById('bl-chamber-canvas')!.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(700);
    expect(await frames(), 'the chamber never resumed after scrolling back').toBeGreaterThan(0);
    const lit = await page.evaluate(() => {
      const c = document.getElementById('bl-chamber-canvas') as HTMLCanvasElement;
      const px = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] > 60) n += 1;
      return n;
    });
    expect(lit, 'the chamber came back blank').toBeGreaterThan(1000);
  });
});

test.describe('ABC log export', () => {
  test('the CSV survives a spreadsheet', async ({ page }) => {
    // This is the tool's only data pipeline out and its destination is a school
    // psychologist's spreadsheet. The old writer wrapped values in quotes and
    // escaped nothing, emitted no BOM (so Excel on Windows mojibakes every row —
    // and every consequence in this log carries an emoji), and put a 13-digit
    // epoch integer under a column headed "Timestamp".
    await mount(page, {
      blPhase: 'running',
      blLevel: 4,
      blTick: 20,
      blAbcLog: [
        { tick: 9, a: 'Chamber', b: 'Pressing Lever', c: '🍕 Food pellet (+SR)', t: 1755300000000 },
        { tick: 4, a: 'FR-3 schedule', b: 'A "quoted" behaviour', c: '=SUM(A1:A9)', t: 1755300060000 },
        { tick: 1, a: 'Chamber', b: 'Exploring', c: 'No food', t: 1755300120000 },
      ],
    }, 'dark');

    const out = await page.evaluate(async () => {
      const realCreate = URL.createObjectURL;
      (URL as any).createObjectURL = (b: Blob) => { (window as any).__blob = b; return 'blob:stub'; };
      const btn = [...document.querySelectorAll('button')]
        .find((b) => (b.getAttribute('aria-label') || '').includes('CSV')) as HTMLButtonElement;
      btn.click();
      (URL as any).createObjectURL = realCreate;
      const blob = (window as any).__blob as Blob;
      // Blob.text() strips a leading BOM per the encoding spec, so the BOM has to
      // be checked in the BYTES — testing it through text() silently passes on a
      // file that has none.
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return { text: await blob.text(), head: [bytes[0], bytes[1], bytes[2]], type: blob.type };
    });

    expect(out.head, 'no UTF-8 BOM: Excel will mojibake every emoji in the log').toEqual([0xEF, 0xBB, 0xBF]);
    expect(out.type).toContain('charset=utf-8');
    expect(out.text, 'rows are not CRLF-terminated').toContain('\r\n');
    expect(out.text, 'an embedded quote was not doubled — the row would tear apart').toContain('""quoted""');
    expect(out.text, 'a leading = was left executable by the spreadsheet').toContain('"\'=SUM');
    expect(out.text, 'the time column is still a raw epoch integer').toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

    // A data file reads oldest-first; the on-screen log is newest-first because
    // that is what a live observer wants.
    const rows = out.text.replace(/^﻿/, '').trim().split('\r\n');
    expect(rows).toHaveLength(4);
    expect(rows[1].startsWith('"1"'), 'export is not oldest-first').toBe(true);
    expect(rows[3].startsWith('"9"')).toBe(true);
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
    const chipLeft = () => page.evaluate(() => {
      const chip = [...document.querySelectorAll('[data-behaviorlab-3d] div')]
        .find((e) => (e as HTMLElement).textContent === 'Subject') as HTMLElement | undefined;
      return chip && chip.style.opacity !== '0' ? parseFloat(chip.style.left) : null;
    });

    // The chamber lerps the subject toward its target, so the assertion has to wait
    // for it to ARRIVE. A fixed sleep looks like it does that and doesn't: under
    // load the rAF loop runs fewer frames in the same wall-clock, so the sample
    // lands mid-travel and the test fails for reasons that have nothing to do with
    // the tool. Poll for the position to stop changing instead.
    // Waiting for an animation is the whole difficulty here, and two earlier
    // attempts were both wrong in instructive ways:
    //   * a fixed sleep — under load the rAF loop runs fewer frames per wall-clock
    //     second, so the sample landed mid-travel;
    //   * "poll until the value stops changing" — starvation looks EXACTLY like
    //     arrival, so two identical reads meant "converged" when they really meant
    //     "the loop did not run between them".
    // So: wait for it to MOVE first, and only then for it to settle. Starvation now
    // makes this wait longer instead of returning a wrong answer.
    const at = async (x: number, y: number) => {
      const before = await chipLeft();
      await page.evaluate(({ x, y }) => {
        const d = (window as any).__toolData;
        d.blMouseX = x; d.blMouseY = y; d.blTargetX = x; d.blTargetY = y;
        (window as any).__rerender();
      }, { x, y });
      let moved = before === null;
      let last: number | null = null;
      let stable = 0;
      for (let i = 0; i < 80; i += 1) {
        await page.waitForTimeout(150);
        const now = await chipLeft();
        if (now === null) { last = null; stable = 0; continue; }
        if (!moved) {
          if (before !== null && Math.abs(now - before) > 2) moved = true;
          last = now;
          continue;
        }
        stable = (last !== null && Math.abs(now - last) < 0.5) ? stable + 1 : 0;
        last = now;
        if (stable >= 2) return;
      }
      throw new Error('the subject never settled at its target');
    };

    // Read the viewer's own label chip rather than the framebuffer: the renderer is
    // created without preserveDrawingBuffer, so readPixels after a frame returns a
    // cleared buffer and every colour test silently measures nothing. The chip is
    // positioned by projecting the subject mesh through the live camera, so its
    // left offset IS the mesh's screen position.
    await page.evaluate(() => { (window as any).__toolData.bl3dSel = 'subject'; (window as any).__rerender(); });
    await page.waitForTimeout(600);

    await at(60, 200);
    const xLeft = await chipLeft();
    await at(345, 200);
    const xRight = await chipLeft();

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
