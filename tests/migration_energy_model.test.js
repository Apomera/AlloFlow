import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, beforeAll } from 'vitest';

// The tool used to carry two flight-energy models that disagreed about the same
// question, and the inquiry model had its mass dependence backwards. These pin
// the behaviour, not the spelling: a rewrite that keeps the physics honest
// should keep this green.
const require_ = createRequire(import.meta.url);
const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_migration.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_migration.js');
const webapp = path.join(process.cwd(), 'desktop/web-app', 'node_modules');

let React;
let renderToStaticMarkup;
let tool;

beforeAll(() => {
  React = require_(path.join(webapp, 'react'));
  renderToStaticMarkup = require_(path.join(webapp, 'react-dom/server')).renderToStaticMarkup;
  // The tool registers itself against window on load.
  require_(sourcePath);
  tool = window.StemLab._registry.migration;
});

function render(tab, isDark, toolState) {
  const store = { migration: Object.assign({ tab }, toolState || {}) };
  const ctx = {
    React,
    toolData: store,
    update: () => {},
    updateMulti: () => {},
    addToast: () => {},
    announceToSR: () => {},
    t: (k, fb) => (fb == null ? k : fb),
    isDark,
    setStemLabTool: () => {},
    awardXP: () => {}
  };
  return renderToStaticMarkup(React.createElement(() => tool.render(ctx)));
}

describe('Migration Lab flight-energy model', () => {
  it('exposes one model as a pure seam', () => {
    expect(typeof tool._testing.flightEnergy).toBe('function');
    expect(typeof tool._testing.typicalSpan).toBe('function');
  });

  it('charges more energy per km for a heavier bird at the same wingspan', () => {
    const em = tool._testing.flightEnergy;
    const light = em({ massKg: 0.4, wingspanM: 1.2, formation: 'V', distanceKm: 1000 });
    const heavy = em({ massKg: 1.6, wingspanM: 1.2, formation: 'V', distanceKm: 1000 });
    expect(heavy.energyPerKm).toBeGreaterThan(light.energyPerKm);
  });

  it('gives a wing of longer span a cheaper flight at the same mass', () => {
    const em = tool._testing.flightEnergy;
    const shortWing = em({ massKg: 1, wingspanM: 0.8, formation: 'V', distanceKm: 1000 });
    const longWing = em({ massKg: 1, wingspanM: 1.6, formation: 'V', distanceKm: 1000 });
    expect(longWing.totalKJ).toBeLessThan(shortWing.totalKJ);
  });

  it('puts the fat-to-cost ratio at a peak rather than rising forever with mass', () => {
    // The retired model scaled cost as mass^0.67 against a fat budget linear in
    // mass, so a heavier bird was unconditionally better off. Induced drag is
    // what makes wing loading bite at the top of the range.
    const em = tool._testing.flightEnergy;
    const ratios = [0.2, 0.4, 0.8, 1.6, 3.2, 6.4].map(
      (m) => em({ massKg: m, wingspanM: 1.2, formation: 'V', distanceKm: 4000 }).ratio
    );
    const peak = ratios.indexOf(Math.max(...ratios));
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThan(ratios.length - 1);
  });

  it('makes a tailwind cheaper and a headwind dearer than dead calm', () => {
    const em = tool._testing.flightEnergy;
    const base = { massKg: 1, wingspanM: 1.2, formation: 'V', distanceKm: 1000 };
    const calm = em(base).totalKJ;
    expect(em({ ...base, headwindMs: -6 }).totalKJ).toBeLessThan(calm);
    expect(em({ ...base, headwindMs: 6 }).totalKJ).toBeGreaterThan(calm);
  });

  it('quotes one V-formation saving, matching the 22% midpoint in the prose', () => {
    const em = tool._testing.flightEnergy;
    const solo = em({ massKg: 1, wingspanM: 1.2, formation: 'solo', distanceKm: 1000 }).totalKJ;
    const vee = em({ massKg: 1, wingspanM: 1.2, formation: 'V', distanceKm: 1000 }).totalKJ;
    expect(1 - vee / solo).toBeCloseTo(0.22, 10);
    expect(tool._testing.formationSaving.V).toBe(0.22);
    expect(tool._testing.formationSaving.solo).toBe(0);
  });

  it('never lets a headwind drive the cost to infinity', () => {
    const em = tool._testing.flightEnergy;
    const gale = em({ massKg: 1, wingspanM: 1.2, formation: 'V', distanceKm: 1000, headwindMs: 40 });
    expect(Number.isFinite(gale.totalKJ)).toBe(true);
    expect(gale.windFactor).toBeLessThanOrEqual(5);
  });

  it('falls back to a plausible wingspan when a surface has no span control', () => {
    // The V-Formation budget calculator has no span slider, so span must come
    // from mass rather than silently vanishing from the physics.
    const span = tool._testing.typicalSpan;
    expect(span(4)).toBeGreaterThan(1.2);
    expect(span(4)).toBeLessThan(2.2);
    expect(span(0.003)).toBeLessThan(0.3);
    expect(span(0.6)).toBeLessThan(span(4));
  });

  it('reads the true Beaufort force bands', () => {
    const b = tool._testing.beaufort;
    expect(b(0).force).toBe(0);
    expect(b(35).force).toBe(7);
    expect(b(35).label).toMatch(/near gale/i);
    expect(b(20).force).toBe(5);
  });
});

