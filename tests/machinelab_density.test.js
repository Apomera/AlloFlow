import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const state = (o = {}) => ({ machineLab: Object.assign({ view: 'build', bandOverride: 'g68' }, o) });
const BANDS = ['k2', 'g35', 'g68', 'g912'];

let M;
beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

// Mass and diameter are independent sliders, so nothing stopped a student
// building a 1 kg boulder or a 300 kg orange. Drag depends on frontal area and
// inertia on mass, so an impossible density silently decides every range
// comparison the tool invites.
describe('Machine Lab: stone density', () => {
  it('computes density from mass and diameter', () => {
    const r = 0.13;
    expect(M.density(25, 0.26)).toBeCloseTo(25 / ((4 / 3) * Math.PI * r * r * r), 6);
  });

  it('inverts to a diameter for a given density', () => {
    const dia = M.diameterFor(25, 2700);
    expect(M.density(25, dia)).toBeCloseTo(2700, 6);
  });

  it('refuses nonsense instead of returning Infinity', () => {
    expect(M.density(0, 0.26)).toBeNull();
    expect(M.density(25, 0)).toBeNull();
    expect(M.diameterFor(25, 0)).toBeNull();
    expect(M.density(NaN, 0.26)).toBeNull();
  });

  it('describes a density in words a student can check against the world', () => {
    expect(M.densityNote(300)).toContain('wood');
    expect(M.densityNote(2700)).toBe('about stone');
    expect(M.densityNote(7800)).toBe('about iron');
    expect(M.densityNote(20000)).toContain('lead');
  });

  it('ships a default stone that is actually stone', () => {
    // 25 kg at 0.24 m was 3454 kg/m3, denser than most rock; 0.26 m is granite.
    const cfg = loadTool(FILE, 'machineLab');
    const src = String(cfg.render);
    void src;
    const rho = M.density(25, 0.26);
    expect(rho).toBeGreaterThan(2400);
    expect(rho).toBeLessThan(3000);
    expect(M.densityNote(rho)).toBe('about stone');
  });

  it('names the density on screen', () => {
    const html = renderTool('machineLab', state());
    expect(html).toMatch(/That stone works out at [\d.]+ kg per cubic metre, about stone/);
  });

  // Density in kg per cubic metre is a grade 6 idea, and this tool serves K-2
  // upward. The house rule is restate, never filter, so the younger bands get
  // the same fact as a weight they can picture against a real rock.
  it('states the same fact in every band, not just the one it was written in', () => {
    const seen = BANDS.map((b) => {
      const html = renderTool('machineLab', state({ bandOverride: b }));
      return { b, html };
    });
    seen.forEach(({ b, html }) => {
      if (b === 'k2' || b === 'g35') {
        expect(html).toMatch(/would weigh about [\d.]+ kg/);
        expect(html).not.toContain('kg per cubic metre');
      } else {
        expect(html).toContain('kg per cubic metre');
      }
    });
  });

  it('does not say "cubic metre" to a five-year-old anywhere in the tool', () => {
    ['build', 'range', 'siege', 'compare'].forEach((v) => {
      const html = renderTool('machineLab', {
        machineLab: { view: v, bandOverride: 'k2', projMass: 1, projDiameter: 0.8 }
      });
      expect(html).not.toContain('cubic metre');
      expect(html).not.toContain('inertia');
    });
  });

  it('tells a K-2 student which way the stone is wrong', () => {
    const light = renderTool('machineLab', state({ bandOverride: 'k2', projMass: 1, projDiameter: 0.8 }));
    const heavy = renderTool('machineLab', state({ bandOverride: 'k2', projMass: 300, projDiameter: 0.1 }));
    expect(light).toContain('far too light');
    expect(heavy).toContain('far too heavy');
  });

  it('computes the weight a real rock that size would have', () => {
    // 0.26 m across at granite is the shipped stone, so it should come back
    // near the 25 kg the tool ships.
    expect(M.massFor(0.26, 2700)).toBeCloseTo(24.85, 1);
    expect(M.massFor(0, 2700)).toBeNull();
    expect(M.massFor(0.26, 0)).toBeNull();
    // massFor and diameterFor must be exact inverses, or the two registers
    // would quietly disagree about the same stone.
    expect(M.diameterFor(M.massFor(0.4, 2700), 2700)).toBeCloseTo(0.4, 9);
  });

  it('warns when the stone could not exist', () => {
    const silly = renderTool('machineLab', state({ projMass: 1, projDiameter: 0.8 }));
    expect(silly).toContain('No rock is that');
    expect(silly).toContain('an impossible stone will give you an impossible range');
  });

  it('warns in every band, in that band\'s own words', () => {
    BANDS.forEach((b) => {
      const html = renderTool('machineLab', state({ bandOverride: b, projMass: 1, projDiameter: 0.8 }));
      // Each band says it differently; what must not vary is that it says it.
      expect(html).toMatch(/too light|No rock/);
    });
  });

  it('stays quiet when the stone is plausible', () => {
    const fine = renderTool('machineLab', state({ projMass: 25, projDiameter: 0.26 }));
    expect(fine).not.toContain('No rock is that');
  });
});

