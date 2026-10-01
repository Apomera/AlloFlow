import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * DIAGNOSTIC, not a suite member. Named .diagnostic.ts so Playwright's default
 * testMatch (**\/*.spec.ts) skips it: it starts and stops a static server and
 * mounts a whole tool per case, which takes ~10 minutes for six tools and is
 * intermittently flaky on teardown. Run it deliberately:
 *
 *   npx playwright test tests/e2e/33-stem-idle-repaint.diagnostic.ts --workers=1
 *
 * ─── WHAT IT FOUND (2026-08-05) ───────────────────────────────────────────
 * Eleven tools measured. Five are fully idle: evoLab, echolocation, weldLab,
 * playlab, epidemicSim. Six repaint continuously with no input — and every one
 * of them is a REAL animation, confirmed by pixel comparison:
 *
 *     heatLab       ~6600 draw-ops/s      animating
 *     migration     ~1560                 animating
 *     rocks          ~600                 animating
 *     semiconductor  ~375                 animating
 *     musicSynth     ~225                 animating
 *     artStudio       ~75                 animating
 *
 * So the nuclearlab defect — the SAME picture repainted sixty times a second —
 * did not reproduce anywhere else. The earlier static estimate of "27 tools
 * with unguarded rAF" was an artifact of a too-narrow guard keyword list and
 * should not be trusted; this measurement supersedes it.
 *
 * heatLab's ~6600 draw-ops/s is worth a look on its own terms. That is roughly
 * 110 operations per frame, which is a lot for one diagram — but it is a
 * performance question, not a correctness one, and nothing here says it is
 * wrong.
 *
 * Does a STEM tool repaint while nothing is happening — and does the repaint
 * CHANGE anything?
 *
 * Found by hand in nuclearlab: its reactor panel re-armed requestAnimationFrame
 * unconditionally and redrew a 240-point polyline plus eleven text runs at 60fps
 * forever, on a section a student may never scroll to. Nothing looked wrong. The
 * battery just went.
 *
 * A grep cannot find this. Fifty-nine tools re-arm a rAF loop and draw to a 2D
 * canvas, and every one contains cancelAnimationFrame somewhere — so did
 * nuclearlab, in its cleanup, while burning frames the whole time.
 *
 * Counting repaints is not enough either. A first pass measured six tools
 * repainting continuously with no input, but several of those are ANIMATIONS:
 * semiconductor bobs an electron with Math.sin(Date.now()/300), and an animated
 * diagram is supposed to repaint. The distinction that matters is whether the
 * PIXELS change. Same picture, sixty times a second, is waste. A different
 * picture is a feature — possibly an expensive one, but a deliberate one.
 *
 * So each tool is mounted, left alone, and photographed twice ~700ms apart:
 *   identical pixels + high repaint count  = wasted frames, the nuclearlab bug
 *   changing pixels                        = a real animation
 *   no repaints                            = idle, nothing to see
 */

const CANDIDATES: Array<[string, string]> = [
  ['heatlab', 'heatLab'],
  ['migration', 'migration'],
  ['rocks', 'rocks'],
  ['semiconductor', 'semiconductor'],
  ['music', 'musicSynth'],
  ['artstudio', 'artStudio'],
];

const IDLE_MS = 1200;

// Each case starts and stops its own static server and mounts a whole tool.
// Generous on purpose: two runs showed the measurement itself is quick and
// reliable, while harness setup and teardown occasionally are not.
test.describe.configure({ timeout: 300_000 });

const verdicts: Array<{ tool: string; perSec: number; changed: boolean | null }> = [];

test.describe('STEM tools — are the idle repaints doing anything?', () => {
  for (const [file, id] of CANDIDATES) {
    test(`${id}`, async ({ page }) => {
      const harness = new GlHarness({
        toolFile: `stem_lab/stem_tool_${file}.js`,
        toolId: id, appStyles: true, width: 1000, height: 800,
      });
      await harness.start();
      try {
        await page.goto(harness.url + '/__harness');
        const ok = await page.waitForFunction(
          (t) => !!(window as any).StemLab?._registry?.[t], id, { timeout: 12000 }
        ).then(() => true).catch(() => false);
        test.skip(!ok, `${id} did not register`);

        await page.evaluate(() => {
          (window as any).__ops = 0;
          const orig = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (this: any, ...a: any[]) {
            const real = orig.apply(this, a as any);
            if (!real || a[0] !== '2d') return real;
            return new Proxy(real, {
              get(t: any, k) {
                if (k === 'clearRect' || k === 'fillRect') (window as any).__ops++;
                const v = t[k];
                return typeof v === 'function' ? v.bind(t) : v;
              },
              set(t: any, k, v) { t[k] = v; return true; },
            });
          } as any;
        });
        const initialToolData = id === 'artStudio'
          ? { artStudio: { tab: 'colorWheel', studioHome: false } }
          : {};
        await page.evaluate((toolData) => (window as any).__mount(toolData), initialToolData);
        await page.evaluate(() => {
          const w = document.getElementById('wrap')!;
          w.style.display = 'block'; w.style.height = 'auto';
        });
        await page.waitForTimeout(900);

        // Biggest canvas: the one a student is actually looking at.
        const target = await page.evaluate(() => {
          let best: HTMLCanvasElement | null = null, area = 0;
          document.querySelectorAll('canvas').forEach((c: any) => {
            const a = c.width * c.height;
            if (a > area) { area = a; best = c; }
          });
          if (!best) return null;
          (best as any).setAttribute('data-probe-target', '1');
          return area;
        });
        test.skip(!target, `${id} rendered no canvas`);

        await page.evaluate(() => { (window as any).__ops = 0; });
        const shotA = await page.locator('[data-probe-target]').screenshot({ timeout: 30000 });
        await page.waitForTimeout(IDLE_MS);
        const shotB = await page.locator('[data-probe-target]').screenshot({ timeout: 30000 });
        const ops = await page.evaluate(() => (window as any).__ops as number);

        const perSec = Math.round(ops / (IDLE_MS / 1000));
        const changed = Buffer.compare(shotA, shotB) !== 0;
        verdicts.push({ tool: id, perSec, changed });

        const verdict = perSec < 20 ? 'idle'
          : changed ? 'ANIMATING — repaints change the picture'
            : 'WASTED — same picture, repainted ' + perSec + ' ops/s';
        console.log(`${id.padEnd(15)} ${String(perSec).padStart(5)} ops/s   ${verdict}`);
        // The assertion that matters. Repainting is fine; repainting the SAME
        // PICTURE forever is the nuclearlab bug, and it is invisible without
        // exactly this comparison. Every tool measured so far animates for
        // real, so this passes today and guards against a regression.
        expect(perSec < 20 || changed,
          `${id} repaints ${perSec} ops/s without changing a pixel — wasted frames`).toBe(true);
      } finally {
        // Close the page BEFORE the server. server.close() waits for open
        // connections to drain, and a page whose animation loop is still
        // running holds one — which hung three of these tests to the full
        // 180 s timeout AFTER they had already taken their measurement.
        await page.close().catch(() => {});
        await harness.stop();
      }
    });
  }

  test.afterAll(() => {
    if (!verdicts.length) return;
    const wasted = verdicts.filter((v) => v.perSec >= 20 && v.changed === false);
    console.log('\n──── verdicts ────');
    for (const v of verdicts.sort((a, b) => b.perSec - a.perSec)) {
      console.log(`  ${v.tool.padEnd(15)} ${String(v.perSec).padStart(5)} ops/s  ` +
        (v.perSec < 20 ? 'idle' : v.changed ? 'animating' : 'WASTED'));
    }
    console.log(`\nwasted-frame tools: ${wasted.map((v) => v.tool).join(', ') || 'none'}`);
  });
});
