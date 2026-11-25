// Bike Lab, sports-labs pass 2026-11-23.
// The Sandbox force arrows shared one scale with the rider's weight (about 800 N), so the forces that decide a ride
// (legs, air, tires, hill: 5 to 100 N) drew a few pixels long, and the pull of a hill was never drawn at all. The
// Sandbox also had no task. This suite guards the shared force model, the predict-then-test experiments, the
// canvas sizing that keeps drawings readable on a phone, and the Neighborhood Ride's stop-sign car and stars.
// BIKELAB_SRC points the suite at another copy for the fail-first check.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(process.env.BIKELAB_SRC || 'stem_lab/stem_tool_bikelab.js', 'utf8').replace(/\r\n/g, '\n');
const model = () => {
  const a = src.indexOf('  var BIKES = ['), e = src.indexOf('  // SECTION 3');
  if (a < 0 || e < 0) throw new Error('model anchors missing');
  return new Function('window', src.slice(a, src.lastIndexOf('\n', e)) +
    '\nreturn { BIKES, TERRAINS, G, gearRatioFor, bikeGearRange, steadyClimbSpeed, rideForces, sandboxStep, SANDBOX_DT, SANDBOX_EXPERIMENTS, sandboxExperimentDone, sandboxExperimentRun, sandboxExperimentRead, sandboxExperimentResult, canvasLogicalSize, fitCanvasLogical, reducedMotionNow, drawHouse, drawTree, drawCarFront };')({});
};
const bike = (M, id) => M.BIKES.find((x) => x.id === id);
const terrain = (M, id) => M.TERRAINS.find((x) => x.id === id);
const slice = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('slice anchors missing: ' + from); return src.slice(a, b); };
const sandbox = () => slice('      function PhysicsSandbox() {', '      function GearingLab() {');
const ride = () => slice('      function NeighborhoodRide() {', '      function PartsInspector() {');
const menu = () => slice('      function MainMenu() {', '      function BackBar(props) {');

describe('one force model for the step, the arrows and the experiments', () => {
  it('the forces along the road add up, and the hill only pulls when the road tilts', () => {
    const M = model(), b = bike(M, 'hybrid'), o = { power: 150, gear: 0.7, wind: 0, riderMass: 70, coasting: false };
    const flat = M.rideForces(b, terrain(M, 'flat'), 10, 5, o);
    expect(flat.hill).toBeCloseTo(0, 9);
    expect(flat.net).toBeCloseTo(flat.push - flat.tires - flat.air - flat.hill, 9);
    const climb = M.rideForces(b, terrain(M, 'steephill'), 50, 3, o);
    expect(climb.slope).toBeCloseTo(0.06, 6);
    expect(climb.hill).toBeCloseTo(80 * M.G * Math.sin(Math.atan(0.06)), 6);       // about 47 N for 80 kg on 6%
    expect(climb.hill).toBeGreaterThan(climb.tires * 5);                            // on a climb the hill, not the tires, is the big one
    const down = M.rideForces(b, terrain(M, 'rollinghills'), 30, 3, o);
    expect(down.hill).toBeLessThan(0);                                              // descending: the hill pushes forward
  });

  it('a headwind adds to the air force, a tailwind can push, and coasting removes the push from the legs', () => {
    const M = model(), b = bike(M, 'hybrid'), t = terrain(M, 'flat');
    const calm = M.rideForces(b, t, 0, 5, { power: 150, gear: 0.7, wind: 0, riderMass: 70 });
    const head = M.rideForces(b, t, 0, 5, { power: 150, gear: 0.7, wind: 4, riderMass: 70 });
    const tail = M.rideForces(b, t, 0, 1, { power: 150, gear: 0.7, wind: -6, riderMass: 70 });
    expect(head.air).toBeCloseTo(calm.air * (9 / 5) * (9 / 5), 6);                 // air grows with (speed + wind) squared
    expect(tail.air).toBeLessThan(0);
    expect(M.rideForces(b, t, 0, 5, { power: 150, gear: 0.7, coasting: true }).push).toBe(0);
    expect(calm.push).toBeGreaterThan(0);
  });

  it('the power table adds up: legs = tires + air + hill + speeding up, every step', () => {
    const M = model(), b = bike(M, 'mtb'), t = terrain(M, 'dirt'), o = { power: 180, gear: 0.4, wind: 2, riderMass: 55, coasting: false };
    const s = { x: 0, v: 0, t: 0, lowY: 0 };
    for (let i = 0; i < 120 * 40; i++) {
      const f = M.sandboxStep(s, b, t, o, M.SANDBOX_DT), bud = f.budget;
      expect(bud.rolling + bud.air + bud.hill + bud.speedUp).toBeCloseTo(bud.pedal, 6);
    }
    expect(s.x).toBeGreaterThan(50); expect(s.t).toBeCloseTo(40, 6);
    expect(s.lowY).toBeLessThan(0);                                                // the dirt trail dips below the start line
  });

  it('the Sandbox step, its arrows and the experiment runner all call the shared functions', () => {
    const view = sandbox();
    expect(view).toContain('var f = sandboxStep(s, bike, terrain, { power: power, gear: gear, wind: wind, riderMass: riderMass, coasting: coasting }, dt);');
    expect(view).toContain('var fNow = rideForces(bike, terrain, camX, v, { power: power, gear: gear, wind: wind, riderMass: riderMass, coasting: coasting });');
    expect(view).toContain('stepDebtRef.current -= SANDBOX_DT;');
    expect(view).toContain('if (running_exp && sandboxExperimentDone(running_exp, out.s, out.f)) { ended = out; break; }');
    expect(view).toContain('var res = sandboxExperimentRead(e, s, f, terrain);');
    expect(view).not.toContain('pedalDriveForce(');                               // no second copy of the physics in the view
  });
});