describe('Machine Lab: the best stone for a machine', () => {
  const inputs = (o = {}) => Object.assign({
    machine: 'trebuchet', g: 9.81,
    cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60,
    projMass: 25, projDiameter: 0.26, releaseAngle: 45, launchElevation: 2,
    winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2, etaMech: 0.85, drag: true
  }, o);

  it('finds a stone that outperforms the one you started with', () => {
    const start = M.shot(inputs());
    const best = M.bestStone(inputs());
    expect(best).not.toBeNull();
    expect(best.range).toBeGreaterThan(start.range);
  });

  it('holds density constant, so every candidate is a real object', () => {
    // Without this the sweep just makes the same ball absurdly light, and the
    // "best" stone is a drag artifact rather than a physical answer.
    const best = M.bestStone(inputs(), { density: 2700 });
    expect(M.density(best.projMass, best.projDiameter)).toBeCloseTo(2700, 3);
  });

  it('takes its density from the current stone when none is given', () => {
    const best = M.bestStone(inputs({ projMass: 25, projDiameter: 0.26 }));
    const rho = M.density(25, 0.26);
    expect(M.density(best.projMass, best.projDiameter)).toBeCloseTo(rho, 3);
  });

  it('answers for each machine, and they do not all want the same stone', () => {
    const treb = M.bestStone(inputs({ machine: 'trebuchet' }), { density: 2700 });
    const ball = M.bestStone(inputs({
      machine: 'ballista', bundleTurns: 18, armLength: 1.1, drawLength: 1.0, armMass: 3, stringMass: 0.35
    }), { density: 2700 });
    expect(treb).not.toBeNull();
    expect(ball).not.toBeNull();
    expect(treb.range).not.toBeCloseTo(ball.range, 1);
  });

  it('returns null rather than guessing when nothing can fly', () => {
    expect(M.bestStone(inputs({ cwMass: 0 }))).toBeNull();
    expect(M.bestStone(inputs({ projDiameter: 0 }))).toBeNull();
  });
});

describe('Machine Lab: the best-stone panel in Compare', () => {
  const cmp = (o = {}) => ({ machineLab: Object.assign({ view: 'compare', bandOverride: 'g68' }, o) });

  it('offers the search as a button, because a sweep is far too slow to render', () => {
    const html = renderTool('machineLab', cmp());
    expect(html).toContain('Find the best stone for each machine');
    // No table until it has been run: an empty table would read as "no answer".
    expect(html).not.toContain('Best stone mass, diameter and range');
  });

  it('shows the answer once it has been run', () => {
    const html = renderTool('machineLab', cmp({
      bestStones: {
        density: 2714, sig: 'whatever',
        results: { trebuchet: { m: 12.5, dia: 0.2, range: 118.4, ke: 4200, nowKE: 13100 } }
      }
    }));
    expect(html).toContain('12.5 kg');
    expect(html).toContain('118.4 m');
    expect(html).toContain('2714 kg per cubic metre');
  });

  it('says so when a slider has moved since the search ran', () => {
    const html = renderTool('machineLab', cmp({
      bestStones: { density: 2714, sig: 'stale-signature', results: { trebuchet: { m: 12.5, dia: 0.2, range: 118.4, ke: 4200, nowKE: 13100 } } }
    }));
    expect(html).toContain('A setting has changed since this ran');
  });

  // The matching-signature case cannot be built here, because the signature is
  // derived from live state inside the tool. It is proven in
  // dev-tools/ml_interaction_smoke.cjs, where the button actually runs.

  it('names a machine that cannot be built rather than dropping its row', () => {
    const html = renderTool('machineLab', cmp({
      bestStones: { density: 2714, sig: 'stale', results: { trebuchet: { m: 12.5, dia: 0.2, range: 118.4, ke: 4200, nowKE: 13100 } } }
    }));
    expect(html).toContain('not a working machine at these settings');
  });
});

