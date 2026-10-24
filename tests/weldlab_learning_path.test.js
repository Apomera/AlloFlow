import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const read = () => readFileSync(resolve(process.cwd(), SRC), 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

const badgeIds = () => {
  const m = /var BADGE_IDS = \[([^\]]+)\]/.exec(read());
  return m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
};
const pathUnits = () => {
  const src = read();
  const block = src.slice(src.indexOf('var PATH_UNITS = ['), src.indexOf('var PATH_ORDER = [];'));
  return [...block.matchAll(/key: '([a-z]+)'[\s\S]*?mods: \[([^\]]+)\]/g)].map((m) => ({
    key: m[1],
    mods: m[2].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean),
  }));
};

describe('WeldLab learning path', () => {
  // Twenty-four equal cards gave a newcomer no order to work in. The path is a
  // second hand-kept list beside BADGE_IDS, which is exactly the shape that
  // drifted twice before (24 cards / 22 badges / 11 labels), so pin it to them.
  it('places every module in exactly one unit, and nothing else', () => {
    const units = pathUnits();
    expect(units.length).toBe(7);
    const all = units.flatMap((u) => u.mods);
    const ids = badgeIds();
    expect(all.filter((m) => !ids.includes(m)), 'unit module with no badge').toEqual([]);
    expect(ids.filter((i) => !all.includes(i)), 'badge in no unit').toEqual([]);
    expect(new Set(all).size, 'module listed in two units').toBe(all.length);
  });

  it('opens on the path, and keeps the full grid one switch away', () => {
    const path = renderTool('weldLab', { weldLab: {} });
    expect(path).toContain('Big question');
    expect(path).toContain('Safety first');
    expect(path).not.toContain('Core Simulators');
    const grid = renderTool('weldLab', { weldLab: { menu_mode: 'all' } });
    expect(grid).toContain('Core Simulators');
    expect(grid).not.toContain('Big question');
  });

  it('treats a nonsense saved mode as the default path rather than a blank menu', () => {
    [42, 'xyz', null, { a: 1 }, ['all']].forEach((bad) => {
      const html = renderTool('weldLab', { weldLab: { menu_mode: bad } });
      expect(html).toContain('Big question');
    });
  });

  it('points the nudge along the path: safety before the arc', () => {
    const tryNext = (html) => {
      const at = html.indexOf('Try next');
      return html.slice(at, at + 200);
    };
    expect(tryNext(renderTool('weldLab', { weldLab: {} }))).toContain('PPE &amp; Safety');
    const afterSafety = renderTool('weldLab', { weldLab: { weldBadges: { ppeSafety: true, safetyHealth: true } } });
    expect(tryNext(afterSafety)).toContain('Heat Input Calculator');
  });

  it('counts unit progress from the badges', () => {
    const html = renderTool('weldLab', { weldLab: { weldBadges: { ppeSafety: true } } });
    expect(html).toContain('1 / 2 explored');
    expect(html).toContain('0 / 4 explored');
  });
});

