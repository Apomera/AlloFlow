import { describe, it, expect, afterEach } from 'vitest';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';
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
    expect(off.find('city3d-L1-light')).toBeNull();
    expect(off.find('city3d').props['aria-pressed']).toBe('false');

    const on = click(base(), 'city3d');
    expect(on.city3d).toBe(true);
    const r = render(on);
    expect(r.find('city3d').props['aria-pressed']).toBe('true');
    const el = r.find('city3d-L1-light');
    expect(el).not.toBeNull();
    expect(typeof el.type).toBe('function');
    expect(el.props.scene.levelId).toBe('L1');
    expect(el.props.scene.world).toEqual({ x0: 0, x1: 10, y0: 0, y1: 8 });
    expect(hasFunction(el.props.scene)).toBe(false); // plain data only

    const back = click(on, 'city3d');
    expect(back.city3d).toBe(false);
    expect(render(back).find('city3d-L1-light')).toBeNull();
  });

  it('sends the curve only when the board shows it (hidden-preview tiers stay hidden until Fire)', () => {
    const practice = render(base({ city3d: true })).find('city3d-L1-light').props.scene;
    expect(practice.showPreview).toBe(true);
    expect(practice.samples.length).toBeGreaterThan(10);

    const hidden = render(base({ city3d: true, tier: 'independent' })).find('city3d-L1-light').props.scene;
    expect(hidden.showPreview).toBe(false);
    expect(hidden.samples).toEqual([]);

    const fired = click(base({ city3d: true, tier: 'independent' }), 'fire');
    const after = render(fired).find('city3d-L1-light').props.scene;
    expect(after.fired).toBe(true);
    expect(after.samples.length).toBeGreaterThan(10);
  });

  it('is keyed per level so a level switch rebuilds the scene geometry', () => {
    const l1 = render(base({ city3d: true })).find('city3d-L1-light');
    expect(l1.props.scene.gates.length + l1.props.scene.walls.length).toBeGreaterThanOrEqual(0);
    expect(l1.props.scene.node).toBeTruthy();
    expect(render(base({ city3d: true, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } } })).find('city3d-L3-light')).not.toBeNull();
  });
});

// The 3D view was hard-wired to the dark palette. Students on the contrast theme are
// the ones who most need edges over atmosphere, so the scene has to know the theme —
// and it has to REMOUNT when the theme changes, since materials are built once.
describe('Arc City — the 3D city view follows the theme', () => {
  function withTheme(theme, fn) {
    const el = document.createElement('div');
    if (theme !== 'light') el.className = 'theme-' + theme;
    document.body.appendChild(el);
    try { return fn(); } finally { el.remove(); }
  }
  afterEach(() => { document.querySelectorAll('.theme-dark,.theme-contrast').forEach(n => n.remove()); });

  it('tells the scene which theme it is in', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      withTheme(theme, () => {
        const el = render(base({ city3d: true })).find('city3d-L1-' + theme);
        expect(el, theme + ' must mount the view under its own key').not.toBeNull();
        expect(el.props.scene.theme).toBe(theme);
      });
    }
  });

  it('keys the component by theme so a theme switch rebuilds the scene', () => {
    // Materials, fog and the bloom decision are all made once at build time, so the
    // same key across themes would leave a contrast user looking at the dark scene.
    const darkKey = withTheme('dark', () => render(base({ city3d: true })).find('city3d-L1-dark'));
    const contrastKey = withTheme('contrast', () => render(base({ city3d: true })).find('city3d-L1-contrast'));
    expect(darkKey).not.toBeNull();
    expect(contrastKey).not.toBeNull();
    expect(withTheme('dark', () => render(base({ city3d: true })).find('city3d-L1-contrast'))).toBeNull();
  });
});

