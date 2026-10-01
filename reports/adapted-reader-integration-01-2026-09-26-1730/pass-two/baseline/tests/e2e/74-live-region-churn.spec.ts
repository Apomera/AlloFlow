import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Live regions must not narrate a running simulation.
 *
 * Particle Lab (2026-09-05) had `role="status" aria-live="polite"` on a card whose
 * detail line carried live physics. Measured over six seconds of a running sim: nine
 * live-region text changes, six from that one card — a screen reader re-announced a
 * whole sentence about once a second, for as long as the simulation ran, drowning out
 * everything the user tried to do.
 *
 * Nothing static catches this. axe checks that a live region is well-formed, not how
 * often it fires, and the markup looks textbook-correct. The only way to know is to
 * count mutations while the tool animates. A live region may carry state transitions
 * and milestones; it may never carry a value that moves with a timer, an animation
 * frame or a physics step. Put metrics in plain content and announce transitions
 * explicitly through ctx.announceToSR.
 *
 * ★The trap this file is built around: a tool mounted bare often shows a STATIC view,
 * and a static view produces no mutations, so a silent result would prove nothing and
 * the suite would look green while measuring air. Every case therefore also counts
 * animation frames and FAILS if the tool never animated — a tool that stops animating
 * on a bare mount must be given state or removed, not left to pass vacuously.
 *
 * Physics is covered by its own case in 72-physics-lab-behaviour.spec.ts, which can
 * hold a projectile in flight for the whole window.
 */

test.describe.configure({ timeout: 240_000 });

/** Tools verified (2026-09-07) to animate on a bare mount, with their frame counts. */
const TOOLS: Array<{ id: string; file: string; orbit?: boolean; note: string }> = [
  { id: 'solarSystem', file: 'stem_lab/stem_tool_solarsystem.js', note: 'orbits drift continuously (~283 frames/5s)' },
  { id: 'anatomy', file: 'stem_lab/stem_tool_anatomy.js', orbit: true, note: '3D body view renders continuously (~161)' },
  { id: 'weatherSystems', file: 'stem_lab/stem_tool_weathersystems.js', note: 'animated weather canvas (~104)' },
  { id: 'beehive', file: 'stem_lab/stem_tool_beehive.js', note: 'hive animation (~109)' },
];

/** Count real animation frames so an inert mount cannot pass for a quiet one. */
const INSTRUMENT = `
  window.__frames = 0;
  (function () {
    var raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function (cb) {
      return raf(function (t) { window.__frames++; return cb(t); });
    };
  })();
`;

const WINDOW_MS = 5000;
/** Particle Lab threshold: more than 3 changes in 5s of a running sim is narration. */
const MAX_CHANGES_PER_REGION = 3;
/** ~6fps over the window; below this the tool was not really animating. */
const MIN_FRAMES = 30;

for (const tool of TOOLS) {
  test(`${tool.id}: does not narrate the running simulation through a live region`, async ({ page }) => {
    const harness = new GlHarness({
      toolFile: tool.file,
      toolId: tool.id,
      width: 1200,
      height: 820,
      probes: INSTRUMENT,
      extraScripts: tool.orbit ? ['vendor/three-r128/OrbitControls.js'] : undefined,
    });
    await harness.start();
    try {
      await harness.mount(page, {}, undefined, { expectCanvas: false });

      // Attach after mount so the tool's own regions exist, and snapshot the frame
      // counter so only frames inside the measurement window are counted.
      const regionCount = await page.evaluate(() => {
        const w = window as any;
        w.__hits = {};
        w.__f0 = w.__frames;
        const nodes = Array.from(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'));
        w.__obs = nodes.map((el, i) => {
          const key = (el.getAttribute('aria-label') || el.id || el.className || 'region').slice(0, 60) + '#' + i;
          w.__hits[key] = 0;
          const mo = new MutationObserver(() => { w.__hits[key]++; });
          mo.observe(el, { childList: true, characterData: true, subtree: true });
          return mo;
        });
        return nodes.length;
      });

      await page.waitForTimeout(WINDOW_MS);

      const result = await page.evaluate(() => {
        const w = window as any;
        (w.__obs || []).forEach((o: MutationObserver) => o.disconnect());
        const hits = w.__hits as Record<string, number>;
        const worst = Object.entries(hits).sort((a, b) => (b[1] as number) - (a[1] as number))[0] || null;
        return { frames: w.__frames - w.__f0, worst };
      });

      // Guard against a vacuous pass before judging silence.
      expect(
        result.frames,
        `${tool.id} never animated (${tool.note}) — the measurement window proved nothing; give it state or drop it from this manifest`,
      ).toBeGreaterThan(MIN_FRAMES);

      expect(regionCount, `${tool.id} exposes no live regions to measure`).toBeGreaterThan(0);

      const worstName = result.worst ? result.worst[0] : 'none';
      const worstCount = result.worst ? (result.worst[1] as number) : 0;
      expect(
        worstCount,
        `${tool.id}: live region "${worstName}" changed ${worstCount} times in ${WINDOW_MS}ms of animation — a screen reader re-announces it that often. Move the moving value into plain content and announce transitions through ctx.announceToSR.`,
      ).toBeLessThanOrEqual(MAX_CHANGES_PER_REGION);
    } finally {
      await harness.destroy(page).catch(() => {});
      await harness.stop().catch(() => {});
    }
  });
}
