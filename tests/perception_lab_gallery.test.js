import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let gallery, scene, host, root, latest, viewers, close, replace;
const load = file => new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))();
const query = selector => host.querySelector(selector);
async function click(selector) {
  const node = typeof selector === 'string' ? query(selector) : selector;
  expect(node).toBeTruthy();
  await act(async () => node.click());
}
async function input(selector, value) {
  const node = query(selector);
  expect(node).toBeTruthy();
  await act(async () => {
    const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function mount(seed = {}, strict = false) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionGallery: seed, perceptionLab: { models: { brightness: { note: '2D draft' } } }, otherTool: { preserved: 37 } });
    latest = data;
    replace = setData;
    return React.createElement(gallery.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: close });
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Harness)) : React.createElement(Harness)));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  load('stem_lab/perception_gallery.js');
  load('stem_lab/perception_gallery_scene.js');
  gallery = window.StemLab.PerceptionGallery;
  scene = window.StemLab.PerceptionGalleryScene;
  viewers = []; close = vi.fn();
  window.StemLab.PerceptionGalleryScene.createViewer = vi.fn(() => {
    let report = () => {};
    const viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready',
      onStatusChange: fn => { report = fn; }, report: value => report(value), pickStation: vi.fn(() => 'triangle'),
      onLayout: fn => { fn(['room', 'triangle', 'shape'].map((id, index) => ({ id, x: (index + 1) / 4, y: 0.7, visible: true }))); return () => {}; } };
    viewers.push(viewer); return viewer;
  });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('3D perception gallery models', () => {
  it('normalizes bounded models and ignores invalid observation records without mutating input', () => {
    const raw = { station: 'unknown', view: 'fly', models: { room: { angle: Infinity, shift: '-150', prediction: 'unknown', note: 'n'.repeat(1000), reveal: true },
      triangle: { angle: '72', shift: NaN }, shape: { angle: null, shift: ' ' } }, observations: [
      { id: 'saved', station: 'shape', model: { shift: 0 }, view: 'inspect', camera: { y: 999, x: -999 } },
      { id: 'saved', station: 'room' }, { id: 'bad-station', station: 'unknown' }, null
    ] };
    const before = structuredClone(raw), result = gallery.normalize(raw);
    expect(raw).toEqual(before);
    expect(result.station).toBe('room'); expect(result.view).toBe('gallery');
    expect(result.models.room).toMatchObject({ angle: -24, shift: -100, prediction: '', assisted: true, solved: false });
    expect(result.models.room.note).toHaveLength(600);
    expect(result.models.triangle).toMatchObject({ angle: 60, shift: 58 });
    expect(result.models.shape).toMatchObject({ angle: -24, shift: 58 });
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0].camera).toEqual({ y: 160, x: -45 });
    result.observations[0].model.shift = 65;
    expect(raw.observations[0].model.shift).toBe(0);
    expect(gallery.normalize(null).models.room).toEqual(gallery.normalizeModel());
  });

  it('checks measured dimensions and alignment tolerance', () => {
    expect(gallery.checkAnswer('room', {})).toBe('choose');
    expect(gallery.checkAnswer('room', { prediction: 'left' })).toBe('again');
    expect(gallery.checkAnswer('room', { prediction: 'same' })).toBe('correct');
    expect(gallery.checkAnswer('triangle', { angle: -2 })).toBe('correct');
    expect(gallery.checkAnswer('triangle', { angle: 3 })).toBe('again');
    expect(gallery.checkAnswer('shape', { shift: 3 })).toBe('correct');
    expect(gallery.checkAnswer('shape', { shift: -4 })).toBe('again');
    expect(gallery.checkAnswer('unknown', {})).toBe('again');
  });

  it('constructs equal room objects at different depths', () => {
    const objects = scene.roomObjects(-11);
    expect(objects[0].height).toBe(objects[1].height);
    expect(objects[0].width).toBe(objects[1].width);
    expect(objects[0].depth).toBe(objects[1].depth);
    expect(objects[0].position.z).not.toBe(objects[1].position.z);
    expect(scene.projectPoint(objects[0].position, -11).y).toBeCloseTo(scene.projectPoint(objects[1].position, -11).y);
  });

  it('joins projected beam endpoints while preserving separate physical depths', () => {
    const beams = scene.triangleParts(0);
    expect(new Set(beams.map(part => part[0].z)).size).toBe(3);
    for (let index = 0; index < beams.length; index++) {
      const end = scene.projectPoint(beams[index][1], 0);
      const next = scene.projectPoint(beams[(index + 1) % beams.length][0], 0);
      expect(end.x).toBeCloseTo(next.x); expect(end.y).toBeCloseTo(next.y);
      expect(beams[index][1]).not.toEqual(beams[(index + 1) % beams.length][0]);
    }
  });

  it('forms one star from ten separated fragments only at aligned projection', () => {
    const aligned = scene.starParts(11, 0), shifted = scene.starParts(11, 58);
    expect(new Set(aligned.map(part => part[0].z)).size).toBe(10);
    for (let index = 0; index < aligned.length; index++) {
      const center = scene.projectPoint(aligned[index][0], 11);
      expect(center.x).toBeCloseTo(0); expect(center.y).toBeCloseTo(0);
      const edge = scene.projectPoint(aligned[index][2], 11);
      const next = scene.projectPoint(aligned[(index + 1) % aligned.length][1], 11);
      expect(edge.x).toBeCloseTo(next.x); expect(edge.y).toBeCloseTo(next.y);
    }
    expect(scene.projectPoint(shifted[0][0], 11)).not.toEqual(scene.projectPoint(shifted[1][0], 11));
  });

  it('reports physical geometry independently from apparent alignment', () => {
    const room = scene.measurements('room', {});
    expect(room).toMatchObject({ objectHeight: 1.65, leftDepthDistance: 15.6, rightDepthDistance: 10 });
    expect(room.apparentHeightRatio).toBeCloseTo(1.56);
    expect(room.leftDepthDistance / room.rightDepthDistance).toBeCloseTo(room.apparentHeightRatio);
    const triangle = scene.measurements('triangle', { angle: 0 }), beams = scene.triangleParts(0);
    expect(triangle.beamCount).toBe(3);
    expect(triangle.joinGaps).toHaveLength(3);
    triangle.joinGaps.forEach((gap, index) => {
      const a = beams[index][1], b = beams[(index + 1) % beams.length][0];
      expect(gap).toBeCloseTo(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
      expect(gap).toBeGreaterThan(0);
    });
    expect(scene.measurements('triangle', { angle: 40 })).toEqual(triangle);
    expect(scene.measurements('shape', { shift: 0 })).toEqual({ fragmentCount: 10, depthSpan: 5.2, distinctDepths: 10 });
    expect(scene.measurements('shape', { shift: 58 })).toEqual(scene.measurements('shape', { shift: 0 }));
    expect(scene.measurements('unknown', {})).toBeNull();
  });
});

