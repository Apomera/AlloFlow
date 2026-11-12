// Bike Lab: the gear control used to multiply the rider's POWER, so an easier gear always made the bike slower and the
// "low gears win on hills" lesson showed the opposite. A gear now changes cadence and how hard the legs must push.
// Also guarded: the shared stopping model, the predict-then-test answers, and the facts corrected on 2026-11-09.
// BIKELAB_SRC points the suite at another copy for the fail-first check.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(process.env.BIKELAB_SRC || 'stem_lab/stem_tool_bikelab.js', 'utf8').replace(/\r\n/g, '\n');
const model = () => {
  const a = src.indexOf('  var BIKES = ['), b = src.indexOf('  var TERRAINS = ['), c = src.indexOf('  var SURFACE_CRR_MULT'), e = src.indexOf('  // SECTION 3');
  if (a < 0 || b < 0 || c < 0 || e < 0) throw new Error('model anchors missing');
  return new Function(src.slice(a, b) + src.slice(b, c) + src.slice(c, src.lastIndexOf('\n', e)) +
    '\nreturn { BIKES, TERRAINS, G, bikeGearRange, gearRatioFor, cadenceRpmFor, cadenceEfficiency, gearForceLimit, motorAssistForce, pedalDriveForce, steadyClimbSpeed, brakingStop, BRAKE_CHALLENGES, brakeChallengeResult };')();
};
const bike = (M, id) => M.BIKES.find((x) => x.id === id);

describe('gear model', () => {
  it('uses each bike\'s real chainrings and cogs', () => {
    const M = model(), r = M.bikeGearRange(bike(M, 'hybrid'));
    expect(r.lo).toBeCloseTo(28 / 34, 5); expect(r.hi).toBeCloseTo(48 / 11, 5);
    expect(M.gearRatioFor(bike(M, 'hybrid'), 0.2)).toBeCloseTo(r.lo, 5);
    expect(M.gearRatioFor(bike(M, 'hybrid'), 1)).toBeCloseTo(r.hi, 5);
    expect(M.gearRatioFor(bike(M, 'hybrid'), 0.6)).toBeGreaterThan(r.lo); expect(M.gearRatioFor(bike(M, 'hybrid'), 0.6)).toBeLessThan(r.hi);
  });

  it('a harder gear means slower legs at the same speed', () => {
    const M = model(), b = bike(M, 'hybrid');
    expect(M.cadenceRpmFor(5, b.wheelR, 48 / 11)).toBeCloseTo(5 / (2 * Math.PI * 0.34 * (48 / 11)) * 60, 3);
    expect(M.cadenceRpmFor(5, b.wheelR, 48 / 11)).toBeLessThan(M.cadenceRpmFor(5, b.wheelR, 28 / 34));
  });

  it('low gears win on hills: on a 6% grade the easiest gear is fastest and the hardest stalls', () => {
    const M = model();
    for (const id of ['hybrid', 'road', 'mtb', 'cargo']) {
      const b = bike(M, id), r = M.bikeGearRange(b);
      const easy = M.steadyClimbSpeed(b, r.lo, 200, 0.06, 70), mid = M.steadyClimbSpeed(b, Math.sqrt(r.lo * r.hi), 200, 0.06, 70), hard = M.steadyClimbSpeed(b, r.hi, 200, 0.06, 70);
      expect(Math.max(easy, mid), id + ' an easier gear climbs').toBeGreaterThan(hard);
      expect(easy, id + ' the easiest gear keeps moving').toBeGreaterThan(2);
      expect(hard, id + ' hardest gear cannot be pushed up the hill').toBe(0);
      expect(easy * 2.237, id + ' climbs at a believable speed').toBeGreaterThan(4);
    }
  });

  it('on flat ground the easiest gear spins out, so a middle gear is faster', () => {
    const M = model(), b = bike(M, 'hybrid'), r = M.bikeGearRange(b);
    const easy = M.steadyClimbSpeed(b, r.lo, 150, 0, 70), mid = M.steadyClimbSpeed(b, M.gearRatioFor(b, 0.7), 150, 0, 70);
    expect(mid).toBeGreaterThan(easy * 1.4);
    expect(M.cadenceRpmFor(easy, b.wheelR, r.lo), 'legs are spinning very fast').toBeGreaterThan(115);
  });

  it('a gear never adds power: the push on the road times the speed stays within the rider\'s power', () => {
    const M = model();
    for (const b of M.BIKES) for (const g of [0.2, 0.5, 0.8, 1]) for (const v of [0.1, 1, 3, 6, 10, 15]) {
      const F = M.pedalDriveForce(b, M.gearRatioFor(b, g), v, 400, 70);
      expect(F).toBeGreaterThanOrEqual(0); expect(Number.isFinite(F)).toBe(true);
      const motor = M.motorAssistForce(b, v, Math.min(400, b.maxPower));
      if (v >= 0.5) expect((F - motor) * v, b.id + ' legs').toBeLessThanOrEqual(Math.min(400, b.maxPower) + 1e-6);
      expect(F - motor).toBeLessThanOrEqual(M.gearForceLimit(b, M.gearRatioFor(b, g), 70) + 1e-9);
      expect(motor * v, b.id + ' motor').toBeLessThanOrEqual((b.assistW || 0) + 1e-6);
    }
    expect(M.cadenceEfficiency(85)).toBe(1); expect(M.cadenceEfficiency(20)).toBeLessThan(0.7); expect(M.cadenceEfficiency(160)).toBeLessThan(0.1);
  });

  it('no view multiplies power by the gear any more', () => {
    expect(src).not.toMatch(/Math\.min\(power, bike\.maxPower\) \* gear/);
    expect(src).not.toMatch(/bike\.maxPower\) \* useGear/);
    expect(src).not.toContain('gear * 0.7');
    expect(src.split('pedalDriveForce(bike, ').length - 1, 'Sandbox and Neighborhood Ride').toBeGreaterThanOrEqual(2);
  });
});