describe('Migration Lab energy inquiry as a controlled investigation', () => {
  it('asks which variable is under test before charting anything', () => {
    const html = render('inquiry', true);
    expect(html).toContain('What are you testing?');
    expect(html).not.toContain('Relationship chart');
  });

  it('marks the variable under test and the ones held constant', () => {
    const html = render('inquiry', true, {
      inquiry: { wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000, testVar: 'mass', trials: [] }
    });
    expect(html).toContain('>testing<');
    expect((html.match(/>held</g) || []).length).toBe(4);
  });

  function trial(n, over) {
    return {
      n, testVar: 'mass', wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000,
      energyPerKm: 0.81, totalKJ: 3248, fatBudget: 9360, ratio: 2.88, state: 'Comfortable',
      ...over
    };
  }

  it('charts a controlled run and marks every trial as controlled', () => {
    const html = render('inquiry', true, {
      inquiry: {
        wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000, testVar: 'mass',
        trials: [trial(1, { mass: 0.4, ratio: 2.88 }), trial(2, { mass: 0.8, ratio: 2.96 }), trial(3, { mass: 1.6, ratio: 2.55 })]
      }
    });
    expect(html).toContain('<polyline');
    expect(html).toContain('just makes it (1.0)');
    expect(html).not.toContain('also changed');
    expect((html.match(/>yes</g) || []).length).toBe(2);
  });

  it('names what else moved when a comparison is confounded', () => {
    const html = render('inquiry', true, {
      inquiry: {
        wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000, testVar: 'mass',
        trials: [trial(1, { mass: 0.4 }), trial(2, { mass: 1.6, headwind: 8, ratio: 1.1 })]
      }
    });
    expect(html).toContain('also changed');
    expect(html).toContain('Headwind');
    expect(html).toContain('cannot separate them');
  });

  it('does not chart trials recorded without a variable under test', () => {
    const html = render('inquiry', true, {
      inquiry: {
        wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000, testVar: null,
        trials: [trial(1, { testVar: null }), trial(2, { testVar: null, mass: 1.6 })]
      }
    });
    expect(html).not.toContain('Relationship chart');
    expect(html).toContain('free explore');
  });

  it('carries an older scratch log forward instead of dropping it', () => {
    const html = render('inquiry', true, {
      inquiry: {
        wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000,
        log: [{ t: '10:00:00', w: '1.20', m: '0.80', hw: 0, fmt: 'V', d: 4000, fr: '0.78', state: 'Borderline' }]
      }
    });
    expect(html).toContain('earlier log');
    expect(html).toContain('0.78x');
  });

  it('describes the model it actually runs, in one place', () => {
    // The on-screen caveat and the exported notebook's caveat drifted apart:
    // the export was updated to the two-term drag model while the footer still
    // described the retired mass^0.67 law. Both read one constant now.
    const html = render('inquiry', true);
    expect(html).toContain('induced drag');
    expect(html).not.toContain('m^0.67 / wingspan');
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect((src.match(/inquiry_widget_no_score_no_reveal_no_a/g) || []).length).toBe(1);
  });

  it('offers the notebook export only once there is something to export', () => {
    const empty = render('inquiry', true);
    expect(empty).not.toContain('Download notebook');
    const withTrials = render('inquiry', true, {
      inquiry: { wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000, testVar: 'mass', trials: [trial(1)] }
    });
    expect(withTrials).toContain('Download notebook (HTML)');
    expect(withTrials).toContain('Download trials (CSV)');
  });
});

describe('Migration Lab tool integrity', () => {
  it('renders every tab in both themes', () => {
    for (const tab of ['flight3d', 'vformation', 'wind', 'routes', 'aero', 'navigate', 'inquiry']) {
      for (const isDark of [true, false]) {
        expect(render(tab, isDark).length, tab + ' ' + (isDark ? 'dark' : 'light')).toBeGreaterThan(1500);
      }
    }
  });

  it('states the same V-formation saving in the budget calculator as in the model', () => {
    const html = render('vformation', true);
    expect(html).toContain('-22%');
    expect(html).not.toContain('35%');
  });

  it('says which wingspan the budget calculator assumed', () => {
    expect(render('vformation', true)).toMatch(/assumed wingspan \d+ cm/);
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