describe('Machine Lab: the peak is real, not a search artifact', () => {
  const inputs = (o = {}) => Object.assign({
    machine: 'trebuchet', g: 9.81,
    cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60,
    projMass: 25, projDiameter: 0.26, releaseAngle: 45, launchElevation: 2,
    winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2, etaMech: 0.85, drag: true
  }, o);

  const rangeAt = (m, o) => {
    const dia = M.diameterFor(m, 2717);
    const s = M.shot(Object.assign({}, inputs(o), { projMass: m, projDiameter: dia }));
    return s ? s.range : null;
  };

  it('range turns over: heavier and lighter both fly less far than the peak', () => {
    // Launch speed saturates at sqrt(2E/m_eff) as the payload vanishes, while
    // drag deceleration goes as area over mass and keeps rising. So there is a
    // genuine interior maximum, and the sweep is finding it rather than an end.
    const best = M.bestStone(inputs(), { density: 2717 });
    expect(best.atBound).toBe(false);
    expect(rangeAt(best.projMass / 8)).toBeLessThan(best.range);
    expect(rangeAt(best.projMass * 8)).toBeLessThan(best.range);
  });

  it('refines past the coarse grid, which is far too coarse to quote', () => {
    // 26 log steps over 0.05..400 kg is a ~40% jump per step. Reporting one
    // decimal off that grid would be a decimal the search has not earned.
    const coarse = M.bestStone(inputs(), { density: 2717, steps: 26 });
    const fine = M.bestStone(inputs(), { density: 2717, steps: 200 });
    expect(Math.abs(coarse.projMass - fine.projMass) / fine.projMass).toBeLessThan(0.12);
  });

  it('admits when the answer is only the edge of the search', () => {
    // Squeeze the search so the true peak lies outside it.
    const clipped = M.bestStone(inputs(), { density: 2717, min: 40, max: 400 });
    expect(clipped.atBound).toBe(true);
  });

  it('reports impact energy, because furthest is not hardest', () => {
    const best = M.bestStone(inputs(), { density: 2717 });
    const now = M.shot(inputs());
    expect(best.impactKE).toBeGreaterThan(0);
    // The stone that flies furthest lands with far less energy than the heavy
    // one. That tension is the lesson; if it ever inverts, the copy is wrong.
    expect(best.range).toBeGreaterThan(now.range);
    expect(best.impactKE).toBeLessThan(now.impactKE);
  });
});

describe('Machine Lab: the panel does not sell a pebble as the answer', () => {
  const cmp = (o = {}) => ({ machineLab: Object.assign({ view: 'compare', bandOverride: 'g68' }, o) });
  const saved = (over = {}) => ({
    bestStones: {
      density: 2717, sig: 'stale',
      results: { trebuchet: Object.assign({ m: 2.5, dia: 0.12, range: 132.3, ke: 900, nowKE: 12800 }, over) }
    }
  });

  it('asks which stone flies furthest, not which is best', () => {
    const html = renderTool('machineLab', cmp(saved()));
    expect(html).toContain('Which stone flies furthest?');
  });

  it('sets what it lands with beside what your own stone lands with', () => {
    const html = renderTool('machineLab', cmp(saved()));
    expect(html).toContain('Lands with');
    expect(html).toContain('900 J');
    expect(html).toContain('12.8 kJ');
  });

  it('keeps small impacts in joules, where the contrast is still readable', () => {
    // 96 J and 141 J both round to "0.1 kJ", which reads as no difference at
    // all when the difference is the lesson.
    const html = renderTool('machineLab', cmp(saved({ ke: 96, nowKE: 141 })));
    expect(html).toContain('96 J');
    expect(html).toContain('141 J');
    expect(html).not.toContain('0.1 kJ');
  });

  it('footnotes a row that only reached the edge of the search', () => {
    const html = renderTool('machineLab', cmp(saved({ atBound: true })));
    expect(html).toContain('132.3 m *');
    expect(html).toContain('where the search stopped rather than a real best');
  });

  it('leaves the footnote off when the peak is genuine', () => {
    const html = renderTool('machineLab', cmp(saved({ atBound: false })));
    expect(html).not.toContain('where the search stopped rather than a real best');
  });
});

