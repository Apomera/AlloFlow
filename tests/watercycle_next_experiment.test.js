import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const SPECS = [
  { key: 'climSolar', label: 'Sunlight', lab: 'climate', target: '#wc-climate-solar', reading: 'evaporation' },
  { key: 'climTemp', label: 'Temperature', lab: 'climate', target: '#wc-climate-temperature', reading: 'evaporation' },
  { key: 'landRainIntensity', label: 'Rainfall intensity', lab: 'land', target: '#wc-land-rain', reading: 'land' },
  { key: 'landSaturation', label: 'Soil saturation', lab: 'land', target: '#wc-land-saturation', reading: 'land' },
  { key: 'landPermeability', label: 'Soil permeability', lab: 'land', target: '[data-wc-input="landPermeability"]', reading: 'land' },
  { key: 'landSlope', label: 'Slope', lab: 'land', target: '[data-wc-input="landSlope"]', reading: 'land' },
  { key: 'landCover', label: 'Land cover', lab: 'land', target: '[data-wc-input="landCover"]', reading: 'land' }
];
const KEYS = SPECS.map(spec => spec.key);
const DEFAULTS = [
  ['atmosphere', 'climSolar'], ['plant', 'climSolar'], ['surface', 'landRainIntensity'],
  ['soil', 'landPermeability'], ['groundwater', 'landPermeability'],
  ['unknown', 'landRainIntensity'], [undefined, 'landRainIntensity'], [null, 'landRainIntensity']
];
const INVALID_KEYS = ['climWind', 'unknown', '', '__proto__', 'constructor', 'toString', undefined, null, 42, {}, []];
const INVALID_CASES = INVALID_KEYS.map((value, index) => ({ value, case: index }));
const PROTECTED_STATE = {
  climSolar: 1.2, climTemp: 19, climWind: 1.4, landRainIntensity: 70, landSaturation: 60,
  landPermeability: 'high', landSlope: 'steep', landCover: 'forest',
  wcScenarioBaseline: { climSolar: 0.8, climTemp: 15 },
  wcScenarioPreset: 'custom', wcPrediction: 'evaporation', wcReplayedObservation: 'saved-1',
  wcExperimentLog: [{ notes: { evidence: 'Keep this evidence.', nextTest: 'Change only sunlight.' } }],
  wcExperimentUndo: [{ index: 0, entry: { label: 'Keep this removed observation.' } }],
  wcProcessCompare: { first: 'evaporation', second: 'transpiration', notes: { 'evaporation|transpiration': 'Keep this explanation.' } },
  activeStage: 'infiltration', stagesViewed: { infiltration: true }, journeyView: '3d',
  journeyActive: true, journeyPaused: true, journeyState: 'aquifer_flow', journeyReplayProgress: 0.42,
  journeyLoops: 3, journeyPaths: { infiltrate: 2 }, journeyLastPath: 'infiltrate',
  wcWalkthroughActive: true, wcWalkthroughIndex: 2, precipLab3dActive: true, wc2dPaused: true,
  researchPoints: 25
};

function load(file) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('var WCNextExperiment =');
  const end = source.indexOf('// End next experiment helpers.', start);
  if (start < 0 || end <= start) throw new Error('Missing next experiment helper in ' + file);
  const fragment = source.slice(start, end);
  const instantiate = () => new Function(fragment + '\nreturn WCNextExperiment;')();
  return { file, K: instantiate(), instantiate };
}

let shipped;
beforeAll(() => { shipped = PATHS.map(load); });
function each(check) { shipped.forEach(({ K, file }) => check(K, file)); }

