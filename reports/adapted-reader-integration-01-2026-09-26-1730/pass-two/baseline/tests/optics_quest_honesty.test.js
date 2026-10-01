import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const SRC = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_optics.js'), 'utf8');

function between(startMarker, endMarker) {
  return sliceBetween(SRC, startMarker, endMarker, { file: 'stem_lab/stem_tool_optics.js' });
}

// The guards run against the REAL defaults lifted out of the tool, so a change
// to either the defaults or the guard shows up here.
const GUARDS = vm.runInNewContext(
  `(function () {
     function _isNum(x) { return typeof x === 'number' && isFinite(x); }
     ${between('var OP_LENS_DEFAULTS =', 'function thinLens(')}
     return {
       OP_LENS_DEFAULTS, OP_INTERFERENCE_DEFAULTS, OP_DIFFRACTION_DEFAULTS,
       isDefaultLens: _opIsDefaultLensSetup,
       isDefaultInterference: _opIsDefaultInterferenceSetup,
       isDefaultDiffraction: _opIsDefaultDiffractionSetup,
     };
   })()`,
);

// The shipped thin-lens solver, so the "already real on arrival" claim is
// checked against the real physics rather than a restatement of it.
const thinLens = vm.runInNewContext(
  `(function () {
     function _isNum(x) { return typeof x === 'number' && isFinite(x); }
     ${between('function thinLens(d_o, f) {', 'function snell(')}
     return thinLens;
   })()`,
);

describe('Optics quests — the defaults must not earn anything', () => {
  // The bug: the lenses tab opens on converging f=12, d_o=25. That is d_o > f,
  // so the thin-lens solver already reports a real image and the achievement
  // fired (with 10 XP) the instant the tab rendered.
  it('the lens tab genuinely opens on a real image, which is why the guard exists', () => {
    const { lensFocal, lensDo } = GUARDS.OP_LENS_DEFAULTS;
    const result = thinLens(lensDo, Math.abs(lensFocal));
    expect(result.error, 'the default lens setup should solve').toBeFalsy();
    expect(result.isReal, 'default setup no longer forms a real image — recheck the guard')
      .toBe(true);
  });

  it('treats the untouched lens setup as unearned', () => {
    expect(GUARDS.isDefaultLens(GUARDS.OP_LENS_DEFAULTS)).toBe(true);
    // An absent value IS the default: the tab has not been touched.
    expect(GUARDS.isDefaultLens({})).toBe(true);
    expect(GUARDS.isDefaultLens({ mode: 'lenses' })).toBe(true);
  });

  it('counts any real change to the lens setup as earned', () => {
    const base = GUARDS.OP_LENS_DEFAULTS;
    expect(GUARDS.isDefaultLens({ ...base, lensDo: 6 })).toBe(false);
    expect(GUARDS.isDefaultLens({ ...base, lensFocal: 20 })).toBe(false);
    expect(GUARDS.isDefaultLens({ ...base, lensType: 'diverging' })).toBe(false);
  });

  it('treats the untouched interference and diffraction setups as unearned', () => {
    expect(GUARDS.isDefaultInterference(GUARDS.OP_INTERFERENCE_DEFAULTS)).toBe(true);
    expect(GUARDS.isDefaultInterference({})).toBe(true);
    expect(GUARDS.isDefaultDiffraction(GUARDS.OP_DIFFRACTION_DEFAULTS)).toBe(true);
    expect(GUARDS.isDefaultDiffraction({})).toBe(true);
  });

  it('counts moving a slit or a wavelength as having explored the pattern', () => {
    const int = GUARDS.OP_INTERFERENCE_DEFAULTS;
    expect(GUARDS.isDefaultInterference({ ...int, intSlitSep: 0.2 })).toBe(false);
    expect(GUARDS.isDefaultInterference({ ...int, intLambda: 450 })).toBe(false);

    const diff = GUARDS.OP_DIFFRACTION_DEFAULTS;
    expect(GUARDS.isDefaultDiffraction({ ...diff, diffSlitWidth: 10 })).toBe(false);
    expect(GUARDS.isDefaultDiffraction({ ...diff, diffLambda: 450 })).toBe(false);
  });

  // Floating-point drift must not silently count as a change.
  it('does not treat a rounding-level difference as a change', () => {
    const base = GUARDS.OP_LENS_DEFAULTS;
    expect(GUARDS.isDefaultLens({ ...base, lensDo: base.lensDo + 1e-12 })).toBe(true);
  });
});

describe('Optics quests — each award says what it means', () => {
  it('no longer awards "viewed" on arrival at a tab', () => {
    const questTracking = between('// Quest tracking.', 'return next;');
    // Arrival records that the tab was opened, nothing more.
    expect(questTracking).toMatch(/interferenceOpened = true/);
    expect(questTracking).toMatch(/diffractionOpened = true/);
    expect(questTracking, 'arrival still awards the achievement directly')
      .not.toMatch(/interferenceViewed = true|diffractionViewed = true/);
  });

  it('scopes every milestone award to its own tab', () => {
    // Without a mode guard the refraction parameters live in state whether or
    // not the student is looking at them, so a saved project awarded TIR on load.
    const chunks = SRC.split('React.useEffect(function() {').filter((chunk) =>
      /upd\(\{ (?:tirTriggered|realImageFormed|interferenceViewed|diffractionViewed)/
        .test(chunk.slice(0, 1400)));
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const chunk of chunks) {
      expect(chunk.slice(0, 800))
        .toMatch(/d\.mode !== '(refraction|lenses|interference|diffraction)'/);
    }
  });

  // Verifying the guard FUNCTIONS is not the same as verifying the effects
  // call them. Both survived mutation until this test existed.
  it('actually calls each default guard in the effect that awards', () => {
    const chunks = SRC.split('React.useEffect(function() {');
    function effectAwarding(flag) {
      const hit = chunks.filter((chunk) => chunk.slice(0, 1400).includes('upd({ ' + flag + ': true })'));
      expect(hit.length, 'no effect awards ' + flag).toBe(1);
      return hit[0].slice(0, 1400);
    }
    expect(effectAwarding('realImageFormed'), 'lens award skips the default guard')
      .toContain('_opIsDefaultLensSetup(d)');
    expect(effectAwarding('interferenceViewed'), 'interference award skips the default guard')
      .toContain('_opIsDefaultInterferenceSetup(d)');
    expect(effectAwarding('diffractionViewed'), 'diffraction award skips the default guard')
      .toContain('_opIsDefaultDiffractionSetup(d)');
  });

  it('keeps the honest achievements checking real physics, not flags', () => {
    // These two were always honest: they run the shipped solvers.
    expect(SRC).toMatch(/var result = snell\(degToRad\(d\.refrTheta1/);
    // The lensDo read now carries a type guard (a saved 'abc' reached
    // d_o.toFixed and blanked the tool), so the pin matches the CALL and the
    // key rather than the exact old spelling. The claim is unchanged: the
    // award runs the shipped solver on the student's real saved value.
    expect(SRC).toMatch(/var result = thinLens\([^;]*d\.lensDo/);
    expect(SRC).toMatch(/if \(result\.isReal && !d\.realImageFormed\)/);
  });
});
