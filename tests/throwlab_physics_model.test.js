// Throw Lab: the physics model, the verdicts and the numbers the tool prints.
//
// Before 2026-11-23 nothing tested this tool's model. Three accessibility files pinned markup,
// while: spin did almost nothing (a bare 0.0001 scaler on the Magnus force), 20 of 40 presets
// failed on their own default numbers, golf and volleyball judged a LATER bounce two times in
// three, "hang time" printed the length of the simulation, and a blocked free kick was still
// drawn flying through the wall. Every check here runs the tool's own functions
// (window.StemLab.ThrowLabModel); none of it re-implements the physics.
//
// THROWLAB_FILE=<path> points the suite at another copy of the tool (used once to confirm the
// suite goes red on the pre-fix file).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILE = process.env.THROWLAB_FILE || 'stem_lab/stem_tool_throwlab.js';
const source = readFileSync(FILE, 'utf8');

function loadModel() {
  const win = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  const doc = {
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
    head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {},
  };
  win.document = doc; win.window = win;
  const ctx = vm.createContext({ window: win, document: doc, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, navigator: {} });
  vm.runInContext(source, ctx, { filename: 'stem_tool_throwlab.js' });
  return win.StemLab && win.StemLab.ThrowLabModel;
}

const M = loadModel();
const IN = 39.37;
const YD = 0.9144;
const setupFor = (mode, id, over) => Object.assign(
  { mode, throwerHand: 'right', gravityId: 'earth', windMph: 0, windDirDeg: 0 },
  M.presetPatch(mode, id), over || {});
const run = (mode, id, over) => M.evaluateThrow(setupFor(mode, id, over));
const teachOf = (mode, id) => M.findPreset(mode, id).teach;
const scenario = (id) => M.SCENARIOS.find((s) => s.id === id);
// The path the student sees, without the short "falls after it hit something" tail.
const flightPath = (r) => r.samples.filter((s) => !s.after);

describe('Throw Lab model is exported for tests', () => {
  it('exposes the same functions the launch button uses', () => {
    expect(M).toBeTruthy();
    for (const k of ['evaluateThrow', 'simulatePitch', 'liftCoefficient', 'presetPatch', 'describeWhere', 'setupKey', 'replaySeconds', 'isMakeOutcome']) {
      expect(typeof M[k], k).toBe('function');
    }
    // the launch handler must call the model, not a private copy of it
    expect(source).toContain('var result = evaluateThrow(d);');
  });
});

describe('spin makes a real Magnus force', () => {
  it('lift coefficient rises with spin and levels off', () => {
    const b = M.BALLS.baseball;
    const cl = (rpm) => M.liftCoefficient(b, rpm * 2 * Math.PI / 60, 40);
    expect(cl(0)).toBe(0);
    expect(cl(1000)).toBeGreaterThan(0.05);
    expect(cl(2000)).toBeGreaterThan(cl(1000));
    expect(cl(3000)).toBeGreaterThan(cl(2000));
    expect(cl(3000) - cl(2000)).toBeLessThan(cl(2000) - cl(1000)); // saturating
    expect(cl(100000)).toBeLessThan(0.45);
  });

  it('a 2300 rpm four-seam fastball crosses 14 to 20 inches higher than the same throw with no spin', () => {
    const r = run('pitching', '4seam');
    expect(r.read.spinShift.up * IN).toBeGreaterThan(14);
    expect(r.read.spinShift.up * IN).toBeLessThan(20);
    expect(Math.abs(r.read.spinShift.side * IN)).toBeLessThan(0.5);
  });

  it('topspin pushes a curveball down and side spin moves a slider sideways', () => {
    const curve = run('pitching', 'curve');
    expect(curve.read.spinShift.up * IN).toBeLessThan(-14);
    expect(curve.read.spinShift.up * IN).toBeGreaterThan(-23);
    const slider = run('pitching', 'slider');
    expect(Math.abs(slider.read.spinShift.side * IN)).toBeGreaterThan(6);
    expect(Math.abs(slider.read.spinShift.up * IN)).toBeLessThan(1);
  });

  it('a left-handed slider breaks the other way', () => {
    const right = run('pitching', 'slider').read.spinShift.side;
    const left = run('pitching', 'slider', { throwerHand: 'left' }).read.spinShift.side;
    expect(Math.sign(right)).toBe(-Math.sign(left));
    expect(Math.abs(right + left)).toBeLessThan(0.02);
  });

  it('backspin carries a golf drive about 100 yards farther', () => {
    const drive = run('golf', 'driver');
    const noSpin = run('golf', 'driver', { spinRpm: 0 });
    const carry = drive.read.land.z / YD;
    expect(carry).toBeGreaterThan(245);
    expect(carry).toBeLessThan(255);
    expect(noSpin.read.land.z / YD).toBeLessThan(160);
    expect(drive.read.spinShift.carry / YD).toBeGreaterThan(90);
  });

  it('600 rpm of side spin bends a 22 m free kick by 2 to 3.5 m', () => {
    const r = run('freekick', 'curling');
    expect(Math.abs(r.read.spinShift.side)).toBeGreaterThan(2);
    expect(Math.abs(r.read.spinShift.side)).toBeLessThan(3.5);
  });
});