describe('Water Cycle next experiment: supported evidence choices', () => {
  it('offers exactly the seven inputs with numerical comparison readings', () => {
    each(K => {
      const inputs = K.inputs();
      expect(inputs).toHaveLength(7);
      expect(new Set(inputs.map(spec => spec.key)).size).toBe(7);
      expect(inputs.map(spec => spec.key)).toEqual(KEYS);
      expect(inputs.map(spec => spec.key)).not.toContain('climWind');
    });
  });

  it.each(SPECS)('$label targets its actual control and supported reading', expected => {
    each(K => {
      expect(K.get(expected.key)).toEqual(expected);
      expect(K.inputs().find(spec => spec.key === expected.key)).toEqual(expected);
    });
  });

  // Wind changes scene transport, but neither the saved evaporation index nor
  // the runoff/infiltration equations depend on it. A quantitative bridge must
  // not promise a measured change in plant storage, groundwater, or precipitation.
  it('maps climate inputs to evaporation and all land inputs to both land indices', () => {
    each(K => {
      expect(K.inputs().filter(spec => spec.reading === 'evaporation').map(spec => spec.key)).toEqual(['climSolar', 'climTemp']);
      expect(K.inputs().filter(spec => spec.reading === 'land').map(spec => spec.key)).toEqual(KEYS.slice(2));
      expect(new Set(K.inputs().map(spec => spec.reading))).toEqual(new Set(['evaporation', 'land']));
    });
  });

  it.each(INVALID_CASES)('does not invent a spec for invalid input case $case', ({ value }) => {
    each(K => expect(K.get(value)).toBeNull());
  });

  it('does not allow a returned list or its specs to redefine supported inputs', () => {
    shipped.forEach(({ instantiate }) => {
      const K = instantiate();
      const first = K.inputs();
      const second = K.inputs();
      expect(first).not.toBe(second);
      first.forEach((spec, index) => expect(spec).not.toBe(second[index]));
      first[0].key = 'climWind';
      first[0].target = '#wrong-control';
      first[1].reading = 'groundwater';
      first.splice(2, 1);
      first.push({ key: 'invented', lab: 'climate' });
      expect(K.inputs()).toEqual(SPECS);
      expect(K.get('climWind')).toBeNull();
      expect(K.get('invented')).toBeNull();
      expect(K.select('atmosphere', 'climWind')).toEqual(SPECS[0]);
    });
  });

  it('returns detached specs from get and select as well as inputs', () => {
    shipped.forEach(({ instantiate }) => {
      const K = instantiate();
      SPECS.forEach(expected => {
        const fromGet = K.get(expected.key);
        const fromSelect = K.select('unknown', expected.key);
        expect(fromGet).not.toBe(fromSelect);
        fromGet.label = 'Changed outside the helper';
        fromGet.lab = expected.lab === 'land' ? 'climate' : 'land';
        fromSelect.target = '#wrong-control';
        fromSelect.reading = 'water-volume';
        expect(K.get(expected.key)).toEqual(expected);
        expect(K.select('unknown', expected.key)).toEqual(expected);
      });
      expect(K.inputs()).toEqual(SPECS);
    });
  });
});

describe('Water Cycle next experiment: learner choice and relevant defaults', () => {
  it.each(DEFAULTS)('defaults focus %j to %s', (focus, key) => {
    each(K => expect(K.select(focus)).toEqual(SPECS.find(spec => spec.key === key)));
  });

  it.each(SPECS)('honors a selected $label across every scene focus', expected => {
    each(K => {
      for (const [focus] of DEFAULTS) expect(K.select(focus, expected.key)).toEqual(expected);
    });
  });

  it.each(DEFAULTS)('recovers malformed requested choices for focus %j', (focus, key) => {
    each(K => {
      for (const invalid of INVALID_KEYS) expect(K.select(focus, invalid)).toEqual(SPECS.find(spec => spec.key === key));
    });
  });

  it('uses the surface default for malformed or inherited-property focus keys', () => {
    each(K => {
      for (const focus of ['', '__proto__', 'constructor', 'toString', 42, {}, []]) {
        expect(K.select(focus)).toEqual(SPECS[2]);
      }
    });
  });
});

describe('Water Cycle next experiment: navigation preserves the experiment and paused journey', () => {
  it.each(SPECS)('$label opens only conditions and its own disclosure', spec => {
    each(K => {
      const expected = { wcSection: 'conditions', wcFocusMode: false,
        [spec.lab === 'climate' ? 'wcClimateLabOpen' : 'wcLandLabOpen']: true };
      const patch = K.navigation(spec.key);
      expect(patch).toEqual(expected);
      expect(Object.keys(patch)).toHaveLength(3);
      const after = { ...PROTECTED_STATE, ...patch };
      for (const key of Object.keys(PROTECTED_STATE)) {
        expect(patch).not.toHaveProperty(key);
        expect(after[key]).toBe(PROTECTED_STATE[key]);
      }
    });
  });

  it.each(INVALID_CASES)('falls back to sunlight navigation for invalid key case $case', ({ value }) => {
    each(K => expect(K.navigation(value)).toEqual({ wcSection: 'conditions', wcFocusMode: false, wcClimateLabOpen: true }));
  });

  it('returns a fresh navigation patch that cannot poison later handoffs', () => {
    each(K => {
      const first = K.navigation('landPermeability');
      const second = K.navigation('landPermeability');
      expect(first).not.toBe(second);
      first.wcSection = 'journey';
      first.journeyPaused = false;
      first.wcLandLabOpen = false;
      expect(K.navigation('landPermeability')).toEqual({ wcSection: 'conditions', wcFocusMode: false, wcLandLabOpen: true });
    });
  });
});
