import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const file = process.env.SCALE_MITO_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js';
const source = fs.readFileSync(file, 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.mitoChecks = { folds: MITO_FOLDS, number: mitoFoldNumber, detail: mitoDetailFold, view: mitoFoldView, energy: mitoEnergyPoint, limit: inspectionLimit, details: atlasDetails, observations: readObservations, drafts: readObservationDrafts, items: ITEMS };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const mito = sandbox.window.mitoChecks;
const plain = v => JSON.parse(JSON.stringify(v));
const details = id => mito.details(id, (key, fallback) => fallback);

describe('Scale Explorer mitochondrial journey', () => {
  it('provides seven distinct ordered folds with finite normalized views', () => {
    expect(mito.folds).toHaveLength(7);
    const positions = new Set();
    mito.folds.forEach((fold, i) => {
      expect(fold.n).toBe(i + 1);
      expect(fold.id).toBe('crista-' + String(i + 1).padStart(2, '0'));
      expect(Number.isFinite(fold.x)).toBe(true);
      expect(fold.radius).toBeGreaterThan(0);
      expect(fold.at).toHaveLength(3); expect(fold.at.every(Number.isFinite)).toBe(true);
      expect(fold.view).toHaveLength(3); expect(fold.view.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...fold.view)).toBeCloseTo(1, 6);
      if (i) expect(fold.x).toBeGreaterThan(mito.folds[i - 1].x);
      positions.add(fold.at.join(','));
    });
    expect(positions.size).toBe(7);
    expect(mito.items.find(i => i.id === 'mitochondrion').size).toBe(1e-6);
  });

  it('bounds numeric navigation and rejects coercible values', () => {
    expect([0, 1, 3.49, 3.5, 7, 100].map(mito.number)).toEqual([1, 1, 3, 4, 7, 7]);
    expect([undefined, null, '7', {}, NaN, Infinity, -Infinity].map(mito.number)).toEqual([4, 4, 4, 4, 4, 4, 4]);
  });

  it('accepts only exact stored fold IDs', () => {
    expect(Array.from({ length: 7 }, (_, i) => mito.detail('crista-' + String(i + 1).padStart(2, '0')))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(['crista-00', 'crista-08', 'crista-1', 'crista-01x', ' crista-01', 'CRISTA-01', 7, null, {}, undefined].map(mito.detail)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('returns detached views without exposing mutable route coordinates', () => {
    const view = mito.view(3), original = plain(mito.view(3));
    expect(view).toMatchObject({ n: 3, id: 'crista-03' });
    expect(view.at).toEqual(mito.folds[2].at); expect(view.view).toEqual(mito.folds[2].view);
    view.at[0] = 90; view.view[0] = 90; view.radius = 90; view.id = 'changed';
    expect(plain(mito.view(3))).toEqual(original);
    expect(mito.view(Infinity).n).toBe(4);
  });

  it('preserves legacy landmarks and gives each fold an individually addressable cutaway view', () => {
    const all = details('mitochondrion');
    expect(all.slice(0, 2).map(d => d.id)).toEqual(['cristae', 'envelope']);
    expect(all[0].source).toBe('https://www.ncbi.nlm.nih.gov/mesh/68051336');
    const stops = all.filter(d => d.mitoFold);
    expect(stops).toHaveLength(7);
    expect(new Set(all.map(d => d.id)).size).toBe(all.length);
    stops.forEach((d, i) => {
      expect(d.id).toBe(mito.folds[i].id); expect(d.at).toEqual(mito.folds[i].at);
      expect(d.marker).toBe(false); expect(d.cutaway).toBe(true);
      expect(d.source).toBe('https://pmc.ncbi.nlm.nih.gov/articles/PMC4625866/');
      expect(d.zoom).toBeGreaterThan(1); expect(d.zoom).toBeLessThanOrEqual(5);
    });
  });

  it('adds matrix, membrane space, synthase, and a DNA portal with cited science', () => {
    const all = details('mitochondrion');
    for (const id of ['matrix', 'intermembrane', 'atp-synthase', 'genome']) {
      const landmark = all.find(d => d.id === id);
      expect(landmark, id).toBeDefined();
      expect(landmark.body.length).toBeGreaterThan(30);
      expect(landmark.source).toMatch(/^https:\/\//);
      expect(landmark.at.every(Number.isFinite)).toBe(true);
      expect(landmark.cutaway).toBe(true);
    }
    expect(all.find(d => d.id === 'genome').visit).toBe('dna');
  });

  it('round trips exact fold notes in the existing detail schema and rejects invalid IDs', () => {
    const notes = plain(mito.observations([
      { itemId: 'mitochondrion', detailId: 'crista-01', zoom: 4, cutaway: true, note: 'First fold.' },
      { itemId: 'mitochondrion', detailId: 'crista-07', yaw: -.4, pitch: .2, note: 'Last fold.' },
      { itemId: 'mitochondrion', detailId: 'crista-08' },
      { itemId: 'mitochondrion', detailId: 'crista-1' },
      { itemId: 'mitochondrion', detailId: 'cristae', note: 'An older observation.' }
    ]));
    expect(notes.map(n => n.detailId)).toEqual(['crista-01', 'crista-07', 'cristae']);
    expect(notes[0]).toMatchObject({ size: 1e-6, zoom: 4, cutaway: true, note: 'First fold.' });
    expect(notes[1].yaw).toBeCloseTo(-.4, 12); expect(notes[1].pitch).toBe(.2);
    expect(notes[0].mitoFold).toBeUndefined();
    expect(plain(mito.drafts({ 'mitochondrion:crista-03': 'Third fold.', 'mitochondrion:crista-08': 'Invalid', 'mitochondrion:cristae': 'Legacy.' }))).toEqual({ 'mitochondrion:crista-03': 'Third fold.', 'mitochondrion:cristae': 'Legacy.' });
  });

  it('allows deep inspection of this organelle without changing other limits', () => {
    expect(mito.limit('mitochondrion')).toBe(5); expect(mito.limit('earth')).toBe(2.5);
    const notes = mito.observations([{ itemId: 'mitochondrion', detailId: 'crista-04', zoom: 4 },
      { itemId: 'mitochondrion', detailId: 'matrix', zoom: 999 }, { itemId: 'earth', zoom: 4 }]);
    expect(notes.map(n => n.zoom)).toEqual([4, 5, 2.5]);
  });

  it('anchors the energy steps to distinct detached membrane locations', () => {
    const ids = ['energy-electrons', 'energy-gradient', 'energy-synthase', 'energy-atp'];
    const points = ids.map(mito.energy), locations = new Set();
    points.forEach((point, i) => {
      expect(point.id).toBe(ids[i]); expect(point.at.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...point.view)).toBeCloseTo(1, 6); expect(point.zoom).toBe(4);
      locations.add(point.at.join(','));
      const original = plain(mito.energy(ids[i])); point.at[0] = 99; point.view[0] = 99;
      expect(plain(mito.energy(ids[i]))).toEqual(original);
    });
    expect(locations.size).toBe(4);
    for (const invalid of ['energy-atp ', ' energy-atp', 'energy-ATP', 'energy-unknown', null, 4, {}]) expect(mito.energy(invalid)).toBeNull();
    const stops = details('mitochondrion').filter(d => d.mitoEnergy);
    expect(stops.map(d => d.id)).toEqual(ids);
    stops.forEach(d => { expect(d.marker).toBe(false); expect(d.cutaway).toBe(true); expect(d.source).toMatch(/^https:\/\//); });
  });
});
