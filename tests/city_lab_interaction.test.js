// City Planning Lab, pointer and focus behaviour.
//
// city_lab_core proves the model. city_lab_render proves the markup. Neither
// can see what happens when someone actually uses the thing: SSR never runs an
// effect, never moves focus, and never fires a handler.
//
// This mounts the panel for real with react-dom/client and drives it with DOM
// events, so useEffect runs, state advances, focus moves, and localStorage is
// actually written.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

// Each test here mounts the whole panel: 144 real buttons plus a scorecard
// recomputed on every event. That is genuinely slower than the 5 s default,
// and on a machine running several sessions at once it has intermittently
// blown the limit and failed tests that are perfectly correct. A flaky suite
// gets ignored, which is worse than a slow one.
vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });

const STORE_KEY = 'allo_citylab_plan_v1';
let cfg;
let P;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const captured = [];
  window.StemLab = {
    registerTool(id, c) { captured.push({ id, cfg: c }); },
    isRegistered() { return false; }
  };
  delete window.__alloCityLabPure;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_citylab.js'), 'utf8'))();
  P = window.__alloCityLabPure;
  cfg = captured[0].cfg;
});

let mounted = [];

beforeEach(() => { window.localStorage.removeItem(STORE_KEY); });
afterEach(() => {
  mounted.forEach((m) => { try { act(() => m.root.unmount()); } catch (_) {} m.container.remove(); });
  mounted = [];
  window.localStorage.removeItem(STORE_KEY);
});

function mount(overrides) {
  const announced = [];
  const ctx = Object.assign({
    React,
    t: (k, fb) => (fb != null ? fb : k),
    theme: 'dark',
    toolData: {},
    setToolData() {},
    setStemLabTool() {},
    announceToSR(msg) { announced.push(msg); },
    awardXP() {}, celebrate() {}, beep() {}, icons: {}
  }, overrides || {});
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  function Panel() { return cfg.render(ctx); }
  act(() => { root.render(React.createElement(Panel)); });
  const handle = { container, root, ctx, announced };
  mounted.push(handle);
  return handle;
}

