// Arc City — Circuit Clash board integrity + readability.
//
// The load-bearing test here is the filter one. The battle board referenced
// url(#arc-glow) seven times while defining no <filter> at all: the play view owns
// the defs block and the play view is not mounted in battle mode. Per SVG, an
// unresolvable filter IRI means the element is NOT RENDERED — so the board was
// silently dropping the player's own authored curve and all six relay targets.
// A tree-level test cannot see "the browser refused to paint it", so it guards the
// invariant instead: every filter this board references must be defined in it.

import { describe, it, expect } from 'vitest';
import { render } from './helpers/arc_harness.js';

function all(tree, pred) {
  const out = [];
  (function w(n) {
    if (n == null || n === false || n === true) return;
    if (Array.isArray(n)) { n.forEach(w); return; }
    if (typeof n === 'object') { if (pred(n)) out.push(n); if (n.children) n.children.forEach(w); }
  })(tree);
  return out;
}
const battle = (extra) => render(Object.assign({ levelId: 'L1', byLevel: {}, view: 'battle', tier: 'practice', fired: false, badges: [], introSeen: true }, extra || {}));

describe('Circuit Clash — every filter it uses is defined in it', () => {
  it('defines arc-glow, and no filter reference dangles', () => {
    const r = battle();
    const defined = all(r.tree, n => n.type === 'filter').map(n => n.props.id);
    expect(defined).toContain('arc-glow');
    const refs = all(r.tree, n => n.props && typeof n.props.filter === 'string')
      .map(n => ({ key: n.props.key, id: (n.props.filter.match(/url\(#([^)]+)\)/) || [])[1] }));
    expect(refs.length, 'the board does use filters').toBeGreaterThan(0);
    const dangling = refs.filter(x => defined.indexOf(x.id) === -1);
    expect(dangling, 'an unresolvable filter IRI means the element is not rendered').toEqual([]);
  });

  it('the elements that were being dropped are the ones that matter: the curve and the targets', () => {
    const r = battle();
    // the player's authored preview and all six relay nodes carry the glow
    expect(r.find('battle-preview').props.filter).toBe('url(#arc-glow)');
    for (const seat of [0, 1]) for (const lane of [0, 1, 2]) {
      expect(r.find('brelay' + seat + '-' + lane), 'relay ' + seat + '-' + lane).not.toBeNull();
    }
  });

  it('holds for the play view too, which owns the defs', () => {
    const r = render({ levelId: 'L3', byLevel: {}, tier: 'practice', fired: true, badges: [], introSeen: true });
    const defined = all(r.tree, n => n.type === 'filter').map(n => n.props.id);
    const refs = all(r.tree, n => n.props && typeof n.props.filter === 'string')
      .map(n => (n.props.filter.match(/url\(#([^)]+)\)/) || [])[1]);
    expect(refs.filter(id => defined.indexOf(id) === -1)).toEqual([]);
  });
});

describe('Circuit Clash — the board can be read', () => {
  it('numbers its axes, so an authored y = m·x + b is not aimed at unlabelled gridlines', () => {
    const r = battle();
    expect(r.find('btx5')).not.toBeNull();
    expect(r.find('bty4')).not.toBeNull();
    expect(r.find('btx5').props['aria-hidden']).toBe('true'); // positions are in the aria-label
  });

  it('marks the halfway line between the two mirrored halves', () => {
    const r = battle();
    const mid = r.find('bmid');
    expect(mid).not.toBeNull();
    expect(mid.props.x1).toBe(mid.props.x2);
    expect(mid.props['aria-hidden']).toBe('true');
  });

  it('draws gate openings and wall caps, matching the play board', () => {
    // the Arc lane (parabola, index 1) is the one carrying a wall and a gate
    const r = battle({ battle: { mode: 'cpu', selectedLane: [1, 1] } });
    expect(r.text).toMatch(/Arc Circuit/);
    const slots = all(r.tree, n => n.props && /^bgslot/.test(n.props.key || ''));
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].props['aria-hidden']).toBe('true');
    expect(Number(slots[0].props.height)).toBeGreaterThan(0);
    const lips = all(r.tree, n => n.props && /^bglip/.test(n.props.key || ''));
    expect(lips.length).toBe(slots.length * 2);
  });
});
