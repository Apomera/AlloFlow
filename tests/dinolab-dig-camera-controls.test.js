import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text) {
  const a = text.indexOf('// DINO_VOXEL_CAMERA_MODEL_START'), b = text.indexOf('// DINO_VOXEL_CAMERA_MODEL_END', a);
  if (a < 0 || b <= a || text.indexOf('// DINO_VOXEL_CAMERA_MODEL_START', a + 1) >= 0) throw Error('Missing or ambiguous voxel camera model');
  return text.slice(a, b);
}
const modelSource = bounded(source);
const summary = new Function(modelSource + '\nreturn digVoxelCameraSummary;')();
const keys = ['view','orientation','zoomPercent','canZoomIn','canZoomOut'].sort();

describe('bounded actual-pose voxel camera summary', () => {
  it('ships the same standalone helper in both source mirrors', () => {
    expect(bounded(mirror)).toBe(modelSource);
    expect(Object.keys(summary()).sort()).toEqual(keys);
    expect(summary()).toEqual({ view: 'full', orientation: 'oblique', zoomPercent: 100, canZoomIn: true, canZoomOut: true });
  });

  it('uses the existing view defaults without reading excavation or identity', () => {
    expect(summary(null, 'full')).toMatchObject({ view: 'full', orientation: 'oblique', zoomPercent: 100 });
    expect(summary(null, 'section')).toMatchObject({ view: 'section', orientation: 'low', zoomPercent: 100 });
    expect(summary(null, 'find')).toMatchObject({ view: 'find', orientation: 'oblique', zoomPercent: 100 });
  });

  it('describes actual low, oblique and overhead presets while preserving active view names', () => {
    for (const view of ['full','section','find']) {
      expect(summary({ yaw: .72, pitch: .20, zoom: 1 }, view)).toMatchObject({ view, orientation: 'low' });
      expect(summary({ yaw: .72, pitch: .70, zoom: 1 }, view)).toMatchObject({ view, orientation: 'oblique' });
      expect(summary({ yaw: 0, pitch: 1.53, zoom: 1 }, view)).toMatchObject({ view, orientation: 'overhead' });
    }
  });

  it('uses deterministic qualitative thresholds rather than geological measurements', () => {
    expect(summary({ pitch: .349999, zoom: 1 }).orientation).toBe('low');
    expect(summary({ pitch: .35, zoom: 1 }).orientation).toBe('oblique');
    expect(summary({ pitch: 1.199999, zoom: 1 }).orientation).toBe('oblique');
    expect(summary({ pitch: 1.20, zoom: 1 }).orientation).toBe('overhead');
  });

  it('clamps zoom to renderer limits and accurately disables further movement at endpoints', () => {
    for (const zoom of [-20, 0, .65]) expect(summary({ pitch: .7, zoom })).toMatchObject({ zoomPercent: 65, canZoomIn: true, canZoomOut: false });
    for (const zoom of [1.8, 3, 200]) expect(summary({ pitch: .7, zoom })).toMatchObject({ zoomPercent: 180, canZoomIn: false, canZoomOut: true });
    expect(summary({ pitch: .7, zoom: 1.234 })).toMatchObject({ zoomPercent: 123, canZoomIn: true, canZoomOut: true });
    expect(summary({ pitch: .7, zoom: .651 })).toMatchObject({ zoomPercent: 65, canZoomIn: true, canZoomOut: true });
  });

  it('rejects coercion of malformed numeric values and safely bounds pitch', () => {
    const hostile = { valueOf() { throw Error('coerced'); }, toString() { throw Error('coerced'); } };
    for (const value of [undefined,null,false,'1',NaN,Infinity,-Infinity,[],{},hostile,new Number(1)]) expect(summary({ pitch: value, zoom: value }, 'section')).toEqual({ view: 'section', orientation: 'low', zoomPercent: 100, canZoomIn: true, canZoomOut: true });
    expect(summary({ pitch: -100, zoom: 1 }).orientation).toBe('low');
    expect(summary({ pitch: 100, zoom: 1 }).orientation).toBe('overhead');
    for (const raw of [null, undefined, 0, false, 'pose', []]) expect(summary(raw, 'find').orientation).toBe('oblique');
  });

  it('is immutable and ignores unrelated yaw, find and hidden-layout properties', () => {
    const raw = { pitch: .7, zoom: 1.2 };
    for (const name of ['yaw','shape','site','seed','burial','boneCells','identity','cameraBank']) Object.defineProperty(raw, name, { get() { throw Error('Unrelated field read: ' + name); } });
    Object.freeze(raw);
    expect(summary(raw, 'full')).toEqual({ view: 'full', orientation: 'oblique', zoomPercent: 120, canZoomIn: true, canZoomOut: true });
    expect(Object.keys(summary(raw, 'full')).sort()).toEqual(keys);
  });

  it('normalizes unknown view identifiers without retaining extra fields or unsafe text', () => {
    for (const view of ['',undefined,null,true,0,'FULL','<script>']) expect(summary({ pitch: .7, zoom: 1 },view).view).toBe('full');
    const actual = { pitch: .7, zoom: 1.1, cameraBank: 'find', depth: 400 };
    expect(summary(actual,'section')).toMatchObject({ view: 'section', zoomPercent: 110 });
    expect(Object.keys(actual)).toEqual(['pitch','zoom','cameraBank','depth']);
  });
});
