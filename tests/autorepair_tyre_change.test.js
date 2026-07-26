// Roadside tyre change (Auto Repair Shop) — ordered procedure with safety gates.
//
// The contract worth pinning is the PROCEDURE, not the pixels. Two orderings in
// here are the difference between a changed wheel and an injury:
//   · lug nuts come loose BEFORE the car is lifted
//   · nothing goes under a car held up by a jack
// A refactor that quietly reorders the steps, drops a hazard, or lets a hazard
// become "correct" still renders perfectly and is actively dangerous.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function extractArray(name) {
  const start = SRC.indexOf('var ' + name + ' = [');
  expect(start, name + ' not found').toBeGreaterThan(-1);
  const open = SRC.indexOf('[', start);
  let depth = 0, end = -1;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '[') depth++;
    else if (SRC[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open, end + 1))();
}

const STEPS = extractArray('TIRE_STEPS');
const HAZARDS = extractArray('TIRE_HAZARDS');
const POOL = extractArray('TIRE_POOL_ORDER');
const PARTS = extractArray('TIRE_PARTS');
const order = STEPS.map((s) => s.id);

function tyre(extra) {
  return renderTool(ID, { autoRepair: Object.assign({ view: 'tyre' }, extra || {}) });
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('tyre change — wiring', () => {
  it('is reachable from the main menu', () => {
    expect(renderTool(ID, {})).toContain('Change a tyre (3D)');
  });

  it('renders without throwing at every point in the procedure', () => {
    for (let n = 0; n <= STEPS.length; n++) {
      const html = tyre({ tcDone: order.slice(0, n) });
      expect(html, 'threw at step ' + n).toContain('Change a tyre');
    }
  });

  it('renders under every theme', () => {
    for (const theme of [{ isDark: true }, { isDark: false }, { isContrast: true }]) {
      expect(renderTool(ID, { autoRepair: { view: 'tyre' } }, theme)).toContain('What do you do next?');
    }
  });
});

describe('tyre change — the procedure itself', () => {
  it('has 13 unique steps', () => {
    expect(STEPS).toHaveLength(13);
    expect(new Set(order).size).toBe(13);
  });

  it('loosens the lug nuts BEFORE the car is lifted', () => {
    // The single most common real-world mistake. If this ordering ever flips,
    // the module teaches people to lean on a wrench against a lifted car.
    expect(order.indexOf('loosen')).toBeLessThan(order.indexOf('place'));
    expect(order.indexOf('loosen')).toBeLessThan(order.indexOf('raise'));
    expect(order.indexOf('loosen')).toBeLessThan(order.indexOf('remove'));
  });

  it('tightens fully only after the wheel is back on the ground', () => {
    expect(order.indexOf('lower1')).toBeLessThan(order.indexOf('tighten'));
    expect(order.indexOf('mount')).toBeLessThan(order.indexOf('lower1'));
  });

  it('secures the car before anything is lifted', () => {
    for (const later of ['tools', 'loosen', 'place', 'raise']) {
      expect(order.indexOf('safe'), 'safe must precede ' + later).toBeLessThan(order.indexOf(later));
      expect(order.indexOf('brake'), 'brake must precede ' + later).toBeLessThan(order.indexOf(later));
      expect(order.indexOf('chock'), 'chock must precede ' + later).toBeLessThan(order.indexOf(later));
    }
  });

  it('gets the tools out before lifting, so a bad spare is found early', () => {
    expect(order.indexOf('tools')).toBeLessThan(order.indexOf('raise'));
  });

  it('explains the reasoning and the mistiming for every step', () => {
    for (const s of STEPS) {
      expect(s.why, s.id + ' has no rationale').toBeTruthy();
      expect(s.why.length, s.id + ' rationale is a stub').toBeGreaterThan(60);
      expect(s.tooEarly, s.id + ' has no out-of-order message').toBeTruthy();
    }
  });

  it('teaches the star pattern, not going round the circle', () => {
    const t = STEPS.find((s) => s.id === 'tighten');
    expect(t.why).toMatch(/star pattern/i);
    expect(t.why).toMatch(/cross|across/i);
  });

  it('states the temporary-spare limits and defers to the spare itself', () => {
    const c = STEPS.find((s) => s.id === 'check');
    expect(c.why).toMatch(/50 mph/i);
    expect(c.why).toMatch(/printed on the spare/i);
  });
});

describe('tyre change — safety gates', () => {
  it('ships the four never-correct actions', () => {
    const ids = HAZARDS.map((x) => x.id);
    for (const need of ['under', 'badpoint', 'torqueup', 'traffic']) {
      expect(ids, 'missing hazard: ' + need).toContain(need);
    }
  });

  it('never lets a hazard be a step', () => {
    for (const hz of HAZARDS) {
      expect(order, 'hazard leaked into the procedure: ' + hz.id).not.toContain(hz.id);
    }
  });

  it('states plainly that a jack is not a support', () => {
    const under = HAZARDS.find((x) => x.id === 'under');
    expect(under.why).toMatch(/NEVER/);
    expect(under.why).toMatch(/does not hold|not a support/i);
    expect(under.why).toMatch(/axle stands/i);
  });

  it('keeps "do not attempt it on a live shoulder" as a real option', () => {
    // Same "know when to stop" thread as the head-gasket case.
    const t = HAZARDS.find((x) => x.id === 'traffic');
    expect(t.why).toMatch(/call for assistance/i);
    expect(t.why).toMatch(/replaceable/i);
  });

  it('explains every hazard rather than just marking it wrong', () => {
    for (const hz of HAZARDS) {
      expect(hz.why.length, hz.id + ' explanation is a stub').toBeGreaterThan(80);
    }
  });

  it('surfaces the jack rule before the student starts', () => {
    expect(tyre()).toMatch(/a jack lifts a car, it does not hold one/i);
  });
});

describe('tyre change — the action pool', () => {
  it('offers every step and every hazard', () => {
    for (const id of order) expect(POOL, 'step missing from pool: ' + id).toContain(id);
    for (const hz of HAZARDS) expect(POOL, 'hazard missing from pool: ' + hz.id).toContain(hz.id);
    expect(POOL).toHaveLength(STEPS.length + HAZARDS.length);
  });

  it('does not present the pool in the answer order', () => {
    const poolSteps = POOL.filter((id) => order.includes(id));
    expect(poolSteps).not.toEqual(order);
  });

  it('drops completed steps from the pool but keeps hazards present', () => {
    const html = tyre({ tcDone: ['safe', 'brake'] });
    const done = STEPS.find((s) => s.id === 'safe').label;
    // Match the POOL BUTTON specifically — the label legitimately still
    // appears in the "Done so far" list, which is not what this is testing.
    expect(html).toContain(done);                                  // in the done list
    expect(html).not.toContain('aria-label="' + done + '"');       // but not as an action
    expect(html).toContain('aria-label="Slide underneath to get a better look"');
  });
});

describe('tyre change — feedback', () => {
  it('explains an out-of-order attempt instead of just rejecting it', () => {
    const html = tyre({ tcDone: [], tcLast: { kind: 'early', id: 'place' } });
    expect(html).toContain('Right action, wrong moment');
    expect(html).toMatch(/Loosen the nuts BEFORE the wheel leaves the ground/i);
  });

  it('calls an unsafe action unsafe, with the reason', () => {
    const html = tyre({ tcLast: { kind: 'hazard', id: 'under' }, tcViolations: ['under'] });
    expect(html).toContain('this is never the answer');
    expect(html).toMatch(/killed this way every year/i);
  });

  it('confirms a correct step with why it belongs there', () => {
    const html = tyre({ tcDone: ['safe'], tcLast: { kind: 'ok', id: 'safe' } });
    expect(html).toMatch(/Flat, firm and as far from moving traffic/i);
  });

  it('marks a repeated hazard as still unsafe in the pool', () => {
    const html = tyre({ tcViolations: ['under'] });
    expect(html).toContain('it is still unsafe');
  });
});

describe('tyre change — grading', () => {
  const all = () => order.slice();

  it('grades a clean run A', () => {
    const html = tyre({ tcDone: all(), tcWrong: 0, tcViolations: [] });
    expect(html).toContain('Grade: A');
  });

  it('drops the grade for out-of-order attempts', () => {
    expect(tyre({ tcDone: all(), tcWrong: 1 })).toContain('Grade: B');
    expect(tyre({ tcDone: all(), tcWrong: 4 })).toContain('Grade: C');
  });

  it('any unsafe action outranks a tidy sequence', () => {
    // A perfect order with one hazard must grade worse than a sloppy order
    // with none — the point is that safety is not traded off against neatness.
    expect(tyre({ tcDone: all(), tcWrong: 0, tcViolations: ['under'] })).toContain('Grade: D');
    expect(tyre({ tcDone: all(), tcWrong: 0, tcViolations: ['under', 'badpoint', 'traffic'] })).toContain('Grade: F');
  });

  it('recaps the unsafe actions above the grade', () => {
    const html = tyre({ tcDone: all(), tcViolations: ['under'] });
    expect(html).toContain('The unsafe ones matter more than the grade');
  });

  it('sends the student to do it for real', () => {
    expect(tyre({ tcDone: all() })).toMatch(/driveway on a dry afternoon/i);
  });
});

describe('tyre change — degrades without 3D', () => {
  it('keeps every action reachable when the 3D view fails', () => {
    const html = tyre({ uh3dStatus: 'failed' });
    expect(html).toContain('3D view unavailable');
    // React escapes apostrophes to &#x27; in SSR output, so compare escaped.
    const esc = (s) => s.replace(/'/g, '&#x27;');
    for (const s of STEPS) expect(html, 'lost action: ' + s.id).toContain(esc(s.label));
    for (const hz of HAZARDS) expect(html, 'lost hazard: ' + hz.id).toContain(esc(hz.label));
  });

  it('says outright that the picture is not required', () => {
    expect(tyre({ uh3dStatus: 'failed' })).toMatch(/nothing here needs the picture/i);
  });
});

describe('tyre change — 3D scene tracks the procedure', () => {
  it('drives the scene from how many steps are done', () => {
    expect(SRC).toContain('phase: doneIds.length');
    expect(SRC).toContain('function buildWheelCornerScene');
  });

  it('rebuilds the scene when the phase changes', () => {
    // Geometry is baked at build time, so an advancing procedure must rebuild
    // or the car never actually lifts.
    expect(SRC).toContain('S.builtPhase !== (props.phase || 0)');
  });

  it('models the parts the procedure talks about', () => {
    const ids = PARTS.map((p) => p.id);
    for (const need of ['wheel', 'lugs', 'jackpoint', 'jack', 'chock', 'spare']) {
      expect(ids, 'missing modelled part: ' + need).toContain(need);
    }
  });

  it('warns on the jack part that it is not a support', () => {
    const jack = PARTS.find((p) => p.id === 'jack');
    expect(jack.note).toMatch(/not a support/i);
  });
});

describe('tyre change — shares one viewer with the other modules', () => {
  it('uses the extracted viewer factory rather than a second copy', () => {
    expect(SRC).toContain('function makeBayViewer(cfg)');
    expect(SRC).toContain('var UH3D = makeBayViewer(');
    expect(SRC).toContain('var TIRE3D = makeBayViewer(');
    // exactly two instances, one shell
    expect((SRC.match(/makeBayViewer\(/g) || []).length).toBe(3);
  });

  it('keeps the scene builders free of DOM and React', () => {
    const from = SRC.indexOf('function buildWheelCornerScene');
    const to = SRC.indexOf('function buildEngineBayScene');
    expect(to).toBeGreaterThan(from);
    // Strip comments first — an earlier version of this test matched the word
    // "React" inside the prose explaining that the builder avoids React.
    const body = SRC.slice(from, to).replace(/\/\/[^\n]*/g, '');
    expect(body).not.toMatch(/document\./);
    expect(body).not.toMatch(/\bctx\./);
    expect(body).not.toMatch(/React\./);
    expect(body).not.toMatch(/\bupd\(|\bh\(/);
  });
});
