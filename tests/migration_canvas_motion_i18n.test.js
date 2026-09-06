import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, beforeAll, afterEach } from 'vitest';

// Canvas is the blind spot none of this repo's other checks reach. axe treats a
// <canvas> as one opaque element; an aria-label sweep reads attributes; a prose
// sweep reads DOM text nodes. Nothing reads fillText, and nothing notices a
// requestAnimationFrame loop ignoring prefers-reduced-motion, because the
// reduced-motion stylesheet only silences CSS animation and transition.
//
// So these mount the tool with an instrumented 2D context and drive frames.
const require_ = createRequire(import.meta.url);
const ROOT = process.cwd();
const WEBAPP = path.join(ROOT, 'desktop/web-app', 'node_modules');
const MARK = '«';

let React;
let ReactDOM;
let act;
let tool;
let paints;
let draws;
let pending;
let reduceMotion;

beforeAll(() => {
  React = require_(path.join(WEBAPP, 'react'));
  ReactDOM = require_(path.join(WEBAPP, 'react-dom/client'));
  act = React.act;
  global.IS_REACT_ACT_ENVIRONMENT = true;

  paints = { n: 0 };
  draws = [];
  pending = [];
  reduceMotion = { on: false };

  window.matchMedia = (q) => ({
    matches: reduceMotion.on && /prefers-reduced-motion/.test(q),
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}
  });
  if (!window.ResizeObserver) {
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    global.ResizeObserver = window.ResizeObserver;
  }

  const noop = () => {};
  function makeCtx() {
    const state = { fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, font: '10px sans-serif' };
    const target = {
      clearRect: () => { paints.n++; },
      fillText: (txt) => { if (txt != null && String(txt).trim()) draws.push(String(txt)); },
      strokeText: noop, fillRect: noop,
      measureText: (s) => ({ width: String(s).length * 6 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      createPattern: () => null,
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: noop, drawImage: noop, setTransform: noop,
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), canvas: null
    };
    return new Proxy(target, {
      get(t, k) { return k in t ? t[k] : (k in state ? state[k] : noop); },
      set(t, k, v) { state[k] = v; return true; }
    });
  }
  window.HTMLCanvasElement.prototype.getContext = function (kind) {
    if (kind !== '2d') return null;
    if (!this.__ctx) { this.__ctx = makeCtx(); this.__ctx.canvas = this; }
    return this.__ctx;
  };
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get() { return 620; }, configurable: true });

  window.requestAnimationFrame = (cb) => { pending.push(cb); return pending.length; };
  window.cancelAnimationFrame = () => {};
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;

  require_(path.join(ROOT, 'stem_lab/stem_tool_migration.js'));
  tool = window.StemLab._registry.migration;
});

afterEach(() => { reduceMotion.on = false; });

function drive(n) {
  for (let i = 0; i < n && pending.length; i++) {
    const cb = pending.shift();
    try { act(() => cb(i * 16)); } catch (e) { /* frames needing real pixels */ }
  }
}

