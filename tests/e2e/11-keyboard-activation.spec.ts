import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Drag-and-drop controls must have a keyboard alternative that WORKS.
 *
 * WCAG 2.5.7 (dragging movements) and 2.1.1 (keyboard). Two tools shipped
 * palettes whose only affordance was dragging, so a keyboard-only student could
 * not build an expression or match a theorem at all. Both were given the ARIA
 * button pattern — role + tabIndex + onKeyDown.
 *
 * WHY THIS SPEC EXISTS RATHER THAN A STATIC CHECK
 * The static audit can confirm the SHAPE of that pattern and nothing more. It
 * cannot confirm the handler responds, because handlers are routinely delegated
 * to a named function it cannot follow. The gap that leaves is the worst outcome
 * available: an element that takes focus and then does nothing, which is strictly
 * worse for a keyboard user than one that was never focusable — they land on it,
 * press Enter, and get silence with no way to know the control is broken rather
 * than themselves. So the assertion here is not "a handler exists" but "state
 * actually changed", which only a real key press against a real render can show.
 *
 * WHY THE HARNESS RATHER THAN THE DEPLOYED APP
 * An earlier version of this spec drove the deployed site through Learning Tools
 * into the STEM Lab picker. That covers only what is already live, which is
 * exactly backwards for verifying a change in progress, and every focusable
 * element on the reachable screens turned out to be a native button — so it
 * measured 0/0 custom controls and reported a vacuous pass. GlHarness mounts the
 * tool straight from the WORKING TREE with no network and no navigation.
 *
 * Both tools are 2D (SVG), hence expectCanvas: false — waiting for a WebGL
 * canvas that never comes just times out and reads like a failure.
 */

test.describe.configure({ timeout: 180_000 });

/** Serialise tool state so a key press can be judged by whether it changed anything. */
const SNAPSHOT = () => JSON.stringify((window as any).__toolData || {});

/**
 * Candidate controls: anything draggable, plus anything already wearing the ARIA
 * button pattern. Native button/a/input are excluded — the browser guarantees
 * their activation, so counting them would inflate the pass rate with cases that
 * cannot fail.
 */
const CANDIDATES = `
  window.__dragControls = function () {
    var all = document.querySelectorAll('#wrap [draggable="true"], #wrap [role="button"]');
    return Array.prototype.filter.call(all, function (el) {
      return ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].indexOf(el.tagName) === -1;
    });
  };
  window.__describe = function (el) {
    return (el.getAttribute('aria-label') || (el.textContent || '').trim() || '(unnamed)').slice(0, 60);
  };
`;

interface ToolCase {
  id: string;
  file: string;
  label: string;
  /** Seed state so the drag surface is on screen. */
  data: Record<string, unknown>;
}

const TOOLS: ToolCase[] = [
  {
    id: 'logicLab',
    file: 'stem_lab/stem_tool_logiclab.js',
    label: 'Logic Lab expression palette',
    data: { logicLab: { mode: 'truth', expression: 'P' } },
  },
  {
    id: 'geometryProver',
    file: 'stem_lab/stem_tool_geo.js',
    label: 'Geometry Prover match/sort chips',
    // The theorem-match chips live behind the Challenge tab AND behind
    // gp.matchGame, which renderMatchGame() returns null without — seeding only
    // the tab reached the panel but no chips, and the probe correctly reported
    // it had exercised nothing. startMatchGame() just writes this shape, so the
    // state is seeded directly rather than by driving its button.
    //
    // `shuffled` is fixed rather than the tool's Math.random() ordering: the
    // assertion is about every chip being operable, which must not depend on
    // which permutation a given run happens to draw.
    data: {
      geometryProver: {
        tab: 'challenge',
        challenge: { type: 'theorem_match', question: 'Drag each theorem name to its matching description!' },
        matchGame: { shuffled: [0, 1, 2, 3, 4], matches: {}, wrong: null, done: false },
      },
    },
  },
];

