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
  // A third argument of { mark: true } swaps in a sentinel locale: every string
  // that went through t() comes back prefixed, so anything unmarked never
  // reached the translator.
  const opts = toolState && toolState.mark ? toolState : null;
  const state = opts ? (opts.state || {}) : (toolState || {});
  const store = { migration: Object.assign({ tab }, state) };
  const ctx = {
    React,
    toolData: store,
    update: () => {},
    updateMulti: () => {},
    addToast: () => {},
    announceToSR: () => {},
    t: opts ? (k, fb) => '«' + (fb == null ? k : fb) : (k, fb) => (fb == null ? k : fb),
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
    // Pinned through the accessor, not the raw table: the 3D deck speaks
    // v/loose/swarm and the inquiry speaks solo/echelon/V, and they were two
    // separate tables until one drifted. Case must not change the answer.
    const saving = tool._testing.savingFor;
    expect(saving('V')).toBe(0.22);
    expect(saving('v')).toBe(0.22);
    expect(saving('solo')).toBe(0);
    expect(saving('echelon')).toBe(0.12);
    expect(saving('loose')).toBeGreaterThan(0);
    expect(saving('swarm')).toBeGreaterThan(0);
    // Ordering is the claim a student can check: a full V beats an echelon,
    // which beats a loose flock, which beats flying alone.
    expect(saving('v')).toBeGreaterThan(saving('echelon'));
    expect(saving('echelon')).toBeGreaterThan(saving('loose'));
    expect(saving('loose')).toBeGreaterThan(saving('swarm'));
    expect(saving('swarm')).toBeGreaterThan(saving('solo'));
    expect(saving('not-a-formation')).toBe(0);
  });

  it('agrees with the record the tool leads with', () => {
    // The Bar-tailed Godwit's 8,425 mi non-stop flight is the tool's headline
    // claim, and the comparison table lists the bird at 300 g. Run the tool's
    // own physics at its own numbers and a 300 g bird does not get there even
    // on 55% fat -- which is correct, and is exactly why the species card now
    // says it leaves at roughly twice its normal weight. Both halves are
    // pinned, because a model that made the record look easy at lean mass
    // would be quietly wrong in the other direction.
    const em = tool._testing.flightEnergy;
    const km = 8425 * 1.609344;
    const lean = em({ massKg: 0.3, formation: 'solo', distanceKm: km, fatFraction: 0.55 });
    const fattened = em({ massKg: 0.6, formation: 'solo', distanceKm: km, fatFraction: 0.55 });
    expect(lean.ratio, 'a lean godwit should fall short').toBeLessThan(1);
    expect(fattened.ratio, 'a fattened godwit should make it').toBeGreaterThanOrEqual(1);
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

  it('derives the best lift-to-drag angle instead of storing it', () => {
    // The Aerodynamics tab answered "what is the best angle of attack?" twice.
    // The graph marked the angle its own model found; the card beneath quoted a
    // bestAngle stored in WING_TYPES. Three of the four wings disagreed --
    // soaring 5 vs 6.00, flapping 6 vs 6.75, speed 4 vs 5.25 -- on the same
    // screen. Storing a value that is a consequence of three others is what
    // lets it drift, so the field is gone.
    for (const w of tool._testing.wingTypes) {
      expect(w, w.id + ' should not carry a stored bestAngle').not.toHaveProperty('bestAngle');
    }
    const best = tool._testing.bestLD;
    const coef = tool._testing.aeroCoeffs;
    for (const w of tool._testing.wingTypes) {
      const b = best(w);
      // The reported angle really is the maximum of the curve the tab draws.
      expect(coef(w, b.angle).ld, w.id).toBeGreaterThanOrEqual(coef(w, b.angle - 1).ld - 1e-9);
      expect(coef(w, b.angle).ld, w.id).toBeGreaterThanOrEqual(coef(w, b.angle + 1).ld - 1e-9);
      expect(b.angle, w.id + ' best angle sits below the stall').toBeLessThanOrEqual(w.stallAngle);
    }
  });

  it('defaults the aerofoil to a wing that actually exists', () => {
    // The canvas loop used to default selectedWing to 'goose', which is a bird
    // SILHOUETTE id, not a WING_TYPES id. It drew the right wing only because
    // getWingType fell through to WING_TYPES[1], which happens to be the same
    // wing the controls default to. Reordering that array would have made the
    // canvas silently disagree with the card beside it.
    const src = fs.readFileSync(sourcePath, 'utf8');
    const declared = (src.match(/var MIGR_DEFAULT_WING = '([a-z]+)'/) || [])[1];
    expect(declared, 'a single named default').toBeTruthy();
    expect(tool._testing.wingTypes.map((w) => w.id)).toContain(declared);
    // No surface may carry its own default.
    expect(src).not.toMatch(/selectedWing\s*\|\|\s*'(?!.*MIGR_DEFAULT_WING)[a-z_]+'/);
  });

  it('models a stall that loses lift and gains drag', () => {
    const coef = tool._testing.aeroCoeffs;
    for (const w of tool._testing.wingTypes) {
      const justBelow = coef(w, w.stallAngle - 0.5);
      const at = coef(w, w.stallAngle);
      const past = coef(w, w.stallAngle + 4);
      const wayPast = coef(w, w.stallAngle + 12);
      // Continuous at the stall: no cliff in the drawn curve.
      expect(Math.abs(at.cl - justBelow.cl), w.id).toBeLessThan(0.1);
      expect(past.cl, w.id + ' lift falls past the stall').toBeLessThan(at.cl);
      // Drag must only rise past the stall. An earlier form added a separation
      // term on top of induced drag, and the collapsing lift pulled the induced
      // term down faster than the penalty came up -- so total drag FELL through
      // the stall, which is backwards.
      expect(past.cd, w.id + ' drag rises past the stall').toBeGreaterThan(at.cd);
      expect(wayPast.cd, w.id + ' drag keeps rising').toBeGreaterThanOrEqual(past.cd);
      expect(past.stalling).toBe(true);
      expect(justBelow.stalling).toBe(false);
    }
  });

  it('shows one best angle on the wing card and in the explainer', () => {
    for (const wing of ['soaring', 'flapping', 'hovering', 'speed']) {
      const el = document.createElement('div');
      el.innerHTML = render('aero', true, { selectedWing: wing });
      const txt = el.textContent;
      const cardAngles = (txt.match(/Best AoA: ([\d.]+)/g) || []).map((m) => m.replace(/[^\d.]/g, ''));
      const explainer = (txt.match(/Best L\/D at: ([\d.]+)/) || [])[1];
      expect(cardAngles.length, wing).toBe(4);
      expect(explainer, wing + ' explainer states an angle').toBeTruthy();
      expect(cardAngles, wing + ' explainer angle matches a card').toContain(explainer);
    }
  });

  it('names the same force the Beaufort card names', () => {
    // The wind tab's Beaufort card states force numbers with their names, and
    // the wind readout resolves a speed to a name from the table. These had
    // drifted: before the bands were rebuilt on the real mph ranges, a 25 mph
    // wind displayed "Fresh" while the card called force 6 "Strong Breeze".
    const src = fs.readFileSync(sourcePath, 'utf8');
    const card = (src.match(/Admiral Sir Francis Beaufort[^']*/) || [''])[0];
    expect(card, 'the Beaufort card is present').toBeTruthy();
    const b = tool._testing.beaufort;
    const labelForForce = (f) => {
      for (let mph = 0; mph <= 70; mph++) if (b(mph).force === f) return b(mph).label;
      return null;
    };
    const claims = [...card.matchAll(/Force (\d+)(?:-(\d+))? (?:winds )?\(([^)]+)\)/g)];
    expect(claims.length).toBeGreaterThanOrEqual(3);
    for (const [, lo, hi, names] of claims) {
      for (const f of [Number(lo), hi ? Number(hi) : null].filter((x) => x != null)) {
        const label = labelForForce(f);
        // Forces above the wind slider's range are general knowledge, not a
        // claim the table has to back.
        if (!label) continue;
        // The card contracts "Light Breeze to Moderate Breeze" to "Light to
        // Moderate Breeze", so match on the distinguishing first word.
        const key = label.split(' ')[0].toLowerCase();
        expect(names.toLowerCase(), 'force ' + f + ' is "' + label + '" in the table').toContain(key);
      }
    }
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

  it('states one distance, speed, altitude and flyway per species', () => {
    // The Species Comparison table was a second hand-kept copy of the species
    // data sitting directly under the cards it disagreed with: the godwit read
    // 7,000 mi against the card's 18,000, and the peregrine was filed under
    // the wrong flyway. It derives from SPECIES now, so this pins that the two
    // cannot drift apart again.
    const el = document.createElement('div');
    el.innerHTML = render('routes', true);
    const table = Array.from(el.querySelectorAll('table')).find((t) => /Species/.test(t.textContent));
    expect(table).toBeTruthy();
    const rows = Array.from(table.querySelectorAll('tbody tr'))
      .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim()));
    expect(rows.length).toBeGreaterThanOrEqual(8);

    // Every card on the same tab states the species' flyway and distance too.
    const cardText = el.textContent;
    for (const [name, dist, , , , flyway] of rows) {
      expect(cardText, name + ' distance').toContain(dist);
      expect(cardText.toLowerCase(), name + ' flyway').toContain(flyway.toLowerCase());
    }
    const godwit = rows.find((r) => /Godwit/.test(r[0]));
    expect(godwit[1]).toBe('18,000 mi');
    const peregrine = rows.find((r) => /Peregrine/.test(r[0]));
    expect(peregrine[5]).toBe('Central');
  });

  it('routes every data-table string through the translator', () => {
    // The species, wing-type and navigation tables are built at module scope,
    // above the closure that owns t(). That is why 181 strings in them had
    // never reached a pack. A sentinel locale marks whatever did go through
    // t(); anything unmarked did not. Probe strings avoid & and < so the
    // comparison is against markup, not against HTML escaping.
    const MARK = '«';
    const cases = [
      ['routes', { selectedSpecies: 'arctic_tern' }, ['Arctic Tern', 'Arctic Circle', 'Antarctic', 'Loose flock']],
      ['navigate', {}, ['Magnetic Sense', 'Star Navigation']],
      ['aero', {}, ['Soaring (Eagle)', 'Hovering (Hummingbird)']]
    ];
    for (const [tab, state, probes] of cases) {
      const html = render(tab, true, { mark: true, state });
      for (const probe of probes) {
        const at = html.indexOf(probe);
        expect(at, tab + ': "' + probe + '" should be rendered').toBeGreaterThan(-1);
        expect(html.slice(at - 1, at), tab + ': "' + probe + '" never went through t()').toBe(MARK);
      }
    }
  });

  it('survives malformed persisted state on every tab', () => {
    // Tool state is persisted, so it comes back stale, partial or corrupted:
    // a renamed key, a half-written value, a schema from an older build. Three
    // of these used to throw, all from a guard testing falsiness where it
    // needed to test shape.
    //
    // The challenge two are not hypothetical. challengeChoices is JSON.parse of
    // a model response, and `!parsed.choices.length` passes a STRING happily --
    // a string has a length. A model answering {"choices": "push through"} was
    // stored and then crashed the render.
    const TABS = ['flight3d', 'vformation', 'wind', 'routes', 'world', 'aero', 'navigate', 'inquiry'];
    const CASES = {
      'trials is not an array': { inquiry: { wingspan: 1, mass: 1, headwind: 0, vMode: 'V', distance: 1000, trials: 'nope' } },
      'model returned choices as a string': { challengeActive: true, challengeChoices: { scenario: null, choices: 'push through' }, challengeLog: null },
      'model returned choices with holes': { challengeActive: true, challengeChoices: { choices: [null, { label: null }] } },
      'unknown ids': { selectedSpecies: 'pterodactyl', selectedWing: 'jetpack', flightFormation: 'teleport' },
      'NaN and Infinity': { windSpeed: NaN, aoa: Infinity, altFeet: NaN, inquiry: { wingspan: NaN, mass: Infinity, headwind: NaN, vMode: 'V', distance: NaN } },
      'wrong types everywhere': { selectedSpecies: 42, selectedWing: [], windSpeed: {}, windObjects: 'not-an-array' },
      'nulls where objects belong': { inquiry: null, challengeChoices: null }
    };
    const broken = [];
    for (const [name, bad] of Object.entries(CASES)) {
      for (const tab of TABS) {
        try {
          const html = render(tab, true, bad);
          if (!html || html.length < 500) broken.push(name + ' / ' + tab + ' rendered almost nothing');
        } catch (e) {
          broken.push(name + ' / ' + tab + ' threw: ' + String(e.message).slice(0, 70));
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('never puts NaN into an attribute the browser has to parse', () => {
    // A NaN does not throw; it renders width="NaN" and value="NaN", which is
    // invalid markup and a slider the browser cannot place.
    const html = render('inquiry', true, {
      inquiry: { wingspan: NaN, mass: Infinity, headwind: NaN, vMode: 'V', distance: NaN, trials: [] }
    });
    expect(html).not.toMatch(/="NaN"/);
    expect(html).not.toMatch(/="Infinity"/);
  });

  it('renders no AI control when there is no AI backend', () => {
    // The AI Explorer button used to render enabled with no backend
    // configured, and clicking it was a silent no-op: handleAIExplorer opens
    // with `if (!callGemini) return`. A control that is visible, focusable and
    // announced, and then does nothing, is worse than an absent one. Other
    // tools here already gate on `callGemini && h(...)`.
    function renderWith(ai) {
      const store = { migration: { tab: 'routes', selectedSpecies: 'canada_goose' } };
      const ctx = {
        React, toolData: store, update: () => {}, updateMulti: () => {},
        addToast: () => {}, announceToSR: () => {}, t: (k, fb) => (fb == null ? k : fb),
        isDark: true, setStemLabTool: () => {}, awardXP: () => {}
      };
      if (ai) ctx.callGemini = () => Promise.resolve('');
      const html = renderToStaticMarkup(React.createElement(() => tool.render(ctx)));
      const el = document.createElement('div');
      el.innerHTML = html;
      return Array.from(el.querySelectorAll('button')).filter((b) => /AI Explorer/.test(b.textContent || '')).length;
    }
    expect(renderWith(true), 'offered when a backend exists').toBe(1);
    expect(renderWith(false), 'absent when no backend exists').toBe(0);
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
