/**
 * Assessment Builder — reordering must not require a mouse.
 *
 * Blocks were reorderable ONLY by dragging: the handle column held a decorative
 * GripVertical in a plain <div>, with no role, no tabIndex and no key handler,
 * and the only other controls in a block were its type select, quantity, and
 * remove button. A keyboard or touch user could not change block order at all
 * (WCAG 2.5.7 dragging movements, 2.1.1 keyboard).
 *
 * WHY A SPEC AND NOT JUST THE UNIT CHECK
 * The reorder MATH is already covered by extracting the two handler bodies and
 * running every permutation. That proves the splice arithmetic and nothing else.
 * It cannot see whether the buttons render, whether they are wired to those
 * handlers, whether they are reachable by keyboard, or whether the labels
 * survive to the accessibility tree — which is precisely the gap that produced
 * the original defect, where a control existed visually and did nothing for a
 * keyboard user. Only a real render and a real key press covers that.
 *
 * WHY THE HUB IS MOUNTED DIRECTLY
 * GlHarness.mount() renders a REGISTERED TOOL via StemLab.renderTool(id, ctx).
 * The Assessment Builder is not a tool — it is hub chrome inside
 * window.AlloModules.StemLab (StemLabModal), so there is no id to mount. That
 * component turns out to be fully CONTROLLED: assessmentBlocks, stemLabTab and
 * showAssessmentBuilder are all props, not internal useState, so the builder can
 * be driven straight from a props object with no navigation at all.
 *
 * The props are a Proxy over 144 destructured names. Unknown props resolve to
 * undefined ON PURPOSE: every sibling panel is gated behind `someFlag && ...`,
 * so undefined keeps them all switched off and renders the builder alone. A
 * default of [] or {} would be TRUTHY and switch those panels on, dragging
 * unrelated surfaces into the render and turning any crash in them into a
 * failure of this spec.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const MODULE = 'stem_lab/stem_lab_module.js';

const harness = new GlHarness({
  // The module must load as a preScript: it installs its registry behind
  // `if (!window.StemLab)` (line 199) and the harness's own fallback stub is
  // defined AFTER preScripts, so loading it any later leaves the stub in place.
  // Naming it as toolFile too is harmless — its line-26 duplicate guard makes
  // the second load a no-op — and toolFile is a required option.
  toolFile: MODULE,
  toolId: 'stemLabHub',
  preScripts: [MODULE],
  width: 1280,
  height: 1000,
});

test.describe.configure({ timeout: 240_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

const SEED = ['computation', 'word_problems', 'fluency', 'geometry'];

/** Mount StemLabModal with only the Assessment Builder switched on. */
async function mountBuilder(
  page: import('@playwright/test').Page,
  types: string[] = SEED,
  snapshots: unknown[] = [],
) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).AlloModules?.StemLab, null, { timeout: 30000 });

  await page.evaluate(({ seedTypes, seedSnaps }: { seedTypes: string[]; seedSnaps: unknown[] }) => {
    // The harness records e.message only. A missing prop surfaces as a bare
    // "cannot read properties of undefined", which names neither the prop nor
    // the site — the stack is what turns that into a one-line fix.
    (window as any).__stacks = [];
    window.addEventListener('error', (e: any) => {
      (window as any).__stacks.push(String((e.error && e.error.stack) || e.message).slice(0, 900));
    });
    const React = (window as any).React;
    const ReactDOM = (window as any).ReactDOM;
    const Modal = (window as any).AlloModules.StemLab;

    // Icons are rendered via createElement, so they must be components —
    // undefined would throw "element type is invalid" before anything renders.
    const Icon = () => React.createElement('span', { 'aria-hidden': 'true' });

    let blocks = seedTypes.map((type, i) => ({
      id: 'b' + i, type, quantity: i + 1, directive: 'directive ' + i,
    }));
    (window as any).__order = () => blocks.map((b: any) => b.id);

    let bump: (() => void) | null = null;
    const overrides: Record<string, unknown> = {
      ArrowLeft: Icon, Calculator: Icon, GripVertical: Icon, Sparkles: Icon, X: Icon,
      stemLabTab: 'create',
      showAssessmentBuilder: true,
      get assessmentBlocks() { return blocks; },
      setAssessmentBlocks: (nb: any) => { blocks = nb; if (bump) bump(); },
      setShowAssessmentBuilder: () => {},
      setStemLabTab: () => {},
      addToast: (m: string) => (window as any).__events.toasts.push({ message: String(m) }),
      t: (k: string, fb: string) => fb || k,
      // Read as `labToolData._persisted` inside a hook DEPENDENCY ARRAY, which
      // is evaluated during render — so undefined here throws before anything
      // paints, rather than failing some later branch.
      labToolData: {},
      setLabToolData: () => {},
      // Read as `toolSnapshots.length > 0` with no guard, inside the builder
      // branch itself (line 4816) — the one other external array on this path.
      toolSnapshots: seedSnaps,
      setHistory: () => {},
    };
    const props = new Proxy({}, {
      get: (_t, key: string) => {
        if (key in overrides) return overrides[key];
        // Setters default to a noop: they are called from effects and handlers
        // regardless of which panel is on screen, and "x is not a function"
        // would mask the thing under test. Everything else stays undefined so
        // sibling panels stay switched off.
        if (typeof key === 'string' && /^set[A-Z]/.test(key)) return () => {};
        return undefined;
      },
      has: () => true,
    });

    // Called directly rather than passed through createElement: React copies a
    // props object via its own keys, and this Proxy has none, so every prop
    // would arrive undefined. The wrapper keeps hook order stable.
    const Wrapper = () => {
      const st = React.useState(0);
      bump = () => st[1]((n: number) => n + 1);
      return Modal(props);
    };
    (window as any).__root = ReactDOM.createRoot(document.getElementById('wrap'));
    (window as any).__root.render(React.createElement(Wrapper));
  }, { seedTypes: types, seedSnaps: snapshots });

  await page.waitForTimeout(600);
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => { try { (window as any).__root?.unmount(); } catch { /* already gone */ } });
});