describe('every preset does what its card says', () => {
  // Round 2: cricket balls bounce, so the Bouncer now has its own goal (chest height at the
  // batter) and succeeds on its own numbers like every other preset. No exceptions left.
  const EXPECTED_NON_MAKE = {};
  for (const mode of Object.keys(M ? M.MODES : {})) {
    for (const p of M.presetsFor(mode)) {
      const key = mode + '/' + p.id;
      it(key + ' succeeds on its own default numbers', () => {
        const r = run(mode, p.id);
        if (EXPECTED_NON_MAKE[key]) expect(r.location).toBe(EXPECTED_NON_MAKE[key]);
        else expect(M.isMakeOutcome(r.location), key + ' gave ' + r.location + ': ' + r.whereText).toBe(true);
      });
    }
  }

  it('each sport tab opens on a preset that succeeds', () => {
    for (const mode of Object.keys(M.MODES)) {
      const def = M.MODES[mode].defaultPreset;
      expect(M.findPreset(mode, def), mode).toBeTruthy();
      expect(M.isMakeOutcome(run(mode, def).location), mode).toBe(true);
    }
    expect(source).toContain('var defaults = presetPatch(newMode, modeMeta.defaultPreset);');
  });

  it('a preset sets left/right aim too, so an earlier aim cannot break it', () => {
    const patch = M.presetPatch('freekick', 'curling');
    expect(patch.aimDegH).toBe(M.findPreset('freekick', 'curling').aimDegH);
    expect(M.presetPatch('pitching', '4seam').aimDegH).toBe(0);
    expect(M.presetPatch('fieldgoal', 'long').fgDistanceYd).toBe(50);
  });

  it('a beginner with only the speed slider can still succeed in every sport', () => {
    // Rookie tier shows the speed slider alone. From each default preset there must be at least
    // two neighbouring speeds that work, so the first small change does not always fail.
    for (const mode of Object.keys(M.MODES)) {
      const mm = M.MODES[mode];
      const step = mm.speedStep || 1;
      const base = setupFor(mode, mm.defaultPreset);
      let wins = 0;
      for (let k = -4; k <= 4; k++) {
        if (M.isMakeOutcome(M.evaluateThrow(Object.assign({}, base, { speedMph: base.speedMph + k * step })).location)) wins++;
      }
      expect(wins, mode).toBeGreaterThanOrEqual(2);
    }
  });

  it('the free kick aim slider reaches far enough to go around the wall', () => {
    const mm = M.MODES.freekick;
    const needDeg = Math.atan(mm.wallHalfWidth / mm.wallZ) * 180 / Math.PI;
    expect(mm.aimHRange[1]).toBeGreaterThan(needDeg + 2);
    expect(mm.aimHRange[0]).toBeLessThan(-needDeg - 2);
  });
});