// The structure layer (axis of symmetry, midline and amplitude, asymptote, turning
// points) is what each level actually teaches. It used to be built inline as SVG, so
// the 3D view could only have shown it by deriving it a second time — and two
// derivations of one claim is how they drift. Both surfaces now read one array.
describe('Arc City — structure guides come from one derivation', () => {
  const level = (id) => ArcMod.levelById ? ArcMod.levelById(id) : (ArcMod.default || ArcMod).levelById(id);
  const guides = (...a) => (ArcMod.default || ArcMod).arcStructureGuides(...a);

  it('is exported as a pure function of the level, the params and the tier', () => {
    const L3 = level('L3'); // parabola
    const g = guides(L3, { a: -0.5, h: 5, k: 5 }, 'independent');
    expect(g.map(x => x.kind)).toEqual(['axis', 'vertex']);
    expect(g[0].x).toBe(5);
    expect(g[1]).toMatchObject({ x: 5, y: 5 });
    // The practice tier already labels the vertex with a draggable handle, so the
    // second marker is suppressed there rather than naming one point twice.
    expect(guides(L3, { a: -0.5, h: 5, k: 5 }, 'practice').map(x => x.kind)).toEqual(['axis']);
  });

  it('names the exponential floor or ceiling by the sign of a', () => {
    const L7 = level('L7');
    expect(guides(L7, { a: 5, b: -0.4, k: 1 }, 'practice')[0].label).toMatch(/floor/);
    expect(guides(L7, { a: -5, b: -0.4, k: 1 }, 'practice')[0].label).toMatch(/ceiling/);
    expect(guides(L7, { a: 5, b: -0.4, k: 1 }, 'practice')[0].ceiling).toBe(false);
  });

  it('drops guides whose feature has left the visible world', () => {
    const L3 = level('L3');
    expect(guides(L3, { a: -0.5, h: 99, k: 5 }, 'practice')).toEqual([]); // axis off-board
  });

  it('hands the 3D view the same guides the board draws — and none when the board hides them', () => {
    const shown = render(base({ city3d: true, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } } }));
    const scene = shown.find('city3d-L3-light').props.scene;
    expect(scene.guides.length).toBeGreaterThan(0);
    expect(shown.find('axis-sym'), 'the board draws the same guide').not.toBeNull();
    // An untouched board shows the level's defaults, so that is what both surfaces
    // must be describing. Deep equality here is the whole point: same array, not a
    // second derivation that happens to agree today.
    const arc = ArcMod.default || ArcMod;
    expect(scene.guides).toEqual(guides(level('L3'), arc.defaultParams(level('L3')), 'practice'));

    // Hidden-preview tiers: the guides are curve-derived, so passing them to the 3D
    // view would leak exactly what that tier conceals.
    const hidden = render(base({ city3d: true, levelId: 'L3', tier: 'independent', byLevel: { L1: { solved: true }, L2: { solved: true } } }));
    expect(hidden.find('city3d-L3-light').props.scene.guides).toEqual([]);
    expect(hidden.find('axis-sym')).toBeNull();
  });
});