describe('terrain and bike data', () => {
  it('Rolling Hills really is gentle (5% at most) and starts on a flat crest', () => {
    const t = model().TERRAINS.find((x) => x.id === 'rollinghills');
    let max = 0; for (let x = 0; x < 600; x += 0.5) max = Math.max(max, Math.abs(t.profile(x + 0.5).y - t.profile(x).y) / 0.5);
    expect(max).toBeLessThanOrEqual(0.0501); expect(max).toBeGreaterThan(0.04);
    expect(t.profile(0).y).toBeCloseTo(0, 6);
    expect(t.desc).toContain('5%');
  });
  it('every bike frame has a believable weight (bike mass includes a 70 kg rider)', () => {
    for (const b of model().BIKES) { expect(b.mass - 70, b.id).toBeGreaterThanOrEqual(8); expect(b.mass - 70, b.id).toBeLessThanOrEqual(70); }
  });
});

describe('stopping model', () => {
  it('matches the physics: reaction distance + v²/(2a), and the time includes the reaction', () => {
    const s = model().brakingStop(20, 'dry', 'both', 1), v = 20 / 2.237;
    expect(s.reaction).toBeCloseTo(v * 1, 6);
    expect(s.braking).toBeCloseTo(v * v / (2 * s.achieved), 6);
    expect(s.total).toBeCloseTo(s.reaction + s.braking, 6);
    expect(s.time).toBeCloseTo(1 + v / s.achieved, 6);
    expect(s.total).toBeCloseTo(16.7, 1);
  });
  it('wet roads and rear-only braking take longer; unknown surfaces fall back to dry', () => {
    const M = model();
    expect(M.brakingStop(15, 'wet', 'both', 1).braking).toBeGreaterThan(M.brakingStop(15, 'dry', 'both', 1).braking);
    expect(M.brakingStop(15, 'dry', 'rear', 1).braking / M.brakingStop(15, 'dry', 'front', 1).braking).toBeGreaterThan(2);
    expect(M.brakingStop(15, 'lava', 'both', 1).total).toBe(M.brakingStop(15, 'dry', 'both', 1).total);
  });
  it('each challenge answer is the option nearest what the model measures', () => {
    const M = model(); const want = { 'double-speed': 4, 'wet-road': 1.3, distracted: 1.6 };
    expect(M.BRAKE_CHALLENGES.map((c) => c.id)).toEqual(Object.keys(want));
    for (const ch of M.BRAKE_CHALLENGES) {
      const r = M.brakeChallengeResult(ch);
      expect(r.answer, ch.id).toBe(want[ch.id]);
      expect(Math.abs(r.ratio - r.answer), ch.id + ' ratio ' + r.ratio.toFixed(2)).toBeLessThan(0.2);
      expect(ch.options.filter((o) => o[0] === r.answer)).toHaveLength(1);
    }
    expect(M.brakeChallengeResult(M.BRAKE_CHALLENGES[0]).ratio).toBeCloseTo(4, 5);
  });
  it('the view reads its numbers from the shared model and warns about going over the bars only for front-only braking', () => {
    expect(src).toContain("var stop = brakingStop(speedMph, SURFACES[surf] ? surf : 'dry', brakeSplit, reaction);");
    expect(src).toContain("var endoWarn = brakeSplit === 'front' && frictionA > endoA;");
    expect(src).toContain("sub: 't = t_react + v / a'");
  });
});

