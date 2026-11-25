// Bike Lab, sports-labs pass round 2 (2026-11-23).
// Guards: the Repair Simulator pictures (a work stand for every job, step pictures for the flat tube and the rim
// brakes that never show a tool before the student picks one), "Test your own reaction time" in Braking (counted
// tries feed brakingStop), the Signal Drill street scenes (the situation, never the arm pose), what the Sandbox
// does when a coasting bike stops on a slope (a foot goes down; the model says whether it would roll back), and the
// leftovers (a hostile Bike Fit save drew NaN; Gearing Lab read reduced motion once at page load; high contrast;
// fullscreen stretched the canvases).
// BIKELAB_SRC points the suite at another copy for the fail-first check.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(process.env.BIKELAB_SRC || 'stem_lab/stem_tool_bikelab.js', 'utf8').replace(/\r\n/g, '\n');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('anchors missing: ' + from); return src.slice(a, b); };
const model = () => new Function('window', cut('  var BIKES = [', '  // SECTION 3').replace(/\n[^\n]*$/, '') +
  '\nreturn { BIKES, TERRAINS, brakingStop, sandboxStep, SANDBOX_DT, REACTION_TRIALS, REACTION_MIN_MS, REACTION_TIMEOUT_MS, reactionWaitMs, reactionCounted, reactionSummary, reactionCompare };')({});
const pictures = () => new Function(cut('  var REPAIR_JOBS = [', '  // SECTION 4').replace(/\n[^\n]*$/, '') +
  '\nreturn { REPAIR_JOBS, REPAIR_PICTURES, REPAIR_FOCUS, PART_SHAPES, repairFocus, repairStepArt, SIGNAL_SCENES, signalSceneSvg };')();
// A stand-in for React.createElement that keeps the tree, so drawings can be read without a browser.
const h = (tag, props, ...kids) => ({ tag, props: props || {}, kids: kids.flat(Infinity).filter((k) => k != null && k !== false) });
const all = (nodes, pred, out = []) => { for (const n of [].concat(nodes)) if (n && n.tag) { if (pred(n)) out.push(n); all(n.kids, pred, out); } return out; };
const view = (name, next) => cut('      function ' + name + '() {', '      function ' + next + '() {');

describe('Repair Simulator pictures', () => {
  it('every job has a work-stand focus, and each ring sits on a real part or a drawn place', () => {
    const P = pictures();
    for (const job of P.REPAIR_JOBS) {
      expect(P.REPAIR_FOCUS[job.id], job.id).toBeTruthy();
      const f = P.repairFocus(job.id, null);
      expect(f.where.length, job.id).toBeGreaterThan(5);
      expect(f.outlines.length, job.id + ' rings something').toBeGreaterThan(0);
      for (const st of job.steps) for (const o of P.repairFocus(job.id, st.id).outlines) for (const v of (o.circle || o.rect)) expect(Number.isFinite(v)).toBe(true);
      for (const id of Object.keys((P.REPAIR_FOCUS[job.id].steps) || {})) expect(job.steps.map((s) => s.id), job.id + '.' + id).toContain(id);
    }
    for (const f of Object.values(P.REPAIR_FOCUS)) for (const id of (f.parts || [])) expect(P.PART_SHAPES[id], id).toBeTruthy();
  });

  it('the flat tube and the rim brakes have a picture for every step', () => {
    const P = pictures();
    for (const jobId of ['patch_tube', 'brake_adjust']) {
      const job = P.REPAIR_JOBS.find((j) => j.id === jobId);
      expect(Object.keys(P.REPAIR_PICTURES[jobId]).sort()).toEqual(job.steps.map((s) => s.id).sort());
    }
  });

  it('before the student picks, a picture shows the bike and never a tool; after the right pick, it shows that tool at work', () => {
    const P = pictures();
    for (const jobId of Object.keys(P.REPAIR_PICTURES)) {
      const job = P.REPAIR_JOBS.find((j) => j.id === jobId);
      for (const st of job.steps) {
        const before = P.repairStepArt(h, jobId, st.id, false), after = P.repairStepArt(h, jobId, st.id, true);
        expect(all(before.kids, (n) => n.props['data-bikelab-tool-art']), jobId + '.' + st.id + ' before').toHaveLength(0);
        expect(before.tool).toBe(null);
        const shown = all(after.kids, (n) => n.props['data-bikelab-tool-art']).map((n) => n.props['data-bikelab-tool-art']);
        // pressing on the patch: the gloved hand presses, and the patch itself is drawn stuck on the tube
        if (st.id === 'press_patch') { expect(shown).toContain('hand'); expect(P.REPAIR_PICTURES[jobId][st.id].after.patched).toBe(true); }
        else expect(shown, jobId + '.' + st.id + ' after shows the right tool').toContain(st.tool);
        expect(before.caption).not.toBe(after.caption);
      }
    }
  });

  it('a right pick on a pictured step waits for the student; the "Use:" answer chip stays gone', () => {
    const rs = view('RepairSim', 'BikeFit');
    expect(rs).toContain("if (REPAIR_PICTURES[job.id] && REPAIR_PICTURES[job.id][s.id]) { focusWantRef.current = 'next'; return; }");
    expect(rs).toContain("'data-bikelab-repair-next': 'true'");
    expect(rs).toContain('workStand(j.id, null, { thumb: true })');
    expect(rs).not.toMatch(/'Use: '/);
  });
});