for (const tool of TOOLS) {
  test.describe(tool.label, () => {
    const harness = new GlHarness({
      toolFile: tool.file,
      toolId: tool.id,
      width: 1180,
      height: 900,
      probes: CANDIDATES,
    });

    test.beforeAll(async () => { await harness.start(); });
    test.afterAll(async () => { await harness.stop(); });
    test.afterEach(async ({ page }) => { await harness.destroy(page); });

    test.beforeEach(async ({ page }) => {
      await harness.mount(page, tool.data, undefined, { expectCanvas: false });
    });

    test('the tool renders at all', async ({ page }) => {
      // Guards every assertion below. A tool that threw during render leaves an
      // empty #wrap, and "no draggable elements found" would then look like a
      // clean result instead of a crash.
      const state = await page.evaluate(() => ({
        html: (document.getElementById('wrap') || { innerHTML: '' }).innerHTML.length,
        errors: (window as any).__events.errors.slice(0, 3),
      }));
      expect(state.errors, `render threw: ${state.errors.join(' | ')}`).toEqual([]);
      expect(state.html, 'tool rendered nothing into #wrap').toBeGreaterThan(200);
    });

    test('every draggable control is focusable and named', async ({ page }) => {
      const { bad, seen } = await page.evaluate(() => {
        const out: string[] = [];
        const controls = (window as any).__dragControls() as HTMLElement[];
        controls.forEach((el: HTMLElement) => {
          const name = el.getAttribute('aria-label') || (el.textContent || '').trim();
          const problems: string[] = [];
          if (el.tabIndex < 0) problems.push('not focusable');
          if (!name) problems.push('no accessible name');
          if (el.getAttribute('draggable') === 'true' && el.getAttribute('role') !== 'button') {
            problems.push('draggable without role=button');
          }
          if (problems.length) {
            out.push(problems.join(' + ') + ' -> ' + el.outerHTML.slice(0, 100).replace(/\s+/g, ' '));
          }
        });
        return { bad: out, seen: controls.length };
      });
      // Same guard as the activation test below. On the first run this assertion
      // passed against ZERO controls, because an empty list trivially satisfies
      // toEqual([]) — a green tick proving nothing at all.
      expect(seen, 'no drag controls were reached — the seeded view has no palette').toBeGreaterThan(0);
      expect(bad, `${bad.length} of ${seen} control(s) fail the ARIA button pattern:\n${bad.join('\n')}`).toEqual([]);
    });

    test('pressing Enter on a drag control actually changes state', async ({ page }) => {
      const result = await page.evaluate(async (seed: Record<string, unknown>) => {
        const snap = () => JSON.stringify((window as any).__toolData || {});
        const settle = (ms: number) => new Promise(r => setTimeout(r, ms));
        const press = (el: HTMLElement, key: string) => {
          el.focus();
          for (const type of ['keydown', 'keyup']) {
            el.dispatchEvent(new KeyboardEvent(type, {
              key, code: key === ' ' ? 'Space' : 'Enter', bubbles: true, cancelable: true,
            }));
          }
        };
        const dead: string[] = [];
        let tested = 0;
        const total = Math.min((window as any).__dragControls().length, 24);

        for (let i = 0; i < total; i += 1) {
          // Reset, then ARM by activating the first control.
          //
          // These are select-then-place surfaces: a TARGET does nothing until a
          // SOURCE is selected, so a blind sweep reports every target after the
          // first as dead. It did — 4 of 10, which was the harness failing to
          // model the interaction, not a defect. Re-seeding each time also stops
          // one press leaking into the next (a placed match makes its own chip
          // inert, which would then read as a second false failure).
          (window as any).__ctx.setLabToolData(JSON.parse(JSON.stringify(seed)));
          (window as any).__rerender();
          await settle(80);

          let controls = (window as any).__dragControls() as HTMLElement[];
          if (i > 0 && controls[0]) { press(controls[0], 'Enter'); await settle(60); }

          controls = (window as any).__dragControls() as HTMLElement[];
          const el = controls[i];
          if (!el) continue;

          tested += 1;
          const before = snap();
          for (const key of ['Enter', ' ']) {
            press(el, key);
            await settle(60);
            if (snap() !== before) break;
          }
          if (snap() === before) dead.push((window as any).__describe(el));
        }
        return { tested, dead };
      }, tool.data);

      // A run that exercised nothing must not read as a pass. `0 tested / 0 dead`
      // is the failure mode that makes a suite look green while coverage silently
      // disappears — the seeded view changing, a section moving behind a gate.
      expect(result.tested, 'no drag controls were reached — the seeded view has no palette').toBeGreaterThan(0);

      expect(
        result.dead,
        `${result.dead.length}/${result.tested} control(s) took focus but neither Enter nor Space `
        + `changed any tool state:\n  ${result.dead.join('\n  ')}\n`
        + `Some legitimately no-op in their current state (a select-then-place TARGET does `
        + `nothing until a source is selected), so confirm each by hand before calling it a defect.`,
      ).toEqual([]);
    });
  });
}