describe('the landing the classifier judges is the first landing', () => {
  it('golf carry grows steadily with ball speed', () => {
    let last = 0;
    for (let v = 130; v <= 175; v += 1) {
      const z = run('golf', 'driver', { speedMph: v }).read.land.z;
      expect(z, 'at ' + v + ' mph').toBeGreaterThan(last);
      last = z;
    }
  });

  it('golf verdicts change in order as speed rises: short, fairway, green, fairway, long', () => {
    const seq = [];
    for (let v = 120; v <= 180; v += 1) {
      const loc = run('golf', 'driver', { speedMph: v }).location;
      if (seq[seq.length - 1] !== loc) seq.push(loc);
    }
    // 'rough' is the 16 to 25 yd band on either side of the fairway band
    expect(seq).toEqual(['short', 'rough', 'fairway', 'green', 'fairway', 'rough', 'long']);
  });

  it('the simulation saves the ground contact point as a sample', () => {
    const r = M.simulatePitch({ ball: 'golf', speedMph: 99, releaseHeight: 0, aimDegV: 17, spinRpm: 6500, spinAxisDeg: 0, targetZ: 146, truncateAtTarget: false, allowBounces: true, maxT: 12 });
    const ground = r.samples.filter((s) => s.ground);
    expect(ground.length).toBeGreaterThan(0);
    expect(ground[0].y).toBe(0);
    expect(r.outcome.landZ).toBeCloseTo(ground[0].z, 6);
  });

  it('a volleyball verdict agrees with where the ball first landed', () => {
    const mm = M.MODES.volleyball;
    for (let v = 30; v <= 60; v += 2) {
      const r = run('volleyball', 'float', { speedMph: v });
      const land = r.read.land;
      if (r.location === 'in' || r.location === 'ace') {
        expect(land.z).toBeGreaterThan(mm.netZ);
        expect(land.z).toBeLessThanOrEqual(mm.targetZ);
      }
      if (r.location === 'long') expect(land.z).toBeGreaterThan(mm.targetZ);
      if (r.location === 'short') expect(land.z).toBeLessThan(mm.netZ);
    }
  });
});

describe('the drawn path stops where the ball was stopped', () => {
  it('a blocked free kick ends at the wall', () => {
    const r = run('freekick', 'curling', { aimDegH: 0, aimDegV: 8 });
    expect(r.location).toBe('blocked');
    const mm = M.MODES.freekick;
    for (const s of flightPath(r)) expect(s.z).toBeLessThanOrEqual(mm.wallZ + 1e-6);
    for (const s of r.samples) expect(s.z).toBeLessThan(mm.wallZ + 0.5); // the tail drops in front of the wall
    expect(r.flightTime).toBeLessThan(0.6);
  });

  it('a serve into the net ends at the net', () => {
    const r = run('volleyball', 'float', { aimDegV: 2 });
    expect(r.location).toBe('net');
    for (const s of r.samples) expect(s.z).toBeLessThanOrEqual(M.MODES.volleyball.netZ + 1e-6);
  });

  it('a made basket drops under the hoop instead of flying on', () => {
    const r = run('freethrow', 'freethrow');
    expect(r.location).toBe('swish');
    const rimZ = M.shotRimZ('freethrow');
    const end = r.samples[r.samples.length - 1];
    expect(Math.abs(end.z - rimZ)).toBeLessThan(M.MODES.freethrow.rimRadius);
    expect(end.y).toBeLessThan(0.05);
  });

  it('golf shows the carry only (no super-ball bounce down the fairway)', () => {
    const r = run('golf', 'iron');
    const end = r.samples[r.samples.length - 1];
    expect(end.ground).toBe(true);
    expect(end.z).toBeCloseTo(r.read.land.z, 6);
  });
});

