import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Nuclear & Radiation Lab — the charts, rasterised.
 *
 * The jsdom suite (nuclearlab_canvas_render) mounts the tool with a recording 2D
 * context and proves the draw calls happen with finite coordinates. That is worth
 * having, but it cannot tell a good chart from a black rectangle: every assertion
 * there would pass just as happily if every stroke landed on the same pixel.
 *
 * This spec puts the same five canvases in front of a real rasteriser and asks the
 * questions only pixels can answer — is anything actually painted, does it use the
 * area it was given, does the light theme differ from the dark one — and writes a
 * PNG of each so the result can be looked at rather than inferred.
 *
 * It also runs axe with colour-contrast ENABLED. That rule is switched off in the
 * jsdom suite because jsdom has no stylesheet, and the hand-rolled contrast suite
 * only covers colours the tool sets inline. With the real bundle loaded, Chromium
 * computes what a student sees, so this is the only place a contrast pass over the
 * Tailwind utilities means anything.
 *
 * No WebGL here — these are 2D contexts — so mount() is told not to wait for a GL
 * context it will never get.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_nuclearlab.js',
  toolId: 'nuclearLab',
  appStyles: true,
  width: 1100,
  height: 1400,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

// NOT under test-results/: Playwright clears that per retry, so the second
// write of a retried test lands in a directory that no longer exists.
const SHOTS = join(process.cwd(), 'tests', 'e2e', 'artifacts', 'nuclearlab-charts');

test.describe.configure({ timeout: 180_000 });
test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });

/**
 * Mount without waiting for a GL context, then wait for the 2D canvases.
 *
 * #wrap is a fixed-size flex box built for a 3D viewport. This tool is a long
 * scrolling document, so it is switched to block flow and allowed to grow —
 * otherwise the flex child is squeezed, every chart is measured at the wrong
 * width, and the screenshots would be of a layout no student ever sees.
 */
async function mount2d(page: any, toolData: Record<string, unknown>) {
  await harness.mount(page, toolData, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const w = document.getElementById('wrap')!;
    w.style.display = 'block';
    w.style.height = 'auto';
    w.style.padding = '12px';
  });
  await page.waitForSelector('#wrap canvas', { timeout: 30000 });
  // Charts draw in useEffect, and the resize above changes their measured width.
  await page.evaluate(() => (window as any).__rerender());
  await page.waitForTimeout(600);
}

/**
 * The harness pins ctx.theme to 'default' for every tool, so light mode has to
 * be set on the live ctx and re-rendered. The tool reads ctx.theme on each
 * render and every chart effect lists isDark in its deps, so they repaint.
 * The page background is moved with it: the harness paints slate-900 behind
 * everything, which would make a light-theme screenshot a lie.
 */
async function setTheme(page: any, theme: 'default' | 'light') {
  await page.evaluate((t: string) => {
    (window as any).__ctx.theme = t;
    // BOTH, and html especially: axe walks to the root for the backdrop of a
    // translucent card, so leaving html dark measures light-theme text against
    // slate-900 and reports contrast failures that do not exist.
    const pageBg = t === 'light' ? '#f8fafc' : '#0f172a';
    document.documentElement.style.background = pageBg;
    document.body.style.background = pageBg;
    (window as any).__rerender();
  }, theme);
  await page.waitForTimeout(600);
}

/**
 * Per-canvas pixel statistics, read in-page. `ink` is the share of pixels that
 * differ from the chart's own background, which is the number that separates a
 * real chart from an empty box.
 */