/** Every assertion below is meaningless if the builder never rendered. */
test('the Assessment Builder renders its blocks', async ({ page }) => {
  await mountBuilder(page);
  const state = await page.evaluate(() => ({
    errors: (window as any).__events.errors.slice(0, 3),
    stacks: ((window as any).__stacks || []).slice(0, 2),
    selects: document.querySelectorAll('#wrap select[aria-label="Block type"]').length,
  }));
  expect(state.errors, `render threw: ${state.errors.join(' | ')}\n${state.stacks.join('\n---\n')}`).toEqual([]);
  expect(state.selects, 'no assessment blocks rendered — the builder branch is not on screen')
    .toBe(SEED.length);
});

test('every block exposes keyboard reorder controls, correctly disabled at the ends', async ({ page }) => {
  await mountBuilder(page);
  const found = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#wrap button')] as HTMLButtonElement[];
    const pick = (dir: string) => btns
      .filter((b) => (b.getAttribute('aria-label') || '').startsWith('Move block ')
        && (b.getAttribute('aria-label') || '').endsWith(' ' + dir))
      .map((b) => ({ label: b.getAttribute('aria-label'), disabled: b.disabled }));
    return { up: pick('up'), down: pick('down') };
  });

  expect(found.up.length, 'no "move up" controls rendered').toBe(SEED.length);
  expect(found.down.length, 'no "move down" controls rendered').toBe(SEED.length);

  // Labels must identify WHICH row moves, or a screen reader user hears four
  // identical "Move block up" controls.
  expect(found.up.map((b) => b.label)).toEqual([
    'Move block 1 up', 'Move block 2 up', 'Move block 3 up', 'Move block 4 up',
  ]);
  // Only the ends are inert, and only in the direction that would fall off.
  expect(found.up.map((b) => b.disabled), 'up should be disabled on the first block only')
    .toEqual([true, false, false, false]);
  expect(found.down.map((b) => b.disabled), 'down should be disabled on the last block only')
    .toEqual([false, false, false, true]);
});

test('clicking move-up actually reorders the blocks', async ({ page }) => {
  await mountBuilder(page);
  const before = await page.evaluate(() => (window as any).__order());
  await page.locator('#wrap button[aria-label="Move block 3 up"]').click();
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => (window as any).__order());

  expect(before, 'seed order is wrong').toEqual(['b0', 'b1', 'b2', 'b3']);
  expect(after, 'move-up did not reorder').toEqual(['b0', 'b2', 'b1', 'b3']);
});

