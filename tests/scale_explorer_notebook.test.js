import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.notebook = { readObservations: readObservations, readObservationDrafts: readObservationDrafts, items: ITEMS };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { readObservations, readObservationDrafts, items } = sandbox.window.notebook;

describe('Scale Explorer notebook recovers persisted student work', () => {
  it('ignores invalid targets and duplicate records without discarding valid notes', () => {
    const notes = readObservations([null, { itemId: '__proto__' }, { itemId: 'honeybee', detailId: 'missing' },
      { itemId: 'honeybee', detailId: 'wings', note: 'Veins branch from the thorax.', source: 'javascript:bad()' },
      { itemId: 'honeybee', detailId: 'wings', note: 'Duplicate' }, { itemId: 'earth', note: '<script>literal text</script>' }]);
    expect(notes.map(n => n.itemId + ':' + n.detailId)).toEqual(['honeybee:wings', 'earth:']);
    expect(notes[0].note).toBe('Veins branch from the thorax.');
    expect(notes[0].source).toBeUndefined();
    expect(notes[1].note).toBe('<script>literal text</script>');
    expect(readObservations({})).toEqual([]);
  });

  it('retains a recorded personal height and bounds damaged camera and note values', () => {
    const notes = readObservations([{ itemId: 'human', you: true, size: 1.23, note: 'x'.repeat(2000), zoom: 20, yaw: Infinity, pitch: -5 },
      { itemId: 'earth', size: 1, zoom: NaN }, { itemId: 'human', detailId: 'bad' }]);
    expect(notes[0]).toMatchObject({ size: 1.23, you: true, zoom: 2.5, yaw: 0, pitch: -1.1 });
    expect(notes[0].note).toHaveLength(1200);
    expect(notes[1].size).toBe(items.find(i => i.id === 'earth').size);
    expect(notes[1].zoom).toBe(1);
    expect(readObservations([{ itemId: 'human', size: 2.2 }])[0].size).toBe(1.7);
  });

  it('keeps drafts attached to known objects and features, including an intentionally blank edit', () => {
    expect(readObservationDrafts({ 'honeybee:wings': 'Two pairs', 'honeybee:': '', 'earth:': 'y'.repeat(1500),
      'honeybee:missing': 'Wrong feature', 'missing:': 'Wrong specimen', 'dna:bases': 12 })).toEqual({
      'honeybee:wings': 'Two pairs', 'honeybee:': '', 'earth:': 'y'.repeat(1200) });
    expect(readObservationDrafts(null)).toEqual({});
    expect(readObservationDrafts([])).toEqual({});
  });

  it('bounds a notebook loaded from oversized storage', () => {
    const notes = readObservations(items.map(item => ({ itemId: item.id, note: item.name })));
    expect(notes).toHaveLength(24);
    expect(notes[23].note).toBe(items[23].name);
  });
});