function mount(tab, opts = {}) {
  let store = { migration: Object.assign({ tab, selectedSpecies: 'canada_goose' }, opts.state || {}) };
  let rerender = null;
  const ctx = {
    React,
    get toolData() { return store; },
    update: (t, k, v) => { store = { ...store, [t]: { ...store[t], [k]: v } }; rerender && rerender(); },
    updateMulti: (t, o) => { store = { ...store, [t]: { ...store[t], ...o } }; rerender && rerender(); },
    addToast: () => {}, announceToSR: () => {},
    t: opts.mark ? (k, fb) => MARK + (fb == null ? k : fb) : (k, fb) => (fb == null ? k : fb),
    isDark: true, setStemLabTool: () => {}, awardXP: () => {}
  };
  function Host() {
    const [, force] = React.useState(0);
    rerender = () => force((n) => n + 1);
    return tool.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOM.createRoot(host);
  pending.length = 0; paints.n = 0; draws.length = 0;
  act(() => { root.render(React.createElement(Host)); });
  return {
    ctx,
    host,
    teardown: () => { act(() => root.unmount()); host.remove(); }
  };
}

// Tabs with a canvas animation loop, and a control on each whose change must
// still force a repaint when motion is reduced. The navigate canvas is a
// decorative night sky that reads no state, so it has nothing to respond to.
const LOOPS = {
  vformation: { vBirdCount: 13 },
  wind: { windSpeed: 33 },
  routes: { selectedSpecies: 'arctic_tern' },
  aero: { aoa: 11 },
  navigate: null
};

describe('Migration Lab canvas loops and prefers-reduced-motion', () => {
  for (const tab of Object.keys(LOOPS)) {
    it(tab + ': animates when no preference is set', () => {
      const m = mount(tab);
      drive(6);
      paints.n = 0;
      drive(20);
      expect(paints.n).toBeGreaterThan(10);
      m.teardown();
    });

    it(tab + ': goes still when motion is reduced', () => {
      reduceMotion.on = true;
      const m = mount(tab);
      drive(6);
      paints.n = 0;
      drive(20);
      expect(paints.n).toBeLessThanOrEqual(2);
      m.teardown();
    });

    if (LOOPS[tab]) {
      it(tab + ': still redraws for a control when motion is reduced', () => {
        // Going still must not mean going dead. V-Formation used to return out
        // of its loop here, which left the canvas frozen AND deaf to every
        // control, for exactly the users who asked for less motion.
        reduceMotion.on = true;
        const m = mount(tab);
        drive(8);
        paints.n = 0;
        act(() => { m.ctx.updateMulti('migration', LOOPS[tab]); });
        drive(6);
        expect(paints.n).toBeGreaterThan(0);
        m.teardown();
      });
    }
  }
});

describe('Migration Lab visible prose reaches the translator', () => {
  it('renders no untranslated prose on any tab', () => {
    // 181 visible strings once shipped English to every locale, most of them
    // because the data tables are built at module scope where t() cannot
    // reach. A sentinel locale marks everything that went through t(); a text
    // node that comes back unmarked never did.
    //
    // This reads TEXT NODES, which is the only way to see the ones that are
    // neither attributes nor canvas draws.
    // Several strings only exist in a state: a species detail card, an expanded
    // accordion, a running challenge, a recorded trial. Rendering each tab once
    // in its default state misses them -- three were found only because the
    // mount happens to select a species.
    const CASES = [
      ['flight3d', {}], ['flight3d', { flightSpecies: 'monarch', flightPaused: true, flightSeason: 'spring' }],
      ['vformation', {}], ['vformation', { expandedFact: 'Upwash Zone', perfectVFormed: true }],
      ['wind', {}], ['wind', { showStreamlines: true, windSpeed: 44 }],
      ['routes', {}], ['routes', { selectedSpecies: 'arctic_tern' }],
      ['world', {}], ['world', { worldFlyway: 'central_asian', worldMigrant: 'globe_skimmer' }],
      ['aero', {}], ['aero', { aoa: 19, selectedWing: 'hovering' }],
      ['navigate', {}], ['navigate', { expandedNav: 'magnetic' }],
      ['navigate', { challengeActive: true, challengeChoices: null, challengeComplete: false }],
      ['inquiry', {}],
      ['inquiry', { inquiry: { wingspan: 1.2, mass: 0.8, headwind: 4, vMode: 'V', distance: 4000, testVar: 'mass', understood: true, stuckRevealed: true,
        trials: [{ n: 1, testVar: 'mass', wingspan: 1.2, mass: 0.4, headwind: 0, vMode: 'V', distance: 4000, ratio: 2.9, state: 'Comfortable', stateKey: 'comfortable', energyPerKm: 0.5, totalKJ: 2000, fatBudget: 5800 },
                 { n: 2, testVar: 'mass', wingspan: 1.2, mass: 1.6, headwind: 4, vMode: 'V', distance: 4000, ratio: 2.5, state: 'Comfortable', stateKey: 'comfortable', energyPerKm: 1.6, totalKJ: 6300, fatBudget: 18720 }] } }]
    ];
    const bad = new Set();
    for (const [tab, state] of CASES) {
      const m = mount(tab, { mark: true, state });
      const walk = document.createTreeWalker(m.host, 4 /* TEXT_NODE */);
      let n;
      while ((n = walk.nextNode())) {
        const txt = (n.nodeValue || '').trim();
        if (!txt || txt.indexOf(MARK) !== -1) continue;
        // Prose only: needs two runs of four letters. Numbers, units, symbols
        // and single short words are not translation targets.
        if (!/[A-Za-z]{4}[\s\S]*?[A-Za-z]{4}/.test(txt)) continue;
        bad.add(tab + ': ' + txt.slice(0, 70));
      }
      m.teardown();
    }
    expect(Array.from(bad)).toEqual([]);
  });
});

describe('Migration Lab spoken narration', () => {
  // A TTS string is an ARGUMENT to a function, not a DOM text node and not an
  // attribute, so neither the prose gate nor the accessible-name gate can see
  // it. That is how the read-aloud came to be teaching a number the screen had
  // stopped claiming.
  const source = () => require_('node:fs').readFileSync(path.join(ROOT, 'stem_lab/stem_tool_migration.js'), 'utf8');

  it('routes every spoken string through the translator', () => {
    // A raw literal as the first argument is the defect shape.
    const raw = source().match(/callTTS\(\s*['"]/g) || [];
    expect(raw).toEqual([]);
  });

  it('does not narrate a formation saving the screen no longer claims', () => {
    const src = source();
    const spoken = [...src.matchAll(/callTTS\(\s*t\(\s*'[^']*'\s*,\s*'((?:\\.|[^'])*)'/g)].map((m) => m[1]);
    expect(spoken.length).toBeGreaterThan(0);
    for (const line of spoken) {
      // 65% is the theoretical per-position maximum. The prose is allowed to
      // name it AS a theoretical bound; a narration stating it as the saving is
      // what this catches.
      expect(line, 'narration states 65% as the saving').not.toMatch(/(up to\s+)?65\s*(percent|%)/i);
      if (/saving|saves|energy/i.test(line) && /percent|%/.test(line)) {
        const nums = [...line.matchAll(/(\d+)\s*(?:to\s*(\d+)\s*)?(?:percent|%)/gi)]
          .flatMap((m) => [Number(m[1]), m[2] ? Number(m[2]) : null])
          .filter((n) => n != null);
        for (const n of nums) {
          expect(n, 'narrated saving ' + n + '% is outside the 10-30% the tool documents').toBeLessThanOrEqual(30);
        }
      }
    }
  });
});

describe('Migration Lab canvas text reaches the translator', () => {
  it('paints no untranslated prose on any animated canvas', () => {
    const known = [
      // A species name, part of the tool's wider content-i18n gap: the data
      // tables of species, wing types, records and threats are a hand
      // translation job, tracked separately.
      /Canada Goose/,
      // A unit symbol on the wind readout. Converting mph to km/h is a units
      // decision, not a translation one.
      /^\d+(\.\d+)? mph$/
    ];
    const bad = new Set();
    for (const tab of Object.keys(LOOPS)) {
      const m = mount(tab, { mark: true });
      drive(10);
      for (const s of draws) {
        if (s.indexOf(MARK) !== -1) continue;
        if (!/[A-Za-z]{3}/.test(s)) continue;
        if (known.some((re) => re.test(s))) continue;
        bad.add(tab + ': ' + s.slice(0, 60));
      }
      m.teardown();
    }
    expect(Array.from(bad)).toEqual([]);
  });
});