describe('time of flight is the flight, not the length of the simulation', () => {
  it('free throw: about one second to the hoop', () => {
    const r = run('freethrow', 'freethrow');
    expect(r.flightTime).toBeGreaterThan(0.8);
    expect(r.flightTime).toBeLessThan(1.3);
  });
  it('free kick: under 1.2 s to the goal line', () => {
    const r = run('freekick', 'curling');
    expect(r.flightTime).toBeGreaterThan(0.7);
    expect(r.flightTime).toBeLessThan(1.2);
  });
  it('golf: the 7-iron is in the air 4 to 7 s (the old readout said 12.00 s, the time cap)', () => {
    const r = run('golf', 'iron');
    expect(r.flightTime).toBeGreaterThan(4);
    expect(r.flightTime).toBeLessThan(7);
    expect(r.flightTime).toBeCloseTo(r.read.land.t, 6);
  });
  it('the result card prints the model flight time', () => {
    expect(source).toContain("'data-throwlab-flight-time': 'true' }, typeof lr.flightTime === 'number' ? lr.flightTime.toFixed(2) + ' s'");
    expect(source).not.toContain("lr.samples[lr.samples.length - 1].t.toFixed(2) + ' s'");
  });
});

describe('basketball geometry', () => {
  const ft = M.MODES.freethrow;
  it('the rim center is 15 in in front of a backboard 15 ft from the line', () => {
    expect(ft.backboardZ).toBeCloseTo(15 * 0.3048, 3);
    expect(ft.rimZ).toBeCloseTo(15 * 0.3048 - 15 * 0.0254, 2);
    expect(ft.rimRadius).toBeCloseTo(9 * 0.0254, 3);
  });
  it('a swish needs the whole ball to fit through the rim', () => {
    const r = run('freethrow', 'freethrow');
    expect(r.read.cross.dist).toBeLessThanOrEqual(ft.rimRadius - M.BALLS.basketball.radius);
    // 0.25 mph more: still drops, but not clean
    const near = run('freethrow', 'freethrow', { speedMph: 16.75 });
    expect(near.location).toBe('made');
    expect(near.read.cross.dist).toBeGreaterThan(ft.rimRadius - M.BALLS.basketball.radius);
  });
  it('too little speed is called short, with the distance from the model', () => {
    const r = run('freethrow', 'freethrow', { speedMph: 15 });
    expect(['air', 'rim']).toContain(r.location);
    expect(r.read.cross.dz).toBeLessThan(0);
    const said = Number(/came down ([0-9.]+) m short/.exec(r.whereText)[1]);
    expect(said).toBeCloseTo(Math.abs(r.read.cross.dz), 2);
    expect(r.whereText).not.toMatch(/lateral|left|right/);
  });
  it('the Bank Shot really banks: glass first, then the hoop', () => {
    const r = run('freethrow', 'bank');
    expect(r.location).toBe('made');
    expect(r.read.cross.banked).toBe(true);
    expect(r.whereText).toMatch(/banked off the glass/);
  });
  it('a shot that is much too hard hits the backboard and bounces away', () => {
    const r = run('freethrow', 'freethrow', { speedMph: 18.5 });
    expect(r.location).toBe('backboard');
    const hit = r.samples.find((s) => s.board);
    expect(hit).toBeTruthy();
    const after = r.samples[r.samples.indexOf(hit) + 3];
    expect(after.z).toBeLessThan(hit.z); // moving back toward the shooter
  });
  it('longer shots are taken from farther away', () => {
    expect(M.shotRimZ('three')).toBeCloseTo(7.24, 2);
    expect(M.shotRimZ('halfcourt')).toBeGreaterThan(12);
    expect(M.shotRimZ('freethrow')).toBeCloseTo(ft.rimZ, 6);
  });
});