describe('Machine Lab: an impossible stone follows you out of Build', () => {
  const view = (v, o = {}) => ({ machineLab: Object.assign({ view: v, bandOverride: 'g68' }, o) });
  const SILLY = { projMass: 1, projDiameter: 0.8 };

  // The two sliders live in Build, but the Test Range scores a prediction
  // against them and the Target Wall computes damage from them. A warning only
  // where the value is set is a warning you can walk away from.
  it('warns in the Test Range, which scores a prediction against it', () => {
    const html = renderTool('machineLab', view('range', SILLY));
    expect(html).toContain('No rock is that');
    expect(html).toContain('The two sliders are in Build');
  });

  it('warns on the Target Wall, which computes damage from it', () => {
    const html = renderTool('machineLab', view('siege', SILLY));
    expect(html).toContain('No rock is that');
  });

  it('names the actual numbers rather than just complaining', () => {
    // fmt strips trailing zeros, so this is "1 kg", not "1.0 kg".
    const html = renderTool('machineLab', view('range', SILLY));
    expect(html).toContain('Your stone is 1 kg and 0.8 m across');
    expect(html).toContain('4 kg per cubic metre');
  });

  it('stays quiet on a real rock in every view that reads it', () => {
    ['range', 'siege', 'build', 'compare'].forEach((v) => {
      const html = renderTool('machineLab', view(v));
      expect(html).not.toContain('No rock is that');
    });
  });

  it('does not tell a student to build the thing it warns about', () => {
    // "Drop the stone mass to a fraction of a kilogram" at a fixed 0.26 m
    // diameter is a stone lighter than balsa.
    const html = renderTool('machineLab', view('compare'));
    expect(html).not.toContain('Drop the stone mass to a fraction of a kilogram');
    expect(html).toContain('shrink its diameter to match so it stays a real rock');
  });
});

describe('Machine Lab: the Field Manual owns the limitation', () => {
  it('lists independent mass and size among what the model is not', () => {
    // The tool prints the implied density, so it has to say plainly that it
    // will still simulate an impossible one rather than refusing.
    const html = renderTool('machineLab', { machineLab: { view: 'learn', manualTopic: 'model' } });
    expect(html).toContain('Stone mass and stone size are separate controls');
    expect(html).toContain('It tells you when you have done that, but it does not stop you');
  });

  it('reaches the read-aloud, because it goes through bullets() not a hand-written li', () => {
    // The manual collects spoken text AS it renders: bullets() pushes each
    // string into `spoken` on its way to the page. A hand-written <li> renders
    // identically and is silently missing from the audio, which is exactly the
    // kind of drift that cannot be seen in the markup. So check the source.
    const src = readFileSync('stem_lab/stem_tool_machinelab.js', 'utf8');
    const at = src.indexOf('manual_x_dens');
    expect(at).toBeGreaterThan(-1);
    // Walk back to the nearest enclosing call and confirm it is bullets(), not
    // a hand-written list item. A regex spanning both bullets() blocks would
    // pass even if this string had escaped into the wrong one.
    const opener = src.lastIndexOf('bullets([', at);
    const closer = src.indexOf("], 'ul')", at);
    expect(opener).toBeGreaterThan(-1);
    expect(closer).toBeGreaterThan(opener);
    expect(src.slice(opener, closer)).toContain('manual_x_dens');
    expect(src.slice(opener, at)).not.toContain("h('li'");
  });
});

describe('Machine Lab: Compare restates for every band', () => {
  const cmp = (b) => renderTool('machineLab', { machineLab: { view: 'compare', bandOverride: b } });

  it('gives each band its own four prompts, not one set for all of them', () => {
    const texts = BANDS.map(cmp);
    // Four prompts everywhere, and no two bands identical.
    texts.forEach((html) => {
      const items = html.match(/<li>/g) || [];
      expect(items.length).toBeGreaterThanOrEqual(4);
    });
    const firstPrompt = (html) => (html.match(/<li>([^<]+)</) || [])[1];
    const prompts = texts.map(firstPrompt);
    expect(new Set(prompts).size).toBe(BANDS.length);
  });

  it('keeps the technical vocabulary out of the youngest band', () => {
    const k2 = cmp('k2');
    ['efficiency', 'm_eff', 'diameter', 'stored energy', 'frontal area'].forEach((word) => {
      expect(k2).not.toContain(word);
    });
  });

  it('still asks the older bands the harder question', () => {
    expect(cmp('g912')).toContain('m_p/(m_p + m_eff)');
    expect(cmp('g912')).toContain('square of the twist angle');
  });

  it('never tells any band to change mass without changing size', () => {
    // The prompt that walked into the density trap. Every band now pairs them.
    BANDS.forEach((b) => {
      expect(cmp(b)).not.toContain('Drop the stone mass to a fraction of a kilogram');
    });
  });
});

