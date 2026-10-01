import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Trajectory Computing Lab had NO tests of any kind (2026-09-07), while being a
// tool whose whole point is that a student computes a flight path BY HAND and the
// tool grades it. Every number below is one a learner is asked to reproduce, so a
// drift in the mission table or the solver silently teaches the wrong answer.
//
// The tool launches from a height, so the flight time is the positive root of
//   0 = Y0 + Vy t - g t^2 / 2   =>   t = [Vy + sqrt(Vy^2 + 2 g Y0)] / g
// which is what the source implements; this file re-derives it independently and
// checks the mission table against it rather than against the tool's own output.

const PATHS = [
  'stem_lab/stem_tool_trajectorycomputing.js',
  'desktop/web-app/public/stem_lab/stem_tool_trajectorycomputing.js',
];
const SRC = readFileSync(PATHS[0], 'utf8');

/** Pull the frozen mission table out of the source. */
function missions() {
  const out = [];
  const re = /Object\.freeze\(\{\s*id:\s*'([^']+)'[^}]*?speed:\s*([\d.]+),\s*angle:\s*([\d.]+),\s*height:\s*([\d.]+),\s*gravity:\s*([\d.]+),\s*zoneMin:\s*([\d.]+),\s*zoneMax:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(SRC))) {
    out.push({
      id: m[1], speed: +m[2], angle: +m[3], height: +m[4],
      gravity: +m[5], zoneMin: +m[6], zoneMax: +m[7],
    });
  }
  return out;
}

/** Independent closed form — deliberately not the tool's code. */
function solve(m) {
  const rad = (m.angle * Math.PI) / 180;
  const vx = m.speed * Math.cos(rad);
  const vy = m.speed * Math.sin(rad);
  const flightTime = (vy + Math.sqrt(vy * vy + 2 * m.gravity * m.height)) / m.gravity;
  const peakTime = vy / m.gravity;
  return {
    vx, vy, flightTime,
    range: vx * flightTime,
    peakHeight: m.height + vy * peakTime - 0.5 * m.gravity * peakTime * peakTime,
  };
}

describe('Trajectory Computing Lab — mission table vs the physics it teaches', () => {
  it('parses all four missions out of the source', () => {
    expect(missions().map((m) => m.id)).toEqual([
      'aurora-3', 'meridian-5', 'horizon-8', 'aurora-control-3b',
    ]);
  });

  it('every mission is physically sane: forward, airborne, and peaking above the launch height', () => {
    missions().forEach((m) => {
      const s = solve(m);
      expect(s.vx, `${m.id} flies forward`).toBeGreaterThan(0);
      expect(s.flightTime, `${m.id} stays airborne`).toBeGreaterThan(0);
      expect(s.range, `${m.id} lands downrange`).toBeGreaterThan(0);
      // Launched upward from a height, so the apex must clear the tower.
      expect(s.peakHeight, `${m.id} peaks above its launch height`).toBeGreaterThan(m.height);
    });
  });

  it('each landing zone matches what the mission actually computes', () => {
    // Three missions are designed to land inside their zone (verdict GO). The
    // fourth is a control: same 38 degrees and 30 m tower as Aurora 3 but 5 m/s
    // slower against the SAME zone, so the correct answer is that it falls short
    // and the verdict is HOLD. The tool supports both — the expected verdict is
    // derived as `EXPECTED.inZone ? 'go' : 'hold'` — so a zone that no longer
    // brackets its own answer would silently flip a mission's correct verdict.
    const expected = {
      'aurora-3': true,
      'meridian-5': true,
      'horizon-8': true,
      'aurora-control-3b': false,
    };
    missions().forEach((m) => {
      const range = solve(m).range;
      const inZone = range >= m.zoneMin && range <= m.zoneMax;
      expect(inZone, `${m.id}: range ${range.toFixed(1)} m vs zone ${m.zoneMin}-${m.zoneMax}`)
        .toBe(expected[m.id]);
    });
  });

  it('the control run falls short of the shared zone by a teachable margin', () => {
    const all = missions();
    const base = all.find((m) => m.id === 'aurora-3');
    const control = all.find((m) => m.id === 'aurora-control-3b');
    expect(control.angle).toBe(base.angle);
    expect(control.height).toBe(base.height);
    expect(control.zoneMin).toBe(base.zoneMin);
    expect(control.speed).toBeLessThan(base.speed); // the one variable that differs
    const shortfall = solve(base).range - solve(control).range;
    // 5 m/s costs ~210 m of range here; if this collapses the comparison stops
    // teaching anything, and if it explodes the control is no longer comparable.
    expect(shortfall).toBeGreaterThan(100);
    expect(shortfall).toBeLessThan(400);
  });

  it('the solver keeps the launch height in the flight time', () => {
    // Dropping the 2gY0 term is the classic error for a launch from a tower: it
    // is invisible at ground level and wrong by ~1.5% here.
    expect(SRC).toContain('var discriminant = (vy * vy) + (2 * m.gravity * m.height);');
    expect(SRC).toContain('var flightTime = (vy + Math.sqrt(discriminant)) / m.gravity;');
    const m = missions()[0];
    const withHeight = solve(m).range;
    const flat = (m.speed * Math.cos((m.angle * Math.PI) / 180)) * ((2 * m.speed * Math.sin((m.angle * Math.PI) / 180)) / m.gravity);
    expect(withHeight).toBeGreaterThan(flat);
  });

  it('the worksheet shows the ACTIVE mission numbers, not a hardcoded copy', () => {
    // MISSION is MISSION_VARIANTS[0] today, so '215 x cos(38 deg)' happens to be
    // right. The variants table exists to make missions selectable, and the moment
    // one is selected these strings would instruct a student to compute numbers the
    // grader rejects — the tool teaching one derivation and marking against another.
    const active = missions()[0];
    expect(SRC).toContain('var MISSION = MISSION_VARIANTS[0];');
    const vx = SRC.match(/id: 'vx',[^}]*?expression: '([^']+)'/);
    const vy = SRC.match(/id: 'vy',[^}]*?expression: '([^']+)'/);
    expect(vx, 'vx worksheet row present').toBeTruthy();
    expect(vy, 'vy worksheet row present').toBeTruthy();
    [vx[1], vy[1]].forEach((expr) => {
      expect(expr, `worksheet "${expr}" must use the active speed`).toContain(String(active.speed));
      expect(expr, `worksheet "${expr}" must use the active angle`).toContain(String(active.angle));
    });
  });

  it('mirror copy is identical', () => {
    expect(readFileSync(PATHS[0], 'utf8')).toBe(readFileSync(PATHS[1], 'utf8'));
  });
});