describe('words in the tool match the model', () => {
  const num = (text, re) => { const m = re.exec(text); if (!m) throw new Error('no match for ' + re + ' in: ' + text); return Number(m[1].replace(/,/g, '')); };
  it('four-seam and curveball: inches of rise and drop', () => {
    expect(num(teachOf('pitching', '4seam'), /about (\d+) inches higher/)).toBeCloseTo(run('pitching', '4seam').read.spinShift.up * IN, 0);
    expect(num(teachOf('pitching', 'curve'), /about (\d+) inches lower/)).toBeCloseTo(-run('pitching', 'curve').read.spinShift.up * IN, 0);
    expect(Math.abs(num(teachOf('pitching', '2seam'), /about (\d+) inches of sideways/) - Math.abs(run('pitching', '2seam').read.spinShift.side * IN))).toBeLessThan(1);
    expect(Math.abs(num(teachOf('pitching', 'slider'), /about (\d+) inches of sideways/) - Math.abs(run('pitching', 'slider').read.spinShift.side * IN))).toBeLessThan(1);
  });
  it('free kick curl', () => {
    const curl = Math.abs(run('freekick', 'curling').read.spinShift.side);
    expect(Math.abs(num(teachOf('freekick', 'curling'), /about ([0-9.]+) m sideways/) - curl)).toBeLessThan(0.15);
    expect(Math.abs(num(scenario('beckham').teach, /bend about ([0-9.]+) m/) - curl)).toBeLessThan(0.15);
  });
  it('golf driver: carry, the share from backspin, and the no-spin carry', () => {
    const r = run('golf', 'driver');
    const t = teachOf('golf', 'driver');
    expect(Math.abs(num(t, /about (\d+) yd here/) - r.read.land.z / YD)).toBeLessThan(2);
    expect(Math.abs(num(t, /about (\d+) yd of that/) - r.read.spinShift.carry / YD)).toBeLessThan(2);
    expect(Math.abs(num(t, /lands near (\d+) yd/) - run('golf', 'driver', { spinRpm: 0 }).read.land.z / YD)).toBeLessThan(2);
  });
  it('golf clubs land within 5 yd of the distance printed on their card', () => {
    for (const p of M.presetsFor('golf')) {
      expect(Math.abs(run('golf', p.id).read.land.z / YD - p.carryYd), p.id).toBeLessThanOrEqual(5);
    }
  });
  it('wind scenarios', () => {
    // Round 2: the Hail Mary preset now carries an 8 mph tailwind, so calm air has to be asked for.
    const calm = run('fieldgoal', 'hailmary', { windMph: 0 }).read.land.z / YD;
    const head = run('fieldgoal', 'hailmary', { windMph: 15, windDirDeg: 0 });
    const t = scenario('headwind-hailmary').teach;
    expect(Math.abs(num(t, /calm air this kick lands (\d+) yards out/) - calm)).toBeLessThan(1.5);
    expect(Math.abs(num(t, /wind it lands (\d+) yards out/) - head.read.land.z / YD)).toBeLessThan(1.5);
    expect(M.isMakeOutcome(head.location)).toBe(false); // "falls short of the posts"
    const tail = run('golf', 'driver', { windMph: 8, windDirDeg: 180 }).read.land.z / YD;
    expect(Math.abs(num(scenario('driver-tail').teach, /\((\d+) yd\)/) - tail)).toBeLessThan(2);
  });
  it('gravity scenarios', () => {
    const jup = run('pitching', '4seam', { gravityId: 'jupiter' });
    expect(jup.location).toBe('wild');
    expect(Math.abs(num(scenario('jupiter-pitcher').teach, /about ([0-9.]+) m before the plate/) - (M.MODES.pitching.targetZ - jup.read.land.z))).toBeLessThan(0.3);
    const moon = run('fieldgoal', 'long', { gravityId: 'moon' }).flightTime / run('fieldgoal', 'long').flightTime;
    expect(Math.abs(num(scenario('moon-fg').teach, /about (\d+) times as long/) - moon)).toBeLessThan(0.6);
  });
  it('the baseball note states the Magnus force the model applies', () => {
    const b = M.BALLS.baseball, v = 95 / 2.23694;
    const force = 0.5 * 1.225 * v * v * M.liftCoefficient(b, 2300 * 2 * Math.PI / 60, v) * Math.PI * b.radius * b.radius;
    expect(num(b.regs.physics, /about ([0-9.]+) N of upward/)).toBeCloseTo(force, 1);
    expect(force).toBeLessThan(b.mass * 9.81); // lift never exceeds the weight: the ball does not truly rise
  });
  it('the Formulas panel uses the same lift function as the simulation', () => {
    expect(source).toContain('var liftNow = liftCoefficient(ball, d.spinRpm * 2 * Math.PI / 60, v0);');
    expect(source).not.toContain('v0 * v0 * ball.cm * area');
    expect(source).not.toContain('* 0.0001;');
  });
});

