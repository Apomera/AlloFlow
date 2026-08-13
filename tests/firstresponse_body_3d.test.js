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
import { makePoseProbe, span } from './helpers/firstresponse_pose_probe.js';

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
    for (const tab of ['gate', 'place', 'depth', 'coach', 'aed', 'recovery', 'call']) {
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


describe('body 3D — 30:2 timing and breath coach', () => {
  function extractTimingAnalyzer() {
    const start = SRC.indexOf('function analyzeCprTiming');
    expect(start).toBeGreaterThan(-1);
    const open = SRC.indexOf('{', start);
    let depth = 0;
    let end = -1;
    for (let i = open; i < SRC.length; i++) {
      if (SRC[i] === '{') depth++;
      else if (SRC[i] === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const fnSource = SRC.slice(start, end + 1);
    // eslint-disable-next-line no-new-func
    return new Function('CPR_COACH_SPEC', 'return (' + fnSource + ')')({ minBpm: 100, maxBpm: 120 });
  }

  it('renders the complete non-WebGL practice floor', () => {
    const html = body({ b3dTab: 'coach', b3dAge: 'adult' });
    expect(html).toContain('30:2 compression + breath coach');
    expect(html).toContain('Start 30:2 practice');
    expect(html).toMatch(/timing and sequence only/i);
    expect(html).toMatch(/never depth, force, airway seal or real chest rise/i);
  });
  it('renders the full arrest scenario path and its training boundary', () => {
    const html = body({ b3dTab: 'coach', b3dCoachMode: 'scenario' });
    expect(html).toContain('Full cardiac-arrest sequence coach');
    expect(html).toContain('Full arrest run');
    expect(html).toContain('Start full arrest scenario');
    expect(SRC).toContain("next.phase = coachMode === 'scenario' ? 'assessment' : 'compressions'");
    expect(SRC).toContain("session.phase = 'call'");
    expect(SRC).toContain("session.phase = 'aed'");
    expect(SRC).toContain('recordScenarioCompressionDown');
    expect(SRC).toContain('recordScenarioCompressionUp');
    expect(SRC).toContain('holdDurations');
    expect(SRC).toContain('scenarioSteps');
    expect(SRC).toContain('Apply AED and follow prompts');
    expect(SRC).toContain('Press and release compression');
  });

  it('pins the 30:2 sequence and target range', () => {
    expect(SRC).toContain('compressionsPerCycle: 30');
    expect(SRC).toContain('breathsPerCycle: 2');
    expect(SRC).toContain('minBpm: 100');
    expect(SRC).toContain('maxBpm: 120');
    expect(SRC).toContain("session.phase = 'breaths'");
    expect(SRC).toContain("session.phase = 'resume'");
    expect(SRC).toContain('session.pauseDurations.push');
  });

  it('scores a steady 110 bpm rhythm as fully in range', () => {
    const analyze = extractTimingAnalyzer();
    const result = analyze(Array(12).fill(60000 / 110));
    expect(result.medianBpm).toBe(110);
    expect(result.inRangePct).toBe(100);
    expect(result.consistencyPct).toBe(100);
  });

  it('exposes erratic timing even when the median looks acceptable', () => {
    const analyze = extractTimingAnalyzer();
    const result = analyze([400, 690, 545, 410, 680, 545]);
    expect(result.medianBpm).toBeGreaterThanOrEqual(100);
    expect(result.medianBpm).toBeLessThanOrEqual(120);
    expect(result.inRangePct).toBeLessThan(100);
    expect(result.consistencyPct).toBeLessThan(90);
  });

  it('keeps accepted very-fast taps and long pauses in the score', () => {
    const analyze = extractTimingAnalyzer();
    for (const intervals of [[545, 200, 545], [545, 3000, 545]]) {
      const result = analyze(intervals);
      expect(result.sampleCount).toBe(3);
      expect(result.medianBpm).toBe(110);
      expect(result.inRangePct).toBe(67);
      expect(result.consistencyPct).toBeLessThan(100);
    }
  });

  it('keeps live taps in memory and persists only the summary', () => {
    expect(SRC).toContain('var frCoachRef = useRef(null)');
    expect(SRC).toContain("upd('b3dCoachBest', session.summary)");
    expect(SRC).not.toContain("upd('b3dCoachTaps'");
  });

  it('links all seven tabs to one roving-focus tabpanel', () => {
    expect(SRC).toContain("var BODY_TAB_IDS = ['gate', 'place', 'depth', 'coach', 'aed', 'recovery', 'call']");
    expect(SRC).toContain("id: 'firstresponse-body-tab-' + id");
    expect(SRC).toContain("'aria-controls': 'firstresponse-body-panel-' + id");
    expect(SRC).toContain("id: 'firstresponse-body-panel-' + tab");
  });

  it('animates through the shared viewer without scene rebuilds', () => {
    expect(HOST).toContain('contentFrame: contentFrame');
    expect(HOST).toContain('S.contentFrame(Date.now(), props.sceneProps || {}, S.reduced)');
    expect(SRC).toContain("sceneKey: tab + ':' + sceneAge");
    expect(SRC).toContain("if (!reduced && mode === 'coach')");
  });
  it('locks each breath through chest rise and fall and resets interrupted sessions', () => {
    expect(SRC).toContain('breathLockMs: 1500');
    expect(SRC).toContain("session.phase = 'breathRecovery'");
    expect(SRC).toContain('CPR_COACH_SPEC.breathLockMs + 50');
    expect(SRC).toContain("document.addEventListener('visibilitychange'");
    expect(SRC).toContain('compressionSegmentEpoch');
  });

  it('renders pediatric ratios, fallback framing, and age-specific depths', () => {
    const infantCoach = body({ b3dTab: 'coach', b3dAge: 'infant' });
    expect(infantCoach).toMatch(/single-rescuer 30:2 practice/i);
    expect(infantCoach).toContain('15:2');
    expect(infantCoach).toContain('Compression-only fallback');
    const infantDepth = body({ b3dTab: 'depth', b3dAge: 'infant', b3dMech: 'right' });
    expect(infantDepth).toMatch(/1\.5 inches \(4 cm\)/i);
    expect(infantDepth).not.toMatch(/2\.4 inches/i);
    const childDepth = body({ b3dTab: 'depth', b3dAge: 'child', b3dMech: 'right' });
    expect(childDepth).toMatch(/About 2 inches \(5 cm\)/i);
    expect(childDepth).not.toMatch(/2\.4 inches/i);
  });

  it('uses age-specific announcements and separate fallback recognition', () => {
    expect(SRC).toContain("var zoneWhy = z.verdict === 'correct' ? ageInfo.where + ' ' + ageInfo.hands : z.why");
    expect(SRC).toContain("note('Model shown', modelTechnique)");
    expect(SRC).toContain("awardBadge('cpr_compression_fallback'");
    expect(SRC).toContain("if (session.mode === 'trained') awardBadge('cpr_30x2_flow'");
  });

  it('pins the 2025 choking order and pediatric drowning response', () => {
    expect(SRC).toContain('Give 5 back blows, then 5 abdominal thrusts');
    expect(SRC).toContain('Repeat 5 back blows + 5 chest thrusts');
    expect(SRC).not.toContain('current AHA guidance is abdominal thrusts first');
    expect(SRC).not.toContain('you have a minute or so');
    expect(SRC).toContain('start conventional CPR with breaths now');
    expect(SRC).toContain('Pregnant or large person: 5 back blows + 5 chest thrusts');
    expect(SRC).not.toContain('Start hands-only CPR if trained');
    expect(SRC).toContain('If they are not breathing normally, start CPR or rescue breathing');
    expect(SRC).toContain('Recovery position only if breathing normally');
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

  it('changes the hands, not just the numbers, using the 2025 infant technique', () => {
    expect(byId('adult').hands).toMatch(/two hands/i);
    expect(byId('child').hands).toMatch(/one hand/i);
    expect(byId('infant').hands).toMatch(/heel of one hand/i);
    expect(byId('infant').hands).toMatch(/two-thumb/i);
    expect(byId('infant').hands).toMatch(/two-finger.*no longer recommended/i);
    expect(byId('infant').hands).not.toMatch(/^Two fingers/i);
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
    expect(SRC).toContain('age: sceneAge,');
    expect(SRC).toContain("coach: tab === 'coach'");
    expect(SRC).toContain("sceneKey: tab + ':' + sceneAge");
  });

  it('shows target patches only on the tabs that ask about them', () => {
    // Compression zones were bleeding onto the gate, recovery and scenario
    // tabs as coloured squares on the body that nothing was asking about.
    expect(SRC).toContain("if (mode === 'aed')");
    expect(SRC).toContain("else if (mode === 'place')");
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
    // i18n-safe param idiom: literal '{count}' placeholder in the translatable
    // string, filled from CALL_CASES.length — the count still tracks the module.
    expect(SRC).toContain(".replace('{count}', CALL_CASES.length)");
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

// ── Airway ──────────────────────────────────────────────────────────────────
// Added 2026-08-11. The coach's trained mode runs 30 compressions then TWO
// BREATHS, but nothing in the tool taught how to open the airway first: "head
// tilt" appeared only in the recovery-position copy, about letting fluid drain.
// A breath delivered into an unopened airway largely inflates the stomach, and
// the age difference is not a matter of degree — tilting an infant's head back
// the way you would an adult's kinks a short, soft trachea SHUT. So the tilt is
// modelled per age in the 3D figure and cued at the moment of the breath, and
// both are pinned here: a wording refactor must not quietly drop them.
describe('body 3D — airway', () => {
  const AGES = extractArray('CPR_AGES');
  const byId = (id) => AGES.filter((a) => a.id === id)[0];

  it('gives every age an airway instruction and a modelled tilt', () => {
    for (const age of AGES) {
      expect(typeof age.airway, age.id + ' airway text').toBe('string');
      expect(age.airway.length, age.id + ' airway text is substantive').toBeGreaterThan(40);
      expect(typeof age.airwayTilt, age.id + ' airwayTilt').toBe('number');
    }
  });

  it('tilts an adult furthest and keeps an infant nearest neutral', () => {
    const adult = byId('adult').airwayTilt;
    const child = byId('child').airwayTilt;
    const infant = byId('infant').airwayTilt;
    expect(adult).toBeGreaterThan(child);
    expect(child).toBeGreaterThan(infant);
    // Neutral means neutral. An infant must not read as "a slightly smaller
    // adult tilt", which is the exact mistake this content teaches against.
    expect(infant).toBeLessThan(0.25);
  });

  it('tells the rescuer NOT to tilt an infant back, in words and not only in numbers', () => {
    const infant = byId('infant').airway;
    expect(infant).toMatch(/neutral|sniffing/i);
    expect(infant).toMatch(/not tilt|do not tilt|don't tilt/i);
    // And the adult instruction must still name the actual maneuver.
    expect(byId('adult').airway).toMatch(/head tilt/i);
    expect(byId('adult').airway).toMatch(/chin lift/i);
  });

  it('holds the airway open in the 3D for the whole breath phase', () => {
    // Not a nod that tracks one breath: the head is HELD open while breaths are
    // being given, which is the thing the learner has to copy.
    expect(SRC).toContain("coach.phase === 'breaths' || coach.phase === 'breathRecovery'");
    expect(SRC).toContain('airwayHold * ageAirwayTilt * AIRWAY_TILT_MAX');
    expect(SRC).toContain('var AIRWAY_TILT_MAX');
  });

  it('cues the airway at the moment of the breath, not only in a reference panel', () => {
    expect(SRC).toContain('inBreathPhase && h(');
    expect(SRC).toContain('b3d_airway_cue_infant');
    expect(SRC).toContain('ageInfo.airway');
  });

  it('renders the airway note on the depth tab for each age', () => {
    for (const age of ['adult', 'child', 'infant']) {
      const html = body({ b3dTab: 'depth', b3dAge: age });
      expect(html, age + ': airway note missing').toContain('open the airway first');
    }
  });
});

// ── Mechanics demonstration ─────────────────────────────────────────────────
// Added 2026-08-11. CPR_MECHANICS lets the learner choose shallow / correct /
// too deep / leaning and returns a written verdict, but the 3D figure used to
// animate perfect technique regardless of the choice — so the one medium that
// could actually SHOW the error never did. Leaning in particular is nearly
// invisible in prose and unmistakable the moment the chest stops coming back
// up. The scene now demonstrates the selected mechanic.
describe('body 3D — mechanics demonstration', () => {
  // Pull the amplitudes straight out of the animation so the test fails if the
  // numbers drift, rather than asserting the prose around them.
  function strokeBlock() {
    const at = SRC.indexOf("if (!reduced && mode === 'depth')");
    expect(at, 'depth animation not found').toBeGreaterThan(-1);
    return SRC.slice(at, at + 900);
  }

  it('passes the chosen mechanic to the scene, but only on the depth tab', () => {
    expect(SRC).toContain("mech: tab === 'depth' ? mech : null");
  });

  it('keeps mech OUT of sceneKey so switching does not rebuild the figure', () => {
    const key = SRC.match(/sceneKey: ([^\n,]+)/);
    expect(key, 'sceneKey not found').toBeTruthy();
    expect(key[1]).not.toContain('mech');
  });

  it('reads the mechanic live in frame() rather than at build time', () => {
    expect(SRC).toContain('var mechDemo = nextProps.mech || null');
  });

  it('gives each error a distinct stroke, ordered shallow < correct < too deep', () => {
    const block = strokeBlock();
    const shallow = Number(block.match(/mechDemo === 'shallow'\) stroke = ([\d.]+)/)[1]);
    const tooDeep = Number(block.match(/mechDemo === 'toodeep'\) stroke = ([\d.]+)/)[1]);
    const correct = Number(block.match(/var stroke = ([\d.]+)/)[1]);
    expect(shallow).toBeLessThan(correct);
    expect(correct).toBeLessThan(tooDeep);
    // Shallow has to look shallow, not "slightly less".
    expect(shallow).toBeLessThan(correct * 0.5);
  });

  it('models leaning as a chest that never returns to the top', () => {
    // The defining property of leaning is residual compression between pushes,
    // so the floor must be non-zero. Every other mechanic returns to zero.
    const block = strokeBlock();
    const lean = block.match(/mechDemo === 'lean'\) \{ stroke = ([\d.]+); floor = ([\d.]+); \}/);
    expect(lean, 'lean mechanic not modelled').toBeTruthy();
    expect(Number(lean[2])).toBeGreaterThan(0);
    expect(block).toContain('compression = floor +');
  });

  it('still honours reduced motion', () => {
    // The whole demonstration sits behind the same !reduced guard as before.
    expect(strokeBlock()).toContain("!reduced && mode === 'depth'");
  });
});

// ── Breathing gate animation ────────────────────────────────────────────────
// Added 2026-08-11. The gate asks the single question that decides everything —
// breathing normally, or agonal gasping? — and the figure used to lie perfectly
// still while the learner answered it. Agonal gasping is not slow breathing: it
// is isolated snatches of air separated by long dead pauses, and that pause is
// exactly what bystanders read as "still breathing". The rhythm is the lesson,
// so these tests pin the TIMING, not the wording.
describe('body 3D — breathing gate animation', () => {
  function gateBlock() {
    const at = SRC.indexOf("mode === 'gate' && gateDemo");
    expect(at, 'gate animation not found').toBeGreaterThan(-1);
    return SRC.slice(at, at + 900);
  }

  it('passes the chosen pattern to the scene, but only on the gate tab', () => {
    expect(SRC).toContain("gate: tab === 'gate' ? gate : null");
    expect(SRC).toContain('var gateDemo = nextProps.gate || null');
  });

  it('keeps gate OUT of sceneKey so switching does not rebuild the figure', () => {
    const key = SRC.match(/sceneKey: ([^\n,]+)/);
    expect(key[1]).not.toContain('gate');
  });

  it('breathes slower when gasping than when breathing normally', () => {
    const block = gateBlock();
    const normalMs = Number(block.match(/now % (\d+)\) \/ \d+;\s*\n\s*breathRise = \(1 - Math\.cos/)[1]);
    const agonalMs = Number(block.match(/var ag = \(now % (\d+)\)/)[1]);
    // Agonal is far less frequent — that is what makes the pauses long.
    expect(agonalMs).toBeGreaterThan(normalMs);
    // Sanity-check both against real physiology rather than just each other:
    // ~14/min normal, and agonal gasps are single digits per minute.
    expect(60000 / normalMs).toBeGreaterThan(10);
    expect(60000 / normalMs).toBeLessThan(20);
    expect(60000 / agonalMs).toBeLessThan(10);
  });

  it('gives the gasp a long dead pause, which normal breathing never has', () => {
    const block = gateBlock();
    // The gasp occupies a small fraction of its cycle and the rest is FLAT at
    // zero. Normal breathing is a continuous cosine with no flat segment.
    const duty = Number(block.match(/ag < ([\d.]+)/)[1]);
    expect(duty).toBeLessThan(0.25);
    expect(block).toContain(': 0;');
    expect(block).toContain('1 - Math.cos(');
  });

  it('makes the chest excursion large enough to read on the gate tab', () => {
    // The internal anatomy is hidden on this tab, so the chest is the only
    // evidence; a 7% wobble would not carry the lesson.
    const amp = SRC.match(/var breathAmp = mode === 'gate' \? ([\d.]+) : ([\d.]+);/);
    expect(amp, 'breathAmp not found').toBeTruthy();
    expect(Number(amp[1])).toBeGreaterThan(Number(amp[2]));
  });

  it('tells the learner what to watch for, per pattern', () => {
    const agonal = body({ b3dTab: 'gate', b3dGate: 'notbreathing' });
    expect(agonal).toContain('agonal gasping');
    expect(agonal).toMatch(/pause is the tell/i);
    const normal = body({ b3dTab: 'gate', b3dGate: 'breathing' });
    expect(normal).toContain('normal breathing');
  });

  it('honours reduced motion on the gate too', () => {
    expect(gateBlock()).toContain('!reduced');
  });
});

// An AED pad is a fixed piece of plastic; it does not shrink with the patient.
// On an infant chest the adult diagonal pair ends up touching, and pads that
// touch short the current across the skin instead of driving it through the
// heart — so the correct layout changes SHAPE, front-and-back, not just scale.
// The tool already taught that twice in prose (the AED rules list, and the
// infant scenario where two front pads is marked UNSAFE) while the pad tab
// showed the adult diagonal on whatever body the age selector had last left
// behind, with no age control on that tab to correct it. These pin the fix.
describe('body 3D — AED pads are age-specific, not age-scaled', () => {
  const INFANT_PADS = extractArray('AED_PADS_INFANT');

  it('gives an infant a front-and-back pair, not the adult diagonal', () => {
    const correct = INFANT_PADS.filter((p) => p.verdict === 'correct').map((p) => p.id).sort();
    expect(correct).toEqual(['padBack', 'padFront']);
    // The adult targets must not survive into the infant layout: on that chest
    // they are the wrong answer, not a differently-sized right one.
    const ids = INFANT_PADS.map((p) => p.id);
    expect(ids).not.toContain('padUR');
    expect(ids).not.toContain('padLL');
  });

  it('routes each age to its own layout', () => {
    const fn = SRC.slice(SRC.indexOf('function aedPadsForAge'));
    expect(fn.slice(0, 220)).toMatch(/infant.*AED_PADS_INFANT.*AED_PADS/s);
  });

  it('agrees with its own scenario that two front pads on a baby is unsafe', () => {
    const together = INFANT_PADS.find((p) => p.id === 'padTogether');
    expect(together.verdict).toBe('unsafe');
    // and for the physical reason, not just "wrong"
    expect(together.why).toMatch(/touch/i);
    expect(together.why).toMatch(/short|across the skin|burn/i);
  });

  it('says the back pad goes behind the heart and why the shape changed', () => {
    const back = INFANT_PADS.find((p) => p.id === 'padBack');
    expect(back.label).toMatch(/back/i);
    expect(back.why).toMatch(/shoulder blade/i);
    expect(back.why).toMatch(/touch/i);
    const front = INFANT_PADS.find((p) => p.id === 'padFront');
    expect(front.why).toMatch(/between them/i);
  });

  it('offers the infant targets on the pad tab and withdraws the adult ones', () => {
    const infant = body({ b3dTab: 'aed', b3dAge: 'infant' });
    for (const p of INFANT_PADS) expect(infant, 'no button for ' + p.id).toContain(p.label);
    const adultOnly = extractArray('AED_PADS').filter((p) => p.id === 'padUR' || p.id === 'padLL');
    for (const p of adultOnly) expect(infant, 'adult target still offered on an infant: ' + p.id).not.toContain(p.label);
    // and the adult tab is unchanged
    const adult = body({ b3dTab: 'aed', b3dAge: 'adult' });
    for (const p of adultOnly) expect(adult).toContain(p.label);
  });

  it('lets the learner choose the age on the pad tab at all', () => {
    const html = body({ b3dTab: 'aed' });
    // The figure was already being drawn at the selected age; without the
    // selector here a learner could not see or change which body they were
    // placing pads on.
    for (const label of ['Adult', 'Child', 'Infant']) {
      expect(html, 'no age control on the AED tab: ' + label).toContain(label);
    }
  });

  it('drops picks belonging to the other layout instead of scoring them', () => {
    // Place the adult pair, then switch to an infant: the old ids must not read
    // as a completed infant answer.
    const stale = body({ b3dTab: 'aed', b3dAge: 'infant', b3dPads: ['padUR', 'padLL'], b3dPad: 'padLL' });
    expect(stale).not.toContain('Both pads placed');
  });

  it('completes on the pair the current layout actually requires', () => {
    const done = body({ b3dTab: 'aed', b3dAge: 'infant', b3dPads: ['padFront', 'padBack'], b3dPad: 'padBack' });
    expect(done).toContain('Both pads placed');
    expect(done).toMatch(/shoulder blades/);
    const adultDone = body({ b3dTab: 'aed', b3dAge: 'adult', b3dPads: ['padUR', 'padLL'], b3dPad: 'padLL' });
    expect(adultDone).toContain('Both pads placed');
    expect(adultDone).toMatch(/diagonally across the heart/);
  });

  it('draws the pads at true size instead of scaling them with the body', () => {
    // This is the whole visual argument: a pad that shrank with the patient
    // would always fit, and the lesson would silently disappear.
    const m = SRC.match(/var padTrueSize = mode === 'aed' \? 1 \/ Math\.max\([\d.]+, ageScale\) : 1;/);
    expect(m, 'pads are no longer counter-scaled out of the body age scale').toBeTruthy();
    const aedBlock = SRC.slice(SRC.indexOf("if (mode === 'aed' && age === 'infant')"),
      SRC.indexOf("} else if (mode === 'place')"));
    // every pad plate in both AED layouts must carry the true-size factor
    const patches = aedBlock.match(/patch\('pad[A-Za-z]+'[^\n]*/g) || [];
    expect(patches.length).toBe(8);
    for (const p of patches) expect(p, 'pad not drawn at true size: ' + p).toContain('padTrueSize');
  });

  it('puts the infant back pad underneath the body, drawn through it', () => {
    const line = (SRC.match(/patch\('padBack'[^\n]*/) || [''])[0];
    expect(line, 'no padBack in the scene').toBeTruthy();
    // Below the torso, not another patch sitting on the chest.
    const y = line.match(/y:\s*(-?[\d.]+)/);
    expect(y, 'padBack has no explicit y').toBeTruthy();
    expect(Number(y[1])).toBeLessThan(0);
    expect(line).toContain('behind: true');
    // and "behind" has to actually defeat the depth buffer, or the torso hides
    // it completely from the default overhead view
    const patchFn = SRC.slice(SRC.indexOf('function patch(id, w, hgt, x, z, opts)'),
      SRC.indexOf("if (mode === 'aed' && age === 'infant')"));
    expect(patchFn).toMatch(/depthTest = false/);
  });

  it('names the infant targets in the viewer part list', () => {
    const parts = SRC.slice(SRC.indexOf('var BODY_SCENE_PARTS'), SRC.indexOf('function buildBodySceneLegacy'));
    expect(parts).toContain('AED_PADS_INFANT');
    // ids shared by both layouts must not be listed twice
    expect(parts).toMatch(/all\[j\]\.id === pad\.id/);
  });

  it('tells the learner the pads are drawn at true size, not shrunk', () => {
    const infant = body({ b3dTab: 'aed', b3dAge: 'infant' });
    expect(infant).toMatch(/size of the pads/i);
    expect(infant).toMatch(/fixed piece of plastic/i);
    // A child still uses the diagonal pair, but gets the touching caveat.
    const child = body({ b3dTab: 'aed', b3dAge: 'child' });
    expect(child).toMatch(/front-and-back/i);
    expect(child).toMatch(/school-age/i);
  });
});

// The recovery tab's teaching content IS the pose, and every step is supposed
// to move the thing it names. It did not. The roll was ramped linearly across
// the last four steps, so "pull on the bent knee to roll them onto their side"
// delivered a quarter of the turn, the airway and top-leg steps appeared to
// work only because the body kept rotating underneath them, and "keep watching
// their breathing" rolled the patient. The head never tilted at all — the one
// step whose own text calls it "the whole reason the position exists".
//
// These read joint positions rather than diffing a screenshot, because a
// screenshot only answers "did anything change" and the bug satisfied that.
describe('body 3D — the recovery position performs its own steps', () => {
  const pose = makePoseProbe(SRC);
  const ORDER = RECOVERY.map((s) => s.id);
  const at = (id) => ORDER.indexOf(id) + 1;
  const LANDMARKS = ['nearShoulder', 'nearElbow', 'nearWrist', 'topHip', 'topKnee', 'topAnkle'];
  const moved = (a, b) => LANDMARKS.some((k) => span(a[k], b[k]) > 1e-9);

  it('turns them on the step that says to turn them', () => {
    expect(pose(at('knee')).rollAngle, 'rolled before the roll step').toBe(0);
    const onRoll = pose(at('roll')).rollAngle;
    const finished = pose(ORDER.length).rollAngle;
    expect(onRoll, 'the roll step did not roll them').toBeGreaterThan(0);
    // Most of the turn belongs to this step. It used to deliver a quarter.
    expect(onRoll / finished).toBeGreaterThan(0.8);
  });

  it('rolls them TOWARDS the rescuer, not away', () => {
    // The near arm is the one placed out at a right angle, so that side is
    // where the rescuer is kneeling. Rolling towards them puts that shoulder
    // DOWN and brings the far hip up and over. Rolling the other way — which
    // is what it did — is the mistake the step text explicitly warns about,
    // and it leaves the lever leg underneath and the bracing arm in the air.
    const done = pose(ORDER.length);
    expect(done.nearShoulder.y, 'the near side ended up on top: they rolled away from the rescuer')
      .toBeLessThan(done.topHip.y);
  });

  it('opens the airway on the airway step, and moves nothing else', () => {
    const before = pose(at('roll'));
    const after = pose(at('airway'));
    expect(before.headTiltX, 'head already tilted before the airway step').toBe(0);
    expect(after.headTiltX, 'the airway step did not tilt the head').toBeGreaterThan(0);
    // ...and points the mouth down towards the mat, which is what the drainage
    // angle is for and the reason the position exists at all.
    expect(after.headRollZ).toBeGreaterThan(0);
    expect(after.rollAngle, 'the airway step rotated the body').toBe(before.rollAngle);
    expect(moved(before, after), 'the airway step moved a limb').toBe(false);
  });

  it('scales the recovery head tilt by age, like the CPR one', () => {
    const adult = pose(at('airway'), 'adult').headTiltX;
    const infant = pose(at('airway'), 'infant').headTiltX;
    expect(infant, 'an infant got the adult head tilt').toBeLessThan(adult);
  });

  it('squares the top leg on the step that squares the top leg', () => {
    const before = pose(at('airway'));
    const after = pose(at('stable'));
    // Measured in the BODY frame. In world space the knee moved on this step
    // even when the leg did not, because the body was still rotating — so a
    // world-space assertion passes against the very bug it should catch.
    const legVec = (L) => ({
      x: L.topKneeLocal.x - L.topHipLocal.x,
      y: L.topKneeLocal.y - L.topHipLocal.y,
      z: L.topKneeLocal.z - L.topHipLocal.z,
    });
    expect(span(legVec(before), legVec(after)), 'the top leg was never re-posed').toBeGreaterThan(0.05);
    expect(after.headTiltX, 'squaring the leg changed the head').toBe(before.headTiltX);
  });

  it('does not move them when the step is to watch them', () => {
    const before = pose(at('stable'));
    const after = pose(at('watch'));
    expect(after.rollAngle, 'watching them breathe rolled them').toBe(before.rollAngle);
    expect(moved(before, after), 'watching them breathe moved them').toBe(false);
  });

  it('keeps every joint above the mat, at every step and every age', () => {
    for (const age of ['adult', 'child', 'infant']) {
      for (let p = 0; p <= ORDER.length; p++) {
        const L = pose(p, age);
        for (const k of LANDMARKS) {
          expect(L[k].y, age + ' ' + k + ' is through the floor at step ' + p).toBeGreaterThan(0);
        }
      }
    }
  });

  it('does not stretch a limb to reach a pose', () => {
    // Both rolled poses re-pin joints that the body rotation would otherwise
    // drag through the floor or into the air. Hand-picked world coordinates
    // did that by stretching: the upper arm went from 0.47 to 0.87 and left a
    // forearm floating clear of the body. The lengths are the figure's own.
    for (const age of ['adult', 'child', 'infant']) {
      const armRef = pose(at('arm'), age);      // arm out at a right angle
      const legRef = pose(0, age);              // legs still flat
      const upper = span(armRef.nearShoulder, armRef.nearElbow);
      const fore = span(armRef.nearElbow, armRef.nearWrist);
      const thigh = span(legRef.topHip, legRef.topKnee);
      const shin = span(legRef.topKnee, legRef.topAnkle);
      for (let p = at('roll'); p <= ORDER.length; p++) {
        const L = pose(p, age);
        expect(Math.abs(span(L.nearShoulder, L.nearElbow) / upper - 1),
          age + ' upper arm stretched at step ' + p).toBeLessThan(0.05);
        expect(Math.abs(span(L.nearElbow, L.nearWrist) / fore - 1),
          age + ' forearm stretched at step ' + p).toBeLessThan(0.05);
        if (p >= at('stable')) {
          expect(Math.abs(span(L.topHip, L.topKnee) / thigh - 1),
            age + ' thigh stretched at step ' + p).toBeLessThan(0.05);
          expect(Math.abs(span(L.topKnee, L.topAnkle) / shin - 1),
            age + ' shin stretched at step ' + p).toBeLessThan(0.05);
        }
      }
    }
  });

  it('lifts the body as it comes onto its side instead of sinking into the mat', () => {
    // A body on its side is taller than one on its back. Holding the supine
    // height through the roll buried the near shoulder under the floor.
    const flat = pose(0);
    const rolled = pose(ORDER.length);
    expect(rolled.nearShoulder.y, 'the near shoulder sank below the mat').toBeGreaterThan(0);
    expect(rolled.topHip.y, 'the figure did not rise as it rolled').toBeGreaterThan(flat.topHip.y);
  });

  it('leaves the other tabs flat on their back', () => {
    for (const tab of ['gate', 'place', 'depth', 'coach', 'aed']) {
      expect(pose(0, 'adult', tab).rollAngle, tab + ' is rolled').toBe(0);
    }
  });
});