describe('3D perception gallery interactions', () => {
  it('requires a prediction, marks independent solves, and preserves other tool data', async () => {
    await mount();
    await click('[data-gallery-check]');
    expect(query('[data-gallery-feedback]').textContent).toContain('Choose');
    await click('[data-gallery-choice="left"]'); await click('[data-gallery-check]');
    expect(latest.perceptionGallery.models.room.solved).toBe(false);
    await click('[data-gallery-choice="same"]'); await click('[data-gallery-check]');
    expect(latest.perceptionGallery.models.room.solved).toBe(true);
    expect(latest.perceptionLab).toEqual({ models: { brightness: { note: '2D draft' } } });
    expect(latest.otherTool).toEqual({ preserved: 37 });
    await click('[data-gallery-close]'); expect(close).toHaveBeenCalledOnce();
  });

  it('opens stations from accessible hotspots in both 3D and diagram modes', async () => {
    await mount();
    for (const diagram of [false, true]) {
      if (diagram) await click('[data-gallery-diagram-toggle]');
      for (const id of ['room', 'triangle', 'shape']) {
        await click('[data-gallery-view="gallery"]');
        const hotspot = query('[data-gallery-hotspot="' + id + '"]');
        expect(hotspot.tagName).toBe('BUTTON');
        expect(hotspot.getAttribute('aria-label') || hotspot.textContent).toBeTruthy();
        await click(hotspot);
        expect(latest.perceptionGallery).toMatchObject({ station: id, view: 'illusion' });
      }
    }
  });

  it('offers bounded hints without revealing answers or granting a solve', async () => {
    expect(gallery.normalizeModel({ hints: -3 }).hints).toBe(0);
    expect(gallery.normalizeModel({ hints: 50 }).hints).toBe(2);
    expect(gallery.normalizeModel({ hints: NaN }).hints).toBe(0);
    await mount();
    for (const station of ['room', 'triangle', 'shape']) {
      await click('[data-gallery-station="' + station + '"]');
      const before = structuredClone(latest.perceptionGallery.models[station]);
      await click('[data-gallery-hint]');
      expect(latest.perceptionGallery.models[station]).toEqual({ ...before, hints: 1 });
      await click('[data-gallery-hint]');
      expect(latest.perceptionGallery.models[station]).toEqual({ ...before, hints: 2 });
      expect(query('[data-gallery-explanation]')).toBeNull();
      expect(query('[data-gallery-hint]').disabled).toBe(true);
      if (station === 'room') await click('[data-gallery-choice="same"]');
      else await input(station === 'triangle' ? '[data-gallery-angle]' : '[data-gallery-shift]', 0);
      await click('[data-gallery-check]');
      expect(latest.perceptionGallery.models[station]).toMatchObject({ solved: true, assisted: false, hints: 2 });
      await click('[data-gallery-reset]');
      expect(latest.perceptionGallery.models[station].hints).toBe(0);
    }
  });

  it('shows measurement evidence only after geometry is revealed', async () => {
    await mount();
    for (const station of ['room', 'triangle', 'shape']) {
      await click('[data-gallery-station="' + station + '"]');
      expect(query('[data-gallery-measurements]')).toBeNull();
      await click('[data-gallery-reveal]');
      const measurements = query('[data-gallery-measurements]');
      expect(measurements).toBeTruthy();
      expect(query('[data-gallery-explanation]').contains(measurements)).toBe(true);
      expect(measurements.textContent).toContain(station === 'room' ? '1.65' : station === 'shape' ? '5.2' : '3');
    }
  });

  it('keeps assisted solutions distinct from independent solves until a puzzle is reset', async () => {
    await mount();
    for (const station of ['triangle', 'shape']) {
      await click('[data-gallery-station="' + station + '"]');
      await input('[data-gallery-note]', 'Keep my observation');
      await click('[data-gallery-reveal]');
      expect(latest.perceptionGallery.view).toBe('inspect');
      expect(query('[data-gallery-explanation]')).toBeTruthy();
      await click('[data-gallery-solution]'); await click('[data-gallery-check]');
      expect(latest.perceptionGallery.models[station]).toMatchObject({ assisted: true, solved: false });
      await click('[data-gallery-reset]');
      expect(latest.perceptionGallery.models[station]).toMatchObject({ assisted: false, solved: false, note: 'Keep my observation' });
      await input(station === 'triangle' ? '[data-gallery-angle]' : '[data-gallery-shift]', 0);
      await click('[data-gallery-check]');
      expect(latest.perceptionGallery.models[station].solved).toBe(true);
    }
  });

  it('saves an independent snapshot and revisits it without losing earned progress', async () => {
    await mount(); await click('[data-gallery-station="shape"]');
    await input('[data-gallery-note]', 'Edges meet from here.'); await input('[data-gallery-shift]', 0);
    await click('[data-gallery-view="inspect"]');
    await input('[data-gallery-yaw]', 40); await input('[data-gallery-pitch]', 12);
    await click('[data-gallery-save]');
    const saved = structuredClone(latest.perceptionGallery.observations[0]);
    expect(saved.camera).toEqual({ y: 40, x: 12 });
    await click('[data-gallery-check]');
    await input('[data-gallery-shift]', 50); await input('[data-gallery-note]', 'Changed draft');
    await click('[data-gallery-station="room"]');
    await click(query('[data-gallery-record] button'));
    expect(latest.perceptionGallery.station).toBe('shape');
    expect(latest.perceptionGallery.models.shape).toMatchObject({ shift: 0, note: 'Edges meet from here.', solved: true });
    expect(query('[data-gallery-yaw]').value).toBe('40'); expect(query('[data-gallery-pitch]').value).toBe('12');
    expect(latest.perceptionGallery.observations[0]).toEqual(saved);
  });

  it('compares saved and current views without changing the draft, camera, or notebook', async () => {
    await mount(); await click('[data-gallery-station="shape"]');
    await input('[data-gallery-shift]', 0); await input('[data-gallery-note]', 'Saved aligned star');
    await click('[data-gallery-view="inspect"]'); await input('[data-gallery-yaw]', 40); await input('[data-gallery-pitch]', 12);
    await click('[data-gallery-save]');
    const record = structuredClone(latest.perceptionGallery.observations[0]);
    await input('[data-gallery-shift]', 50); await input('[data-gallery-note]', 'Current scattered star');
    await input('[data-gallery-yaw]', -20); await input('[data-gallery-pitch]', 5);
    const before = structuredClone(latest);
    await click('[data-gallery-compare="' + record.id + '"]');
    expect(query('aside.pg-task').textContent).toContain('Saved aligned star');
    expect(query('aside.pg-task').textContent).toContain('Current scattered star');
    expect(query('[data-gallery-note]')).toBeNull();
    expect(query('[data-gallery-yaw]')).toBeNull();
    await click('[data-gallery-compare-view="saved"]');
    expect(viewers.at(-1).push.mock.lastCall[0]).toMatchObject({ station: 'shape', view: 'inspect', shift: 0, rotY: 40, rotX: 12 });
    await click('[data-gallery-compare-view="current"]');
    expect(viewers.at(-1).push.mock.lastCall[0]).toMatchObject({ station: 'shape', view: 'inspect', shift: 50, rotY: -20, rotX: 5 });
    expect(latest).toEqual(before);
    await click('[data-gallery-compare-close]');
    expect(query('[data-gallery-comparison]')).toBeNull();
    expect(query('[data-gallery-note]').value).toBe('Current scattered star');
    expect(query('[data-gallery-yaw]').value).toBe('-20');
    expect(query('[data-gallery-pitch]').value).toBe('5');
    expect(latest).toEqual(before);
  });

  it('ends comparisons when navigating or when the saved record disappears', async () => {
    await mount(); await click('[data-gallery-save]');
    const id = latest.perceptionGallery.observations[0].id;
    await click('[data-gallery-station="shape"]');
    await input('[data-gallery-note]', 'Keep current star draft');
    const before = structuredClone(latest);
    await click('[data-gallery-compare="' + id + '"]');
    expect(viewers.at(-1).push.mock.lastCall[0].station).toBe('room');
    expect(latest).toEqual(before);
    await click('[data-gallery-station="triangle"]');
    expect(query('[data-gallery-comparison]')).toBeNull();
    expect(latest.perceptionGallery.models.shape.note).toBe('Keep current star draft');
    await click('[data-gallery-compare="' + id + '"]');
    await click('[data-gallery-record="' + id + '"] button[title="Delete observation"]');
    expect(query('[data-gallery-comparison]')).toBeNull();
    expect(latest.perceptionGallery.observations).toHaveLength(0);
    await click('[data-gallery-save]');
    await click('[data-gallery-compare="' + latest.perceptionGallery.observations[0].id + '"]');
    await act(async () => replace(data => ({ ...data, perceptionGallery: { ...data.perceptionGallery, observations: [] } })));
    expect(query('[data-gallery-comparison]')).toBeNull();
    expect(latest.perceptionGallery.station).toBe('triangle');
  });

  it('caps saved observations without deleting existing records and allows recovery by deletion', async () => {
    const records = Array.from({ length: 30 }, (_, index) => ({ id: 'record-' + index, station: 'room', model: { note: 'Observation ' + index } }));
    await mount(gallery.normalize({ observations: records }));
    expect(latest.perceptionGallery.observations).toHaveLength(24);
    expect(query('[data-gallery-save]').disabled).toBe(true);
    await click(query('[data-gallery-record] button[title="Delete observation"]'));
    expect(latest.perceptionGallery.observations).toHaveLength(23);
    expect(query('[data-gallery-save]').disabled).toBe(false);
    await click('[data-gallery-save]');
    expect(latest.perceptionGallery.observations).toHaveLength(24);
    expect(latest.perceptionGallery.observations[0].id).toBe('record-0');
  });

  it('provides an interactive diagram after WebGL failure and retries with one active viewer', async () => {
    await mount({}, true);
    expect(viewers.filter(viewer => viewer.dispose.mock.calls.length === 0)).toHaveLength(1);
    await act(async () => viewers.at(-1).report('failed'));
    expect(query('[data-gallery-diagram]')).toBeTruthy();
    expect(query('[data-gallery-retry]')).toBeTruthy();
    await click('[data-gallery-choice="same"]'); await click('[data-gallery-check]');
    expect(latest.perceptionGallery.models.room.solved).toBe(true);
    await click('[data-gallery-retry]');
    expect(viewers.filter(viewer => viewer.dispose.mock.calls.length === 0)).toHaveLength(1);
    await click('[data-gallery-diagram-toggle]');
    expect(query('[data-gallery-diagram]')).toBeTruthy();
    expect(viewers.filter(viewer => viewer.dispose.mock.calls.length === 0)).toHaveLength(0);
    await click('[data-gallery-diagram-toggle]');
    expect(viewers.filter(viewer => viewer.dispose.mock.calls.length === 0)).toHaveLength(1);
    await act(async () => root.unmount()); root = null;
    expect(viewers.every(viewer => viewer.dispose.mock.calls.length === 1)).toBe(true);
  });

  it('exports the bounded notebook as structured JSON', async () => {
    const blobs = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob); return 'blob:gallery'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount(); await input('[data-gallery-note]', 'Literal <words>'); await click('[data-gallery-save]');
    await click('[data-gallery-export]');
    expect(blobs).toHaveLength(1);
    const text = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blobs[0]); });
    const exported = JSON.parse(text);
    expect(exported.schema).toBe('alloflow.perception.gallery'); expect(exported.version).toBe(1);
    expect(exported.observations[0].model.note).toBe('Literal <words>');
  });
});