const parcel = (c, id) => c.querySelector('#citylab-parcel-' + id);
const click = (el) => { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); };
const press = (el, key) => {
  act(() => {
    el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
};
const byText = (c, sel, text) =>
  [...c.querySelectorAll(sel)].find((el) => el.textContent.trim() === text);
const containingText = (c, sel, text) =>
  [...c.querySelectorAll(sel)].filter((el) => el.textContent.indexOf(text) !== -1);
const storedPlan = () => JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null');

describe('City Planning Lab - pointer selection', () => {
  it('selects the parcel that was clicked and moves the inspector to it', () => {
    const { container } = mount();
    expect(container.textContent).toContain('Parcel D6');
    click(parcel(container, 'H4'));
    expect(container.textContent).toContain('Parcel H4');
    expect(parcel(container, 'H4').getAttribute('aria-pressed')).toBe('true');
    expect(parcel(container, 'D6').getAttribute('aria-pressed')).toBe('false');
  });

  it('assigns land use from the inspector and updates the board and scorecard', () => {
    const { container } = mount();
    click(parcel(container, 'A9'));
    const btn = byText(container, 'button', 'Housing, mid density (45/ha)');
    expect(btn, 'land use button missing').toBeTruthy();
    click(btn);
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain('Housing, mid density');
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain('45 homes');
  });

  it('builds a road from the inspector direction buttons', () => {
    const { container } = mount();
    click(parcel(container, 'A9'));
    const build = containingText(container, 'button', 'Build').filter((b) => !b.disabled)[0];
    expect(build, 'no buildable direction').toBeTruthy();
    const before = P.scorecard(storedPlan() || P.basePlan(), 'central').tier1.newRoadMetres;
    click(build);
    expect(P.scorecard(storedPlan(), 'central').tier1.newRoadMetres).toBeGreaterThan(before);
  });
});

describe('City Planning Lab - keyboard focus really moves', () => {
  it('walks the grid with the arrow keys and takes focus with it', () => {
    const { container } = mount();
    const start = parcel(container, 'D6');
    start.focus();
    expect(document.activeElement.id).toBe('citylab-parcel-D6');

    press(start, 'ArrowRight');
    expect(document.activeElement.id, 'ArrowRight').toBe('citylab-parcel-E6');

    press(document.activeElement, 'ArrowDown');
    expect(document.activeElement.id, 'ArrowDown').toBe('citylab-parcel-E7');

    press(document.activeElement, 'ArrowLeft');
    expect(document.activeElement.id, 'ArrowLeft').toBe('citylab-parcel-D7');

    press(document.activeElement, 'ArrowUp');
    expect(document.activeElement.id, 'ArrowUp').toBe('citylab-parcel-D6');
  });

  it('keeps selection and focus in step, so the inspector follows the cursor', () => {
    const { container } = mount();
    const start = parcel(container, 'D6');
    start.focus();
    press(start, 'ArrowLeft');
    expect(document.activeElement.id).toBe('citylab-parcel-C6');
    expect(container.textContent).toContain('Parcel C6');
    expect(parcel(container, 'C6').getAttribute('aria-pressed')).toBe('true');
  });

  it('does not walk off the edges of the board', () => {
    const { container } = mount();
    const topLeft = parcel(container, 'A1');
    topLeft.focus();
    press(topLeft, 'ArrowUp');
    expect(document.activeElement.id, 'ArrowUp at row 1').toBe('citylab-parcel-A1');
    press(topLeft, 'ArrowLeft');
    expect(document.activeElement.id, 'ArrowLeft at column A').toBe('citylab-parcel-A1');

    const bottomRight = parcel(container, 'L12');
    bottomRight.focus();
    press(bottomRight, 'ArrowDown');
    expect(document.activeElement.id, 'ArrowDown at row 12').toBe('citylab-parcel-L12');
    press(bottomRight, 'ArrowRight');
    expect(document.activeElement.id, 'ArrowRight at column L').toBe('citylab-parcel-L12');
  });

  it('jumps to the row edges with Home and End', () => {
    const { container } = mount();
    const start = parcel(container, 'F5');
    start.focus();
    press(start, 'Home');
    expect(document.activeElement.id).toBe('citylab-parcel-A5');
    press(document.activeElement, 'End');
    expect(document.activeElement.id).toBe('citylab-parcel-L5');
  });

  it('assigns land use from the number keys, in palette order', () => {
    const { container } = mount();
    const cell = parcel(container, 'A9');
    cell.focus();
    // 6 is the sixth entry in PALETTE_IDS.
    const expected = P.USE_BY_ID[P.PALETTE_IDS[5]];
    press(cell, '6');
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain(expected.label);
    // 0 is the tenth, not the zeroth.
    const tenth = P.USE_BY_ID[P.PALETTE_IDS[9]];
    press(parcel(container, 'A9'), '0');
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain(tenth.label);
  });

  it('toggles green infrastructure with G, and refuses on natural land', () => {
    const { container } = mount();
    const cell = parcel(container, 'A9');
    cell.focus();
    press(cell, '6');                       // make it housing first
    press(parcel(container, 'A9'), 'g');
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain('green infrastructure');
    press(parcel(container, 'A9'), 'g');
    expect(parcel(container, 'A9').getAttribute('aria-label')).not.toContain('green infrastructure');

    // A park already drains at the open-field coefficient, so the credit is
    // floored and would change no number while still billing $250k/ha.
    const park = parcel(container, 'B9');
    park.focus();
    press(park, '2');
    expect(parcel(container, 'B9').getAttribute('aria-label')).toContain('Park');
    press(parcel(container, 'B9'), 'g');
    expect(parcel(container, 'B9').getAttribute('aria-label')).not.toContain('green infrastructure');
  });

  it('drops green infrastructure when the land is rezoned to something that cannot use it', () => {
    const { container } = mount();
    const cell = parcel(container, 'A9');
    cell.focus();
    press(cell, '6');                                  // housing: chargeable and useful
    press(parcel(container, 'A9'), 'g');
    expect(storedPlan().greenInfra.A9).toBe(true);
    press(parcel(container, 'A9'), '2');               // rezone to park
    expect(storedPlan().greenInfra.A9, 'stale paid-for overlay survived a rezone').toBeUndefined();
  });

  it('opens the shortcut list with the question mark', () => {
    const { container } = mount();
    expect(container.textContent).not.toContain('Move around the grid');
    const cell = parcel(container, 'D6');
    cell.focus();
    press(cell, '?');
    expect(container.textContent).toContain('Move around the grid');
  });

  it('never suppresses the browser focus ring on a parcel', () => {
    // outline:none on the unselected parcels made Tab focus invisible across
    // the whole grid. Arrow keys concealed it, because they move selection
    // along with focus and selection had its own visible treatment.
    const { container } = mount();
    P.allParcelIds().forEach((id) => {
      const style = parcel(container, id).getAttribute('style') || '';
      expect(style, id + ' suppresses its focus ring').not.toMatch(/outline:\s*none/);
    });
  });

  it('still marks the selected parcel distinctly from a merely focused one', () => {
    const { container } = mount();
    click(parcel(container, 'H4'));
    const selected = parcel(container, 'H4').getAttribute('style') || '';
    const other = parcel(container, 'H5').getAttribute('style') || '';
    expect(selected).not.toBe(other);
    expect(selected).toMatch(/box-shadow/);
  });

  it('never leaves a parcel that cannot be reached by the keyboard', () => {
    const { container } = mount();
    P.allParcelIds().forEach((id) => {
      const el = parcel(container, id);
      expect(el, 'missing ' + id).toBeTruthy();
      expect(el.tagName).toBe('BUTTON');
      expect(el.disabled, id + ' is disabled and so unreachable').toBe(false);
    });
  });
});

describe('City Planning Lab - undo and redo restore real state', () => {
  it('undoes an edit and redoes it again', () => {
    const { container } = mount();
    const cell = parcel(container, 'A9');
    cell.focus();
    press(cell, '6');
    const afterEdit = parcel(container, 'A9').getAttribute('aria-label');
    expect(afterEdit).toContain('Housing');

    click(byText(container, 'button', 'Undo'));
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain('Open field');

    click(byText(container, 'button', 'Redo'));
    expect(parcel(container, 'A9').getAttribute('aria-label')).toBe(afterEdit);
  });

  it('disables undo and redo when there is nothing to undo or redo', () => {
    const { container } = mount();
    expect(byText(container, 'button', 'Undo').disabled).toBe(true);
    expect(byText(container, 'button', 'Redo').disabled).toBe(true);
    const cell = parcel(container, 'A9');
    cell.focus();
    press(cell, '6');
    expect(byText(container, 'button', 'Undo').disabled).toBe(false);
    expect(byText(container, 'button', 'Redo').disabled).toBe(true);
  });

  it('reaches back past a reset, so Start over cannot destroy work outright', () => {
    const { container } = mount();
    const cell = parcel(container, 'A9');
    cell.focus();
    press(cell, '6');
    // Memo tab holds the reset.
    click(byText(container, 'button', 'Memo'));
    click(byText(container, 'button', 'Start over'));
    click(byText(container, 'button', 'Yes, clear the plan'));
    click(byText(container, 'button', 'Design'));
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain('Open field');
    click(byText(container, 'button', 'Undo'));
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain('Housing');
  });
});

describe('City Planning Lab - the destructive control is two-step', () => {
  it('arms before it fires, and can be cancelled', () => {
    const { container } = mount();
    const cell = parcel(container, 'A9');
    cell.focus();
    press(cell, '6');
    click(byText(container, 'button', 'Memo'));

    expect(byText(container, 'button', 'Yes, clear the plan')).toBeFalsy();
    click(byText(container, 'button', 'Start over'));
    expect(byText(container, 'button', 'Yes, clear the plan')).toBeTruthy();

    click(byText(container, 'button', 'Cancel'));
    expect(byText(container, 'button', 'Yes, clear the plan')).toBeFalsy();
    click(byText(container, 'button', 'Design'));
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain('Housing');
  });
});

describe('City Planning Lab - effects actually run', () => {
  it('persists the plan to localStorage, which SSR could never show', () => {
    const { container } = mount();
    expect(storedPlan()).toBeTruthy();
    const cell = parcel(container, 'A9');
    cell.focus();
    press(cell, '6');
    expect(storedPlan().uses.A9).toBe(P.PALETTE_IDS[5]);
  });

  it('reloads the stored plan after the tool is closed and reopened', () => {
    const first = mount();
    const cell = parcel(first.container, 'A9');
    cell.focus();
    press(cell, '6');
    const expected = P.PALETTE_IDS[5];

    // Unmount before remounting. Two live copies would put duplicate element
    // ids in the document, which is not a state the app can reach and would
    // make this assertion test the harness rather than the tool.
    act(() => first.root.unmount());
    first.container.remove();
    mounted = mounted.filter((m) => m !== first);

    const second = mount();
    expect(parcel(second.container, 'A9').getAttribute('aria-label'))
      .toContain(P.USE_BY_ID[expected].label);
  });

  it('survives a corrupt stored plan rather than crashing on open', () => {
    window.localStorage.setItem(STORE_KEY, '{not json at all');
    expect(() => mount()).not.toThrow();
  });
});

describe('City Planning Lab - announcements carry the delta, not just the action', () => {
  it('says what moved when a parcel changes', () => {
    const { container, announced } = mount();
    const cell = parcel(container, 'A9');
    cell.focus();
    press(cell, '6');
    const last = announced[announced.length - 1];
    expect(last).toContain('A9');
    expect(last, 'no home count in the announcement').toMatch(/New homes \d/);
    expect(last, 'no runoff figure in the announcement').toMatch(/Runoff coefficient \d/);
    expect(last, 'no cost in the announcement').toMatch(/Cost \$/);
  });

  it('announces undo with the resulting numbers', () => {
    const { container, announced } = mount();
    const cell = parcel(container, 'A9');
    cell.focus();
    press(cell, '6');
    click(byText(container, 'button', 'Undo'));
    const last = announced[announced.length - 1];
    expect(last).toContain('Undone');
    expect(last).toMatch(/New homes \d/);
  });
});

describe('City Planning Lab - predict-then-place closes its own loop', () => {
  // The prompt used to store the coefficient as it stood AFTER the changes,
  // which made the question unanswerable: the very movement being predicted
  // had already been folded into the baseline it would be compared against.
  function makeSixEdits(container) {
    ['A9', 'B9', 'C9', 'A10', 'B10', 'C10', 'A11'].forEach((id) => {
      const cell = parcel(container, id);
      cell.focus();
      press(cell, '6');                                  // housing, mid density
    });
  }

  it('offers the prediction after a run of edits, naming what it compares against', () => {
    const { container } = mount();
    makeSixEdits(container);
    expect(container.textContent).toContain('Before you look');
    expect(container.textContent,
      'the prompt does not say what the baseline was').toMatch(/coefficient was 0\.\d+/);
  });

  it('reveals the answer instead of leaving the student hanging', () => {
    const { container } = mount();
    makeSixEdits(container);
    click(byText(container, 'button', 'up'));
    // The wording differs between a right and a wrong guess ("and it went" vs
    // "It actually went"), so match either casing rather than pin the copy.
    expect(container.textContent).toMatch(/it (actually )?went (up|down|about the same)/i);
    expect(container.textContent).toMatch(/0\.\d+ to 0\.\d+/);
  });

  it('scores the direction against the real movement, not against itself', () => {
    const { container } = mount();
    makeSixEdits(container);
    // Every one of those edits raised the coefficient, so "down" is wrong and
    // the tool has to say so plainly.
    click(byText(container, 'button', 'down'));
    const text = container.textContent;
    expect(text).toContain('You said down');
    expect(text).toContain('It actually went up');
    const logged = storedPlan().predictions;
    expect(logged).toHaveLength(1);
    expect(logged[0].guess).toBe('down');
    expect(logged[0].actual).toBe('up');
    expect(logged[0].toC).toBeGreaterThan(logged[0].fromC);
  });

  it('never punishes or scores the guess', () => {
    const { container } = mount();
    makeSixEdits(container);
    click(byText(container, 'button', 'down'));
    const text = container.textContent.toLowerCase();
    expect(text).toContain('nothing is scored here');
    expect(text).not.toMatch(/wrong|incorrect|failed|penalt/);
  });
});

describe('City Planning Lab - the table path is genuinely equivalent', () => {
  it('edits the plan from the table select, not just the map', () => {
    const { container } = mount();
    click(byText(container, 'button', 'Parcel table'));
    const select = container.querySelector('select[aria-label="Land use for parcel A9"]');
    expect(select, 'no select for A9').toBeTruthy();
    act(() => {
      select.value = 'housing_mid';
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(storedPlan().uses.A9).toBe('housing_mid');
    click(byText(container, 'button', 'Design'));
    expect(parcel(container, 'A9').getAttribute('aria-label')).toContain('Housing, mid density');
  });

  it('refuses to rezone the river from the table, same as from the map', () => {
    const { container } = mount();
    click(byText(container, 'button', 'Parcel table'));
    expect(container.querySelector('select[aria-label="Land use for parcel E6"]')).toBeFalsy();
    expect(container.textContent).toContain('River (terrain)');
  });
});
