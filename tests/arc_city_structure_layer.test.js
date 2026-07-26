// Arc City — the structure layer.
//
// Every level teaches one feature of its function family, and until this pass none
// of them were drawn: the slider said "midline" and the board showed nothing. These
// tests pin that each family's defining object appears, that it is derived from the
// same params the beam is sampled from, and — the load-bearing one — that the whole
// layer obeys the hidden-preview integrity gate (§2.4), because every guide is
// curve-derived and would otherwise hand back exactly what that tier conceals.

import { describe, it, expect } from 'vitest';
import { render } from './helpers/arc_harness.js';

const practice = (levelId, params, extra) => Object.assign({
  levelId, byLevel: params ? { [levelId]: { params, shots: 0, misses: 0 } } : {},
  tier: 'practice', fired: false, badges: [], introSeen: true
}, extra || {});

describe('Arc City structure layer — each family shows the object it teaches', () => {
  it('parabola: the axis of symmetry, at x = h', () => {
    const r = render(practice('L3', { a: -0.5, h: 4, k: 5 }));
    const axis = r.find('axis-sym');
    expect(axis).not.toBeNull();
    expect(axis.props['aria-hidden']).toBe('true');
    expect(axis.props.x1).toBe(axis.props.x2);          // vertical: it IS the fold line
    expect(r.text).toMatch(/x = 4\.00/);
    // and it tracks h rather than sitting at a fixed place
    const moved = render(practice('L3', { a: -0.5, h: 7, k: 5 }));
    expect(moved.find('axis-sym').props.x1).toBeGreaterThan(axis.props.x1);
  });

  it('absolute value: the same fold line, because a V has one too', () => {
    expect(render(practice('L4', { a: 0.5, h: 5, k: 3 })).find('axis-sym')).not.toBeNull();
  });

  it('sine: the midline it oscillates about, plus the amplitude reaching off it', () => {
    const r = render(practice('L5', { a: 2.5, b: 1.0472, c: 1, k: 4 }));
    const mid = r.find('midline');
    expect(mid).not.toBeNull();
    expect(mid.props.y1).toBe(mid.props.y2);            // horizontal: it IS the centre
    expect(r.text).toMatch(/midline y = 4/);
    const amp = r.find('amp');
    expect(amp).not.toBeNull();
    expect(amp.props.y1).not.toBe(amp.props.y2);        // vertical reach off the midline
    expect(r.text).toMatch(/a = 2\.50/);
  });

  it('exponential: the floor it approaches and never crosses — L7 is about nothing else', () => {
    const r = render(practice('L7', { a: 5, b: -0.4, k: 1 }));
    expect(r.find('asymptote')).not.toBeNull();
    expect(r.text).toMatch(/floor y = 1\.0 — never crossed/);
  });

  it('exponential: names it a CEILING when the curve rises to it instead', () => {
    const r = render(practice('L7', { a: -5, b: -0.4, k: 1 }));
    expect(r.text).toMatch(/ceiling y = 1\.0/);
  });

  it('cubic: both turning points, where the player put them', () => {
    const r = render(practice('L9', { a: 0.12, p: 2.5, q: 6.5, k: 4 }));
    expect(r.find('turndot-p')).not.toBeNull();
    expect(r.find('turndot-q')).not.toBeNull();
    expect(r.text).toMatch(/crest p=2\.50/);
    expect(r.text).toMatch(/dip q=6\.50/);
  });

  it('line levels get no guide — the beam already IS the slope', () => {
    const r = render(practice('L2', { m: -0.5, b: 4 }));
    expect(r.find('axis-sym')).toBeNull();
    expect(r.find('midline')).toBeNull();
  });

  it('does not duplicate the practice tier\'s labelled vertex handle', () => {
    expect(render(practice('L3', { a: -0.5, h: 4, k: 5 })).find('vertex-dot')).toBeNull();
    // on a tier with no handle, the vertex is marked instead — after Fire reveals the curve
    const indep = render(Object.assign(practice('L3', { a: -0.5, h: 4, k: 5 }), { tier: 'independent', fired: true }));
    expect(indep.find('vertex-dot')).not.toBeNull();
  });
});