// A gate, not a spot check. Every panel in this tool is supposed to restate for
// the selected band rather than filter, and three separate blocks had quietly
// been written in one register: the density notes, the Compare prompts, and the
// energy ledger itself. The failure mode is invisible unless you render at K-2
// and read, so this renders at K-2 and reads.
describe('Machine Lab: nothing speaks over a five-year-old', () => {
  // Terms that carry a grade 6+ definition. A K-2 reader can be taught any of
  // these ideas; what they cannot do is meet the word cold as a panel label.
  const TOO_OLD = [
    'Kinetic energy', 'Transfer efficiency', 'inertia', 'cubic metre',
    'coefficient', 'effective mass', 'frontal area', 'proportional',
    'monotonically', 'degrees of freedom', 'Air resistance'
  ];
  const VIEWS = ['machines', 'build', 'range', 'siege', 'compare'];

  VIEWS.forEach((v) => {
    it('the ' + v + ' view is readable at K-2', () => {
      const html = renderTool('machineLab', {
        machineLab: { view: v, bandOverride: 'k2', lastShot: null }
      });
      const found = TOO_OLD.filter((w) => html.includes(w));
      expect(found).toEqual([]);
    });
  });

  it('but keeps the real vocabulary for the bands that want it', () => {
    // Restate, never filter: the older bands must still get the proper names.
    const g912 = renderTool('machineLab', { machineLab: { view: 'build', bandOverride: 'g912' } });
    expect(g912).toContain('Kinetic energy');
    expect(g912).toContain('Transfer efficiency');
  });

  it('names the same four ledger stages in both registers', () => {
    // The bars and the screen-reader table are built from ONE stages array, so
    // a band that renamed only one of them would drift. Count the stages.
    const k2 = renderTool('machineLab', { machineLab: { view: 'build', bandOverride: 'k2' } });
    const g68 = renderTool('machineLab', { machineLab: { view: 'build', bandOverride: 'g68' } });
    expect(k2).toContain('How hard you work at the handle');
    expect(k2).toContain('Saved up in the lifted weight');
    expect(k2).toContain('Energy the stone has as it flies off');
    expect(k2).toContain('Energy the stone has when it lands');
    expect(g68).toContain('Work you do at the crank');
    expect(g68).toContain('Stored in the raised counterweight');
  });

  it('renames the loss causes too, not just the stage labels', () => {
    const k2 = renderTool('machineLab', { machineLab: { view: 'build', bandOverride: 'k2' } });
    expect(k2).toContain('rubbing in the handle');
    expect(k2).toContain('pushing through the air');
    expect(k2).not.toContain('winch friction');
    expect(k2).not.toContain('air resistance');
  });
});

describe('Machine Lab: the last two single-register panels', () => {
  const build = (b, o = {}) => renderTool('machineLab',
    { machineLab: Object.assign({ view: 'build', bandOverride: b }, o) });

  // The Machine Shop keeps "Mechanical advantage" at K-2 and glosses it
  // underneath ("How it feels: Much easier"), because there the term IS the
  // lesson. The winch panel follows that rather than renaming it away.
  it('keeps mechanical advantage at every band and glosses it for the young ones', () => {
    BANDS.forEach((b) => expect(build(b)).toContain('Winch mechanical advantage'));
    expect(build('k2')).toMatch(/That means the winch pulls [\d.]+ times harder than you do/);
    expect(build('g912')).not.toContain('times harder than you do');
  });

  it('says the crank numbers in plain words for the young bands', () => {
    expect(build('k2')).toContain('How hard you pull:');
    expect(build('k2')).toContain('Times you turn the handle:');
    expect(build('g68')).toContain('Crank force:');
    expect(build('g68')).toContain('Turns of the crank:');
  });

  it('restates the part notes rather than leaving one register for all', () => {
    // partsOf() reads `young` from render scope. If that binding were missing
    // this would throw, and renderTool can swallow a throw into empty output,
    // so assert the text is actually present rather than trusting a green run.
    const k2 = build('k2');
    expect(k2).toContain('the long end of the beam moves much further than the short end');
    expect(k2).toContain('your hand goes round a big circle');
    expect(k2).toContain('each extra loop of rope makes the pull half as hard');
    const g68 = build('g68');
    expect(g68).toContain('long arm ÷ short arm');
    expect(g68).toContain('a big handle circle turning a small drum');
  });

  it('restates the torsion arm note too, not just the trebuchet beam', () => {
    const k2 = build('k2', { machine: 'ballista' });
    expect(k2).toContain('The rope twists it back a little way');
    expect(build('g68', { machine: 'ballista' })).toContain('trading a short powerful twist');
  });
});