describe('where-it-went sentences come from the crossing point', () => {
  it('pitch below the zone', () => {
    const r = run('pitching', '4seam', { aimDegV: -4 });
    expect(r.location).not.toBe('strike');
    const said = Number(/(\d+) in below the zone/.exec(r.whereText)[1]);
    expect(Math.abs(said - (M.STRIKE_ZONE.yMin - r.read.cross.y) * IN)).toBeLessThanOrEqual(0.5);
  });
  it('free kick over the bar', () => {
    const r = run('freekick', 'knuckle', { aimDegV: 16 });
    expect(r.location).toBe('over');
    const said = Number(/([0-9.]+) m over the bar/.exec(r.whereText)[1]);
    expect(said).toBeCloseTo(r.read.cross.y - M.MODES.freekick.goalHeight, 1);
  });
  it('golf short of the flag', () => {
    const r = run('golf', 'iron', { speedMph: 80 });
    expect(r.location).toBe('short');
    const said = Number(/(\d+) yd short of/.exec(r.whereText)[1]);
    expect(Math.abs(said - (160 - r.read.land.z / YD))).toBeLessThanOrEqual(1);
  });
});

describe('rewards need evidence', () => {
  it('the same setup has the same key and a changed setup has a new one', () => {
    const a = setupFor('pitching', '4seam');
    expect(M.setupKey(a)).toBe(M.setupKey(Object.assign({}, a)));
    expect(M.setupKey(a)).not.toBe(M.setupKey(Object.assign({}, a, { speedMph: 91 })));
    expect(M.setupKey(a)).not.toBe(M.setupKey(Object.assign({}, a, { gravityId: 'moon' })));
    expect(M.setupKey(a)).not.toBe(M.setupKey(setupFor('pitching', 'curve')));
  });
  it('make XP is paid only for the first make of a setup', () => {
    expect(source).toContain("function makeXP(points, reason) { if (firstMakeOfSetup && awardXP) awardXP('throwlab', points, reason); }");
    for (const reason of ['Strike thrown', 'Swish', 'Shot made', 'Pass completed', 'Field goal made', 'Free kick goal', 'Wicket taken', 'Service ace', 'Serve in', 'Green in regulation', 'Fairway hit']) {
      expect(source, reason).not.toContain("awardXP('throwlab', " + (/\d+/.exec(source.split("'" + reason + "'")[0].slice(-8)) || ['0'])[0] + ", '" + reason + "')");
      expect(source, reason).toMatch(new RegExp("makeXP\\(\\d+, '" + reason + "'\\)"));
    }
    expect(source).toContain("makeXP(12, 'Personal Best: ' + r.label);");
  });
  it('the daily challenge needs a call made before launch', () => {
    expect(source).toContain('if (d.activeScenarioId && madeIt && d.predictionKey) {');
  });
  it('a streak of one is not announced as a record', () => {
    expect(source).toContain("(stats.hotStreak || 0) >= 3 && (stats.hotStreak || 0) > (pbs.cross.longestStreakAnySport || 0)");
  });
});

describe('the replay and the reveal', () => {
  it('replay length follows the flight: fast throws slowed, long flights shortened', () => {
    expect(M.replaySeconds(0.43, 0.43)).toBeCloseTo(0.9, 6);
    expect(M.replaySeconds(1.0, 1.0)).toBeCloseTo(1.0, 6);
    expect(M.replaySeconds(6.3, 6.3)).toBeCloseTo(3.2, 6);
    expect(M.replaySeconds(0.62, 0.62)).toBeGreaterThanOrEqual(M.replaySeconds(0.43, 0.43));
    // a tail after the hit adds time in the same proportion
    expect(M.replaySeconds(1.0, 1.5)).toBeCloseTo(1.5, 6);
  });
  it('the verdict, the trail color and the toasts wait for the ball', () => {
    expect(source).toContain("'data-throwlab-in-flight': 'true'");
    expect(source).toContain("if (!tlRevealNow) trajColor = '#f8fafc';");
    // Round 2: the third argument marks a timer that waits for the ball, so skipping the replay can bring it forward.
    expect(source).toContain('}, revealMs + 60, 60);');
    expect(source).not.toContain('}, 350);');
  });
});