describe('WeldLab catalog tile in the contrast theme', () => {
  it('drops its cream gradient, which left the forced-yellow ink unreadable', () => {
    const plain = renderTool('weldLab', { weldLab: {} });
    expect(plain).toMatch(/linear-gradient\(110deg/);
    const contrast = renderTool('weldLab', { weldLab: {} }, { isContrast: true });
    expect(contrast).not.toMatch(/linear-gradient\(110deg/);
  });
});

describe('WeldLab shared bead geometry', () => {
  // The old Bead Lab width saturated at its 0.55" clamp from 2.3 kJ/in up, so
  // every realistic setting drew the identical bead. These pin the classroom
  // process triangle: amps feed metal and depth, volts spread it, speed sizes it.
  const g = (V, A, TS, P = 'mig', M = 'steel', TH = 0.25) => window.__WeldLabCore.beadGeometry(V, A, TS, P, M, TH);

  it('responds to travel speed: faster is narrower and lower', () => {
    const slow = g(22, 180, 6), mid = g(22, 180, 12), fast = g(22, 180, 24);
    expect(slow.width).toBeGreaterThan(mid.width);
    expect(mid.width).toBeGreaterThan(fast.width);
    expect(slow.reinf).toBeGreaterThan(mid.reinf);
    expect(mid.reinf).toBeGreaterThan(fast.reinf);
  });

  it('leaves a ropier, more convex bead when travel is too fast', () => {
    // A shop sees a narrow, humped bead with poor tie-in at the toes when the
    // torch outruns the puddle, and a flatter, wetted-out bead when it is slow.
    const slow = g(22, 180, 6), mid = g(22, 180, 12), fast = g(22, 180, 24);
    expect(fast.toeAngle).toBeGreaterThan(mid.toeAngle);
    expect(mid.toeAngle).toBeGreaterThan(slow.toeAngle);
  });

  it('spreads the bead with voltage and flattens its toe', () => {
    const low = g(18, 180, 12), high = g(26, 180, 12);
    expect(high.width).toBeGreaterThan(low.width);
    expect(high.toeAngle).toBeLessThan(low.toeAngle);
    expect(high.reinf).toBeLessThan(low.reinf);
  });

  it('spreads with voltage even at EQUAL heat input: volts widen, amps deepen', () => {
    // 18 V x 220 A and 26 V x 152.3 A put the same kJ/in into the plate. Arc
    // length still spreads the high-voltage bead wider and flatter, while the
    // high-amperage bead penetrates deeper for its width. Without this case a
    // model that ignored voltage's own effect passed, because voltage also
    // raises heat input.
    const lowV = g(18, 220, 12), highV = g(26, 3960 / 26, 12);
    expect(lowV.net).toBeCloseTo(highV.net, 6);
    expect(highV.width).toBeGreaterThan(lowV.width * 1.1);
    expect(highV.toeAngle).toBeLessThan(lowV.toeAngle);
    expect(lowV.depArea).toBeGreaterThan(highV.depArea);
  });

  it('deposits more metal and digs deeper with amperage', () => {
    const lo = g(22, 120, 12), hi = g(22, 250, 12);
    expect(hi.depArea).toBeGreaterThan(lo.depArea);
    expect(hi.penetration).toBeGreaterThan(lo.penetration);
    expect(hi.width).toBeGreaterThan(lo.width);
  });

  it('no longer saturates: two very different settings draw different beads', () => {
    expect(g(16, 90, 25).width).not.toBeCloseTo(g(30, 300, 6).width, 2);
  });

  it('lands the module default on a realistic stringer bead', () => {
    const d = g(22, 180, 12);
    expect(d.width).toBeGreaterThan(0.25);
    expect(d.width).toBeLessThan(0.45);
    // ~1/16 to 1/8 in, not the old 0.013 in smear
    expect(d.reinf).toBeGreaterThan(0.0625);
    expect(d.reinf).toBeLessThan(0.125);
  });

  it('reuses the calibrated penetration model rather than a second one', () => {
    const { beadPenetration, heatInputNet, MATERIAL } = window.__WeldLabCore;
    [[22, 180, 12, 'mig', 'steel'], [24, 130, 6, 'stick', 'stainless'], [14, 150, 5, 'tig', 'aluminum']].forEach(([V, A, TS, P, M]) => {
      expect(g(V, A, TS, P, M).penetration).toBeCloseTo(beadPenetration(heatInputNet(V, A, TS, P), 0.25, MATERIAL[M].kFactor), 10);
    });
  });

  it('stays finite for junk input', () => {
    [[NaN, 180, 12], [22, -5, 12], [22, 180, 0], ['x', null, undefined]].forEach(([V, A, TS]) => {
      const r = g(V, A, TS, 'nope', 'unobtainium', NaN);
      Object.values(r).forEach((v) => expect(Number.isFinite(v)).toBe(true));
    });
  });
});

describe('WeldLab radiogroup arrows in a first-pick-final quiz', () => {
  // radioGroupKeys follows the APG: an arrow moves focus AND selects. In a quiz
  // that locks on the first pick, "select" means "submit", so an arrow pressed
  // only to move would commit the neighbouring answer. Such groups opt out with
  // data-arrow-select="false": the arrow moves focus, Enter/Space picks.
  const build = (optOut) => {
    const group = document.createElement('div');
    group.setAttribute('role', 'radiogroup');
    if (optOut) group.setAttribute('data-arrow-select', 'false');
    const clicks = [];
    const radios = [0, 1, 2].map((i) => {
      const b = document.createElement('button');
      b.setAttribute('role', 'radio');
      b.addEventListener('click', () => clicks.push(i));
      group.appendChild(b);
      return b;
    });
    document.body.appendChild(group);
    return { group, radios, clicks };
  };
  const press = (group, target, key) => {
    let prevented = false;
    window.__WeldLabCore.radioGroupKeys({ key, currentTarget: group, target, preventDefault: () => { prevented = true; } });
    return prevented;
  };

  it('still selects on arrow in an ordinary picker', () => {
    const { group, radios, clicks } = build(false);
    expect(press(group, radios[0], 'ArrowRight')).toBe(true);
    expect(clicks).toEqual([1]);
    expect(document.activeElement).toBe(radios[1]);
    group.remove();
  });

  it('moves focus without committing in an opted-out quiz group', () => {
    const { group, radios, clicks } = build(true);
    expect(press(group, radios[0], 'ArrowRight')).toBe(true);
    expect(press(group, radios[1], 'End')).toBe(true);
    expect(clicks).toEqual([]);
    expect(document.activeElement).toBe(radios[2]);
    group.remove();
  });
});
