import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.notebook = { readObservations: readObservations, readObservationDrafts: readObservationDrafts, items: ITEMS };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { readObservations, readObservationDrafts, items } = sandbox.window.notebook;

describe('Scale Explorer notebook recovers persisted student work', () => {
  it('restores bounded canyon relief and preserves its new Earth entry point', () => {
    const notes=readObservations([{itemId:'grand-canyon',detailId:'canyon-rim',terrainRelief:7,zoom:10},
      {itemId:'grand-canyon',detailId:'river-bend',terrainRelief:-9,zoom:100},
      {itemId:'grand-canyon',detailId:'side-canyons',terrainRelief:Infinity},
      {itemId:'earth',detailId:'arizona-canyon',terrainRelief:999}]);
    expect(notes.map(n=>n.terrainRelief)).toEqual([7,1,8,20]);
    expect(notes.map(n=>n.zoom)).toEqual([10,12,1,1]);
    expect(readObservationDrafts({'earth:arizona-canyon':'Enter the landscape','grand-canyon:river-bend':'Along the river'})).toEqual({'earth:arizona-canyon':'Enter the landscape','grand-canyon:river-bend':'Along the river'});
  });

  it('restores deep orbital views without extending other specimens’ zoom limits', () => {
    const notes=readObservations([{itemId:'solar-system',detailId:'earth-orbit',zoom:32},
      {itemId:'solar-system',detailId:'inner-orbits',zoom:24},{itemId:'solar-system',detailId:'saturn-orbit',zoom:100},
      {itemId:'earth',zoom:32},{itemId:'solar-system',detailId:'pluto-orbit',zoom:12}]);
    expect(notes.map(n=>n.zoom)).toEqual([32,24,32,2.5]);
    expect(readObservationDrafts({'solar-system:earth-orbit':'One AU','solar-system:pluto-orbit':'Unknown'})).toEqual({'solar-system:earth-orbit':'One AU'});
  });

  it('recovers nebula visibility and uses the corrected 24-light-year reference', () => {
    const notes=readObservations([{itemId:'orion-nebula',detailId:'trapezium',nebulaReveal:true,size:7.6e17},
      {itemId:'orion-nebula',detailId:'dust-ridge',nebulaReveal:'true'},
      {itemId:'orion-nebula',detailId:'stellar-cavity'},{itemId:'orion-nebula',detailId:'imaginary-star'}]);
    expect(notes.map(n=>[n.detailId,n.nebulaReveal])).toEqual([['trapezium',true],['dust-ridge',false],['stellar-cavity',false]]);
    expect(notes[0].size/9.461e15).toBeCloseTo(24,1);
    expect(readObservationDrafts({'orion-nebula:trapezium':'Four bright stars','orion-nebula:missing':'Ignore'})).toEqual({'orion-nebula:trapezium':'Four bright stars'});
  });
  it('preserves galaxy landmarks and the recorded viewing direction', () => {
    const notes=readObservations([{itemId:'milkyway',detailId:'galactic-disc',yaw:-.18,pitch:-.66,zoom:1.25},
      {itemId:'milkyway',detailId:'solar-neighbourhood',note:'Our location'},{itemId:'milkyway',detailId:'invented-arm'}]);
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({detailId:'galactic-disc',yaw:-.18,pitch:-.66,zoom:1.25,size:9.5e20});
    expect(readObservationDrafts({'milkyway:solar-neighbourhood':'Here we are','milkyway:invented-arm':'Invalid'})).toEqual({'milkyway:solar-neighbourhood':'Here we are'});
  });
  it('preserves solar layer observations and rejects an unknown solar target', () => {
    const notes=readObservations([{itemId:'sun',detailId:'core',cutaway:true,note:'Fusion releases energy.'},
      {itemId:'sun',detailId:'photosphere',cutaway:false},{itemId:'sun',detailId:'prominence',cutaway:false},
      {itemId:'sun',detailId:'missing-layer'}]);
    expect(notes.map(n=>[n.detailId,n.cutaway])).toEqual([['core',true],['photosphere',false],['prominence',false]]);
    expect(notes[0].note).toBe('Fusion releases energy.');
    expect(readObservationDrafts({'sun:core':'Start here','sun:missing-layer':'Invalid'})).toEqual({'sun:core':'Start here'});
  });
  it('keeps distinct microscopic structures and their saved cutaway state', () => {
    const notes=readObservations([{itemId:'ecoli',detailId:'nucleoid',cutaway:true,note:'DNA is folded.'},
      {itemId:'ecoli',detailId:'cell-envelope',cutaway:false},
      {itemId:'paramecium',detailId:'contractile-vacuole',cutaway:true},
      {itemId:'paramecium',detailId:'oral-groove',cutaway:false}]);
    expect(notes.map(n=>[n.itemId,n.detailId,n.cutaway])).toEqual([
      ['ecoli','nucleoid',true],['ecoli','cell-envelope',false],
      ['paramecium','contractile-vacuole',true],['paramecium','oral-groove',false]]);
    expect(notes[0].note).toBe('DNA is folded.');
  });
  it('restores planetary lighting and landmarks while accepting older notebook entries', () => {
    const notes = readObservations([{itemId:'earth',detailId:'sahara',sunAngle:135},
      {itemId:'moon',detailId:'tycho',sunAngle:999},{itemId:'jupiter',detailId:'red-spot',sunAngle:NaN},
      {itemId:'earth',detailId:'pacific'}]);
    expect(notes.map(n=>n.sunAngle)).toEqual([135,180,45,45]);
    expect(notes.map(n=>n.detailId)).toEqual(['sahara','tycho','red-spot','pacific']);
  });
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