test('the reorder controls are operable by keyboard alone', async ({ page }) => {
  await mountBuilder(page);

  // Focus by keyboard rather than .focus(): a control that cannot be TABBED to
  // is unreachable in practice even if it responds once focused.
  const reached = await page.evaluate(async () => {
    const target = document.querySelector('#wrap button[aria-label="Move block 2 down"]') as HTMLElement;
    if (!target) return { ok: false, why: 'control not found' };
    target.focus();
    return { ok: document.activeElement === target, why: String(document.activeElement?.tagName) };
  });
  expect(reached.ok, `move-down did not take focus (active: ${reached.why})`).toBe(true);

  // Enter on a focused native button activates it — this is what a keyboard
  // user actually does, and it is the step the original code had no answer for.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__order()), 'Enter on move-down did not reorder')
    .toEqual(['b0', 'b2', 'b1', 'b3']);

  // Space is the button's other native activation key.
  await page.locator('#wrap button[aria-label="Move block 1 down"]').focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__order()), 'Space on move-down did not reorder')
    .toEqual(['b2', 'b0', 'b1', 'b3']);
});

test('a reorder is announced to screen readers', async ({ page }) => {
  // Without this the move is silent: focus stays on the button, whose label
  // quietly re-reads as the block's new position. A sighted user sees the row
  // jump; a screen reader user gets nothing to confirm anything happened.
  await mountBuilder(page);
  await page.locator('#wrap button[aria-label="Move block 3 up"]').click();
  await page.waitForTimeout(150); // announceToSR clears the region after 3s.

  const live = await page.evaluate(() => {
    const el = document.getElementById('stem-a11y-live');
    return el
      ? { text: (el.textContent || '').trim(), live: el.getAttribute('aria-live') }
      : null;
  });
  expect(live, 'no live region rendered').not.toBeNull();
  expect(live!.live, 'the region is present but not announcing').toBeTruthy();
  expect(live!.text, 'the reorder was not announced').toContain('moved up to position 2');
});

test('no layout container is left wearing an unnamed, dead button role', async ({ page }) => {
  // The Tool Snapshots section wrapper carried role="button" + tabIndex=0 and an
  // e.target.click() key shim with no onClick behind it: focusable, announced as
  // an unnamed button, inert on Enter — and it wrapped the real "Clear all" and
  // "Open ..." buttons in a button role, whose children ARIA treats as
  // presentational. Seeding a snapshot is what puts that branch on screen; with
  // toolSnapshots empty this test would pass without rendering the thing at all.
  const snaps = [
    { id: 's1', label: 'Volume snapshot', tool: 'volume', mode: 'explore', rotation: 0, data: {} },
    { id: 's2', label: 'Grid snapshot', tool: 'coordgrid', mode: 'explore', rotation: 0, data: {} },
  ];
  await mountBuilder(page, SEED, snaps);

  const section = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('#wrap h4')] as HTMLElement[];
    const head = heads.find((h) => (h.textContent || '').includes('Tool Snapshots'));
    if (!head) return { rendered: false } as Record<string, unknown>;
    // Walk up to the section wrapper that used to hold the bogus role.
    let el: HTMLElement | null = head;
    const roles: Array<{ role: string | null; tab: number; name: string | null; hasClick: boolean }> = [];
    for (let i = 0; i < 4 && el; i += 1) {
      el = el.parentElement;
      if (!el || el.id === 'wrap') break;
      roles.push({
        role: el.getAttribute('role'),
        tab: el.tabIndex,
        name: el.getAttribute('aria-label'),
        hasClick: false,
      });
    }
    return { rendered: true, roles, buttons: document.querySelectorAll('#wrap button').length };
  });

  expect(section.rendered, 'the Tool Snapshots section did not render — seed did not take').toBe(true);
  // The walk must have inspected something. An empty ancestor list satisfies
  // the filter below trivially — the same vacuous shape that made an earlier
  // spec in this suite report a pass against zero controls.
  expect((section.roles as unknown[]).length, 'ancestor walk inspected nothing').toBeGreaterThan(0);

  // Deliberately NOT filtered on "has no accessible name". The module runs a
  // "WCAG Auto-Fixer" on a setInterval (line 2794) that stamps an aria-label
  // onto every `[role="button"]:not([aria-label])` inside .stem-lab-modal,
  // using the element's text content. That class IS applied here (line 4045),
  // so the fixer is live in this harness: an unnamed-button assertion would be
  // racing it, and would go green the moment it ticked — reporting the defect
  // as fixed because something had papered a name over it.
  //
  // The invariant that actually holds is simpler: a layout container wrapping
  // other controls must not claim role="button" at all, named or not.
  const offenders = (section.roles as Array<{ role: string | null; tab: number; name: string | null }>)
    .filter((a) => a.role === 'button');
  expect(offenders, `an ancestor of the section heading claims role=button: ${JSON.stringify(offenders)}`)
    .toEqual([]);
});

