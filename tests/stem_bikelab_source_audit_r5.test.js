// Bike Lab source audit, 2026-11-23 (Aaron: "if you're not finding the sources they could be hallucinated so please
// remove unsubstantiated facts"). Each removed claim stays out; each corrected claim keeps its sourced wording; the two
// sentences that disagreed with the tool's own model now read the model; the menu chart labels no longer collide.
// BIKELAB_SRC points the suite at another copy for the fail-first check.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(process.env.BIKELAB_SRC || 'stem_lab/stem_tool_bikelab.js', 'utf8').replace(/\r\n/g, '\n');
// What students can see: the source without its line comments (the comments name the removed claims and their sources).
const code = src.replace(/(^|\s)\/\/[^\n]*/g, '$1');
const model = () => {
  const a = src.indexOf('  var BIKES = ['), e = src.indexOf('  // SECTION 3');
  if (a < 0 || e < 0) throw new Error('model anchors missing');
  return new Function(src.slice(a, src.lastIndexOf('\n', e)) + '\nreturn { BIKES, TERRAINS, rideForces, brakingStop };')();
};

describe('claims with no source found are gone', () => {
  it('statistics and specs that no primary source backs are removed', () => {
    for (const s of ['most riders use about 8', 'by about a fifth', 'about three times the push of smooth road tires',
      'The #1 roadside repair', 'lasts 3× longer', '1 mm of toe', 'Wait 60–90 s', 'for 30 seconds', 'Peel the clear film off only after',
      '3.4mm (most common)', '5 Nm (carbon steerer) or 7 Nm (aluminum)', 'Pro racer: 0.3 s', 'Front brake does ~70% of the work',
      'locked front = over the bars', 'most bike crashes happen close to home', 'legal in Maine and most states', 'illegal in most states',
      'Universal in the US', 'double-yellow centerline', 'over ~1500 miles', 'every 150 miles', 'every ~2 chain changes',
      'Replace cable every 2 years', 'replace after 5-10 years', 'threadless hanger', 'wear a groove in the mounting bosses',
      'most slippery when the temperature is close to freezing', 'Many night crashes happen because']) {
      expect(code, s).not.toContain(s);
    }
  });
  it('corrected claims carry their sourced wording', () => {
    expect(src).toContain('count 24 more rivets: the last one should sit on the 12-inch mark');            // Park Tool chain wear
    expect(src).toContain('Replace it at about 0.5% wear (11 or more gears at the back) or 0.75% (10 or fewer)');
    expect(src).toContain('a driver pass a bike in a no-passing zone, but only when it is safe');           // 29-A §2070(1-A)
    expect(src).toContain('may also point the RIGHT arm straight out for a right turn (Title 29-A §2071)');
    expect(src).toContain('riders and passengers under 16 must wear a helmet by law (Title 29-A §2323)');
    expect(src).toContain('no more than 1 or 2 fingers fit under the chin strap');                         // NHTSA
    expect(src).toContain('for over a minute. You can leave the clear film on top.');                      // Park Tool patch
    expect(src).toContain("'A surprise on the road: about 1 to 1.5 s'");                                    // Green 2000
    expect(src).toContain('a skidding front wheel almost always means a fall');                            // Sheldon Brown
  });
  it('changed translated strings use new keys, so stored text for the old wording cannot override them', () => {
    for (const k of ['rear_only_distance_v3', 'reaction_typical_note_v2', 'front_brake_most_work_v2', 'on_dry_pavement_v2',
      'on_gravel_ice_rear_brake_is_safer_v2', 'front_skid_falls_v2',
      'doubling_speed_quadruples_braking_dist_v2']) expect(src, k).toContain("'stem.bikelab." + k + "'");
    // Only the BRAKING part grows with speed squared; the reacting part only doubles, so the total does not quadruple.
    expect(src).not.toContain("'Doubling speed quadruples stopping distance'");
    for (const k of ['rear_only_distance_v2', 'alert_adult_1_0_s_pro_racer_0_3_s', 'front_brake_does_70_of_the_work',
      'locked_rear_skids_locked_front_over_th']) expect(src, k).not.toContain("'stem.bikelab." + k + "'");
  });
});

describe('sentences that now read the model', () => {
  it('the rear-only braking ratio is computed for the chosen surface (dry is not 3×)', () => {
    const M = model();
    const ratio = (s) => M.brakingStop(15, s, 'rear', 1).braking / M.brakingStop(15, s, 'front', 1).braking;
    expect(ratio('dry')).toBeCloseTo(2.31, 2);
    expect(ratio('wet')).toBeCloseTo(3.33, 2);
    expect(src).toContain("ratio: (brakingStop(speedMph, surfKey, 'rear', reaction).braking / brakingStop(speedMph, surfKey, 'front', reaction).braking).toFixed(1)");
  });
  it('the "air pushes back harder than the tires" toast fires on the model forces, not at a fixed 10 mph', () => {
    const M = model(), flat = M.TERRAINS.find((t) => t.id === 'flat');
    const crossMph = (id) => {
      const b = M.BIKES.find((x) => x.id === id);
      for (let v = 0.5; v < 20; v += 0.01) { const f = M.rideForces(b, flat, 0, v, { power: 0, gear: 0.6, wind: 0, riderMass: 70, coasting: true }); if (f.air > f.tires) return v * 2.23694; }
      return Infinity;
    };
    expect(crossMph('hybrid')).toBeLessThan(10);
    for (const id of ['mtb', 'cargo', 'bmx']) expect(crossMph(id), id).toBeGreaterThan(10);   // the old fixed 10 mph text was wrong for these
    expect(src).toContain('if (v > 0.5 && fNow.air > fNow.tires) fire(\'mph10\'');
    expect(src).not.toContain("if (v * 2.23694 >= 10) fire('mph10'");
  });
});

describe('menu fleet chart', () => {
  it('no bike label overlaps another bike\'s label or dot', () => {
    const M = model();
    const a = src.indexOf('var labelPlacement = {'), b = src.indexOf('};', a);
    const placement = new Function('return ' + src.slice(a + 'var labelPlacement = '.length, b + 1))();
    const W = 640, padL = 96, padR = 26, padT = 20, padB = 34, H = 176, plotW = W - padL - padR, plotH = H - padT - padB;
    const xOf = (c) => padL + (c / 0.85) * plotW, yOf = (r) => padT + plotH - (r / 0.015) * plotH;
    const charW = 8.6;   // 14 px bold, a generous average width
    const boxes = M.BIKES.map((bk) => {
      const cx = xOf(Math.min(0.81, bk.cdA)), cy = yOf(Math.min(0.014, bk.crr)), p = placement[bk.id];
      const text = bk.name.split(' ')[0], w = text.length * charW, x = cx + p.dx, y = cy + p.dy;
      const x0 = p.anchor === 'end' ? x - w : p.anchor === 'middle' ? x - w / 2 : x;
      return { id: bk.id, label: [x0, y - 11, x0 + w, y + 3], dot: [cx - 7, cy - 7, cx + 7, cy + 7] };
    });
    const hit = (p, q) => p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3];
    for (const m of boxes) for (const n of boxes) {
      if (m === n) continue;
      expect(hit(m.label, n.label), m.id + ' label vs ' + n.id + ' label').toBe(false);
      expect(hit(m.label, n.dot), m.id + ' label vs ' + n.id + ' dot').toBe(false);
    }
  });
});