describe('force arrows show the forces that change the ride', () => {
  it('the arrow scale is set by the four road forces, never by weight or the ground push', () => {
    const view = sandbox();
    expect(view).toContain('var maxF = Math.max(30, Math.abs(pedalF), rollingF, Math.abs(dragF), Math.abs(gravP));');
    expect(view).not.toMatch(/maxF = Math\.max\([^;]*normalN/);
    // on the 6% climb the hill arrow is most of the length of the push arrow, instead of a 4 px stub
    const M = model(), f = M.rideForces(bike(M, 'mtb'), terrain(M, 'steephill'), 20, 2.5, { power: 180, gear: 0.25, wind: 0, riderMass: 70 });
    const maxF = Math.max(30, Math.abs(f.push), f.tires, Math.abs(f.air), Math.abs(f.hill)), px = 110 / maxF;
    expect(f.hill * px).toBeGreaterThan(40);
    expect(f.hill * (80 / Math.max(50, f.push, f.normal))).toBeLessThan(8);         // what the old shared scale gave it
  });

  it('the hill force is drawn, and every arrow has a plain name with its newtons', () => {
    const view = sandbox();
    expect(view).toContain("'#ef4444', 'F_hill');");
    expect(view).toContain("var FORCE_NAMES = { F_pedal: 'Your push', F_drag: 'Air', F_roll: 'Tires', F_hill: 'Hill' };");
    expect(view).toContain("var text = (FORCE_NAMES[label] || label) + ' ' + Math.round(newtons) + ' N';");
    expect(view).toContain('forceNowRef.current = { F_pedal: pedalF, F_drag: dragF, F_roll: rollingF, F_hill: gravP };');
    for (const jargon of ['F_grav', 'm·g·sin', 'm\\u00B7g\\u00B7sin', 'Cd·A=', "'mg'", 'gravity component parallel']) expect(view, jargon).not.toContain(jargon);
  });

  it('the rider is the shared helmeted figure, and motion settings are read live', () => {
    const view = sandbox();
    expect(view).toContain('drawBikeFigure(ctx2d, 0, 0, { scale: bikeK,');
    expect(view).toContain('stillMotion = reducedMotionNow()');
    expect(view).not.toContain('_prefersReducedMotion');
    expect(ride()).not.toContain('_prefersReducedMotion');
    expect(ride()).toContain('stillMotion = reducedMotionNow()');
  });

  it('the energy graph keeps a whole hill: four samples a second, 600 samples', () => {
    const view = sandbox();
    expect(view).toContain('if (s.t - sampleAtRef.current >= 0.25) {');
    expect(view).toContain('if (hist.length > 600) hist.shift();');
  });
});

describe('Sandbox experiments: predict, then test', () => {
  it('four experiments, each with three options, one of which the model picks', () => {
    const M = model();
    expect(M.SANDBOX_EXPERIMENTS.map((e) => e.id)).toEqual(['steady-flat', 'slow-knobby', 'headwind', 'coast-dip']);
    for (const e of M.SANDBOX_EXPERIMENTS) {
      expect(e.options).toHaveLength(3);
      const r = M.sandboxExperimentResult(e), keys = e.options.map((o) => o[0]);
      expect(new Set(keys).size).toBe(3);
      expect(keys, e.id + ' answer ' + r.answer).toContain(r.answer);
      expect(e.ask.trim().endsWith('?')).toBe(true); expect(e.why.length).toBeGreaterThan(60);
    }
  });

  it('the answers have clear margins, so a small change to the model cannot flip one silently', () => {
    const M = model(), R = Object.fromEntries(M.SANDBOX_EXPERIMENTS.map((e) => [e.id, M.sandboxExperimentResult(e)]));
    expect(R['steady-flat'].answer).toBe('air'); expect(R['steady-flat'].share.air).toBeGreaterThan(0.65);
    expect(R['steady-flat'].mph).toBeGreaterThan(14); expect(R['steady-flat'].mph).toBeLessThan(18);
    expect(R['slow-knobby'].answer).toBe('tires'); expect(R['slow-knobby'].share.tires).toBeGreaterThan(0.65);
    expect(R['slow-knobby'].mph).toBeGreaterThan(6); expect(R['slow-knobby'].mph).toBeLessThan(8);   // the question says "about 7 mph"
    expect(R.headwind.answer).toBe('some'); expect(R.headwind.drop).toBeGreaterThan(3); expect(R.headwind.drop).toBeLessThan(8);
    expect(R.headwind.windMph).toBeCloseTo(10, 1);                                 // the question says "a 10 mph wind"
    expect(R.headwind.baseMph).toBeCloseTo(R['steady-flat'].mph, 6);               // "same bike and same effort as the first experiment"
    expect(R['coast-dip'].answer).toBe('less'); expect(R['coast-dip'].back).toBeGreaterThan(0.2); expect(R['coast-dip'].back).toBeLessThan(0.45);
    expect(R['coast-dip'].lowM).toBeCloseTo(4, 1);
  });

  it('the right answer moves around, is never the longest option, and every wrong option explains the misconception', () => {
    const M = model(), positions = [];
    for (const e of M.SANDBOX_EXPERIMENTS) {
      const r = M.sandboxExperimentResult(e), idx = e.options.findIndex((o) => o[0] === r.answer);
      positions.push(idx);
      const lengths = e.options.map((o) => o[1].length);
      expect(lengths[idx], e.id + ' right answer is not the longest').toBeLessThan(Math.max(...lengths) + (lengths.filter((l) => l === Math.max(...lengths)).length > 1 ? 1 : 0));
      expect(Math.max(...lengths) - Math.min(...lengths), e.id + ' options are about the same length').toBeLessThanOrEqual(8);
      e.options.forEach((o, i) => { if (i === idx) expect(o[2]).toBe(''); else expect(o[2].length, e.id + ' ' + o[0]).toBeGreaterThan(40); });
    }
    expect(new Set(positions).size).toBe(3);                                      // first, second and third all used
  });

  it('each run ends on its own within two minutes of ride time', () => {
    const M = model();
    for (const e of M.SANDBOX_EXPERIMENTS) { const run = M.sandboxExperimentRun(e); expect(run.s.t, e.id).toBeGreaterThan(8); expect(run.s.t, e.id).toBeLessThan(120); }
    const coast = M.sandboxExperimentRun(M.SANDBOX_EXPERIMENTS[3]);
    expect(coast.s.v).toBeLessThan(0.05); expect(coast.s.x).toBeGreaterThan(126);  // it passed the bottom of the dip (125.7 m) before stopping
  });

  it('the prediction comes first, results are saved, and solving all four is the Sandbox mastery goal', () => {
    const view = sandbox();
    expect(view).toContain("disabled: !expPick, onClick: runExperiment,");
    expect(view).toContain("expPick ? '▶ Run the test' : 'Pick a prediction first'");
    expect(view).toContain("disabled: expPhase !== 'predict',");
    expect(view).toContain('res.right = res.answer === expPick;');
    expect(view).toContain("upd('sandboxExperiments', nextSolved);");
    expect(view).toContain('var locked = !!exp;');
    expect(menu()).toContain('sandbox: solvedIn(d.sandboxExperiments) >= SANDBOX_EXPERIMENTS.length,');
    expect(menu()).toContain("sandbox: 'Predict all ' + SANDBOX_EXPERIMENTS.length + ' Sandbox experiments correctly',");
  });
});

describe('canvases stay readable on a phone', () => {
  it('wide frames keep the wide drawing; a phone frame gets a drawing as wide as the frame and relatively taller', () => {
    const M = model();
    expect(M.canvasLogicalSize(0, 900, 440, 0.72)).toEqual({ w: 900, h: 440, narrow: false });        // not laid out yet
    expect(M.canvasLogicalSize(922, 900, 440, 0.72)).toEqual({ w: 900, h: 440, narrow: false });
    expect(M.canvasLogicalSize(744, 900, 440, 0.72)).toEqual({ w: 900, h: 440, narrow: false });
    const phone = M.canvasLogicalSize(352, 900, 440, 0.72);
    expect(phone).toEqual({ w: 352, h: 253, narrow: true });
    expect(phone.h / phone.w).toBeGreaterThan(440 / 900);
    expect(M.canvasLogicalSize(640, 900, 440, 0.72)).toEqual({ w: 640, h: 313, narrow: false });
    expect(M.canvasLogicalSize(200, 900, 440, 0.72).w).toBe(300);                   // never narrower than 300
  });

  it('all three scenes size themselves from their frame', () => {
    expect(sandbox()).toContain('var size = fitCanvasLogical(cvs, 900, 440, 0.72);');
    expect(ride()).toContain('var size = fitCanvasLogical(cvs, 1000, 380, 0.62);');
    expect(slice('      function BrakingPhysics() {', '      function SafetyQuiz() {')).toContain('var size = fitCanvasLogical(cvs, 1000, 250, 0.62);');
    expect(src).not.toContain('cvs._logicalW || cvs.width');                       // the old fixed-size path is gone
  });

  it('fitCanvasLogical sets the drawing size and the aspect ratio, with or without the host helper', () => {
    const calls = [];
    const win = { StemLab: { setupHiDPI: (c, w, h) => calls.push([w, h]) } };
    const a = src.indexOf('  var BIKES = ['), e = src.indexOf('  // SECTION 3');
    const mk = (w) => new Function('window', src.slice(a, src.lastIndexOf('\n', e)) + '\nreturn fitCanvasLogical;')(w);
    const cvs = { getBoundingClientRect: () => ({ width: 364 }), style: {}, width: 1000, height: 380 };
    expect(mk(win)(cvs, 1000, 380, 0.62)).toEqual({ w: 364, h: 226, narrow: true });
    expect(calls).toEqual([[364, 226]]); expect(cvs.style.aspectRatio).toBe('364 / 226');
    const bare = { getBoundingClientRect: () => ({ width: 364 }), style: {}, width: 1000, height: 380 };
    mk({})(bare, 1000, 380, 0.62);
    expect([bare.width, bare.height]).toEqual([364, 226]);
  });

  it('no canvas label in the Sandbox is drawn smaller than 12 px', () => {
    const fonts = [...sandbox().matchAll(/ctx2d\.font = '(?:bold )?(\d+)px/g)].map((m) => +m[1]);
    expect(fonts.length).toBeGreaterThan(8);
    expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12);
  });
});

describe('Neighborhood Ride: the stop sign has a reason, and the ride has a rating', () => {
  it('a full stop lets the car cross first; running the sign makes it brake', () => {
    const view = ride();
    expect(view).toContain("if (s.car === 'coming' && newV <= 0.3) { s.car = 'crossing'; s.carT = 0; newV = 0; say('Good stop. The car goes first.'); }");
    expect(view).toContain("if (s.car === 'coming') { s.car = 'braked'; say('Close call! The car had to brake hard for you.'); }");
    expect(view).toContain("if (waiting.carT >= CAR_CROSS_SECONDS) waiting.car = 'gone';");
    expect(view).toContain('var CROSS_STREET_X = 222;');
    expect(view).toContain("hillCrawlTime: 0, wetBrakingHard: false, car: 'coming', carT: 0 };");
    // the cross street is past the end of the stop window, so a rider who stops in the window is never in it
    const windowEnd = +/stopSign: \{ at: 205, windowStart: 195, windowEnd: (\d+) \}/.exec(view)[1];
    expect(222 - 34 * 1.25 / 11).toBeGreaterThan(windowEnd);
  });

  it('stars are counted from the three checks and the best count is saved', () => {
    const view = ride();
    expect(view).toContain("var stars = (s.stopSignObeyed === true ? 1 : 0) + (s.hillCrawlTime <= 5 ? 1 : 0) + ((!s.wetBrakingHard && !s.wetTooFast) ? 1 : 0);");
    expect(view).toContain('var cleanRide = s.stopSignObeyed === true && s.hillCrawlTime <= 5 && !s.wetBrakingHard && !s.wetTooFast;');
    expect(view).toContain("if (stars > (+d.rideBestStars || 0)) upd('rideBestStars', stars);");
    expect(view).toContain("if (cleanRide && (!bestT || timeRef.current < bestT)) upd('rideBestTime', timeRef.current);");   // times still need a clean ride
  });

  it('hill coaching follows the model: gear advice when a gear would work, effort advice when none would', () => {
    const M = model(), climbs = (id, watts) => M.steadyClimbSpeed(bike(M, id), M.bikeGearRange(bike(M, id)).lo, watts, 0.07, 70) >= 2.0;
    expect(climbs('hybrid', 150)).toBe(true);        // default ride: shifting down is enough
    expect(climbs('cargo', 150)).toBe(false);        // the cargo bike crawls at 150 W whatever the gear
    expect(climbs('hybrid', 80)).toBe(false);
    const view = ride();
    expect(view.split('steadyClimbSpeed(bike, bikeGearRange(bike).lo, power, 0.07, 70) >= 2.0').length - 1).toBe(2);   // live tip and end-of-ride advice
  });

  // The wet-road star used to be free: nothing made a rider brake there, so it was earned by doing nothing. Now the
  // rider has to slow down on the dry road first. This replays the ride's own step maths to show the star is neither
  // free nor out of reach.
  it('the wet-road star needs braking before the wet part: coasting in is too fast, braking early passes, braking on it fails', () => {
    const M = model(), view = ride();
    expect(view).toContain('var WET_ENTRY_MAX = 12 / 2.237;');
    expect(view).toContain("if (newV > WET_ENTRY_MAX) { s.wetTooFast = true; say('Too fast for a wet road: half the grip here.'); }");
    expect(view).toContain("if (!s.wetWarned && newX >= 405 && newX < 450) { s.wetWarned = true; say('Wet road ahead. Slow to 12 mph while it is dry.'); }");
    expect(view).toContain("var brakeF = braking ? m * Math.min(5.0, (t.kind === 'wet' ? 0.45 : 0.8) * G * 0.9) : 0;");
    const full = new Function('window', src.slice(src.indexOf('  var BIKES = ['), src.lastIndexOf('\n', src.indexOf('  // SECTION 3'))) + '\nreturn { RHO_AIR, SURFACE_CRR_MULT, pedalDriveForce };')({});
    const elev = (x) => x < 280 ? 0 : x < 380 ? (x - 280) * 0.07 : x < 450 ? 7 - (x - 380) * 0.03 : x < 520 ? 4.9 - (x - 450) * 0.04 : 2.1 - (x - 520) * 0.026;
    const kind = (x) => (x >= 450 && x <= 520) ? 'wet' : 'pavement';
    const rideIt = (policy) => {
      const b = bike(M, 'hybrid'), m = b.mass, dt = 1 / 240; let x = 0, v = 0, t = 0, prevV = 0, entry = null, crawl = 0, wetHard = false;
      while (x < 600 && t < 600) {
        const p = policy(x, v), ang = Math.atan((elev(Math.min(600, x + 0.5)) - elev(x)) / 0.5);
        const roll = b.crr * (full.SURFACE_CRR_MULT[kind(x)] || 1) * m * M.G * Math.cos(ang), drag = 0.5 * full.RHO_AIR * b.cdA * v * v, hill = m * M.G * Math.sin(ang);
        const ped = p.brake ? 0 : full.pedalDriveForce(b, M.gearRatioFor(b, p.gear), v, 150, 70);
        const brakeF = p.brake ? m * Math.min(5, (kind(x) === 'wet' ? 0.45 : 0.8) * M.G * 0.9) : 0;
        v = Math.max(0, v + (ped - roll - drag - hill - brakeF) / m * dt); const nx = x + v * dt;
        if (x < 450 && nx >= 450) entry = v * 2.237;
        if (nx >= 280 && nx <= 380 && v < 2) crawl += dt;
        if (nx >= 450 && nx <= 520 && p.brake && v > 3 && (prevV - v) / dt > 3.5) wetHard = true;
        prevV = v; x = nx; t += dt;
      }
      return { entry, crawl, wetHard };
    };
    const gearFor = (x) => (x > 262 && x < 380) ? 0.3 : 0.7;
    const coastIn = rideIt((x) => ({ gear: gearFor(x), brake: false }));
    const brakeEarly = rideIt((x, v) => ({ gear: gearFor(x), brake: x >= 440 && x < 450 && v > 4.6 }));
    const brakeOnIt = rideIt((x, v) => ({ gear: gearFor(x), brake: x >= 455 && x < 470 && v > 4 }));
    expect(coastIn.entry).toBeGreaterThan(14);                 // well over 12 mph: the star is not free any more
    expect(brakeEarly.entry).toBeLessThan(11.5); expect(brakeEarly.wetHard).toBe(false); expect(brakeEarly.crawl).toBeLessThanOrEqual(5);
    expect(brakeOnIt.wetHard).toBe(true);
  });

  it('the page around the scene updates ten times a second, and the scene has a text alternative', () => {
    const view = ride();
    expect(view).toContain('if (ts - hudAtRef.current > 100) { hudAtRef.current = ts; setHudTick(function(x) { return (x + 1) % 1000; }); }');
    expect(view).toContain("id: 'bikelab-neighborhood-description', className: 'sr-only'");
    expect(view).toContain("'aria-describedby': 'bikelab-neighborhood-description'");
    expect(view).toContain("'data-bikelab-ride-pad': 'true'");
    expect(src).toContain('.bikelab-root .bikelab-ride-pad button{min-height:56px}');
  });

  it('street drawings run without a browser canvas and leave the canvas state balanced', () => {
    const M = model(), calls = [];
    const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push(k); }), set: (t, k, v) => { t[k] = v; return true; } });
    M.drawHouse(ctx, 10, 100, 1.2, '#fff', '#000', false); M.drawHouse(ctx, 10, 100, 1.2, '#fff', '#000', true);
    M.drawTree(ctx, 10, 100, 1); M.drawCarFront(ctx, 10, 100, 1, '#2563eb', { braking: true }); M.drawCarFront(ctx, 10, 100, 0.5);
    expect(calls.filter((k) => k === 'save').length).toBe(5);
    expect(calls.filter((k) => k === 'restore').length).toBe(5);
    expect(calls).toContain('fillText');                                         // the "!" over a car that had to brake
  });
});

