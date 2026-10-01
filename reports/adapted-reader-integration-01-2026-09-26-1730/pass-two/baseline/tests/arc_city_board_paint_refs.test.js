// Arc City — the PLAY board's paint and filter references all resolve.
//
// Sibling of arc_city_battle_board_defs, which guards the same invariant for the
// battle board after a real bug: the board referenced url(#arc-glow) while defining
// no <filter>, and an unresolvable IRI silently drops the paint. The play board now
// carries several conditional defs — the sky, the dark-theme horizon, the vignette —
// each emitted under its own theme/calm condition, and each referenced under a
// condition that has to match exactly. A tree test cannot see "the browser painted
// nothing", so it guards the thing that causes it: no reference may dangle.
//
// Run across every theme AND with calm on, because those are precisely the switches
// that turn the defs on and off.
import { describe, it, expect, afterEach } from 'vitest';
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

// arcTheme() reads the host classes off the document, so the theme is set the same
// way the real shell sets it.
function withTheme(theme, fn) {
  const el = document.createElement('div');
  if (theme !== 'light') el.className = 'theme-' + theme;
  document.body.appendChild(el);
  try { return fn(); } finally { el.remove(); }
}

const IRI = /url\(#([^)]+)\)/;
const state = (extra) => Object.assign({ schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [], fired: false }, extra || {});

afterEach(() => { document.querySelectorAll('.theme-dark,.theme-contrast').forEach(n => n.remove()); });

describe('Arc City play board — every paint/filter IRI it uses is defined in it', () => {
  for (const theme of ['light', 'dark', 'contrast']) {
    for (const calm of [false, true]) {
      it(`resolves every reference on the ${theme} theme with calm ${calm ? 'on' : 'off'}`, () => {
        withTheme(theme, () => {
          const r = render(state({ calm }));
          const defined = all(r.tree, n => ['filter', 'radialGradient', 'linearGradient', 'pattern'].indexOf(n.type) !== -1)
            .map(n => n.props.id);
          const refs = [];
          all(r.tree, n => !!n.props).forEach(n => {
            ['fill', 'stroke', 'filter'].forEach(attr => {
              const v = n.props[attr];
              if (typeof v !== 'string') return;
              const m = v.match(IRI);
              if (m) refs.push({ key: n.props.key, attr, id: m[1] });
            });
          });
          const dangling = refs.filter(x => defined.indexOf(x.id) === -1);
          expect(dangling, 'an unresolvable IRI paints nothing at all').toEqual([]);
        });
      });
    }
  }

  it('the dark theme defines and uses its vignette, and calm strips both halves together', () => {
    withTheme('dark', () => {
      const loud = render(state());
      expect(all(loud.tree, n => n.type === 'radialGradient').map(n => n.props.id)).toContain('arc-vignette');
      expect(loud.find('vignette')).not.toBeNull();

      const calm = render(state({ calm: true }));
      expect(all(calm.tree, n => n.type === 'radialGradient').map(n => n.props.id)).not.toContain('arc-vignette');
      expect(calm.find('vignette')).toBeNull();
    });
  });

  it('the light and contrast themes have no vignette to dangle', () => {
    for (const theme of ['light', 'contrast']) {
      withTheme(theme, () => {
        const r = render(state());
        expect(r.find('vignette'), theme + ' must not reference the dark-only vignette').toBeNull();
      });
    }
  });
});

// Glow is a dark-canvas idiom. The filter merged a BLURRED copy under the crisp
// source, which reads as neon on a dark board and as a smudge on the white default
// one — softening every edge on the theme most students actually see. The light
// board gets a soft dark shadow instead: the tested core colour is untouched, and a
// shadow darker than the white ground can only raise apparent contrast.
describe('Arc City play board — the glow idiom follows the canvas', () => {
  function filt(tree, id) {
    let found = null;
    (function w(n) {
      if (n == null || n === false || n === true) return;
      if (Array.isArray(n)) { n.forEach(w); return; }
      if (typeof n === 'object') {
        if (!found && n.type === 'filter' && n.props && n.props.id === id) found = n;
        if (n.children) n.children.forEach(w);
      }
    })(tree);
    return found;
  }
  const kinds = (f) => {
    const out = [];
    (function w(n) {
      if (n == null || n === false || n === true) return;
      if (Array.isArray(n)) { n.forEach(w); return; }
      if (typeof n === 'object') { if (typeof n.type === 'string') out.push(n.type); if (n.children) n.children.forEach(w); }
    })(f.children);
    return out;
  };

  it('uses a drop shadow on the light board and a blur bloom on dark and contrast', () => {
    withTheme('light', () => {
      const r = render(state());
      for (const id of ['arc-glow', 'arc-glow-strong']) {
        const f = filt(r.tree, id);
        expect(f, id + ' must exist on light').not.toBeNull();
        expect(kinds(f)).toContain('feDropShadow');
        expect(kinds(f), 'no blur bloom on a white canvas').not.toContain('feGaussianBlur');
      }
    });
    for (const theme of ['dark', 'contrast']) {
      withTheme(theme, () => {
        const r = render(state());
        for (const id of ['arc-glow', 'arc-glow-strong']) {
          const f = filt(r.tree, id);
          expect(f, id + ' must exist on ' + theme).not.toBeNull();
          expect(kinds(f), theme + ' keeps the bloom it was designed around').toContain('feGaussianBlur');
          expect(kinds(f)).not.toContain('feDropShadow');
        }
      });
    }
  });
});

// The board paints its own canvas per theme from JS, but every text colour resolves
// through var(--allo-stem-text, <light ink>). The tool already pinned that variable
// for light and contrast so it could not depend on the host supplying it; dark was
// the gap, and without the host variable a dark board rendered near-black text on a
// near-black canvas. All three are pinned now — this keeps them that way.
describe('Arc City — the board pins its own theme variables for every theme', () => {
  const css = () => Array.from(document.querySelectorAll('style')).map(n => n.textContent || '').join(' ');

  it('pins --allo-stem-text for light, dark and contrast', () => {
    render(state()); // module-injected stylesheet lands on first render
    const sheet = css();
    expect(sheet).toContain('.theme-dark #allo-arccity-root{');
    expect(sheet).toContain('.theme-contrast #allo-arccity-root{');
    for (const sel of ['.theme-dark #allo-arccity-root{', '.theme-contrast #allo-arccity-root{']) {
      const block = sheet.slice(sheet.indexOf(sel), sheet.indexOf('}', sheet.indexOf(sel)));
      expect(block, sel + ' must set its own ink').toMatch(/--allo-stem-text:/);
      expect(block, sel + ' must set its own canvas').toMatch(/--allo-stem-canvas:/);
    }
  });

  it('gives the dark theme LIGHT ink, not the light-theme fallback', () => {
    render(state());
    const sheet = css();
    const block = sheet.slice(sheet.indexOf('.theme-dark #allo-arccity-root{'));
    const ink = (block.match(/--allo-stem-text:(#[0-9a-f]{6})/i) || [])[1];
    const canvas = (block.match(/--allo-stem-canvas:(#[0-9a-f]{6})/i) || [])[1];
    expect(ink).toBeTruthy();
    expect(canvas).toBeTruthy();
    const lum = (hex) => {
      const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (Math.max(lum(ink), lum(canvas)) + 0.05) / (Math.min(lum(ink), lum(canvas)) + 0.05);
    expect(lum(ink), 'dark-theme ink must be lighter than its canvas').toBeGreaterThan(lum(canvas));
    expect(ratio, 'dark ink on the dark canvas must clear 4.5:1').toBeGreaterThanOrEqual(4.5);
  });
});

// The level strip hides its star glyphs from assistive tech and folds "N of 3 stars"
// into the button's accessible name. The teacher view's per-level line concatenated
// the glyphs straight into its text, so a screen reader announced the characters.
// A list item has no accessible name to fold into, so the count rides in a
// visually-hidden span instead. Same fact, both ways of reading it.
describe('Arc City teacher view — stars are decorative, the count is spoken', () => {
  const state = () => ({
    schemaVersion: 2, levelId: 'L3', view: 'teacher', tier: 'practice', badges: [],
    byLevel: {
      L1: { solved: true, independent: true, shots: 2, misses: 0, flawless: true },
      L2: { solved: true, shots: 4, misses: 3 }
    }
  });

  function nodes(tree, pred) {
    const out = [];
    (function w(n) {
      if (n == null || n === false || n === true) return;
      if (Array.isArray(n)) { n.forEach(w); return; }
      if (typeof n === 'object') { if (pred(n)) out.push(n); if (n.children) n.children.forEach(w); }
    })(tree);
    return out;
  }
  const STAR = '★';

  it('never leaves a bare star glyph in text an assistive reader would announce', () => {
    const r = render(state());
    const starry = nodes(r.tree, n => n.props && typeof n.props.key === 'string' && n.props.key.startsWith('tl-'));
    expect(starry.length, 'the teacher view lists levels').toBeGreaterThan(0);

    for (const li of starry) {
      // Any glyph must sit inside an aria-hidden element.
      const bearers = nodes(li, n => {
        const txt = (n.children || []).filter(c => typeof c === 'string').join('');
        return txt.indexOf(STAR) !== -1;
      });
      for (const b of bearers) {
        expect(b.props['aria-hidden'], 'star glyphs must be hidden from assistive tech').toBe('true');
      }
      // Direct string children of the item itself must carry no glyphs.
      const direct = (li.children || []).filter(c => typeof c === 'string').join('');
      expect(direct.indexOf(STAR), 'no bare glyph in the item text').toBe(-1);
    }
  });

  it('states the star count in words for the levels that earned them', () => {
    const r = render(state());
    expect(r.text).toContain('3 of 3 stars'); // L1: independent + flawless
    expect(r.text).toContain('1 of 3 stars'); // L2: solved with preview
  });
});

// The golden master checks each PALETTE colour against the canvas at full strength.
// That is not what the board draws: marks carry their own opacity (guides 0.5, turning
// ticks 0.45, the previous-attempt trail 0.34, the gate slot 0.16), and a colour that
// passes at 1.0 can land well under 3:1 once it is drawn at a third of that. WCAG 1.4.11
// asks for 3:1 on graphics you need in order to understand the content — which is what
// these marks are: they show where the axis, the asymptote and your last shot were.
describe('Arc City board — information-bearing marks keep 3:1 as DRAWN', () => {
  const lum = (hex) => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  // Several marks are painted with `var(--allo-stem-text, #0f172a)` rather than a
  // literal. Skipping those would have quietly excluded the guides and the previous
  // shot — the faintest, most at-risk marks on the board. Resolve the variable from the
  // TOOL'S OWN pinned stylesheet for the theme under test, so this reads the same
  // source of truth the board does instead of re-deriving a value.
  function inkFor(theme) {
    const sheet = Array.from(document.querySelectorAll('style')).map(n => n.textContent || '').join(' ');
    const sel = theme === 'light' ? '#allo-arccity-root{' : '.theme-' + theme + ' #allo-arccity-root{';
    const at = sheet.indexOf(sel);
    if (at === -1) return null;
    const block = sheet.slice(at, sheet.indexOf('}', at));
    const m = block.match(/--allo-stem-text:(#[0-9a-fA-F]{6})/);
    return m ? m[1].toLowerCase() : null;
  }
  const hex = (v, ink) => {
    if (!v) return null;
    if (v.indexOf('var(--allo-stem-text') === 0) return ink;
    if (v[0] !== '#') return null;
    return v.length === 4 ? '#' + v.slice(1).split('').map(x => x + x).join('') : v;
  };
  const mix = (fg, bg, a) => {
    const f = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const A = f(fg), B = f(bg);
    return '#' + [0, 1, 2].map(i => Math.round(A[i] * a + B[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  // The board paints a sky gradient, so a mark sits on a RANGE of backgrounds. Judge
  // against every stop and keep the worst — the mark has to hold up wherever it lands.
  const GROUNDS = { light: ['#ffffff', '#f6f9fc', '#eef3f9'], dark: ['#141c38', '#0a0e1c', '#05070f'], contrast: ['#000000'] };

  // Keys whose marks carry meaning a player reads off the board. Decoration (sky,
  // skyline, stars, halos, sparks, glow, celebration) is out of scope by 1.4.11.
  const MEANINGFUL = /^(beam-|beamhead-|preview$|prevtrail$|ghost-curve$|node-|wall\d|wallcap\d|gateLo|gateHi|gateLip|axis-sym$|midline$|amp$|asymptote$|turn-|turndot-|missgap$|missdot$|matchgap|actual-slope$|gslope)/;
  // ...except the denied path. It is drawn deliberately faint (0.38) to read as "here
  // is where you were headed" WITHOUT competing with the beam that was actually fired,
  // and it is redundant three times over: the drawn beam stops at the block, a red X
  // marks the exact stop, and describeResult says in words what stopped it. All three
  // of those ARE judged below. Raising it to 3:1 would make a hint compete with the
  // fact. Excluded on that reasoning, not because it was inconvenient.
  const DECORATIVE_REDUNDANT = /^beam-remainder$/;

  function marks(tree, ink) {
    const out = [];
    (function w(n) {
      if (n == null || n === false || n === true) return;
      if (Array.isArray(n)) { n.forEach(w); return; }
      if (typeof n !== 'object') return;
      const p = n.props || {};
      const k = String(p.key || '');
      if (MEANINGFUL.test(k) && !DECORATIVE_REDUNDANT.test(k)) {
        const paint = hex(p.stroke, ink) || hex(p.fill, ink);
        const op = p.opacity == null ? 1 : Number(p.opacity);
        if (paint && op > 0) out.push({ key: k, paint, op });
      }
      if (n.children) n.children.forEach(w);
    })(tree);
    return out;
  }

  function withTheme(theme, fn) {
    const el = document.createElement('div');
    if (theme !== 'light') el.className = 'theme-' + theme;
    document.body.appendChild(el);
    try { return fn(); } finally { el.remove(); }
  }

  for (const theme of ['light', 'dark', 'contrast']) {
    it(`${theme}: every meaningful mark clears 3:1 against every sky stop`, () => {
      withTheme(theme, () => {
        // A fired shot on a level with a wall, a gate and structure guides showing.
        // Once a shot is FIRED the previous-attempt trail is read from prevShot, not
        // lastShot — seeding the wrong one silently drops the faintest mark on the
        // board, which is exactly the one this test exists to measure.
        const r = render({ schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true }, L3: { params: { a: -0.5, h: 5, k: 3 }, prevShot: { a: -0.3, h: 4, k: 3 }, lastShot: { a: -0.4, h: 4.5, k: 3 } } }, tier: 'practice', badges: [], fired: true });
        const ink = inkFor(theme);
        expect(ink, theme + ' must pin its own ink for the sweep to resolve').toBeTruthy();
        const found = marks(r.tree, ink);
        expect(found.length, 'the board must actually draw marks to judge').toBeGreaterThan(6);
        // Name the risky ones explicitly. The whole point is the marks drawn at low
        // opacity, so a fixture that quietly stopped producing them would leave this
        // passing while measuring only the full-strength marks.
        const keys = found.map(m => m.key);
        for (const need of ['prevtrail', 'axis-sym']) {
          expect(keys, 'fixture must still produce the low-opacity mark ' + need).toContain(need);
        }
        expect(keys.some(k => /^gateLo/.test(k)), 'and the gate').toBe(true);
        expect(keys.some(k => /^wall\d/.test(k)), 'and the wall').toBe(true);
        expect(keys.some(k => /^beam-\d/.test(k) || /^beam-/.test(k)), 'and the fired beam').toBe(true);
        const bad = [];
        for (const m of found) {
          for (const g of GROUNDS[theme]) {
            const got = ratio(mix(m.paint, g, m.op), g);
            if (got < 3) bad.push({ key: m.key, paint: m.paint, op: m.op, ground: g, got: Math.round(got * 100) / 100 });
          }
        }
        expect(bad, 'marks below 3:1 as drawn').toEqual([]);
      });
    });
  }
});

// The Circuit Clash board is the AUTHORITATIVE surface for two-player mode — the 3D
// arena is explicitly a visual peer of it. Its marks carry opacity too (the centre
// divider 0.35, gates 0.82, the aperture band 0.16, tick labels 0.85), and unlike the
// play board it paints no sky: it sits directly on the root's own ground. Same rule as
// the play sweep — 3:1 for marks you read the game off, 4.5:1 for text.
describe('Arc City battle board — its marks hold up as DRAWN', () => {
  const lum = (hex) => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const mix = (fg, bg, a) => {
    const f = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const A = f(fg), B = f(bg);
    return '#' + [0, 1, 2].map(i => Math.round(A[i] * a + B[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  // The root paints its own ground per theme; the battle svg has no fill of its own.
  const GROUND = { light: '#ffffff', dark: '#0f172a', contrast: '#000000' };

  function inkFor(theme) {
    const sheet = Array.from(document.querySelectorAll('style')).map(n => n.textContent || '').join(' ');
    const sel = theme === 'light' ? '#allo-arccity-root{' : '.theme-' + theme + ' #allo-arccity-root{';
    const at = sheet.indexOf(sel);
    if (at === -1) return null;
    const block = sheet.slice(at, sheet.indexOf('}', at));
    const m = block.match(/--allo-stem-text:(#[0-9a-fA-F]{6})/);
    return m ? m[1].toLowerCase() : null;
  }
  const paintOf = (v, ink) => {
    if (!v) return null;
    if (v.indexOf('var(--allo-stem-text') === 0) return ink;
    if (v[0] !== '#') return null;
    return v.length === 4 ? '#' + v.slice(1).split('').map(x => x + x).join('') : v;
  };

  // Marks a player reads the match off. Excluded: the skyline/beacons (decoration) and
  // the faint aperture band 'bgslot', which is a fill INSIDE the gate whose own posts
  // (bglo/bghi, judged here) carry the position — the band only softens the opening.
  const MEANINGFUL = /^(bmid$|bglo|bghi|bwall|brelay|btrail|battle-preview$|battle-replay-trail$|btx|bty)$|^(bglo|bghi|btx|bty|brelay|btrail)/;

  function withTheme(theme, fn) {
    const el = document.createElement('div');
    if (theme !== 'light') el.className = 'theme-' + theme;
    document.body.appendChild(el);
    try { return fn(); } finally { el.remove(); }
  }

  for (const theme of ['light', 'dark', 'contrast']) {
    it(`${theme}: battle marks and tick labels clear their minimum`, () => {
      withTheme(theme, () => {
        const r = render({ schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle' });
        const ink = inkFor(theme);
        expect(ink, theme + ' must pin its own ink').toBeTruthy();
        const ground = GROUND[theme];
        const found = [];
        (function w(n) {
          if (n == null || n === false || n === true) return;
          if (Array.isArray(n)) { n.forEach(w); return; }
          if (typeof n !== 'object') return;
          const p = n.props || {};
          const k = String(p.key || '');
          if (MEANINGFUL.test(k)) {
            // For a FILLED shape the mark is its fill; a stroke is a secondary outline.
            // Reading stroke first reported the relays as white-on-white 1:1, because
            // each relay is a coloured disc wearing a 2px white ring — the ring vanishes
            // on a light board and the disc, which is the actual mark, does not.
            const filled = p.fill && p.fill !== 'none';
            const paint = filled ? (paintOf(p.fill, ink) || paintOf(p.stroke, ink)) : (paintOf(p.stroke, ink) || paintOf(p.fill, ink));
            const op = p.opacity == null ? 1 : Number(p.opacity);
            if (paint && op > 0) found.push({ key: k, paint, op, text: n.type === 'text' });
          }
          if (n.children) n.children.forEach(w);
        })(r.tree);

        expect(found.length, 'the battle board must draw marks to judge').toBeGreaterThan(5);
        expect(found.some(m => m.key === 'bmid'), 'including the centre divider').toBe(true);
        expect(found.some(m => /^btx/.test(m.key)), 'including the axis tick labels').toBe(true);

        const bad = [];
        for (const m of found) {
          const need = m.text ? 4.5 : 3;
          const got = ratio(mix(m.paint, ground, m.op), ground);
          if (got < need - 0.005) bad.push({ key: m.key, paint: m.paint, op: m.op, need, got: Math.round(got * 100) / 100 });
        }
        expect(bad, 'battle marks below their minimum as drawn').toEqual([]);
      });
    });
  }
});
