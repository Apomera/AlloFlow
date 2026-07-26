// Repair Bay (Auto Repair Shop) — diagnose-and-fix simulation.
//
// The thing worth pinning here is not "does it render." It is that the
// PEDAGOGY survives edits: every case must keep exactly one correct action,
// must keep at least one trap that a parts-swapper would fall into, must be
// solvable from evidence the student can actually reach, and must not be
// solvable without turning the engine on and off at the right moments.
//
// A case that quietly loses its trap answer, or gains a second "correct"
// choice, still renders fine and still looks finished — and is worthless.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

// Pull REPAIR_CASES straight out of the source so the tests assert against the
// real data rather than a copy that can drift.
function extractCases() {
  const start = SRC.indexOf('var REPAIR_CASES = [');
  expect(start, 'REPAIR_CASES not found').toBeGreaterThan(-1);
  const open = SRC.indexOf('[', start);
  let depth = 0, end = -1;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '[') depth++;
    else if (SRC[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  expect(end).toBeGreaterThan(open);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open, end + 1))();
}

const CASES = extractCases();

function bay(extra) {
  return renderTool(ID, { autoRepair: Object.assign({ view: 'repairbay' }, extra || {}) });
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('repair bay — wiring', () => {
  it('is reachable from the main menu', () => {
    expect(renderTool(ID, {})).toContain('Repair Bay (3D)');
  });

  it('renders the case picker', () => {
    const html = bay();
    expect(html).toContain('diagnose &amp; fix');
    for (const c of CASES) expect(html, 'case missing: ' + c.title).toContain(c.title);
  });

  it('renders every case without throwing, engine off and running', () => {
    for (const c of CASES) {
      for (const engine of ['off', 'running']) {
        const html = bay({ rbCase: c.id, rbEngine: engine });
        expect(html, c.id + '/' + engine).toContain('Customer says');
      }
    }
  });
});

describe('repair bay — every case is well formed', () => {
  it('ships 7 cases with unique ids', () => {
    expect(CASES).toHaveLength(7);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(7);
  });

  it('gives each case exactly one correct action', () => {
    for (const c of CASES) {
      const correct = c.choices.filter((x) => x.verdict === 'correct');
      expect(correct.length, c.id + ' must have exactly 1 correct choice').toBe(1);
    }
  });

  it('gives each case at least one trap a parts-swapper would fall for', () => {
    for (const c of CASES) {
      const traps = c.choices.filter((x) => x.verdict === 'trap');
      expect(traps.length, c.id + ' has no trap answer').toBeGreaterThanOrEqual(1);
    }
  });

  it('explains the reasoning behind every option, not just the right one', () => {
    for (const c of CASES) {
      for (const ch of c.choices) {
        expect(ch.why, c.id + '/' + ch.id + ' has no explanation').toBeTruthy();
        expect(ch.why.length, c.id + '/' + ch.id + ' explanation is a stub').toBeGreaterThan(60);
      }
    }
  });

  it('makes every case solvable — key evidence exists and is reachable', () => {
    for (const c of CASES) {
      const keyFindings = Object.values(c.findings).filter((f) => f.key).length;
      const keyTests = c.tests.filter((t) => t.key).length;
      expect(keyFindings + keyTests, c.id + ' has no key evidence').toBeGreaterThanOrEqual(2);
      expect(c.teaching, c.id + ' has no takeaway').toBeTruthy();
    }
  });

  it('only references parts that exist in the 3D bay', () => {
    // NB: \s* around the line break, not a literal \n — this file has been
    // round-tripped through tools that rewrite line endings, and a regex that
    // silently matches zero parts would make this test vacuously pass.
    const partIds = Array.from(SRC.matchAll(/\{ id: '([a-z]+)', icon: '[^']*', label: '[^']*',\s*[\r\n]+\s*shape:/g)).map((m) => m[1]);
    expect(partIds.length).toBeGreaterThanOrEqual(12);
    for (const c of CASES) {
      for (const pid of Object.keys(c.findings)) {
        expect(partIds, c.id + ' inspects unknown part "' + pid + '"').toContain(pid);
      }
    }
  });

  it('requires the engine RUNNING for at least one key test in most cases', () => {
    const needRunning = CASES.filter((c) => c.tests.some((t) => t.needs === 'running' && t.key));
    expect(needRunning.length, 'engine state is not load-bearing anywhere').toBeGreaterThanOrEqual(4);
  });
});

describe('repair bay — the traps are the real ones', () => {
  const trapFor = (caseId, choiceId) =>
    CASES.find((c) => c.id === caseId).choices.find((x) => x.id === choiceId);

  it('charging case: replacing the battery is a trap, not the answer', () => {
    expect(trapFor('charging', 'batt').verdict).toBe('trap');
    expect(trapFor('charging', 'alt').verdict).toBe('correct');
  });

  it('no-crank case: replacing the battery AND the starter are both traps', () => {
    expect(trapFor('nocrank', 'batt').verdict).toBe('trap');
    expect(trapFor('nocrank', 'starter').verdict).toBe('trap');
    expect(trapFor('nocrank', 'clean').verdict).toBe('correct');
  });

  it('overheat case: thermostat is a trap, fan fuse is the answer', () => {
    expect(trapFor('overheat', 'thermo').verdict).toBe('trap');
    expect(trapFor('overheat', 'fuse').verdict).toBe('correct');
  });

  it('head gasket case: the correct action is to REFER IT OUT, and sealer is a trap', () => {
    expect(trapFor('headgasket', 'refer').verdict).toBe('correct');
    expect(trapFor('headgasket', 'sealer').verdict).toBe('trap');
  });

  it('head gasket case does not contradict the under-hood milky-cap nuance', () => {
    // The under-hood tour says a light milky film can be harmless winter
    // condensation. This case must therefore rest on the CLUSTER, not the cap.
    const c = CASES.find((x) => x.id === 'headgasket');
    expect(c.findings.oilcap.text).toMatch(/not a light film|heavy/i);
    expect(c.teaching).toMatch(/cluster|converging/i);
  });
});

describe('repair bay — safety is enforced, not decorative', () => {
  it('defines running-engine hazards for the belt and the cooling system', () => {
    expect(SRC).toContain('RB_RUNNING_HAZARD');
    const block = SRC.slice(SRC.indexOf('var RB_RUNNING_HAZARD'), SRC.indexOf('var REPAIR_CASES'));
    expect(block).toMatch(/belt:/);
    expect(block).toMatch(/radiator:/);
    expect(block).toMatch(/spinning belt/i);
    expect(block).toMatch(/pressurized/i);
  });

  it('warns on the inspect button when the engine is running', () => {
    const html = bay({ rbCase: 'squeal', rbEngine: 'running' });
    expect(html).toContain('unsafe with the engine running');
  });

  it('does not warn when the engine is off', () => {
    const html = bay({ rbCase: 'squeal', rbEngine: 'off' });
    expect(html).not.toContain('unsafe with the engine running');
  });

  it('surfaces recorded violations in an alert region', () => {
    const html = bay({ rbCase: 'squeal', rbViolations: ['You just put your hands next to a spinning belt.'] });
    expect(html).toContain('Safety violations');
    expect(html).toContain('role="alert"');
  });
});

describe('repair bay — grading rewards evidence, not luck', () => {
  it('shows an evidence counter while working the case', () => {
    expect(bay({ rbCase: 'charging' })).toContain('Key evidence:');
  });

  it('calls out a correct answer reached on thin evidence', () => {
    const html = bay({ rbCase: 'charging', rbVerdict: 'alt', rbFound: {},
      rbDone: { charging: { verdict: 'correct', grade: 'C' } } });
    expect(html).toContain('Right answer, thin evidence');
  });

  it('does not scold when the evidence was actually gathered', () => {
    const c = CASES.find((x) => x.id === 'charging');
    const full = {};
    Object.keys(c.findings).forEach((p) => { if (c.findings[p].key) full['p:' + p] = true; });
    c.tests.forEach((t) => { if (t.key) full['t:' + t.id] = true; });
    const html = bay({ rbCase: 'charging', rbVerdict: 'alt', rbFound: full,
      rbDone: { charging: { verdict: 'correct', grade: 'A' } } });
    expect(html).not.toContain('Right answer, thin evidence');
  });

  it('reveals the reasoning for every option once committed', () => {
    const html = bay({ rbCase: 'charging', rbVerdict: 'batt',
      rbDone: { charging: { verdict: 'trap', grade: 'F' } } });
    expect(html).toContain('Trap answer');
    expect(html).toContain('What this case teaches');
  });
});

describe('repair bay — cost model', () => {
  function costs() {
    const start = SRC.indexOf('var RB_COSTS = {');
    const open = SRC.indexOf('{', start);
    let depth = 0, end = -1;
    for (let i = open; i < SRC.length; i++) {
      if (SRC[i] === '{') depth++;
      else if (SRC[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    // eslint-disable-next-line no-new-func
    return new Function('return ' + SRC.slice(open, end + 1))();
  }
  const COSTS = costs();

  it('prices every choice of every case', () => {
    for (const c of CASES) {
      expect(COSTS[c.id], 'no cost block for ' + c.id).toBeTruthy();
      for (const ch of c.choices) {
        expect(COSTS[c.id][ch.id], c.id + '/' + ch.id + ' has no price').toBeDefined();
      }
    }
  });

  it('makes at least one trap MORE expensive than the correct repair', () => {
    // If every trap were cheaper, the sim would accidentally teach that
    // guessing saves money.
    const punished = CASES.filter((c) => {
      const right = c.choices.find((x) => x.verdict === 'correct');
      const traps = c.choices.filter((x) => x.verdict === 'trap');
      return traps.some((t) => COSTS[c.id][t.id] > COSTS[c.id][right.id]);
    });
    expect(punished.length).toBeGreaterThanOrEqual(3);
  });

  it('shows the bill only after the student commits', () => {
    expect(bay({ rbCase: 'charging' })).not.toContain('What the customer pays');
    const html = bay({ rbCase: 'charging', rbVerdict: 'batt', rbDone: { charging: { verdict: 'trap', grade: 'F' } } });
    expect(html).toContain('What the customer pays');
  });

  it('bills a misdiagnosis for the wrong part AND the right one', () => {
    const html = bay({ rbCase: 'charging', rbVerdict: 'batt', rbDone: { charging: { verdict: 'trap', grade: 'F' } } });
    expect(html).toContain('$190');            // the battery they did not need
    expect(html).toContain('$560');            // the alternator still required
    expect(html).toContain('$750');            // and the total
    expect(html).toContain('avoidable');
  });

  it('bills a correct call for the repair only', () => {
    const html = bay({ rbCase: 'charging', rbVerdict: 'alt', rbDone: { charging: { verdict: 'correct', grade: 'A' } } });
    expect(html).toContain('the repair it actually needed');
    expect(html).not.toContain('avoidable');
  });

  it('labels the money as teaching figures, never as quotes', () => {
    const html = bay({ rbCase: 'charging', rbVerdict: 'alt', rbDone: { charging: { verdict: 'correct', grade: 'A' } } });
    expect(html).toMatch(/not quotes/i);
    expect(html).toMatch(/vary a lot by vehicle/i);
  });
});

describe('repair bay — working notes', () => {
  it('offers a notes field and marks it optional', () => {
    const html = bay({ rbCase: 'charging' });
    expect(html).toContain('Working notes');
    expect(html).toMatch(/Optional/);
  });

  it('reflects the notes back in the debrief', () => {
    const html = bay({ rbCase: 'charging', rbNotes: 'I think the alternator is not charging.',
      rbVerdict: 'alt', rbDone: { charging: { verdict: 'correct', grade: 'A' } } });
    expect(html).toContain('What you wrote before you committed');
    expect(html).toContain('I think the alternator is not charging.');
  });

  it('omits the notes panel when nothing was written', () => {
    const html = bay({ rbCase: 'charging', rbNotes: '   ',
      rbVerdict: 'alt', rbDone: { charging: { verdict: 'correct', grade: 'A' } } });
    expect(html).not.toContain('What you wrote before you committed');
  });
});

describe('repair bay — the battery lesson is not "never replace batteries"', () => {
  it('includes a case where replacing the battery is CORRECT', () => {
    const c = CASES.find((x) => x.id === 'badbattery');
    expect(c, 'badbattery case missing').toBeTruthy();
    expect(c.choices.find((x) => x.id === 'batt').verdict).toBe('correct');
  });

  it('makes that case turn on a load test, not resting voltage', () => {
    const c = CASES.find((x) => x.id === 'badbattery');
    const load = c.tests.find((t) => t.id === 'load');
    expect(load, 'no load test').toBeTruthy();
    expect(load.key).toBe(true);
    expect(c.teaching).toMatch(/load test/i);
    expect(c.teaching).toMatch(/state of charge/i);
  });

  it('names the tension with the earlier trap cases explicitly', () => {
    const c = CASES.find((x) => x.id === 'badbattery');
    expect(c.teaching).toMatch(/test before you replace/i);
  });
});

describe('repair bay — oil pressure case', () => {
  it('distinguishes the pressure light from an oil level message', () => {
    const c = CASES.find((x) => x.id === 'oilpressure');
    expect(c.teaching).toMatch(/pressure/i);
    expect(c.teaching).toMatch(/level/i);
  });

  it('treats "just top it up" and "blame the sensor" as traps', () => {
    const c = CASES.find((x) => x.id === 'oilpressure');
    expect(c.choices.find((x) => x.id === 'topup').verdict).toBe('trap');
    expect(c.choices.find((x) => x.id === 'sensor').verdict).toBe('trap');
    expect(c.choices.find((x) => x.id === 'fixleak').verdict).toBe('correct');
  });
});

describe('repair bay — copy cannot drift from the data', () => {
  // The menu tile said "5 cases" for a while after a 6th and 7th were added.
  // Nothing enforced it, so nothing caught it. Now something does.
  it('states the real case count on the menu tile', () => {
    const menu = renderTool(ID, {});
    expect(menu).toContain(CASES.length + ' cases. Inspect the 3D bay');
  });

  it('states the real case count on the completion badge', () => {
    const html = renderTool(ID, { autoRepair: { view: 'badges' } });
    expect(html).toContain('all ' + CASES.length + ' Repair Bay cases');
  });

  it('counts progress out of the real case count', () => {
    expect(bay()).toContain('0 / ' + CASES.length + ' cases correctly diagnosed');
  });
});

describe('repair bay — cross-links to the reference', () => {
  it('offers a part lookup from a finding, so a case is never a dead end', () => {
    const html = bay({ rbCase: 'charging', rbSel: 'alternator' });
    expect(html).toContain('What is this part?');
    expect(html).toContain('then come back to the case');
  });

  it('keeps the case state so the round trip does not lose work', () => {
    // The lookup only changes `view`; rbCase/rbFound/rbNotes live on and the
    // student lands back in the same case, not the picker.
    const working = { rbCase: 'charging', rbFound: { 'p:battery': true }, rbNotes: 'checking charging' };
    const back = bay(working);
    expect(back).toContain('Customer says');
    expect(back).toContain('checking charging');
    expect(back).toContain('1 / 4');
  });
});

describe('repair bay — degrades without 3D', () => {
  it('keeps every inspection reachable as a button when the bay fails to load', () => {
    const c = CASES.find((x) => x.id === 'overheat');
    const html = bay({ rbCase: 'overheat', uh3dStatus: 'failed' });
    expect(html).toContain('3D bay unavailable');
    // Each inspectable part still has its own control.
    for (const pid of Object.keys(c.findings)) {
      expect(html, 'lost inspect control for ' + pid).toContain('Inspect ');
    }
    expect(html).toContain('Key evidence:');
    expect(html).toContain('Call it');
  });
});