// Post-shot measurements: how far short of the node you finished, the tangent the
// gate rejected, the worst disagreement with a match target. Same reasoning as the
// guides — one derivation, read by the board's overlay, its analysis layer and the
// city view, so a drawn measurement can never contradict the sentence the player hears.
describe('Arc City — shot analysis comes from one derivation', () => {
  const arc = () => (ArcMod.default || ArcMod);
  const L3 = () => arc().levelById('L3');

  it('measures a near miss off the same samples the adjudication judged', () => {
    const lvl = L3();
    // A shot that CLEARS the wall and the gate but slides past the node. The level
    // defaults hit the wall, which produces no gap at all, so using them here would
    // have made this assertion pass without ever running.
    const params = { a: -1.05, h: 5, k: 6.5 };
    const res = arc().classifyShot(lvl, params);
    expect(res.result, 'the fixture must actually be a near miss').toBe('miss');
    const samples = arc().sampleCurve(lvl, params);
    const out = arc().arcShotAnalysis(lvl, res, samples, false, (k, d) => d);
    const gap = out.find(a => a.kind === 'missgap');
    expect(gap, 'a near miss must produce a measurable gap').toBeTruthy();
    expect(gap.to).toEqual({ x: lvl.node.x, y: lvl.node.y });
    // The label must quote the SAME distance the result carries, not a re-measure.
    expect(gap.label).toContain(String(Math.round(res.nodeDist * 10) / 10));
    // The near point must actually be one of the judged samples.
    expect(samples.some(s => s.x === gap.from.x && s.y === gap.from.y)).toBe(true);
  });

  it('produces nothing for a hit', () => {
    const lvl = L3();
    const params = { a: -0.5, h: 5, k: 5 }; // the golden-pinned hit
    const res = arc().classifyShot(lvl, params);
    expect(res.result).toBe('hit');
    expect(arc().arcShotAnalysis(lvl, res, arc().sampleCurve(lvl, params), false, (k, d) => d)).toEqual([]);
  });

  it('hands the city view the same measurements the board draws, and none before firing', () => {
    const solved = { L1: { solved: true }, L2: { solved: true } };
    const unfired = render(base({ city3d: true, levelId: 'L3', byLevel: solved }));
    expect(unfired.find('city3d-L3-light').props.scene.analysis).toEqual([]);
    expect(unfired.find('missgap'), 'nothing is measured until a shot is fired').toBeNull();

    // Seeded with a shot that really does miss the node, so the comparison below has
    // something in it — comparing two empty arrays would prove nothing.
    const params = { a: -1.05, h: 5, k: 6.5 };
    const fired = click(base({ city3d: true, levelId: 'L3', byLevel: Object.assign({}, solved, { L3: { params } }) }), 'fire');
    const r = render(fired);
    const scene = r.find('city3d-L3-light').props.scene;
    const lvl = L3();
    const expected = arc().arcShotAnalysis(lvl, arc().classifyShot(lvl, params), arc().sampleCurve(lvl, params), false, (k, d) => d);
    expect(expected.length, 'the fixture must produce a measurement').toBeGreaterThan(0);
    expect(scene.analysis).toEqual(expected);
    expect(r.find('missgap'), 'the board draws the same measurement').not.toBeNull();
  });
});

// A Transformations level has no node to light and no gate to thread — the goal is to
// overlay the ghost. describeBoard says exactly that, but the board's legend and its
// coordinate list were unconditional and still announced a node and a gate, so the
// board's own summaries contradicted its narration and pointed the player at a target
// that is neither drawn nor judged.
describe('Arc City — the board summaries agree with the goal', () => {
  const solvedFour = {
    L1: { solved: true, independent: true }, L3: { solved: true, independent: true },
    L4: { solved: true, independent: true }, L5: { solved: true, independent: true }
  };
  const at = (levelId) => render({ schemaVersion: 2, levelId, byLevel: solvedFour, tier: 'practice', badges: [], fired: false });

  it('a match level never advertises a node to light or a gate it does not have', () => {
    const r = at('L11');
    expect(r.text, 'the level really is a match goal').toMatch(/match the ghost curve/i);
    expect(r.text).not.toMatch(/node to light/i);
    expect(r.text).not.toMatch(/Node \(target\)/i);
    expect(r.text).not.toMatch(/pass through the opening/i);
    // ...and says what IS judged instead.
    expect(r.text).toMatch(/Target curve:/i);
    expect(r.text).toMatch(/stay within/i);
  });

  it('an ordinary level still names its node, and its gate only when it has one', () => {
    const r = at('L3');
    expect(r.text).toMatch(/node to light/i);
    expect(r.text).toMatch(/Node \(target\)/i);
    const lvl = (ArcMod.default || ArcMod).levelById('L3');
    const hasGate = (lvl.gates || []).length > 0;
    expect(/pass through the opening/i.test(r.text), 'gate legend appears iff the level has a gate').toBe(hasGate);
  });

  it('no level advertises a gate it does not have', () => {
    const arc = ArcMod.default || ArcMod;
    for (const id of ['L1', 'L3', 'L4', 'L5', 'L11']) {
      const lvl = arc.levelById(id);
      if (lvl.goal === 'match') continue;
      const hasGate = (lvl.gates || []).length > 0;
      expect(/pass through the opening/i.test(at(id).text), id).toBe(hasGate);
    }
  });
});