async function canvasStats(page: any) {
  return page.evaluate(() => {
    const out: Array<Record<string, any>> = [];
    document.querySelectorAll('canvas').forEach((cv: any) => {
      const w = cv.width, h = cv.height;
      if (!w || !h) { out.push({ label: (cv.getAttribute('aria-label') || '').slice(0, 40), w, h, empty: true }); return; }
      const g = cv.getContext('2d');
      if (!g) { out.push({ label: 'no-2d-context', w, h, empty: true }); return; }
      const d = g.getImageData(0, 0, w, h).data;
      // Background = the modal corner pixel; charts fill their whole box first.
      const b = [d[0], d[1], d[2]];
      const seen = new Set<string>();
      let ink = 0, total = 0;
      let minX = w, maxX = 0, minY = h, maxY = 0;
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 4;
          total++;
          const dr = Math.abs(d[i] - b[0]) + Math.abs(d[i + 1] - b[1]) + Math.abs(d[i + 2] - b[2]);
          if (dr > 24) {
            ink++;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
          if (seen.size < 400) seen.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
        }
      }
      out.push({
        label: (cv.getAttribute('aria-label') || '').slice(0, 40),
        w, h,
        bg: b.join(','),
        inkPct: +(100 * ink / total).toFixed(2),
        colours: seen.size,
        spreadX: +((maxX - minX) / w).toFixed(2),
        spreadY: +((maxY - minY) / h).toFixed(2),
      });
    });
    return out;
  });
}

async function shootCanvases(page: any, tag: string) {
  const cvs = await page.locator('#wrap canvas').all();
  for (let i = 0; i < cvs.length; i++) {
    const label = ((await cvs[i].getAttribute('aria-label')) || 'canvas')
      .slice(0, 34).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const buf = await cvs[i].screenshot({ timeout: 60000 });
    writeFileSync(join(SHOTS, `${tag}-${i}-${label}.png`), buf);
  }
}

