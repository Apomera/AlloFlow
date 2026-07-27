// First Response — body position in 3D (compression placement, depth, recovery).
//
// This is the highest-stakes content in the Life Skills category, so what gets
// pinned here is the CLINICAL CONTENT, not the rendering. Specifically:
//   · the breathing gate (CPR vs recovery position) exists and both branches
//     are correct — getting it backwards is the fatal error
//   · agonal gasping is named as arrest, not as breathing
//   · depth carries BOTH a floor and a ceiling, in both units
//   · the xiphoid and off-centre placements are marked as harmful, not merely
//     suboptimal
//   · the module states its own limits: adult, hands-only, not certification
//
// A wording refactor that quietly drops "not more than" from the depth range,
// or lets "breathing normally" route to compressions, still renders perfectly.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_firstresponse.js';
const ID = 'firstResponse';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const HOST = readFileSync(resolve(process.cwd(), 'stem_lab/stem_lab_module.js'), 'utf8');

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

const ZONES = extractArray('CPR_ZONES');
const MECHANICS = extractArray('CPR_MECHANICS');
const GATE = extractArray('BREATHING_GATE');
const RECOVERY = extractArray('RECOVERY_STEPS');
const HAZARDS = extractArray('BODY_HAZARDS');
const PARTS = extractArray('BODY_PARTS');