describe('Arc City structure layer — it obeys the anti-fishing gate (§2.4)', () => {
  it('draws nothing while the preview is hidden, on every family', () => {
    for (const [id, params, key] of [
      ['L3', { a: -0.5, h: 4, k: 5 }, 'axis-sym'],
      ['L5', { a: 2.5, b: 1.0472, c: 1, k: 4 }, 'midline'],
      ['L7', { a: 5, b: -0.4, k: 1 }, 'asymptote'],
      ['L9', { a: 0.12, p: 2.5, q: 6.5, k: 4 }, 'turndot-p']
    ]) {
      const hidden = render(Object.assign(practice(id, params), { tier: 'independent', fired: false }));
      expect(hidden.find(key), id + ' leaked ' + key + ' before Fire').toBeNull();
      const revealed = render(Object.assign(practice(id, params), { tier: 'independent', fired: true }));
      expect(revealed.find(key), id + ' should reveal ' + key + ' after Fire').not.toBeNull();
    }
  });

  it('the y-intercept marker is gated too — it is a point ON the hidden curve', () => {
    const shown = render(practice('L2', { m: -0.5, b: 4 }));
    expect(shown.find('bdot')).not.toBeNull();
    const hidden = render(Object.assign(practice('L2', { m: -0.5, b: 4 }), { tier: 'independent', fired: false }));
    expect(hidden.find('bdot')).toBeNull();
  });
});

describe('Arc City structure layer — post-shot analysis sits on top of the shot', () => {
  it('a rejected slope-gate draws the angle you arrived at beside the angle demanded', () => {
    // L6 gate 1 at x=3 needs slope +1.5; a flat-ish arc arrives wrong
    const r = render(Object.assign(practice('L6', { a: -0.2, h: 5, k: 4 }), { fired: true }));
    expect(r.text).toMatch(/wrong angle/);              // the sentence the SR hears
    const actual = r.find('actual-slope');
    expect(actual).not.toBeNull();
    expect(actual.props['aria-hidden']).toBe('true');
    expect(r.text).toMatch(/yours /);
    expect(r.text).toMatch(/needs 1\.5/);
  });

  it('a match miss points at the worst disagreement and measures it', () => {
    const r = render(Object.assign(practice('L11', { a: 0.3, h: 2, k: 1 }), { fired: true }));
    const gap = r.find('matchgap');
    expect(gap).not.toBeNull();
    expect(gap.props.x1).toBe(gap.props.x2);            // a vertical measurement at one x
    expect(r.find('matchgap-you')).not.toBeNull();
    expect(r.find('matchgap-ghost')).not.toBeNull();
    expect(r.text).toMatch(/off by /);
  });

  it('a matched curve is not annotated with a gap it no longer has', () => {
    const r = render(Object.assign(practice('L11', { a: 0.3, h: 5, k: 3 }), { fired: true }));
    expect(r.find('matchgap')).toBeNull();
    expect(r.text).toMatch(/MATCHED!/);
  });

  it('analysis is drawn after the beam, so a measurement is never hidden by the shot', () => {
    const r = render(Object.assign(practice('L6', { a: -0.2, h: 5, k: 4 }), { fired: true }));
    const kids = r.find('svg').children.flat(Infinity).filter(Boolean);
    const beamAt = kids.findIndex(n => n.props && /^beam-/.test(n.props.key || ''));
    const analysisAt = kids.findIndex(n => n.props && n.props.key === 'actual-slope');
    const structureAt = kids.findIndex(n => n.props && n.props.key === 'axis-sym');
    expect(beamAt).toBeGreaterThan(-1);
    expect(analysisAt).toBeGreaterThan(beamAt);         // measurement on top
    expect(structureAt).toBeLessThan(beamAt);           // guides underneath
  });
});