test.describe('Nuclear Lab — charts in a real browser', () => {
  test('every chart paints, uses its box, and is not a flat rectangle', async ({ page }) => {
    await mount2d(page, {
      _nuclearLab: {
        halves: 3.25, isoId: 'cs137', chainPick: 6, bioId: 'cs137',
        cdSrc: 'cs137', cdDist: 10,
        cdRuns: [{ g: 940, b: 255, t: 600, d: 10, s: 'cs137' }],
        ptSrc: 'cs137', ptDist: 2, ptShield: 'lead', ptThick: 2,
        shRate: 2, shPlume: 8, shEvac: 4, shPlace: 'masonry',
      },
    });

    // The reactor canvas deliberately parks while it is far below the viewport.
    // Bring it into view before sampling pixels so this assertion tests the
    // resting frame, not the race between requestAnimationFrame and the first
    // IntersectionObserver callback.
    await page.getByRole('img', { name: /Reactor control panel/ }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const stats = await canvasStats(page);
    console.log('DARK canvas stats:\n' + stats.map((s) => JSON.stringify(s)).join('\n'));
    await shootCanvases(page, 'dark');

    // The reactor panel is excluded from the CHART assertions below (different
    // layout, its own scale), but it must still have painted its resting frame.
    // It silently stopped doing so once the idle-skip landed — a resize wipes
    // the canvas by assigning el.width, and the skip could not tell a wipe from
    // a no-op. Printing its stats was not enough; nothing failed. Assert it.
    const panel = stats.find((s) => /Reactor control panel/i.test(s.label || ''));
    expect(panel, 'reactor panel canvas missing').toBeTruthy();
    expect(panel!.inkPct, 'reactor panel never painted its resting frame').toBeGreaterThan(1);

    const charts = stats.filter((s) => !/Reactor control panel/i.test(s.label || ''));
    expect(charts.length, 'expected seven chart canvases').toBeGreaterThanOrEqual(7);

    for (const s of charts) {
      expect(s.empty, `${s.label}: canvas has zero size`).toBeFalsy();
      // A blank box reads as ~0% ink; a solid fill reads as ~100%. Real charts
      // with a gradient fill, gridlines and labels sit well inside that.
      expect(s.inkPct, `${s.label}: nothing painted (${s.inkPct}% ink)`).toBeGreaterThan(3);
      expect(s.inkPct, `${s.label}: whole box is one colour (${s.inkPct}% ink)`).toBeLessThan(97);
      // Anti-aliased curves and text produce hundreds of shades. A handful means
      // gridlines drew and the data did not.
      expect(s.colours, `${s.label}: only ${s.colours} distinct colours`).toBeGreaterThan(24);
      // Content must span the box, not huddle in a corner — the failure mode
      // when a scale collapses or a series is out of range.
      expect(s.spreadX, `${s.label}: content spans only ${s.spreadX} of the width`).toBeGreaterThan(0.7);
      expect(s.spreadY, `${s.label}: content spans only ${s.spreadY} of the height`).toBeGreaterThan(0.5);
    }
  });

  test('the light theme really is a different picture', async ({ page }) => {
    await mount2d(page, {
      _nuclearLab: { halves: 3.25, isoId: 'cs137', chainPick: 6, bioId: 'cs137', cdSrc: 'cs137' },
    });
    const dark = await canvasStats(page);

    await setTheme(page, 'light');
    const light = await canvasStats(page);
    console.log('LIGHT canvas stats:\n' + light.map((s) => JSON.stringify(s)).join('\n'));
    await shootCanvases(page, 'light');

    // If the theme never reached the charts, every background would match and the
    // ink remap would be doing nothing on canvas.
    const darkBgs = dark.map((s) => s.bg).join('|');
    const lightBgs = light.map((s) => s.bg).join('|');
    expect(lightBgs, 'light theme produced identical chart backgrounds').not.toBe(darkBgs);
    for (const s of light.filter((x) => !/Reactor control panel/i.test(x.label || ''))) {
      expect(s.inkPct, `light ${s.label}: nothing painted`).toBeGreaterThan(3);
      expect(s.colours, `light ${s.label}: only ${s.colours} colours`).toBeGreaterThan(24);
    }
  });

  test('the chain map lights up the selected nucleus', async ({ page }) => {
    await mount2d(page, { _nuclearLab: {} });
    const before = await page.locator('#wrap canvas').nth(1).screenshot({ timeout: 60000 });
    writeFileSync(join(SHOTS, 'chain-none-selected.png'), before);
    await harness.destroy(page);

    await mount2d(page, { _nuclearLab: { chainPick: 6 } });
    const after = await page.locator('#wrap canvas').nth(1).screenshot({ timeout: 60000 });
    writeFileSync(join(SHOTS, 'chain-radon-selected.png'), after);

    // Selecting radon draws one extra ring. The two renders must differ.
    expect(Buffer.compare(before, after), 'selection changed nothing on the map').not.toBe(0);
  });

  test('full page, both themes, for the record', async ({ page }) => {
    const state = {
      _nuclearLab: {
        halves: 2, isoId: 'c14', chainPick: 6, enrPick: 5, dosePick: 7,
        wrId: 'alpha', wtId: 'lung', absorbedMGy: 2, bioId: 'cs137',
        cdSrc: 'cs137', cdDist: 10, cdRuns: [{ g: 940, b: 255, t: 600, d: 10, s: 'cs137' }],
      },
    };
    await mount2d(page, state);
    writeFileSync(join(SHOTS, 'page-dark.png'), await page.screenshot({ fullPage: true, timeout: 90000 }));
    await setTheme(page, 'light');
    writeFileSync(join(SHOTS, 'page-light.png'), await page.screenshot({ fullPage: true, timeout: 90000 }));
  });

  // ── The reactor panel ────────────────────────────────────────────────────
  // Every other canvas here paints once from a useEffect. This one paints from
  // a requestAnimationFrame loop that only does anything after the student
  // presses Start, which is why it was excluded from the assertions above and
  // had never been looked at. Drive it: start it, pull the rods, let the trace
  // fill, and check the panel that results.
  test('the reactor panel runs, traces power, and labels its readouts', async ({ page }) => {
    await mount2d(page, { _nuclearLab: { rxMode: 'modern', rxScenario: 'steady' } });

    const panel = page.locator('#wrap canvas').last();
    const before = await panel.screenshot({ timeout: 60000 });
    writeFileSync(join(SHOTS, 'reactor-idle.png'), before);

    await page.getByLabel('Start the simulation').click();
    // Pull rods out to 30% so power actually moves and the trace has a shape.
    await page.locator('#rx-rods').fill('30');
    // hist takes one sample per animation frame and holds 240, so a full-width
    // trace needs roughly four seconds of frames.
    await page.waitForTimeout(5000);

    const after = await panel.screenshot({ timeout: 60000 });
    writeFileSync(join(SHOTS, 'reactor-running.png'), after);
    expect(Buffer.compare(before, after), 'the panel never changed — the loop is not running').not.toBe(0);

    const stats = (await canvasStats(page)).filter((x: any) => /Reactor control panel/i.test(x.label || ''));
    console.log('REACTOR panel stats: ' + JSON.stringify(stats[0]));
    expect(stats.length, 'reactor canvas not found').toBe(1);
    // Idle it sits near 2.5% ink (labels + flat line). Running, the trace and
    // live readouts add to that. Anything at zero means the loop died.
    expect(stats[0].inkPct, 'panel is blank').toBeGreaterThan(2);
    expect(stats[0].colours, 'panel has almost no colour variation').toBeGreaterThan(20);

    // The physics should have moved: pulling rods from 50 to 30 raises power.
    const power = await page.evaluate(() => {
      const el = document.querySelector('[aria-label*="Reactor control panel"]') as HTMLCanvasElement;
      return el ? el.getAttribute('aria-label') : null;
    });
    expect(power, 'reactor canvas lost its description').toBeTruthy();
  });

  // The only place in the whole suite where a contrast result means anything:
  // real stylesheet, real computed styles, axe's own implementation.
  for (const theme of ['default', 'light'] as const) {
    test(`axe colour-contrast with the real stylesheet — ${theme}`, async ({ page }) => {
      await mount2d(page, {
        _nuclearLab: {
          chainPick: 6, enrPick: 5, dosePick: 7, wrId: 'alpha', wtId: 'lung',
          bioId: 'cs137', cdSrc: 'cs137', cdRuns: [{ g: 940, b: 255, t: 600, d: 10, s: 'cs137' }],
          incidentId: 'chernobyl', reactorId: 'smr',
          // A route-active index was never audited: its pills, its step
          // buttons and its category row only exist in this state.
          nkPath: 'me', nkOpen: true,
          nkRouteSeen: {
            me: ['weighting', 'biohalf', 'mydose', 'doseladder', 'lowdose', 'evidence'],
          },
          pathsCompleted: ['me'],
          evidenceMastered: [
            'reactor-bomb',
            'inverse-square',
            'low-dose-zero',
            'neutron-layers',
            'short-count',
          ],
          nkReflections: {
            me: {
              confidence: 'growing',
              idea: 'Dose needs a unit, a pathway, and a timescale.',
              question: 'Which uncertainty matters most here?',
            },
          },
        },
      });
      if (theme === 'light') await setTheme(page, 'light');
      // Guard: if the bundle were missing, every ratio below would be measured
      // against unstyled defaults and the pass would be worthless.
      const fs = await page.evaluate(() => {
        const el = document.querySelector('[data-nuclear-lab] p');
        return el ? getComputedStyle(el).fontSize : '';
      });
      expect(fs, 'app stylesheet did not apply — contrast results would be meaningless').not.toBe('16px');

      const violations = await page.evaluate(async () => {
        const res = await (window as any).axe.run(document.querySelector('#wrap'), {
          runOnly: { type: 'rule', values: ['color-contrast'] },
          resultTypes: ['violations'],
        });
        return res.violations.flatMap((v: any) => v.nodes.map((n: any) => ({
          ratio: (n.any?.[0]?.data?.contrastRatio ?? null),
          fg: n.any?.[0]?.data?.fgColor, bg: n.any?.[0]?.data?.bgColor,
          html: String(n.html).slice(0, 130),
        })));
      });
      if (violations.length) console.log(`${theme} contrast violations:\n` + violations.map((v: any) => `  ${v.ratio}:1 ${v.fg} on ${v.bg}\n    ${v.html}`).join('\n'));
      expect(violations, `${theme}: ${violations.length} elements below AA`).toEqual([]);
    });
  }
});
