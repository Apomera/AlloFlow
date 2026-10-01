import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

// Physics Simulator — the shared projectile integrator and the regressions
// that shipped around it (2026-09-07 review):
//   • Air Drag applied `drag·v·|v|·50` per FRAME (no dt). With drag=0.002 the
//     per-frame loss exceeded the velocity above 10 m/s, so the ball reversed
//     on frame 1 and "landed" at -0.2 m. Shipped that way since 2026-03-25.
//   • Paused frames still applied drag → velocity drained to NaN.
//   • The Flight Data empty hint died to semicolon insertion: a comment was
//     inserted between `return` and its expression.
//   • launchCount was initialised but never written, so the Launches metric,
//     the "recommended next move" ladder and the launch_10 quest were dead.

const PHYSICS_PATHS = [
  'stem_lab/stem_tool_physics.js',
  'desktop/web-app/public/stem_lab/stem_tool_physics.js',
];

describe('physics source gates (both live copies)', () => {
  it('integrates drag through the shared step, scaled by dt, and never per frame', () => {
    PHYSICS_PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).not.toContain('spd * 50');
      expect(src).toContain('function physStep(b, dt)');
      expect(src).toContain('if (dt > 0) physStep(ball, dt);');
      expect(src).toContain('if (dt > 0 && trails.length > 0)');
      expect(src).toContain('window.StemLab._physics = {');
      // The canvas loop must take its timestep from the real clock. A fixed
      // slice per frame ran the flight at the display refresh rate (2.02x real
      // time at 58fps, ~4x at 120Hz), so reported flight time did not match a
      // stopwatch. The solver keeps a fixed step on purpose, for determinism.
      expect(src).toContain('function draw(nowTs) {');
      expect(src).toContain('dt = _elapsed * _ss;');
      expect(src).toContain('Math.min(0.05, (_now - _prevTs) / 1000)');
      expect(src).not.toContain('dt = DT_BASE * _ss;');
    });
  });

  it('keeps the empty Flight Data hint reachable and counts launches', () => {
    PHYSICS_PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain('if (lastTrail.length === 0) {');
      expect(src).toContain("bump('launchCount', 1);");
      expect(src.match(/fireLaunch\(/g).length).toBeGreaterThanOrEqual(4);
      expect(src).toContain("check: function(d) { return (d.targetsHit || 0) >= 3; }");
    });
  });

  it('Clear Trails empties the arrays in place (fresh arrays were overwritten by the draw loop)', () => {
    PHYSICS_PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).not.toContain('cv._trails = []; cv._impactParticles = []; cv._landingMarkers = [];');
      expect(src).toContain("['_trails', '_impactParticles', '_landingMarkers'].forEach(function (k) { if (Array.isArray(cv[k])) cv[k].length = 0;");
    });
  });

  it('data panels refresh during flight and export every integrator point as CSV', () => {
    PHYSICS_PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain("if (!cv || !cv._launched || cv._liveTimer) return;");
      expect(src).toContain("bump('liveTick', 1);");
      expect(src).toContain('function physFlightCsv()');
      expect(src).toContain("lines.push('t_s,x_m,y_m,vx_mps,vy_mps,speed_mps');");
      expect(src).toContain("__alloT('stem.physics.copy_csv', 'Copy CSV')");
    });
  });

  it('mirror copies are identical', () => {
    expect(readFileSync(PHYSICS_PATHS[0], 'utf8')).toBe(readFileSync(PHYSICS_PATHS[1], 'utf8'));
  });
});

describe('no STEM tool has a `return` split from its expression by a comment', () => {
  // `return // comment\n  <expr>` returns undefined (ASI) and the expression
  // becomes dead code. This is exactly how the physics hint went missing.
  it('scans every stem_lab/stem_tool_*.js', () => {
    const offenders = [];
    readdirSync('stem_lab').filter((f) => /^stem_tool_.*\.js$/.test(f)).forEach((f) => {
      const src = readFileSync('stem_lab/' + f, 'utf8');
      const lines = src.split('\n');
      lines.forEach((ln, i) => {
        if (/\breturn\s*\/\//.test(ln)) offenders.push(f + ':' + (i + 1));
      });
    });
    expect(offenders).toEqual([]);
  }, 180000); // 147 tools; OneDrive hydration made a cold read take ~47 s
});

describe('physics integrator behaviour (jsdom)', () => {
  let P;
  beforeAll(() => {
    // The tool is a browser IIFE; jsdom supplies window/document and the
    // file's own StemLab guard supplies the registry.
    const src = readFileSync(PHYSICS_PATHS[0], 'utf8');
    new Function(src)();
    P = window.StemLab._physics;
  });

  it('exposes the shared integrator', () => {
    expect(P).toBeTruthy();
    expect(typeof P.simulate).toBe('function');
    expect(P.DT).toBeCloseTo(0.035, 6);
  });

  it('matches the closed-form range without drag', () => {
    const ideal = (25 * 25 * Math.sin(Math.PI / 2)) / 9.8; // 63.78 m
    const r = P.simulate(45, 25, 9.8, false, 1).range;
    expect(Math.abs(r - ideal) / ideal).toBeLessThan(0.02);
  });

  it('drag shortens the flight but keeps it forward, and heavier balls carry further', () => {
    const off = P.simulate(45, 25, 9.8, false, 1).range;
    const on1 = P.simulate(45, 25, 9.8, true, 1).range;
    const on10 = P.simulate(45, 25, 9.8, true, 10).range;
    expect(on1).toBeGreaterThan(off * 0.6);
    expect(on1).toBeLessThan(off);
    expect(on10).toBeGreaterThan(on1);
    expect(on10).toBeLessThan(off);
  });

  it('optimum angle drops below 45° through air at high speed', () => {
    let best = null;
    for (let a = 20; a <= 70; a++) {
      const r = P.simulate(a, 50, 9.8, true, 1).range;
      if (!best || r > best.r) best = { a, r };
    }
    expect(best.a).toBeLessThan(45);
    expect(best.a).toBeGreaterThan(35);
  });

  it('a zero-length step leaves the state untouched (pause cannot drain velocity)', () => {
    const b = { mX: 3, mY: 4, mVx: 17.68, mVy: 17.68, grav: 9.8, drag: P.DRAG_K, mass: 1, t: 1 };
    P.step(b, 0);
    expect(b.mVx).toBeCloseTo(17.68, 9);
    expect(b.mVy).toBeCloseTo(17.68, 9);
    expect(b.mX).toBe(3);
    expect(Number.isFinite(b.mVx)).toBe(true);
  });

  it('the Target Mode helper solves the drag rounds so the suggested value really lands', () => {
    // Round 7: angle locked 35°, crate at 90 m, drag on, tolerance 15.
    const v = P.solveVelocity(35, 90, 9.8, true, 1);
    expect(v).not.toBeNull();
    expect(v).toBeLessThanOrEqual(50); // within the velocity slider
    expect(Math.abs(P.simulate(35, v, 9.8, true, 1).range - 90)).toBeLessThan(1);
    // Round 10: velocity locked 38 m/s, crate at 85 m, drag on, tolerance 12.
    const a = P.solveAngle(38, 85, 9.8, true, 1);
    expect(a).not.toBeNull();
    expect(a).toBeGreaterThanOrEqual(5);
    expect(a).toBeLessThanOrEqual(85);
    expect(Math.abs(P.simulate(a, 38, 9.8, true, 1).range - 85)).toBeLessThan(1);
    // The old 130 m crate at 38 m/s is genuinely unreachable through air.
    expect(P.solveAngle(38, 130, 9.8, true, 1)).toBeNull();
  });
});
