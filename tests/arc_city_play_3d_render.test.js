import { describe, it, expect } from 'vitest';
import { render, click } from './helpers/arc_harness.js';

// The Play-mode "City view" is a visual peer of the SVG board: it mounts only on
// request, it receives plain data (nothing it could adjudicate with), and it can
// never see MORE of the curve than the board itself shows (anti-fishing gate).

const base = (extra) => Object.assign({ schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], fired: false }, extra || {});

function hasFunction(v, seen = new Set()) {
  if (typeof v === 'function') return true;
  if (!v || typeof v !== 'object' || seen.has(v)) return false;
  seen.add(v);
  return Object.keys(v).some(k => hasFunction(v[k], seen));
}

describe('Arc City render — optional Play 3D city view', () => {
  it('mounts only when toggled, and the toggle persists in tool state', () => {
    const off = render(base());
    expect(off.find('city3d-L1')).toBeNull();
    expect(off.find('city3d').props['aria-pressed']).toBe('false');

    const on = click(base(), 'city3d');
    expect(on.city3d).toBe(true);
    const r = render(on);
    expect(r.find('city3d').props['aria-pressed']).toBe('true');
    const el = r.find('city3d-L1');
    expect(el).not.toBeNull();
    expect(typeof el.type).toBe('function');
    expect(el.props.scene.levelId).toBe('L1');
    expect(el.props.scene.world).toEqual({ x0: 0, x1: 10, y0: 0, y1: 8 });
    expect(hasFunction(el.props.scene)).toBe(false); // plain data only

    const back = click(on, 'city3d');
    expect(back.city3d).toBe(false);
    expect(render(back).find('city3d-L1')).toBeNull();
  });

  it('sends the curve only when the board shows it (hidden-preview tiers stay hidden until Fire)', () => {
    const practice = render(base({ city3d: true })).find('city3d-L1').props.scene;
    expect(practice.showPreview).toBe(true);
    expect(practice.samples.length).toBeGreaterThan(10);

    const hidden = render(base({ city3d: true, tier: 'independent' })).find('city3d-L1').props.scene;
    expect(hidden.showPreview).toBe(false);
    expect(hidden.samples).toEqual([]);

    const fired = click(base({ city3d: true, tier: 'independent' }), 'fire');
    const after = render(fired).find('city3d-L1').props.scene;
    expect(after.fired).toBe(true);
    expect(after.samples.length).toBeGreaterThan(10);
  });

  it('is keyed per level so a level switch rebuilds the scene geometry', () => {
    const l1 = render(base({ city3d: true })).find('city3d-L1');
    expect(l1.props.scene.gates.length + l1.props.scene.walls.length).toBeGreaterThanOrEqual(0);
    expect(l1.props.scene.node).toBeTruthy();
    expect(render(base({ city3d: true, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } } })).find('city3d-L3')).not.toBeNull();
  });
});