test('the a11y loop reports defects instead of papering over them', async ({ page }) => {
  // The loop at stem_lab_module.js:2792 shipped as a silent auto-fixer that
  // stamped aria-label/alt/role onto anything unlabelled every 2 seconds, which
  // silenced the audits used to find those gaps. It now reports instead. Both
  // halves of that need proving: that it no longer writes, AND that it still
  // detects — a reporter that detects nothing is just a deleted feature.
  await mountBuilder(page);

  await page.evaluate(() => {
    const modal = document.querySelector('.stem-lab-modal');
    if (!modal) throw new Error('.stem-lab-modal absent — the loop never starts');
    const add = (tag: string, id: string) => {
      const el = document.createElement(tag);
      el.id = id;
      modal.appendChild(el);
      return el;
    };
    add('canvas', 'probe-canvas');
    add('select', 'probe-select');
    add('img', 'probe-img');
    add('button', 'probe-close').textContent = '×';
  });

  // One full tick of the 2s interval, plus margin.
  await page.waitForTimeout(2800);

  const after = await page.evaluate(() => {
    const get = (id: string, attr: string) =>
      document.getElementById(id)?.getAttribute(attr) ?? null;
    return {
      canvasRole: get('probe-canvas', 'role'),
      canvasTab: get('probe-canvas', 'tabindex'),
      canvasLabel: get('probe-canvas', 'aria-label'),
      selectLabel: get('probe-select', 'aria-label'),
      imgAlt: get('probe-img', 'alt'),
      closeLabel: get('probe-close', 'aria-label'),
      rules: ((window as any).__stemA11yFindings || []).map((f: any) => f.rule),
      summary: typeof (window as any).__stemA11yReport,
    };
  });

  // Nothing may be rewritten any more.
  expect(after.canvasRole, 'canvas was still given role="img"').toBeNull();
  expect(after.canvasTab, 'canvas was still made focusable — a dead keyboard stop').toBeNull();
  expect(after.canvasLabel, 'canvas was still given the generic label').toBeNull();
  expect(after.selectLabel, 'select was still auto-labelled from its sibling').toBeNull();
  expect(after.imgAlt, 'img was still given alt="Illustration"').toBeNull();

  // ...except the one rule worth keeping: "x" is not a name.
  expect(after.closeLabel, 'the x -> Close mapping was lost').toBe('Close');

  // And it must still be finding things, or this is a deletion wearing a
  // reporter's clothes.
  expect(after.summary, 'the __stemA11yReport() summary helper is missing').toBe('function');
  expect(after.rules, `reported rules: ${JSON.stringify(after.rules)}`)
    .toEqual(expect.arrayContaining(['canvas-unnamed', 'select-unlabelled', 'img-no-alt']));
});

test('the directive field has a name that survives typing', async ({ page }) => {
  await mountBuilder(page);
  // Its only name used to be the placeholder, which is gone the moment the
  // field has a value — so a filled form presented an unnamed text box.
  const named = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('#wrap input[type="text"], #wrap input:not([type])')] as HTMLInputElement[];
    const directives = inputs.filter((i) => (i.getAttribute('aria-label') || '').includes('directive'));
    return { count: directives.length, labels: directives.map((i) => i.getAttribute('aria-label')) };
  });
  expect(named.count, 'directive inputs carry no aria-label').toBe(SEED.length);
  expect(named.labels).toEqual([
    'Block 1 directive', 'Block 2 directive', 'Block 3 directive', 'Block 4 directive',
  ]);
});