describe('Braking: test your own reaction time', () => {
  it('the hazard waits 1.5 to 4.5 s, so nobody can time the tap', () => {
    const M = model();
    expect(M.reactionWaitMs(0)).toBe(1500); expect(M.reactionWaitMs(1)).toBe(4500); expect(M.reactionWaitMs(0.5)).toBe(3000);
    expect(M.reactionWaitMs(-3)).toBe(1500); expect(M.reactionWaitMs('x')).toBe(1500);
  });

  it('guesses and misses are not counted; the average is of the counted tries', () => {
    const M = model();
    const s = M.reactionSummary([50, 300, 'abc', 500, 4000, null, NaN, 400]);
    expect(s.count).toBe(3); expect(s.avgSec).toBeCloseTo(0.4, 9); expect(s.bestSec).toBeCloseTo(0.3, 9);
    expect(M.reactionSummary('nope')).toEqual({ count: 0, avgSec: null, bestSec: null });
    expect(M.reactionCounted(M.REACTION_MIN_MS)).toBe(true); expect(M.reactionCounted(M.REACTION_TIMEOUT_MS + 1)).toBe(false);
    expect(M.REACTION_TRIALS).toBe(5);
  });

  it('the comparison comes from brakingStop: only the reaction part changes with the time', () => {
    const M = model();
    const rows = M.reactionCompare(20, 'wet', 'both', 0.42);
    expect(rows.map((r) => r.key)).toEqual(['me', 'typical1', 'typical1.5']);
    for (const r of rows) {
      const ref = M.brakingStop(20, 'wet', 'both', r.sec);
      expect(r.stop.total).toBeCloseTo(ref.total, 9);
      expect(r.stop.reaction).toBeCloseTo((20 / 2.237) * r.sec, 9);
      expect(r.stop.braking).toBeCloseTo(rows[0].stop.braking, 9);
    }
    expect(M.reactionCompare(20, 'dry', 'both', null).map((r) => r.key)).toEqual(['typical1', 'typical1.5']);
  });

  it('one button does start and brake, a pointer press and its click count once, and there is an untimed path', () => {
    const v = view('BrakingPhysics', 'SafetyQuiz');
    expect(v).toContain("onPointerDown: rtPress, onKeyDown: rtPress, onClick: rtPress");
    expect(v).toContain("if (type === 'click') { if (rtPtrRef.current) { rtPtrRef.current = false; return; } }");
    expect(v).toContain("'data-bikelab-reaction-use': 'typical'");
    expect(v).toContain('if (!reducedMotionNow())');                       // the road stands still for reduced motion
    expect(v).toContain('useEffect(function() { return rtClear; }, []);');  // the timer is cleared on unmount
    expect(v).toContain('It is not a race');
    // mastery is unchanged: the test locks nobody out
    expect(src).toContain('braking: solvedIn(d.brakingChallenges) >= BRAKE_CHALLENGES.length,');
  });
});