function body(extra) {
  return renderTool(ID, {
    firstResponse: Object.assign({ view: 'body3d', consentAccepted: true }, extra || {}),
  });
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('body 3D — wiring', () => {
  it('is reachable from the menu', () => {
    expect(SRC).toContain("id: 'body3d'");
    expect(SRC).toContain("case 'body3d':");
  });

  it('renders every tab without throwing', () => {
    for (const tab of ['gate', 'place', 'depth', 'recovery']) {
      expect(body({ b3dTab: tab }), 'threw on tab ' + tab).toContain('Body position in 3D');
    }
  });

  it('renders at every point in the recovery sequence', () => {
    const order = RECOVERY.map((s) => s.id);
    for (let n = 0; n <= order.length; n++) {
      expect(body({ b3dTab: 'recovery', b3dRec: order.slice(0, n) })).toContain('Recovery position, in order');
    }
  });
});

describe('body 3D — the breathing gate', () => {
  it('routes NOT breathing normally to compressions', () => {
    const g = GATE.find((x) => x.id === 'notbreathing');
    expect(g.action).toBe('cpr');
  });

  it('routes breathing normally to the recovery position, NOT compressions', () => {
    const g = GATE.find((x) => x.id === 'breathing');
    expect(g.action).toBe('recovery');
    expect(g.action).not.toBe('cpr');
  });

  it('names agonal gasping as a sign of arrest, not of breathing', () => {
    const g = GATE.find((x) => x.id === 'notbreathing');
    expect(g.why).toMatch(/agonal/i);
    expect(g.why).toMatch(/not of recovery|sign of cardiac arrest/i);
  });

  it('treats compressions on a breathing person as never correct', () => {
    const hz = HAZARDS.find((x) => x.id === 'compressbreathing');
    expect(hz, 'that hazard is missing').toBeTruthy();
    expect(hz.why).toMatch(/injury|do not help/i);
  });

  it('does not send lay rescuers hunting for a pulse first', () => {
    const hz = HAZARDS.find((x) => x.id === 'delay');
    expect(hz.why).toMatch(/not expected to check for a pulse/i);
  });

  it('puts the gate first in the tab order', () => {
    expect(SRC).toMatch(/tabBtn\('gate'/);
    expect(SRC.indexOf("tabBtn('gate'")).toBeLessThan(SRC.indexOf("tabBtn('place'"));
  });
});

describe('body 3D — compression placement', () => {
  it('has exactly one correct zone, and it is the centre of the chest', () => {
    const correct = ZONES.filter((z) => z.verdict === 'correct');
    expect(correct).toHaveLength(1);
    expect(correct[0].id).toBe('correct');
    expect(correct[0].label).toMatch(/centre of the chest/i);
    expect(correct[0].label).toMatch(/lower half of the breastbone/i);
  });

  it('marks the xiphoid and off-centre placements as harmful, not just weak', () => {
    expect(ZONES.find((z) => z.id === 'low').verdict).toBe('harm');
    expect(ZONES.find((z) => z.id === 'side').verdict).toBe('harm');
    expect(ZONES.find((z) => z.id === 'belly').verdict).toBe('harm');
    expect(ZONES.find((z) => z.id === 'low').why).toMatch(/xiphoid/i);
  });

  it('teaches locked arms and stacked shoulders, not just the spot', () => {
    expect(ZONES.find((z) => z.id === 'correct').why).toMatch(/shoulders/i);
    expect(ZONES.find((z) => z.id === 'correct').why).toMatch(/arms locked|locked straight/i);
  });

  it('explains every zone rather than just scoring it', () => {
    for (const z of ZONES) {
      expect(z.why, z.id + ' has no explanation').toBeTruthy();
      expect(z.why.length, z.id + ' explanation is a stub').toBeGreaterThan(80);
    }
  });

  it('offers every 3D target as a button too', () => {
    const html = body({ b3dTab: 'place' });
    for (const p of PARTS) expect(html, 'no button for ' + p.id).toContain(p.label);
  });
});

describe('body 3D — depth and recoil', () => {
  it('gives depth a floor AND a ceiling, in both units', () => {
    const right = MECHANICS.find((m) => m.verdict === 'correct');
    expect(right.label).toMatch(/at least 2 inches/i);
    expect(right.label).toMatch(/5 cm/i);
    expect(right.label).toMatch(/not more than/i);
    expect(right.label).toMatch(/6 cm/i);
  });

  it('treats "as deep as possible" as wrong, not as enthusiasm', () => {
    expect(MECHANICS.find((m) => m.id === 'toodeep').verdict).toBe('poor');
  });

  it('calls out leaning between compressions', () => {
    const lean = MECHANICS.find((m) => m.id === 'lean');
    expect(lean.verdict).toBe('poor');
    expect(lean.why).toMatch(/recoil/i);
  });

  it('names shallow compressions as the common real-world error', () => {
    expect(MECHANICS.find((m) => m.id === 'shallow').why).toMatch(/most common/i);
  });

  it('states the rate range', () => {
    const html = body({ b3dTab: 'depth' });
    expect(html).toMatch(/100 to 120/);
  });

  it('has exactly one correct mechanic', () => {
    expect(MECHANICS.filter((m) => m.verdict === 'correct')).toHaveLength(1);
  });
});

describe('body 3D — recovery position', () => {
  it('checks breathing before anything else', () => {
    expect(RECOVERY[0].id).toBe('check');
    expect(RECOVERY[0].why).toMatch(/only for someone unresponsive who IS breathing normally/i);
  });

  it('opens the airway and points the mouth down', () => {
    const airway = RECOVERY.find((s) => s.id === 'airway');
    expect(airway.why).toMatch(/drain/i);
    expect(airway.why).toMatch(/airway/i);
  });

  it('rolls them towards the rescuer', () => {
    expect(RECOVERY.find((s) => s.id === 'roll').label).toMatch(/towards you/i);
  });

  it('ends by telling them to keep watching, not that they are done', () => {
    const last = RECOVERY[RECOVERY.length - 1];
    expect(last.id).toBe('watch');
    expect(last.why).toMatch(/start compressions/i);
  });

  it('explains every step', () => {
    for (const s of RECOVERY) {
      expect(s.why, s.id + ' has no rationale').toBeTruthy();
      expect(s.why.length, s.id + ' rationale is a stub').toBeGreaterThan(50);
    }
  });

  it('handles suspected spinal injury without overriding airway and breathing', () => {
    const hz = HAZARDS.find((x) => x.id === 'spine');
    expect(hz.why).toMatch(/NOT breathing normally.*overrides|overrides everything/i);
  });
});

describe('body 3D — age variants', () => {
  const AGES = extractArray('CPR_AGES');
  const byId = (id) => AGES.find((a) => a.id === id);

  it('covers adult, child and infant', () => {
    expect(AGES.map((a) => a.id)).toEqual(['adult', 'child', 'infant']);
  });

  it('gives a child about 2 in / 5 cm — NOT the infant depth', () => {
    // The quick-reference in the CPR + AED module previously listed the child
    // depth as ~1.5 in (4 cm), identical to the infant, while citing AHA 2020.
    // AHA puts a child at about 2 inches (5 cm). Pinned so it cannot drift back.
    const child = byId('child');
    expect(child.depth).toMatch(/2 inches/i);
    expect(child.depth).toMatch(/5 cm/i);
    expect(child.depth).not.toMatch(/1\.5 inches|4 cm/i);
  });

  it('gives an infant about 1.5 in / 4 cm', () => {
    const inf = byId('infant');
    expect(inf.depth).toMatch(/1\.5 inches/i);
    expect(inf.depth).toMatch(/4 cm/i);
  });

  it('anchors every depth to one third of the chest', () => {
    for (const a of AGES) {
      if (a.id === 'adult') continue;      // adult is given as an absolute range
      expect(a.depth, a.id + ' loses the one-third anchor').toMatch(/one third/i);
    }
  });

  it('changes the hands, not just the numbers', () => {
    expect(byId('adult').hands).toMatch(/two hands/i);
    expect(byId('child').hands).toMatch(/one hand/i);
    expect(byId('infant').hands).toMatch(/two fingers/i);
    expect(byId('infant').hands).toMatch(/two-thumbs|thumbs/i);
  });

  it('says breaths matter more for children and infants', () => {
    expect(byId('child').breaths).toMatch(/breathing problem/i);
    expect(byId('infant').breaths).toMatch(/breathing problem/i);
    // ...without telling an untrained rescuer to do nothing
    expect(byId('child').breaths).toMatch(/better than nothing/i);
  });

  it('keeps hands-only as the adult standard for untrained rescuers', () => {
    expect(byId('adult').breaths).toMatch(/hands-only/i);
  });

  it('warns not to over-inflate an infant', () => {
    expect(byId('infant').breaths).toMatch(/chest rise|lungs are tiny/i);
  });

  it('surfaces the selected age in the UI', () => {
    const infant = body({ b3dTab: 'depth', b3dAge: 'infant' });
    expect(infant).toContain('1.5 inches');
    const child = body({ b3dTab: 'depth', b3dAge: 'child' });
    expect(child).toMatch(/About 2 inches/);
  });

  it('scales the 3D figure by age', () => {
    for (const a of AGES) expect(typeof a.scale).toBe('number');
    expect(byId('infant').scale).toBeLessThan(byId('child').scale);
    expect(byId('child').scale).toBeLessThan(byId('adult').scale);
    expect(SRC).toContain('body.scale.setScalar(ageScale)');
  });
});

describe('body 3D — AED pad placement', () => {
  const PADS = extractArray('AED_PADS');
  const RULES = extractArray('AED_RULES');

  it('has exactly two correct pad positions, diagonally opposite', () => {
    const correct = PADS.filter((p) => p.verdict === 'correct');
    expect(correct.map((p) => p.id).sort()).toEqual(['padLL', 'padUR']);
  });

  it('explains WHY the pads are diagonal — the heart in between', () => {
    expect(PADS.find((p) => p.id === 'padUR').why).toMatch(/cross the heart|between them/i);
    expect(PADS.find((p) => p.id === 'padTogether').why).toMatch(/misses the heart|short path/i);
  });

  it('marks side-by-side and abdominal placement as wrong', () => {
    expect(PADS.find((p) => p.id === 'padTogether').verdict).toBe('wrong');
    expect(PADS.find((p) => p.id === 'padBelly').verdict).toBe('wrong');
  });

  it('covers the rules that stop an AED working', () => {
    const ids = RULES.map((r) => r.id);
    for (const need of ['bare', 'hair', 'patch', 'device', 'clear', 'kids', 'resume']) {
      expect(ids, 'missing AED rule: ' + need).toContain(need);
    }
  });

  it('says nobody touches during analysis or shock', () => {
    expect(RULES.find((r) => r.id === 'clear').why).toMatch(/clear/i);
  });

  it('tells them to use adult pads on a child rather than do nothing', () => {
    const kids = RULES.find((r) => r.id === 'kids');
    expect(kids.why).toMatch(/rather than doing nothing/i);
    expect(kids.why).toMatch(/front and one on the back/i);
  });

  it('says resume compressions immediately after a shock', () => {
    expect(RULES.find((r) => r.id === 'resume').why).toMatch(/do not wait/i);
  });

  it('offers every pad target as a button', () => {
    const html = body({ b3dTab: 'aed' });
    for (const p of PADS) expect(html, 'no button for ' + p.id).toContain(p.label);
    for (const r of RULES) expect(html, 'missing rule ' + r.id).toContain(r.label);
  });
});

describe('body 3D — run the call (integrated scenarios)', () => {
  const CASES = extractArray('CALL_CASES');
  const byId = (id) => CASES.find((c) => c.id === id);
  const allOpts = (c) => c.steps.flatMap((s) => s.options);

  it('ships four scenarios with unique ids', () => {
    expect(CASES).toHaveLength(4);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(4);
  });

  it('gives every step exactly one correct option', () => {
    for (const c of CASES) {
      for (const [i, s] of c.steps.entries()) {
        const correct = s.options.filter((o) => o.verdict === 'correct');
        expect(correct.length, c.id + ' step ' + i + ' must have exactly 1 correct option').toBe(1);
      }
    }
  });

  it('explains every option, including the right one', () => {
    for (const c of CASES) {
      for (const o of allOpts(c)) {
        expect(o.why, c.id + '/' + o.id + ' has no explanation').toBeTruthy();
        expect(o.why.length, c.id + '/' + o.id + ' explanation is a stub').toBeGreaterThan(50);
      }
    }
  });

  it('includes genuinely unsafe options, not just wrong ones', () => {
    const withUnsafe = CASES.filter((c) => allOpts(c).some((o) => o.verdict === 'unsafe'));
    expect(withUnsafe.length, 'unsafe choices are not modelled').toBeGreaterThanOrEqual(3);
  });

  it('gives every scenario a debrief', () => {
    for (const c of CASES) {
      expect(c.debrief, c.id + ' has no debrief').toBeTruthy();
      expect(c.debrief.length).toBeGreaterThan(60);
    }
  });

  it('tests the gate in BOTH directions', () => {
    // Every other case is "not breathing -> compress". This one is the reverse,
    // which is the direction people actually get wrong.
    const b = byId('breathing');
    expect(b, 'no breathing-but-unresponsive scenario').toBeTruthy();
    const first = b.steps[0];
    const right = first.options.find((o) => o.verdict === 'correct');
    expect(right.label).toMatch(/recovery position/i);
    const compress = first.options.find((o) => /compressions/i.test(o.label));
    expect(compress.verdict, 'compressing a breathing person must be unsafe').toBe('unsafe');
  });

  it('treats "leave them to sleep it off" as unsafe', () => {
    const opt = byId('breathing').steps[0].options.find((o) => /sleep it off/i.test(o.label));
    expect(opt.verdict).toBe('unsafe');
    expect(opt.why).toMatch(/vomit|choke/i);
  });

  it('makes the gym case turn on recognising agonal gasping', () => {
    const g = byId('gym');
    expect(g.steps[0].options.find((o) => o.verdict === 'correct').why).toMatch(/agonal/i);
    expect(g.debrief).toMatch(/agonal gasping/i);
  });

  it('rejects delaying an AED to finish a CPR cycle', () => {
    const opt = byId('gym').steps.flatMap((s) => s.options).find((o) => /finish your two minutes/i.test(o.label));
    expect(opt.verdict).toBe('wrong');
    expect(opt.why).toMatch(/as soon as it arrives/i);
  });

  it('makes the infant case reject adult technique as unsafe', () => {
    const opt = byId('infant').steps.flatMap((s) => s.options).find((o) => /two hands, as you would for an adult/i.test(o.label));
    expect(opt.verdict).toBe('unsafe');
  });

  it('makes the infant case require breaths and warn against over-inflating', () => {
    const step = byId('infant').steps.find((s) => /rescue breaths/i.test(s.prompt));
    const right = step.options.find((o) => o.verdict === 'correct');
    expect(right.why).toMatch(/chest rise|lungs are tiny/i);
    const tooMuch = step.options.find((o) => /as much air as you can/i.test(o.label));
    expect(tooMuch.verdict).toBe('unsafe');
  });

  it('accepts an adult-pad AED on an infant, front and back', () => {
    const step = byId('infant').steps.find((s) => /adult pads/i.test(s.prompt));
    const right = step.options.find((o) => o.verdict === 'correct');
    expect(right.label).toMatch(/front .*back|back/i);
    const refuse = step.options.find((o) => /do not use it/i.test(o.label));
    expect(refuse.verdict).toBe('wrong');
  });

  it('makes drowning an oxygen problem, and dries the chest before the AED', () => {
    const p = byId('pool');
    expect(p.steps[0].options.find((o) => o.verdict === 'correct').why).toMatch(/30 compressions to 2 breaths/i);
    const aed = p.steps.find((s) => /AED/i.test(s.prompt));
    expect(aed.options.find((o) => o.verdict === 'correct').label).toMatch(/wipe her chest dry/i);
    expect(aed.options.find((o) => /skip the aed/i.test(o.label)).verdict).toBe('wrong');
  });

  it('never tells a lay rescuer to check for a pulse', () => {
    for (const c of CASES) {
      for (const o of allOpts(c)) {
        if (/pulse/i.test(o.label) && o.verdict === 'correct') {
          throw new Error(c.id + ' has a correct option telling them to check a pulse');
        }
      }
    }
  });

  it('tags every scenario with the age it involves', () => {
    const AGES = extractArray('CPR_AGES').map((a) => a.id);
    for (const c of CASES) {
      expect(c.age, c.id + ' has no age').toBeTruthy();
      expect(AGES, c.id + ' has an unknown age').toContain(c.age);
    }
    expect(byId('infant').age).toBe('infant');
    // ...and the 3D figure follows the scenario, not the age selector
    expect(SRC).toContain("if (tab === 'call')");
    expect(SRC).toContain('sceneProps: { tab: tab, age: sceneAge }');
  });

  it('shows target patches only on the tabs that ask about them', () => {
    // Compression zones were bleeding onto the gate, recovery and scenario
    // tabs as coloured squares on the body that nothing was asking about.
    expect(SRC).toContain("if (mode !== 'place' && mode !== 'aed')");
  });

  it('renders the scenario picker and every scenario', () => {
    const list = body({ b3dTab: 'call' });
    expect(list).toContain('Run the call');
    for (const c of CASES) expect(list, 'missing scenario ' + c.title).toContain(c.title);
    for (const c of CASES) {
      const html = body({ b3dTab: 'call', b3dCall: { caseId: c.id, step: 0, wrong: 0, unsafe: [], picked: null } });
      expect(html, c.id + ' first step did not render').toContain(c.steps[0].prompt);
    }
  });

  it('grades unsafe choices below merely wrong ones', () => {
    const run = (patch) => body({ b3dTab: 'call', b3dCall: Object.assign({ caseId: 'gym', step: 99, wrong: 0, unsafe: [], picked: null }, patch) });
    expect(run({})).toContain('Grade: A');
    expect(run({ wrong: 1 })).toContain('Grade: B');
    expect(run({ wrong: 4 })).toContain('Grade: C');
    expect(run({ unsafe: ['x'] })).toContain('Grade: D');
    expect(run({ unsafe: ['x', 'y'] })).toContain('Grade: F');
  });

  it('puts the unsafe recap above the grade', () => {
    const html = body({ b3dTab: 'call', b3dCall: { caseId: 'gym', step: 99, wrong: 0, unsafe: ['x'], picked: null } });
    expect(html).toContain('The unsafe choices matter more than the grade');
  });
});

describe('body 3D — menu copy tracks the module', () => {
  it('mentions the scenarios and the real count', () => {
    const CASES = extractArray('CALL_CASES');
    expect(SRC).toContain("CALL_CASES.length + ' scenarios");
    const menu = renderTool(ID, { firstResponse: { consentAccepted: true } });
    expect(menu).toContain(CASES.length + ' scenarios');
  });

  it('mentions the ages and the AED, which the tile once omitted', () => {
    const menu = renderTool(ID, { firstResponse: { consentAccepted: true } });
    expect(menu).toMatch(/adult, child, infant/i);
    expect(menu).toMatch(/AED pad placement/i);
  });
});

describe('body 3D — states its own limits', () => {
  it('states a scope that matches what it actually covers', () => {
    // The scope line said "adult ... hands-only" after child and infant were
    // added, which was no longer true. Assert it tracks the real age list.
    const AGES = extractArray('CPR_AGES');
    const html = body();
    expect(html).toMatch(/lay rescuer/i);
    for (const a of AGES) {
      expect(html.toLowerCase(), 'scope omits ' + a.id).toContain(a.label.toLowerCase());
    }
  });

  it('says this is not certification and sends them to a real course', () => {
    const html = body();
    expect(html).toMatch(/not certification/i);
    expect(html).toMatch(/hands-on course/i);
    expect(html).toMatch(/manikin/i);
  });

  it('tells them to call 911 first', () => {
    expect(body()).toMatch(/call 911 first/i);
  });

  it('admits the 3D body is schematic, not anatomical', () => {
    expect(body()).toMatch(/not an anatomical model/i);
  });
});

describe('body 3D — degrades without the canvas', () => {
  it('keeps every target and step reachable when 3D fails', () => {
    const esc = (s) => s.replace(/'/g, '&#x27;');
    const place = body({ b3dTab: 'place', b3dStatus: 'failed' });
    expect(place).toContain('3D view unavailable');
    for (const p of PARTS) expect(place, 'lost target ' + p.id).toContain(esc(p.label));
    const rec = body({ b3dTab: 'recovery', b3dStatus: 'failed' });
    for (const s of RECOVERY) expect(rec, 'lost step ' + s.id).toContain(esc(s.label));
  });

  it('says outright that the picture is not required', () => {
    expect(body({ b3dStatus: 'failed' })).toMatch(/nothing here needs the picture/i);
  });
});

describe('body 3D — uses the shared viewer shell', () => {
  it('takes the shell from the host rather than copying it', () => {
    expect(HOST).toContain('makeBayViewer: function (cfg)');
    expect(SRC).toContain('window.StemLab && window.StemLab.makeBayViewer');
    expect(SRC).not.toContain('function makeBayViewer');
    expect(SRC).toContain('FR_NULL_VIEWER');
  });

  it('keeps its scene builder free of DOM and React', () => {
    const from = SRC.indexOf('function buildBodyScene');
    const to = SRC.indexOf('var FR_NULL_VIEWER');
    expect(to).toBeGreaterThan(from);
    const bodySrc = SRC.slice(from, to).replace(/\/\/[^\n]*/g, '');
    expect(bodySrc).not.toMatch(/document\./);
    expect(bodySrc).not.toMatch(/React\./);
    expect(bodySrc).not.toMatch(/\bctx\./);
  });

  it('drives the recovery roll from the step count', () => {
    expect(SRC).toContain("phase: tab === 'recovery' ? recDone.length : 0");
  });
});
