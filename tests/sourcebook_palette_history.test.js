import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('stem_lab/stem_tool_sourcebook.js', 'utf8');
function load() { const box = { console, setTimeout, clearTimeout, window: { AbortController } }; vm.runInNewContext(source, box); return box.window.SourcebookProviders; }
const now = '2026-09-04T12:00:00.000Z';
const clone = value => JSON.parse(JSON.stringify(value));
function manifest(api) {
  const ids = api.materials.slice(0, 2).map(item => item.id).reverse();
  return api.buildPalette(ids, { [ids[0]]: { note: 'Compare warm shadows', flip: true, grayscale: true, grid: true, posterize: true } }, 'Lesson one');
}
describe('Sourcebook palette checkpoint history', () => {
  it('round-trips order, preparation, and title through a portable manifest', async () => {
    const api = load(); const original = manifest(api);
    const history = api.appendPaletteCheckpoint([], original, '  Before value study  ', 'checkpoint-one', now);
    expect(history[0].name).toBe('Before value study');
    expect(history[0].manifest.assets.map(item => item.id)).toEqual(original.assets.map(item => item.id));
    const restored = await api.revalidatePalette(history[0].manifest);
    expect(restored.title).toBe(original.title);
    expect(restored.preparation[original.assets[0].id]).toEqual(original.assets[0].preparation);
    expect(api.normalizePaletteHistory(JSON.parse(JSON.stringify(history)))).toEqual(history);
  });
  it('fingerprints content independently of timestamps and detects changes in notes, order, or title', () => {
    const api = load(); const original = manifest(api); const changed = clone(original);
    changed.createdAt = '2000-01-01';
    expect(api.checkpointFingerprint(changed)).toBe(api.checkpointFingerprint(original));
    changed.assets[0].preparation.note = 'Different';
    expect(api.checkpointFingerprint(changed)).not.toBe(api.checkpointFingerprint(original));
    const reordered = clone(original); reordered.assets.reverse();
    expect(api.checkpointFingerprint(reordered)).not.toBe(api.checkpointFingerprint(original));
    expect(api.checkpointFingerprint({ ...original, title: 'Lesson two' })).not.toBe(api.checkpointFingerprint(original));
  });
  it('does not mutate or evict any of the eight checkpoints when history is full', () => {
    const api = load(); let history = []; const original = manifest(api);
    for (let i=0; i<8; i++) history=api.appendPaletteCheckpoint(history, original, 'Version '+i, 'checkpoint-'+i, now);
    const before = JSON.stringify(history);
    expect(() => api.appendPaletteCheckpoint(history, original, 'Nine', 'checkpoint-nine', now)).toThrow('checkpoint-full');
    expect(JSON.stringify(history)).toBe(before);
    expect(history.map(entry => entry.name)).toEqual(Array.from({ length: 8 }, (_, i) => 'Version '+(7-i)));
  });
  it('rejects malformed history, duplicate IDs, unsafe manifests, and oversize storage', () => {
    const api = load(); const history = api.appendPaletteCheckpoint([], manifest(api), 'Saved', 'checkpoint-one', now);
    expect(api.normalizePaletteHistory(undefined)).toEqual([]);
    expect(() => api.normalizePaletteHistory({})).toThrow('checkpoint-invalid');
    expect(() => api.normalizePaletteHistory([history[0], history[0]])).toThrow('checkpoint-invalid');
    expect(() => api.normalizePaletteHistory([{ ...history[0], createdAt: 'bad' }])).toThrow('checkpoint-invalid');
    const unsafe = clone(history); unsafe[0].manifest.assets[0].sourceUrl='javascript:alert(1)';
    expect(() => api.normalizePaletteHistory(unsafe)).toThrow('checkpoint-invalid');
    expect(() => api.normalizePaletteHistory([{ ...history[0], name: 'x'.repeat(160001) }])).toThrow('checkpoint-full');
    expect(() => api.appendPaletteCheckpoint([], manifest(api), ' ', 'checkpoint-empty', now)).toThrow('checkpoint-invalid');
  });
  it('keeps external checkpoints as unverified candidates until restore checks the catalog', async () => {
    const api = load();
    const item = api.normalizeAicArtwork({ id:123, title:'Study', image_id:'abc-123', is_public_domain:true }, { iiif_url:'https://www.artic.edu/iiif/2' }, '', 'All');
    const saved = api.appendPaletteCheckpoint([], api.buildPalette([item.id], {}, 'External', [item]), 'External', 'checkpoint-external', now);
    expect(api.normalizePaletteHistory(saved)).toHaveLength(1);
    await expect(api.revalidatePalette(saved[0].manifest)).rejects.toThrow();
  });
});