describe('Signal Drill street scenes', () => {
  it('every drill situation has a scene with a caption', () => {
    const P = pictures();
    const ids = [...cut('      function SignalDrill() {', '      // MAIN VIEW DISPATCH').matchAll(/\{ id: '([a-z0-9-]+)',\s+prompt:/g)].map((m) => m[1]);
    expect(ids).toHaveLength(10);
    for (const id of ids) {
      expect(P.SIGNAL_SCENES[id], id).toBeTruthy();
      const svg = P.signalSceneSvg(h, id);
      expect(svg.props['aria-label']).toBe(P.SIGNAL_SCENES[id].caption);
      expect(svg.props['data-bikelab-signal-scene']).toBe(id);
    }
  });

  it('the rider in the scene keeps both hands on the bars: the picture never shows the answer pose', () => {
    const P = pictures();
    for (const id of Object.keys(P.SIGNAL_SCENES)) {
      const arms = all(P.signalSceneSvg(h, id), (n) => n.tag === 'polyline').map((n) => n.props.points).sort();
      expect(arms, id).toEqual(['32,34 26,56', '48,34 54,56']);
    }
    expect(cut('      function SignalDrill() {', '      // MAIN VIEW DISPATCH')).toContain('signalSceneSvg(h, current.id)');
  });
});

describe('Sandbox: coasting to a stop', () => {
  const run = (terrainId, v0) => {
    const M = model(), b = M.BIKES.find((x) => x.id === 'hybrid'), t = M.TERRAINS.find((x) => x.id === terrainId);
    const s = { x: 0, v: v0, t: 0, lowY: 0 }, o = { power: 0, gear: 0.7, wind: 0, riderMass: 70, coasting: true };
    let f = null, minV = Infinity;
    for (let i = 0; i < 120 * 30; i++) { f = M.sandboxStep(s, b, t, o, M.SANDBOX_DT); minV = Math.min(minV, s.v); }
    return { s, f, minV };
  };
  it('on the steep climb the bike stops, the model says it would roll back, and it never runs backward', () => {
    const r = run('steephill', 4);
    expect(r.s.v).toBe(0); expect(r.minV).toBe(0);
    expect(r.f.rest).toBe(true); expect(r.f.rollBack).toBe(true);
    expect(r.f.hill).toBeGreaterThan(r.f.tires);
    expect(r.f.budget.hillN).toBeCloseTo(r.f.hill, 9); expect(r.f.budget.holdN).toBeCloseTo(r.f.tires, 9);
  });
  it('on flat ground it stops with nothing pulling it back', () => {
    const r = run('flat', 1);
    expect(r.f.rest).toBe(true); expect(r.f.rollBack).toBe(false);
  });
  it('a stopped bike is drawn with a foot down, and the cue says why in one line', () => {
    const sb = cut('      function PhysicsSandbox() {', '      function GearingLab() {');
    expect(sb).toContain('footDown: velRef.current === 0');
    expect(sb).toContain('so a bike on its own would roll back down.');
    expect(src).toContain('if (o.footDown) {');
  });
});

describe('leftovers', () => {
  it('a hostile Bike Fit save falls back to the defaults instead of drawing NaN', () => {
    const v = view('BikeFit', 'BrakingPhysics');
    const fitNum = new Function(v.slice(v.indexOf('var fitNum = '), v.indexOf('var heightState')) + '\nreturn fitNum;')();
    expect(fitNum('abc', 105, 210, 170)).toBe(170); expect(fitNum(400, 45, 100, 78)).toBe(78); expect(fitNum({}, 45, 100, 78)).toBe(78);
    expect(fitNum('150', 105, 210, 170)).toBe(150);
    expect(v).toContain('useState(fitNum(d.fitHeightCm, 105, 210, 170))');
  });
  it('Gearing Lab reads reduced motion when it opens, and pauses when it is switched on', () => {
    const g = view('GearingLab', 'RepairSim');
    expect(g).not.toContain('useState(!_prefersReducedMotion)');
    expect(g).toContain("mq.addEventListener('change', onChange)");
  });
  it('high contrast turns the light chips black and the dark inks yellow, and fullscreen keeps the drawing shape', () => {
    expect(src).toContain(".theme-contrast .bikelab-root :is(.bg-slate-200,");
    expect(src).toContain(".theme-contrast .bikelab-root :is(.text-indigo-700,");
    expect(src).toContain("':fullscreen .bikelab-fit-canvas{object-fit:contain;background:#0f172a}'");
    expect(src).toContain("'[data-allo-fullscreen-active] .bikelab-fit-canvas{object-fit:contain;background:#0f172a}'");
  });
});