describe('corrected facts and fair scoring', () => {
  it('wheel truing: tighten the side you want the rim to move towards', () => {
    expect(src).toContain('If the rim wobbles to the right, move it LEFT: TIGHTEN the left-side spokes');
    expect(src).not.toContain('LOOSEN left-flange spokes OR TIGHTEN right-flange spokes');
  });
  it('derailleur: both limit screws are set before the full shift test', () => {
    const job = src.slice(src.indexOf("id: 'smallest_cog'"), src.indexOf("id: 'test_all_gears'") + 40);
    expect(job.indexOf("id: 'limit_l'")).toBeGreaterThan(job.indexOf("id: 'limit_h'"));
    expect(job.indexOf("id: 'limit_l'")).toBeLessThan(job.indexOf("id: 'tension_cable'"));
    expect(src.split("id: 'limit_l'").length - 1).toBe(1);
  });
  it('Maine night-light law: §2084, white front and red or amber rear, 200 feet', () => {
    expect(src).not.toContain('§2065'); expect(src).not.toMatch(/500 f(ee)?t/);
    expect(src).toContain('Title 29-A §2084'); expect(src).toContain('seen from 200 feet');
  });
  it('the right-turn question has one right answer; the roundabout item is gone; no unsourced statistics', () => {
    const q = src.slice(src.indexOf("q: 'You want to turn RIGHT."), src.indexOf("q: 'You\\'re slowing or stopping."));
    expect(q).not.toContain("svg: 'right_straight'");
    expect(q.split('correct: true').length - 1).toBe(1);
    expect(src).not.toContain('roundabout');
    expect(src).not.toContain('60-80% of cyclist head injuries'); expect(src).not.toContain('-10°F can be safer');
    expect(src).toContain('If you are not sure, ask an adult.');
  });
  it('repair jobs cannot be completed or paid by skipping, and a fast double click cannot pay twice', () => {
    expect(src).toContain('if (skippedRef.current) {');
    expect(src).toContain("if (firstTime && ctx.awardXP) ctx.awardXP('bikeLab', 5, job.name + ' repair');");
    expect(src).toContain('if (advancingRef.current) return;');
    expect(src).not.toContain("'tire-lever': '🗡️'");
  });
  it('ride best times need a clean ride with a full stop; drill bests need 8 of 10 correct', () => {
    expect(src).toContain('s.stopSignMinV <= 0.3');
    expect(src).toContain("if (cleanRide && (!bestT || timeRef.current < bestT)) upd('rideBestTime', timeRef.current);");
    expect(src).toContain('if (!untimed && correctOnly.length >= 8) {');
  });
  it('menu counts match the content', () => {
    expect((src.match(/\n\s+q: '/g) || []).length, 'quiz questions').toBe(13);
    expect(src).toContain("'13-question road safety quiz'"); expect(src).toContain("'20 parts on a clickable bike'");
  });
  it('Braking and Neighborhood Ride canvases scale to their frame', () => {
    expect(src).toContain(".bikelab-fit-canvas{width:100%!important;height:auto!important;display:block}");
    expect(src.split("className: 'bikelab-fit-canvas w-full block'").length - 1).toBe(2);
  });
});

describe('repair jobs ask for decisions, and the signal drill shows arm signals', () => {
  it('the step screen no longer shows which tool to use', () => {
    expect(src).not.toContain("}, 'Use:'),");
    expect(src).toContain("'data-bikelab-repair-feedback': 'true'");
    expect(src).not.toContain("h('div', { className: 'text-5xl mb-2 opacity-40' }, TOOL_ICONS[currStep.tool]");
  });
  it('every tool has a plain explanation, shown when it is the wrong pick', () => {
    const M = new Function(src.slice(src.indexOf('  var TOOL_PURPOSE = {'), src.indexOf('  // SECTION 4')) .replace(/\n\s*\/\/ ─+\s*$/, '') + '\nreturn { TOOL_PURPOSE, TOOL_ICONS, JOB_CHECKS };')();
    expect(Object.keys(M.TOOL_PURPOSE).sort()).toEqual(Object.keys(M.TOOL_ICONS).sort());
    expect(src).toContain("setWrongNote('Not that one. ' + (TOOL_PURPOSE[toolId] || '')");
    // one why-question per job, three answers each, the first is the right one in the data and the view rotates them
    const jobIds = [...src.slice(src.indexOf('var REPAIR_JOBS = ['), src.indexOf('var TOOL_PURPOSE')).matchAll(/\n    \{\r?\n      id: '([a-z_]+)'/g)].map((m) => m[1]);
    expect(jobIds).toHaveLength(7);
    for (const id of jobIds) { expect(M.JOB_CHECKS[id], id).toBeTruthy(); expect(M.JOB_CHECKS[id].options).toHaveLength(3); expect(M.JOB_CHECKS[id].why.length).toBeGreaterThan(20); }
    expect(M.JOB_CHECKS.pedal_change.options[0]).toContain('Counter-clockwise');
    expect(M.JOB_CHECKS.wheel_true.options[0]).toContain('LEFT side');
    const rotations = new Set(jobIds.map((id) => id.length % 3));
    expect(rotations.size, 'the right answer is not always in the same place').toBeGreaterThan(1);
    expect(src).toContain('} else if (JOB_CHECKS[job.id] && !checkOpen) {');
  });
  it('the drill offers four arm poses; both legal right-turn signals count; the reference hides during play', () => {
    const P = new Function(src.slice(src.indexOf('      var ARM_POSES = {'), src.indexOf('      function armPoseSvg(')) + '\nreturn ARM_POSES;')();
    expect(Object.keys(P).sort()).toEqual(['left_down', 'left_straight', 'left_up', 'right_straight']);
    expect([P.left_straight.means, P.left_up.means, P.right_straight.means, P.left_down.means]).toEqual(['left', 'right', 'right', 'stop']);
    for (const p of Object.values(P)) expect(p.name).not.toMatch(/turn|stop|slow/i);   // the label describes the pose, not the answer
    expect(src).toContain("var correct = ARM_POSES[pose].means === current.answer;");
    expect(src).not.toContain("signalButton('Left',  'left',");
    expect(src).toContain("gameMode !== 'playing' && h('div', { 'data-bikelab-signal-reference': 'true'");
    expect(src).toContain('if (!untimed && correctOnly.length >= 8) {');
  });
});

describe('simulation visuals', () => {
  it('all three simulation canvases scale to their frame', () => {
    expect(src.split("className: 'bikelab-fit-canvas w-full block").length - 1).toBe(3);
  });
  it('scenes share one drawn bike, backdrop and stop sign, and the Sandbox keeps its own sky', () => {
    for (const fn of ['function drawBikeFigure(c, x, y, o)', 'function drawSkyBackdrop(c, W, horizonY, shift, mood)', 'function drawStopSign(c, x, groundY, size)']) expect(src).toContain(fn);
    const sandbox = src.slice(src.indexOf('function PhysicsSandbox()'), src.indexOf('function GearingLab()'));
    expect(sandbox).not.toContain('terrainAt('); expect(sandbox).not.toContain('drawSkyBackdrop(');
    const ride = src.slice(src.indexOf('function NeighborhoodRide()'), src.indexOf('function PartsInspector()'));
    expect(ride).toContain('drawSkyBackdrop(ctx2d, W, H * 0.78'); expect(ride).toContain('drawBikeFigure(ctx2d, 0, 0,'); expect(ride).toContain('drawStopSign(ctx2d, signX + 14');
    const braking = src.slice(src.indexOf('function BrakingPhysics()'), src.indexOf('function SafetyQuiz()'));
    expect(braking.split('drawBikeFigure(ctx2d, ').length - 1).toBe(3);
  });
  it('the energy graph covers negative height energy and tells its lines apart by dash as well as color', () => {
    const g = src.slice(src.indexOf('var drawEnergyGraph = function'), src.indexOf('// Draw on HUD tick even when paused'));
    expect(g).toContain('minE = Math.min(minE, pt.pe, pt.total)');
    expect(g).toContain("['pe', '#fbbf24', [7, 4], 'Height (PE)']");
    expect(g).toContain('ctx2d.clip();');
  });
  it('drawing helpers run without a browser canvas', () => {
    const calls = []; const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : (...a) => { calls.push(k); }), set: (t, k, v) => { t[k] = v; return true; } });
    const D = new Function(src.slice(src.indexOf('  function drawBikeFigure('), src.indexOf('  // ── Gear model, shared by the Sandbox,')) + '\nreturn { drawBikeFigure, drawSkyBackdrop, drawStopSign };')();
    D.drawBikeFigure(ctx, 10, 10, { scale: 1.2, braking: true, pedal: 1 }); D.drawBikeFigure(ctx, 10, 10);
    for (const mood of ['clear', 'rain', 'cold']) D.drawSkyBackdrop(ctx, 1000, 180, 400, mood);
    D.drawStopSign(ctx, 50, 100, 15);
    expect(calls.filter((k) => k === 'save').length).toBe(calls.filter((k) => k === 'restore').length);
    expect(calls).toContain('arc'); expect(calls).toContain('fillText');
  });
});

describe('e-bike motor, mastery, focus and parts hotspots', () => {
  it('only the e-bike has a motor: it helps while pedaling, up to 250 W, and cuts out at 20 mph', () => {
    const M = model(), e = bike(M, 'ebike'), h = bike(M, 'hybrid');
    expect(e.assistW).toBe(250); expect(M.BIKES.filter((b) => b.assistW).map((b) => b.id)).toEqual(['ebike']);
    expect(M.motorAssistForce(e, 5, 150) * 5).toBeCloseTo(150, 6);       // matches the rider
    expect(M.motorAssistForce(e, 5, 400) * 5).toBeCloseTo(250, 6);       // capped
    expect(M.motorAssistForce(e, 5, 0)).toBe(0);                          // no pedaling, no help
    expect(M.motorAssistForce(e, 9, 150)).toBe(0);                        // above 20 mph
    expect(M.motorAssistForce(h, 5, 150)).toBe(0);
    const r = M.bikeGearRange(e);
    expect(M.steadyClimbSpeed(e, r.lo, 150, 0.06, 70), 'heavier, but climbs faster than the hybrid').toBeGreaterThan(M.steadyClimbSpeed(h, M.bikeGearRange(h).lo, 150, 0.06, 70));
  });
  it('mastery is earned from saved results, never from opening a card', () => {
    const menu = src.slice(src.indexOf('function MainMenu()'), src.indexOf('function BackBar(props)'));
    for (const k of ['repair', 'braking', 'ride', 'signalDrill', 'safety', 'helmetFit', 'winterBike']) expect(menu, k).toMatch(new RegExp('\\n\\s+' + k + ': '));
    expect(menu).not.toContain('full mastery path complete');
    expect(menu).toContain("'To master: ' + MASTERY_GOAL[c.id]");
    expect(src).toContain("upd('safetyBest', correctCount)"); expect(src).toContain("upd('helmetFitDone', true)"); expect(src).toContain("upd('winterBest', nextScore)");
    const mastery = menu.slice(menu.indexOf('var mastered = {'), menu.indexOf('var MASTERY_GOAL'));
    expect(mastery).not.toContain('bikeBadges'); expect(mastery).not.toContain('badges[');
  });
  it('focus moves to the view title, and back to the card on return; every view sits in one root', () => {
    expect(src).toContain("tabIndex: -1, 'data-bikelab-view-title': 'true' }, props.title)");
    expect(src).toContain("document.querySelector('[data-bikelab-card=\"' + cameFrom + '\"]')");
    expect(src).not.toContain("return h(stableType('");
    expect(src.split("return bikeRoot(h(stableType('").length - 1).toBe(11);
    expect(src).toContain('.bikelab-root button,.bikelab-root [role=button],.bikelab-root select{min-height:44px}');
    expect(src).not.toMatch(/text-\[0\.(5|6)\d*rem\]/);
  });
  it('small parts are clickable on top of big ones, and diagonal tubes have matching hotspots', () => {
    const a = src.indexOf('        var PART_SHAPES = {'), b = src.indexOf('        // hit = a transparent click target');
    const P = new Function(src.slice(a, b) + '\nreturn { PART_SHAPES, partArea };')();
    const area = (id, rect) => P.partArea(Object.assign({ id }, rect || { hw: 0, hh: 0 }));
    expect(area('hub')).toBeLessThan(area('rim')); expect(area('rim')).toBeLessThan(area('tire'));
    expect(area('cassette')).toBeLessThan(area('spokes'));
    expect(area('saddle', { hw: 46, hh: 14 })).toBe(644);                 // unlisted parts keep their rectangle
    for (const id of ['down_tube', 'seatstay', 'chainstay', 'chain']) expect(P.PART_SHAPES[id].poly.split(' ')).toHaveLength(4);
    expect(src).toContain('BIKE_PARTS.slice().sort(function(a, b) { return partArea(b) - partArea(a); })');
  });
});

describe('quiz answer positions and the parts illustration', () => {
  it('across the quiz the right answer appears in every position, including the last', () => {
    const quiz = src.slice(src.indexOf('function SafetyQuiz()'), src.indexOf('function NeighborhoodRide()'));
    const order = new Function(quiz.slice(quiz.indexOf('var quizOrder = function'), quiz.indexOf('var hasAnswered')) + '\nreturn quizOrder;')();
    const questions = quiz.split(/\n\s+q: '/).slice(1).map((block) => [...block.slice(0, block.indexOf('explain:')).matchAll(/\{ id: '([a-d])'[^\n]*\}/g)].map((m) => ({ id: m[1], correct: /correct: true/.test(m[0]) })));
    expect(questions).toHaveLength(13);
    const shown = questions.map((choices, i) => order(choices, i));
    shown.forEach((list, i) => { expect(list.map((c) => c.id).sort().join(''), 'same choices, q' + i).toBe(questions[i].map((c) => c.id).sort().join('')); expect(list.filter((c) => c.correct)).toHaveLength(1); });
    const positions = shown.map((list) => list.findIndex((c) => c.correct));
    expect(new Set(positions).size).toBe(4);
    expect(shown.filter((list, i) => positions[i] === list.length - 1).length, 'sometimes last').toBeGreaterThanOrEqual(2);
    expect(Math.max(...[0, 1, 2, 3].map((p) => positions.filter((x) => x === p).length)), 'no position dominates').toBeLessThanOrEqual(4);
    expect(quiz).toContain('quizOrder(q.choices, idx).map(function(c) {');
  });
  it('every part on the diagram has a hotspot of its own, and the drawing shows each one', () => {
    const view = src.slice(src.indexOf('function PartsInspector()'), src.indexOf('function HelmetFit()'));
    const ids = [...view.matchAll(/\{ id: '([a-z_0-9-]+)',\s*name:\s/g)].map((m) => m[1]);
    expect(ids).toHaveLength(20);
    const shapes = new Function(view.slice(view.indexOf('var PART_SHAPES = {'), view.indexOf('var partArea = ')) + '\nreturn PART_SHAPES;')();
    for (const id of Object.keys(shapes)) expect(ids, id + ' is a real part').toContain(id);
    for (const id of ['brake_lever', 'shifter', 'stem', 'handlebar', 'caliper', 'hub', 'cassette', 'chain', 'chainstay', 'seatstay', 'down_tube']) expect(shapes[id], id).toBeTruthy();
    // no two rectangle hotspots in the cockpit share a center
    const center = (r) => [r[0] + r[2] / 2, r[1] + r[3] / 2].join(',');
    expect(new Set([shapes.handlebar.rect, shapes.stem.rect, shapes.shifter.rect].map(center)).size).toBe(3);
    expect(view).toContain("d: 'M 277 63 Q 300 52 327 60");     // saddle
    expect(view).toContain("[120, 425].map(function(wx) {");     // two drawn wheels
    expect(view).not.toContain("h('circle', { cx: 120, cy: 250, r: 42, fill: 'none', stroke: '#1e293b', strokeWidth: 3 })");
  });
});

// The helmet drawing used to move the wrong way: its "good fit" state drew the helmet perched on top of the skull and its
// "too high" state drew it down at the eyebrows. The drawing and the checks now share one set of values.
describe('helmet fit and the quiz ending', () => {
  const helmet = src.slice(src.indexOf('function helmetChecks(v)'), src.indexOf('function HelmetFit()'));
  const H = () => new Function('h', helmet + '\nreturn { helmetChecks, helmetSideSvg, HELMET_PROBLEMS, HELMET_CASES, HELMET_SPOT_PASS };')((tag, props, ...kids) => ({ tag, props: props || {}, kids: kids.flat(Infinity).filter(Boolean) }));
  const find = (node, pred, out = []) => { if (node && node.tag) { if (pred(node)) out.push(node); node.kids.forEach((k) => find(k, pred, out)); } return out; };
  // The lowest point of the helmet's front edge on screen (a larger y is lower down).
  const frontEdgeY = (v) => {
    const g = find(H().helmetSideSvg(v), (n) => n.tag === 'g' && /rotate/.test(n.props.transform || ''))[0];
    const m = /translate\(0 ([-\d.]+)\) rotate\(([-\d.]+) (\d+) (\d+)\).*scale\(([\d.]+)\)/.exec(g.props.transform);
    const drop = +m[1], rad = +m[2] * Math.PI / 180, cx = +m[3], cy = +m[4], sc = +m[5];
    const dx = (176 - cx) * sc, dy = (102 - cy) * sc;
    return cy + dx * Math.sin(rad) + dy * Math.cos(rad) + drop;
  };
  const EYEBROW_Y = 117, EYE_Y = 128;
  it('a level helmet sits just above the eyebrows; tipped back it rises, pulled down it reaches the eyes', () => {
    const level = frontEdgeY({ tilt: 0, strap: 0, chin: 0.5, snug: 0.5 });
    expect(EYEBROW_Y - level).toBeGreaterThan(8); expect(EYEBROW_Y - level).toBeLessThan(22);
    expect(frontEdgeY({ tilt: 1, strap: 0, chin: 0.5, snug: 0.5 })).toBeLessThan(level - 20);   // forehead bare
    expect(frontEdgeY({ tilt: -1, strap: 0, chin: 0.5, snug: 0.5 })).toBeGreaterThan(EYE_Y - 4); // over the eyes
  });
  it('only the middle of each control passes', () => {
    const c = H().helmetChecks;
    expect(c({ tilt: 0, strap: 0, chin: 0.5, snug: 0.5 })).toEqual({ tilt: true, strap: true, chin: true, snug: true });
    expect(c({ tilt: 0.7, strap: -0.7, chin: 0.9, snug: 0.1 })).toEqual({ tilt: false, strap: false, chin: false, snug: false });
    expect(c({ tilt: -0.7, strap: 0.7, chin: 0.1, snug: 0.9 })).toEqual({ tilt: false, strap: false, chin: false, snug: false });
  });
  it('each rider to check has exactly the fault its answer names, and the drawing does not color it in', () => {
    const { HELMET_CASES, HELMET_PROBLEMS, helmetChecks, helmetSideSvg, HELMET_SPOT_PASS } = H();
    const failing = { tilt_back: 'tilt', tilt_low: 'tilt', strap: 'strap', chin: 'chin', loose: 'snug' };
    expect(HELMET_CASES.map((c) => c.answer).sort()).toEqual(HELMET_PROBLEMS.map((p) => p.id).sort());
    for (const c of HELMET_CASES) {
      const bad = Object.entries(helmetChecks(c.v)).filter(([, ok]) => !ok).map(([k]) => k);
      expect(bad, c.id).toEqual(c.answer === 'ok' ? [] : [failing[c.answer]]);
      if (c.answer === 'tilt_back') expect(c.v.tilt).toBeGreaterThan(0);
      if (c.answer === 'tilt_low') expect(c.v.tilt).toBeLessThan(0);
      const drawn = JSON.stringify(helmetSideSvg(c.v, { plain: true }));
      expect(drawn, c.id).not.toContain('#dc2626'); expect(drawn, c.id).not.toContain('#f59e0b'); expect(drawn, c.id).not.toContain('2 fingers');
    }
    expect(HELMET_SPOT_PASS).toBe(5);
    expect(src).toContain("helmetFit: !!d.helmetFitDone && (+d.helmetSpotBest || 0) >= 5,");
  });
  it('the quiz ends with a results screen that lists missed questions and offers another go', () => {
    const quiz = src.slice(src.indexOf('function SafetyQuiz()'), src.indexOf('function NeighborhoodRide()'));
    expect(quiz).toContain("'data-quiz-results': 'true'"); expect(quiz).toContain('onClick: restartQuiz');
    expect(quiz).toContain('var SAFETY_PASS = 10;'); expect(src).toContain('safety: (+d.safetyBest || 0) >= 10,');
    expect(quiz).not.toContain('Left arm straight down');
    expect(quiz).toContain('armPoseSvg(kind)');
    expect(src).toContain("kind === 'left_straight' || kind === 'both_out' ? '32,34 6,34'");
  });
});

// The Gearing Lab had no picture of a chainring or a cog, and Bike Fit drew a frame with no rider that ignored reach.
describe('gearing picture and the bike fit rider', () => {
  const fitSrc = src.slice(src.indexOf('function bikeFitModel('), src.indexOf('function BikeFit()'));
  const fit = () => new Function(fitSrc + '\nreturn { bikeFitModel, fitJoint };')();
  it('the suggested saddle height gives the same slight knee bend for a child and a tall adult', () => {
    const { bikeFitModel } = fit();
    for (const [hgt, inseam] of [[112, 48], [140, 62], [170, 78], [205, 98]]) {
      const m = bikeFitModel(hgt, inseam, 'road', 'medium', 0);
      expect(m.saddleHeight).toBeCloseTo(inseam * 0.883, 6);
      expect(m.verdict, hgt + ' cm').toBe('ok'); expect(m.kneeBend).toBeGreaterThan(20); expect(m.kneeBend).toBeLessThan(30);
    }
  });
  it('lowering the saddle bends the knee more, raising it straightens the leg until the foot cannot reach', () => {
    const { bikeFitModel } = fit();
    const at = (o) => bikeFitModel(170, 78, 'hybrid', 'medium', o);
    const bends = [-8, -6, -4, -2, 0, 2, 4].map((o) => at(o).kneeBend);
    for (let i = 1; i < bends.length; i++) expect(bends[i], 'offset step ' + i).toBeLessThan(bends[i - 1]);
    expect(at(-8).verdict).toBe('low'); expect(at(-1).verdict).toBe('ok'); expect(at(1).verdict).toBe('ok');
    expect(at(4).verdict).toBe('high'); expect(at(8).verdict).toBe('unreachable');
    expect(at(0).bar).toEqual(at(6).bar);                       // moving the saddle does not move the handlebar
  });
  it('suggests a wheel size by height and a standover limit from inseam', () => {
    const { bikeFitModel } = fit();
    expect(bikeFitModel(110, 48, 'hybrid', 'low', 0).size.label).toContain('16-inch');
    expect(bikeFitModel(125, 55, 'hybrid', 'low', 0).size.label).toContain('20-inch');
    expect(bikeFitModel(140, 64, 'hybrid', 'low', 0).size.label).toContain('24-inch');
    expect(bikeFitModel(150, 70, 'hybrid', 'low', 0).size.label).toContain('26-inch');
    expect(bikeFitModel(175, 80, 'hybrid', 'low', 0).size.label).toContain('Adult');
    expect(bikeFitModel(170, 78, 'road', 'low', 0).standover).toBe(75); expect(bikeFitModel(170, 78, 'mtb', 'low', 0).standover).toBe(73);
    expect(src).toContain("id: 'bikelab-fit-height', type: 'range', min: 105"); expect(src).toContain("id: 'bikelab-fit-inseam', type: 'range', min: 45");
  });
  it('the knee joint sits one leg link from both the hip and the ankle', () => {
    const { bikeFitModel, fitJoint } = fit();
    const m = bikeFitModel(170, 78, 'road', 'medium', -4), k = fitJoint(m.hip, m.ankle, m.link, true);
    expect(Math.hypot(k.x - m.hip.x, k.y - m.hip.y)).toBeCloseTo(m.link, 6); expect(Math.hypot(k.x - m.ankle.x, k.y - m.ankle.y)).toBeCloseTo(m.link, 6);
    expect(k.x).toBeGreaterThan((m.hip.x + m.ankle.x) / 2);     // the knee bends forward
  });
  it('the drivetrain turns the wheel by the gear ratio, can be paused, and starts paused for reduced motion', () => {
    const lab = src.slice(src.indexOf('function GearingLab()'), src.indexOf('function RepairSim()'));
    expect(lab).toContain('spinRef.current.crank += turn; spinRef.current.wheel += turn * L.ratio;');
    expect(lab).toContain('var playState = useState(!_prefersReducedMotion);');
    expect(lab).toContain("'data-gear-play': playing ? 'playing' : 'paused'");
    expect(lab).toContain('useEffect(function() { spinRef.current = { crank: 0, wheel: 0 }; paintDrivetrain(); }, [bikeId, ringIdx, cogIdx]);');
    expect(lab).toContain('var tirePush = 100 * CRANK_M / (ratio * bike.wheelR);');
    expect(lab).not.toContain('Mech. Advantage');
  });
});

// The Parts Inspector has an optional 3D model. Its shape is plain data, so it is checked here without a 3D engine.
describe('3D parts model', () => {
  const spec = () => new Function(src.slice(src.indexOf('  function bikeModelSpec() {'), src.indexOf('  // Turn the spec into meshes.')) + '\nreturn bikeModelSpec();')();
  const view = src.slice(src.indexOf('function PartsInspector()'), src.indexOf('function helmetChecks(v)'));
  const partIds = [...view.matchAll(/\{ id: '([a-z_0-9-]+)',\s*name:\s/g)].map((m) => m[1]);
  it('every one of the 20 parts has at least one piece in the model, and no piece names an unknown part', () => {
    const pieces = spec();
    expect(partIds).toHaveLength(20);
    for (const id of partIds) expect(pieces.filter((p) => p.part === id).length, id).toBeGreaterThanOrEqual(1);
    for (const p of pieces) if (p.part) expect(partIds, p.part).toContain(p.part);
    for (const p of pieces) for (const n of [].concat(p.a || [], p.b || [], p.c || [], p.ex, p.size || [], p.scale || [], [p.r || 0, p.R || 0, p.len || 0])) expect(Number.isFinite(n), p.part + ' ' + p.kind).toBe(true);
  });
  it('the chain, chainring, cassette and derailleur sit on the rider\'s right, and both tires rest on the ground', () => {
    const pieces = spec();
    for (const id of ['chain', 'chainring', 'cassette', 'rd', 'shifter']) for (const p of pieces.filter((x) => x.part === id)) expect((p.c || p.a)[2], id).toBeGreaterThan(0);
    const tires = pieces.filter((p) => p.part === 'tire');
    expect(tires).toHaveLength(2);
    for (const ty of tires) { expect(ty.c[1] - ty.R - ty.r).toBeGreaterThan(-0.05); expect(ty.c[1] - ty.R - ty.r).toBeLessThan(0.05); }
    expect(Math.max(...tires.map((ty) => ty.c[0]))).toBeGreaterThan(0);          // the front wheel is forward (+x)
    const bars = pieces.filter((p) => p.part === 'handlebar'), saddle = pieces.find((p) => p.part === 'saddle');
    expect(bars[0].a[0]).toBeGreaterThan(saddle.c[0]);                             // handlebar ahead of the saddle
  });
  it('3D is optional: the diagram is the default, the model is disposed on leaving, and a failed start says so', () => {
    expect(view).toContain('var view3dState = useState(false)');
    expect(view).toContain("window.StemLab.ensureThree({ orbit: false })");
    expect(view).toContain('renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {}');
    expect(view).toContain("try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { setThreeStatus('error'); return; }");
    expect(view).toContain('The 3D model could not start on this device. The diagram shows the same parts.');
    expect(view).toContain("camBtn('◀ Turn', 'Turn the bike left'");                // every camera move has a button, so no dragging is required
    expect(view).not.toContain("addEventListener('wheel'");                         // scrolling the page is never captured
  });
  it('the 2D diagram is mirrored so the bike faces right with the chain on its right-hand side', () => {
    expect(view).toContain("h('g', { transform: 'matrix(-1 0 0 1 500 0)' },");
  });
});

// The Gearing Lab had nothing to solve, and its hill was fixed at 6% with a 200 W adult rider.
describe('pick-the-gear challenges', () => {
  const G2 = () => {
    const a = src.indexOf('  var BIKES = ['), e = src.indexOf('  // SECTION 3');
    return new Function(src.slice(a, src.lastIndexOf('\n', e)) + '\nreturn { BIKES, GEAR_CHALLENGES, gearChallengeResult, steadyClimbSpeed, pedalDriveForce, gearForceLimit, bikeGearRange };')();
  };
  it('the answer to each challenge is the gear the climb model makes fastest, by a clear margin', () => {
    const M = G2();
    expect(M.GEAR_CHALLENGES).toHaveLength(4);
    const answers = {};
    for (const ch of M.GEAR_CHALLENGES) {
      const r = M.gearChallengeResult(ch);
      expect(r.gears.map((g) => g.key)).toEqual(['easy', 'middle', 'hard']);
      expect(r.gears[0].ratio).toBeLessThan(r.gears[1].ratio); expect(r.gears[1].ratio).toBeLessThan(r.gears[2].ratio);
      const best = r.gears.slice().sort((x, y) => y.v - x.v)[0];
      expect(r.answer, ch.id).toBe(best.key); expect(best.v).toBeGreaterThan(0);
      expect(r.margin, ch.id + ' margin').toBeGreaterThan(1.08);
      answers[ch.id] = r.answer;
    }
    expect(answers).toEqual({ 'steep-hill': 'easy', 'flat-road': 'middle', 'gentle-rise': 'easy', downhill: 'hard' });
  });
  it('a gentle rider can get moving on a hill in an easy gear (starting off is limited by push, not power)', () => {
    const M = G2(), hybrid = M.BIKES.find((b) => b.id === 'hybrid'), mtb = M.BIKES.find((b) => b.id === 'mtb');
    const lo = M.bikeGearRange(hybrid).lo;
    expect(M.pedalDriveForce(hybrid, lo, 0, 100, 70)).toBeCloseTo(M.gearForceLimit(hybrid, lo, 70), 6);     // from a standstill the legs push at their limit
    expect(M.steadyClimbSpeed(hybrid, lo, 100, 0.08, 70) * 2.237).toBeGreaterThan(2);                        // was 0: could never start
    expect(M.steadyClimbSpeed(mtb, M.bikeGearRange(mtb).lo, 100, 0.06, 70)).toBeGreaterThan(0);
    expect(M.steadyClimbSpeed(hybrid, M.bikeGearRange(hybrid).hi, 100, 0.08, 70)).toBe(0);                   // the hardest gear still stalls
  });
  it('the hill simulator lets the student choose the hill and the rider, and solving the challenges is the mastery goal', () => {
    const lab = src.slice(src.indexOf('function GearingLab()'), src.indexOf('function RepairSim()'));
    expect(lab).toContain('return steadyClimbSpeed(bike, gearRatio, riderW, hill, 70);');
    expect(lab).toContain("opts: [[-0.03, 'Downhill 3%'], [0, 'Flat'], [0.03, 'Gentle 3%'], [0.06, 'Steep 6%'], [0.1, 'Very steep 10%']]");
    expect(lab).toContain("opts: [[75, 'Easy pace · 75 W'], [120, 'Steady · 120 W'], [200, 'Strong · 200 W']]");
    expect(lab).not.toContain('6% grade, 200 W rider');
    expect(lab).toContain("upd('gearChallenges', nextSolved)");
    expect(src).toContain('gearing: solvedIn(d.gearChallenges) >= GEAR_CHALLENGES.length,');
    // The speed-vs-cadence bars are sized in pixels: a percentage height in a column with no height drew nothing.
    expect(lab).toContain("style: { height: Math.max(4, Math.round(pct * 84)) + 'px' } },");
  });
});

// The Winter page was adult-commuter reading whose "mastery" was ticking twelve boxes. It now asks for decisions,
// and its stopping numbers come from the same model as the Braking lab.
describe('winter page', () => {
  const view = src.slice(src.indexOf('var WINTER_CHOICES = ['), src.indexOf('// SIGNAL REACTION DRILL'));
  const W = () => new Function(view.slice(0, view.indexOf('function WinterBike()')) + '\nreturn { WINTER_CHOICES, WINTER_CASES, WINTER_PASS, MAINE_SUNSETS };')();
  it('six situations, two for each choice, and the same choice never comes twice in a row', () => {
    const { WINTER_CASES, WINTER_CHOICES, WINTER_PASS } = W();
    expect(WINTER_CASES).toHaveLength(6); expect(WINTER_PASS).toBe(5);
    for (const c of WINTER_CHOICES) expect(WINTER_CASES.filter((x) => x.answer === c.id), c.id).toHaveLength(2);
    WINTER_CASES.forEach((c, i) => { if (i) expect(c.answer, c.id).not.toBe(WINTER_CASES[i - 1].answer); expect(c.why.length).toBeGreaterThan(40); });
    expect(src).toContain('winterBike: (+d.winterBest || 0) >= 5'); expect(view).not.toContain('winterAllChecked');
  });
  it('stopping distances come from brakingStop, and ice needs several times the braking distance of a dry road', () => {
    expect(view).toContain("var r = brakingStop(stopMph, sf[0], 'both', 1);");
    const M = model(), dry = M.brakingStop(10, 'dry', 'both', 1), wet = M.brakingStop(10, 'wet', 'both', 1), ice = M.brakingStop(10, 'ice', 'both', 1);
    expect(wet.total).toBeGreaterThan(dry.total); expect(ice.total).toBeGreaterThan(wet.total * 2);
    expect(ice.braking / dry.braking).toBeGreaterThan(4);
  });
  it('sunset is earliest in December, and the table gives the daylight left after 3 pm', () => {
    const { MAINE_SUNSETS } = W();
    const dec = MAINE_SUNSETS.find((m) => m.month === 'December');
    for (const m of MAINE_SUNSETS) { expect(m.hour).toBeGreaterThanOrEqual(dec.hour); expect(m.hour).toBeGreaterThan(15.9); expect(m.hour).toBeLessThan(19); }
    for (const m of MAINE_SUNSETS) { const [hh, mm] = m.label.replace(' pm', '').split(':').map(Number); expect(hh + 12 + mm / 60, m.month).toBeCloseTo(m.hour, 1); }
  });
  it('drops the unsourced figures and the swapped ice definitions', () => {
    for (const gone of ['3x sooner', '3-5x faster', 'lasts a week instead of a season', 'Glare ice', '🇺🇸', 'Norway and Minnesota']) expect(view, gone).not.toContain(gone);
    expect(view).toContain('Black ice '); expect(view).toContain('The road just looks wet.');
  });
});

// Eleven cards with no suggested order, and nothing for a teacher. Also: the cruiser's hardest gear was nearly as tall as the road bike's.
describe('class order and teacher notes', () => {
  const menu = src.slice(src.indexOf('function MainMenu()'), src.indexOf('function BackBar('));
  it('the suggested order uses every activity exactly once, starting with safety', () => {
    const path = new Function(menu.slice(menu.indexOf('var CLASS_PATH = ['), menu.indexOf('var SCIENCE_LINKS')) + '\nreturn CLASS_PATH;')();
    const ids = path.flatMap((p) => p.ids);
    const badgeIds = new Function('return ' + /var BADGE_IDS = (\[[^\]]+\]);/.exec(src)[1])();
    expect(ids.slice().sort()).toEqual(badgeIds.slice().sort());
    expect(path[0].ids).toContain('helmetFit');
    for (const p of path) { expect(p.teach.length).toBeGreaterThan(40); expect(p.ask.trim().endsWith('?')).toBe(true); }
  });
  it('every step is a button that opens its activity, and teacher notes sit in a closed-by-default section', () => {
    expect(menu).toContain("'data-bikelab-path-step': id,"); expect(menu).toContain('onClick: function() { goto(id); },');
    expect(menu).toContain("h('details', { 'data-bikelab-teacher-notes': 'true'");
    for (const code of ['3-PS2-1', '4-PS3-1', 'MS-PS2-2', 'MS-PS3-1', 'MS-PS3-5']) expect(menu, code).toContain("['" + code + "', ");
  });
  it('menu cards no longer describe removed features', () => {
    for (const gone of ['mechanical advantage', 'KOPS setback', 'SVG-illustrated quiz', 'SVG bike diagram', 'Side-view 2D canvas', 'winterization checklist']) expect(menu, gone).not.toContain(gone);
  });
  it('the beach cruiser has a real 7-speed range, well below the road bike\'s top gear', () => {
    const M = model(), cruiser = bike(M, 'cruiser'), road = bike(M, 'road');
    expect(cruiser.cassetteT).toEqual([28, 24, 22, 20, 18, 16, 14]);
    expect(M.bikeGearRange(cruiser).hi).toBeLessThan(M.bikeGearRange(road).hi * 0.75);
    expect(M.steadyClimbSpeed(cruiser, M.bikeGearRange(cruiser).lo, 150, 0.03, 70)).toBeGreaterThan(0);
  });
});