describe('menu: riding is one tap from the top', () => {
  it('the ride buttons come first, then the suggested order, then the bike chart behind a disclosure, then the cards', () => {
    const m = menu(), ret = m.slice(m.indexOf("return h('div', { className: 'p-6 max-w-6xl mx-auto' },"));
    const at = (s) => { const i = ret.indexOf(s); expect(i, s).toBeGreaterThan(0); return i; };
    const quick = at("'data-bikelab-quickstart': 'true'"), path = at("'data-bikelab-path': 'true'"), fleet = at("h('details', { 'data-bikelab-fleet-strip': 'true'"), cards = at("t('stem.bikelab.core_modules', 'Core Modules')");
    expect(quick).toBeLessThan(path); expect(path).toBeLessThan(fleet); expect(fleet).toBeLessThan(cards);
    expect(ret).toContain("{ id: 'ride', icon: '🏘️', title: 'Ride to school',");
    expect(ret).toContain("onClick: function() { goto(q.id); },");
    expect(ret).toContain("onClick: function() { upd('sandboxBikeId', b.id); goto('sandbox'); },");   // the chart's bike buttons are kept
  });

  it('menu text is in plain words', () => {
    const m = menu();
    for (const jargon of ['Cd·A', '(Crr)', "'Crr 0", 'Aero Drag Area', 'endo-limit', 'Applied-physics', 'Vector decomposition', 'Fleet Physics Map', 'procedural practice']) expect(m, jargon).not.toContain(jargon);
    const tips = new Function(src.slice(src.indexOf('  var BIKES = ['), src.indexOf('  // SECTION 2: TERRAINS')).replace(/\n\s*\/\/[^\n]*$/, '') + '\nreturn BIKES;')().map((b) => b.tip).join(' ');
    for (const jargon of ['Crr', 'Cd', 'cross-chain', 'psi']) expect(tips, jargon).not.toContain(jargon);     // the tip is shown under the Sandbox scene
    for (const key of ['sandbox_card_desc_v2', 'repair_card_desc_v2', 'ride_card_desc_v2', 'braking_card_desc_v2', 'drill_card_desc_v2']) expect(m, key).toContain("t('stem.bikelab." + key + "', '");
  });

  it('every rider drawn from behind wears a helmet', () => {
    expect(slice('      function armPoseSvg(kind) {', '      function SignalDrill() {')).toContain("h('path', { d: 'M29,16 A11,11 0 0 1 51,16 Z', fill: '#f59e0b'");
  });
});
