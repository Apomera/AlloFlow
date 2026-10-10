import {describe, it, expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_LUNAR_SURFACE_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const marker = "  window.StemLab.registerTool('scaleExplorer', {";
if (!source.includes(marker)) throw new Error('Scale Explorer registration marker was not found');
const sandbox = {window: {StemLab: {registerTool() {}}}, console: {log() {}}};
vm.runInNewContext(source.replace(marker, '  window.lunarSurfaceChecks={position:lunarPosition,surface:lunarSurfacePoint,inverse:lunarFromSurface,map:lunarMapPoint,view:lunarViewValue,details:atlasDetails,observations:readObservations,drafts:readObservationDrafts};\n' + marker), sandbox);
const api = sandbox.window.lunarSurfaceChecks;
const S = (key, fallback) => fallback;
const details = point => api.details('moon', S, undefined, undefined, undefined, point);
const radius = vector => Math.hypot(...vector);

function expectVector(actual, expected) {
  expect(actual).toHaveLength(3);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
}

describe('Scale Explorer lunar coordinates', () => {
  it('wraps longitude at the seam, clamps latitude and rounds to a tenth of a degree', () => {
    expect(api.position({longitude: 181.24, latitude: 95})).toEqual({longitude: -178.8, latitude: 90});
    expect(api.position({longitude: -541.26, latitude: -95})).toEqual({longitude: 178.7, latitude: -90});
    expect(api.position({longitude: 34.567, latitude: -12.345})).toEqual({longitude: 34.6, latitude: -12.3});
    for (const longitude of [-540, -180, 180, 540, 179.96]) {
      expect(api.position({longitude, latitude: 0}).longitude).toBe(-180);
    }
  });

  it('defaults invalid coordinates independently without coercing strings or booleans', () => {
    for (const value of [undefined, null, {}, [], '45']) {
      expect(api.position(value)).toEqual({longitude: 0, latitude: 0});
    }
    for (const value of [NaN, Infinity, -Infinity, '12', true, null]) {
      expect(api.position({longitude: value, latitude: 12.3})).toEqual({longitude: 0, latitude: 12.3});
      expect(api.position({longitude: 12.3, latitude: value})).toEqual({longitude: 12.3, latitude: 0});
    }
  });

  it('returns fresh coordinate objects and does not mutate persisted state', () => {
    const raw = Object.freeze({longitude: 540.2, latitude: 91, privateField: 'preserve'});
    const first = api.position(raw);
    const second = api.position(raw);
    expect(first).not.toBe(raw);
    expect(first).not.toBe(second);
    expect(first).toEqual({longitude: -179.8, latitude: 90});
    expect(raw).toEqual({longitude: 540.2, latitude: 91, privateField: 'preserve'});
  });

  it('uses the existing globe orientation and a consistent surface radius', () => {
    const cardinals = [
      [{longitude: 0, latitude: 0}, [.503, 0, 0]],
      [{longitude: 90, latitude: 0}, [0, 0, -.503]],
      [{longitude: -90, latitude: 0}, [0, 0, .503]],
      [{longitude: -180, latitude: 0}, [-.503, 0, 0]],
      [{longitude: 0, latitude: 90}, [0, .503, 0]],
      [{longitude: 0, latitude: -90}, [0, -.503, 0]]
    ];
    for (const [point, expected] of cardinals) {
      const surface = api.surface(point);
      expectVector(surface, expected);
      expect(radius(surface)).toBeCloseTo(.503, 12);
    }
  });

  it('round-trips geographic coordinates across hemispheres and the longitude seam', () => {
    for (const longitude of [-180, -179.9, -90, -11.4, 0, 90, 179.9]) {
      for (const latitude of [-89.9, -43.3, 0, 18, 89.9]) {
        const point = {longitude, latitude};
        expect(api.inverse(api.surface(point))).toEqual(point);
      }
    }
  });

  it('recovers coordinates from a ray hit regardless of vector length and leaves the hit unchanged', () => {
    const point = {longitude: 63.2, latitude: -24.7};
    const vector = Object.freeze(Array.from(api.surface(point), value => value * 5.6));
    const before = [...vector];
    expect(api.inverse(vector)).toEqual(point);
    expect(vector).toEqual(before);
    expect(api.inverse([0, .503, 0]).latitude).toBe(90);
    expect(api.inverse([0, -.503, 0]).latitude).toBe(-90);
  });

  it('returns a safe default for missing, zero or nonfinite ray hits', () => {
    for (const vector of [undefined, null, {}, [], [0, 0, 0], [1, 0], [NaN, 0, 0], [0, Infinity, 0], ['1', 0, 0]]) {
      expect(api.inverse(vector)).toEqual({longitude: 0, latitude: 0});
    }
  });

  it('maps normalized pointer positions to geographic coordinates with the same seam at both edges', () => {
    expect(api.map(.5, .5)).toEqual({longitude: 0, latitude: 0});
    expect(api.map(.25, .25)).toEqual({longitude: -90, latitude: 45});
    expect(api.map(.75, .75)).toEqual({longitude: 90, latitude: -45});
    expect(api.map(0, 0)).toEqual({longitude: -180, latitude: 90});
    expect(api.map(1, 1)).toEqual({longitude: -180, latitude: -90});
    expect(api.map(-.2, -.2)).toEqual({longitude: -180, latitude: 90});
    expect(api.map(1.2, 1.2)).toEqual({longitude: -180, latitude: -90});
  });

  it('accepts only the explicit relief view and defaults older state to surface', () => {
    expect(api.view('relief')).toBe('relief');
    for (const value of [undefined, null, 'surface', 'Relief', 'other', true, 1, {}]) {
      expect(api.view(value)).toBe('surface');
    }
  });
});

describe('Scale Explorer lunar destinations and notebook restoration', () => {
  it('preserves the original three lunar landmarks alongside whole-hemisphere destinations', () => {
    const all = details();
    const ids = Array.from(all, detail => detail.id);
    for (const id of ['tycho', 'maria', 'highlands', 'lunar-near', 'lunar-far', 'lunar-surface']) {
      expect(ids.filter(candidate => candidate === id)).toHaveLength(1);
    }
    const overview = ['lunar-near', 'lunar-far'].map(id => all.find(detail => detail.id === id));
    overview.forEach(detail => {
      expect(detail).toMatchObject({lunarOverview: true, surface: true, zoom: 1});
      expectVector(detail.viewAim, [0, 0, 0]);
      expect(radius(detail.at)).toBeCloseTo(.503, 12);
    });
    expectVector(overview[0].at.map((value, index) => value + overview[1].at[index]), [0, 0, 0]);
    expect(all.find(detail => detail.id === 'tycho').source).toContain('tycho');
  });

  it('uses the selected lunar position for the dynamic destination without changing other landmarks', () => {
    const point = Object.freeze({longitude: 126.4, latitude: -35.8});
    const initial = details();
    const selected = details(point);
    const destination = selected.find(detail => detail.id === 'lunar-surface');
    expect(destination).toMatchObject({surface: true, marker: false, zoom: 4});
    expectVector(destination.at, api.surface(point));
    for (const id of ['tycho', 'maria', 'highlands', 'lunar-near', 'lunar-far']) {
      expectVector(selected.find(detail => detail.id === id).at, initial.find(detail => detail.id === id).at);
    }
    expect(point).toEqual({longitude: 126.4, latitude: -35.8});
  });

  it('restores saved lunar destinations, coordinates and view while dropping unknown targets', () => {
    const input = [
      {itemId: 'moon', detailId: 'lunar-near', lunarPoint: {longitude: 190.24, latitude: 100}, lunarView: 'relief', note: 'The near hemisphere'},
      {itemId: 'moon', detailId: 'lunar-far', lunarPoint: {longitude: -220, latitude: -30}, lunarView: 'surface'},
      {itemId: 'moon', detailId: 'lunar-surface', lunarPoint: {longitude: 63.2, latitude: -24.7}, lunarView: 'relief', zoom: 4},
      {itemId: 'moon', detailId: 'imaginary-crater', lunarView: 'relief'}
    ];
    const before = JSON.stringify(input);
    const notes = api.observations(input);
    expect(Array.from(notes, note => note.detailId)).toEqual(['lunar-near', 'lunar-far', 'lunar-surface']);
    expect(notes[0]).toMatchObject({lunarPoint: {longitude: -169.8, latitude: 90}, lunarView: 'relief', note: 'The near hemisphere'});
    expect(notes[1]).toMatchObject({lunarPoint: {longitude: 140, latitude: -30}, lunarView: 'surface'});
    expect(notes[2]).toMatchObject({lunarPoint: {longitude: 63.2, latitude: -24.7}, lunarView: 'relief', zoom: 4});
    expectVector(details(notes[2].lunarPoint).find(detail => detail.id === notes[2].detailId).at, api.surface(input[2].lunarPoint));
    expect(notes[2].lunarPoint).not.toBe(input[2].lunarPoint);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('recovers legacy or damaged lunar state without adding lunar fields to other specimens', () => {
    const notes = api.observations([
      {itemId: 'moon', detailId: 'tycho'},
      {itemId: 'moon', detailId: 'maria', lunarPoint: {longitude: Infinity, latitude: '45'}, lunarView: 'RELIEF'},
      {itemId: 'earth', lunarPoint: {longitude: 10, latitude: 20}, lunarView: 'relief'},
      {itemId: 'jupiter', lunarPoint: {longitude: 10, latitude: 20}, lunarView: 'relief'}
    ]);
    for (const note of notes.slice(0, 2)) {
      expect(note).toMatchObject({lunarPoint: {longitude: 0, latitude: 0}, lunarView: 'surface'});
    }
    for (const note of notes.slice(2)) {
      expect(note).not.toHaveProperty('lunarPoint');
      expect(note).not.toHaveProperty('lunarView');
    }
  });

  it('retains drafts for all new lunar targets while rejecting unknown lunar destinations', () => {
    const drafts = {
      'moon:lunar-near': 'Dark plains', 'moon:lunar-far': 'Cratered hemisphere',
      'moon:lunar-surface': 'My selected location', 'moon:tycho': 'Rays',
      'moon:imaginary-crater': 'Unknown'
    };
    expect(api.drafts(drafts)).toEqual({
      'moon:lunar-near': 'Dark plains', 'moon:lunar-far': 'Cratered hemisphere',
      'moon:lunar-surface': 'My selected location', 'moon:tycho': 'Rays'
    });
  });
});
