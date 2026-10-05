import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function extract(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous shipped find display function');
  return text.slice(a, b);
}
const displaySource = extract(source, '        function syncFindDisplay(p, find) {', '        function viewKey(p)');
const lookSource = extract(source, '  function digVoxelFindLook(value) {', '  // Shortcuts are momentary');
const normalizeLook = new Function(lookSource + '\nreturn digVoxelFindLook;')();
const selected = Object.freeze({ index: 7, coord: 'B2', shape: 'elongate', removed: 3, remaining: 1 });
const other = Object.freeze({ index: 0, coord: 'A1', shape: 'curved', removed: 4, remaining: 0 });
const find = Object.freeze({ selected, focus: 7, finds: Object.freeze([other, selected]) });

function fixture() {
  const surfaces = [Object.freeze({ name: 'bone-surface', map: { name: 'bone-map' }, bumpMap: { name: 'bone-map' } }),
    Object.freeze({ name: 'break-surface', map: { name: 'bone-map' } })];
  const outline = Object.freeze({ name: 'dino-find-outline', map: null, bumpMap: null, wireframe: false, toneMapped: false });
  const siteLights = [.5, 1.15, .22].map((intensity, index) => ({ name: 'site-' + index, visible: true, intensity,
    color: Object.freeze({ name: 'original-site-color-' + index }), position: Object.freeze({ x: index, y: 12, z: 8 }) }));
  const records = [];
  const worldMeshes = [];
  for (let index = 0; index < 24; index++) for (let part = 0; part < 2; part++) {
    // Include an array material and an originally non-shadow-casting mesh. Both
    // must be restored by identity, not replaced with a guessed surface material.
    const surface = part ? surfaces[1] : index === 7 ? Object.freeze([...surfaces]) : surfaces[0];
    const castShadow = part === 0;
    const geometry = Object.freeze({ name: 'shared-geometry-' + part });
    const mesh = { material: surface, castShadow, receiveShadow: true, geometry };
    records.push(Object.freeze({ index, mesh, surface, castShadow }));
    worldMeshes.push(Object.freeze({ material: surface, castShadow, receiveShadow: true, geometry }));
  }
  const environment = {
    siteLights,
    findLighting: { visible: false, userData: { role: 'find-only-lighting' } },
    findAmbient: { intensity: .5 },
    findKey: { intensity: 1.15, shadow: { needsUpdate: false }, position: { x: -6, y: 12, z: 8,
      set(x, y, z) { this.x = x; this.y = y; this.z = z; } } },
    findFill: { intensity: .22 },
    scene: { userData: { inspectionOnly: true, removedLayers: 17, visibleLayers: 0, findSelection: 7 } },
    findStage: { userData: { find: selected, columnIndices: [7] } },
    findMeshes: Object.freeze(records), findOutlineMaterial: outline
  };
  const sync = new Function(...Object.keys(environment), 'digVoxelFindLook', displaySource + '\nreturn syncFindDisplay;')
    (...Object.values(environment), normalizeLook);
  return { sync, ...environment, worldMeshes, surfaces, outline };
}
function props(look, extras = {}) { return Object.freeze({ findMode: true, findLook: look, ...extras }); }
function assertRestored(f) {
  for (const record of f.findMeshes) {
    expect(record.mesh.material).toBe(record.surface);
    expect(record.mesh.castShadow).toBe(record.castShadow);
  }
}
function assertSiteUnchanged(f, before) {
  expect(f.siteLights.map(({ visible, ...rest }) => rest)).toEqual(before);
  f.worldMeshes.forEach((mesh, index) => {
    expect(mesh.material).toBe(f.findMeshes[index].surface);
    expect(mesh.castShadow).toBe(f.findMeshes[index].castShadow);
    expect(mesh.geometry).toBe(f.findMeshes[index].mesh.geometry);
  });
}

describe('actual Dino renderer exposed-find display isolation', () => {
  it('ships the same sync function in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
    expect(extract(mirror, '        function syncFindDisplay(p, find) {', '        function viewKey(p)')).toBe(displaySource);
  });

  it.each(['surface', undefined, 'corrupt', {}, ['outline']])('keeps the original surface materials and balanced find-only lighting for %s', look => {
    const f = fixture(), before = f.siteLights.map(({ visible, ...rest }) => rest);
    f.sync(props(look), find);
    assertRestored(f); assertSiteUnchanged(f, before);
    expect(f.siteLights.every(light => !light.visible)).toBe(true);
    expect(f.findLighting.visible).toBe(true);
    expect([f.findAmbient.intensity, f.findKey.intensity, f.findFill.intensity]).toEqual([.5, 1.15, .22]);
    expect(f.findKey.position).toMatchObject({ x: -6, y: 12, z: 8 });
    expect(f.findKey.shadow.needsUpdate).toBe(true);
    expect([f.scene.userData.findLook, f.findLighting.userData.look, f.findStage.userData.look]).toEqual(['surface', 'surface', 'surface']);
  });

  it('uses low angled lighting without changing any surface, geometry or site light setting', () => {
    const f = fixture(), before = f.siteLights.map(({ visible, ...rest }) => rest);
    f.sync(props('raking'), find);
    assertRestored(f); assertSiteUnchanged(f, before);
    expect([f.findAmbient.intensity, f.findKey.intensity, f.findFill.intensity]).toEqual([.18, 1.7, .12]);
    expect(f.findKey.position).toMatchObject({ x: -6, y: 2.3, z: 4 });
    expect([f.scene.userData.findLook, f.findLighting.userData.look, f.findStage.userData.look]).toEqual(['raking', 'raking', 'raking']);
  });

  it('applies the one solid outline material to the selected clone only', () => {
    const f = fixture(), before = f.siteLights.map(({ visible, ...rest }) => rest);
    f.sync(props('outline'), find);
    for (const record of f.findMeshes) {
      expect(record.mesh.material).toBe(record.index === 7 ? f.outline : record.surface);
      expect(record.mesh.castShadow).toBe(record.index === 7 ? false : record.castShadow);
      expect(record.mesh.receiveShadow).toBe(true);
    }
    assertSiteUnchanged(f, before);
    expect(f.outline).toMatchObject({ map: null, bumpMap: null, wireframe: false, toneMapped: false });
    expect([f.scene.userData.findLook, f.findLighting.userData.look, f.findStage.userData.look]).toEqual(['outline', 'outline', 'outline']);
  });

  it('restores material arrays and original castShadow flags through every display transition', () => {
    const f = fixture(), originalArray = f.findMeshes.find(record => record.index === 7 && Array.isArray(record.surface)).surface;
    for (const look of ['outline', 'raking', 'outline', 'surface', 'raking', 'surface']) {
      f.sync(props(look), find);
      if (look !== 'outline') {
        assertRestored(f);
        expect(f.findMeshes.find(record => record.index === 7 && Array.isArray(record.surface)).mesh.material).toBe(originalArray);
      }
    }
  });

  it('restores the prior selected clone when another exposed find is selected in outline mode', () => {
    const f = fixture();
    f.sync(props('outline'), find);
    f.sync(props('outline'), Object.freeze({ ...find, selected: other, focus: 0 }));
    for (const record of f.findMeshes) {
      expect(record.mesh.material).toBe(record.index === 0 ? f.outline : record.surface);
      expect(record.mesh.castShadow).toBe(record.index === 0 ? false : record.castShadow);
    }
  });

  it('clears display metadata and all outline overrides when Undo or selection leaves a blank find view', () => {
    const f = fixture(); f.sync(props('outline'), find);
    const p = { findMode: true };
    Object.defineProperty(p, 'findLook', { get() { throw Error('No active find; display choice must not be read'); } });
    f.sync(p, Object.freeze({ selected: null, focus: 23, finds: [other] }));
    assertRestored(f);
    expect(f.siteLights.every(light => !light.visible)).toBe(true);
    expect(f.findLighting.visible).toBe(false);
    expect([f.scene.userData.findLook, f.findLighting.userData.look, f.findStage.userData.look]).toEqual([null, null, null]);
  });

  it.each([false, true])('restores site lights and surfaces upon returning to full/section mode (inspect=%s)', inspect => {
    const f = fixture(), before = f.siteLights.map(({ visible, ...rest }) => rest);
    f.sync(props('outline'), find);
    f.sync(props('raking', { findMode: false, inspect }), find);
    assertRestored(f); assertSiteUnchanged(f, before);
    expect(f.siteLights.every(light => light.visible)).toBe(true);
    expect(f.findLighting.visible).toBe(false);
    expect([f.scene.userData.findLook, f.findLighting.userData.look, f.findStage.userData.look]).toEqual([null, null, null]);
  });

  it('does not read hidden evidence, alter observations or add resources during repeated sync', () => {
    const f = fixture(), records = [...f.findMeshes], beforeFind = JSON.stringify(find);
    const exposed = { index: 7 };
    for (const key of ['burial', 'hasBone', 'species', 'anatomy', 'fossilY', 'clues', 'coord', 'removed', 'remaining']) {
      Object.defineProperty(exposed, key, { get() { throw Error('Unexpected metadata read: ' + key); } });
    }
    Object.freeze(exposed);
    for (let i = 0; i < 30; i++) f.sync(props(['surface', 'raking', 'outline'][i % 3]), Object.freeze({ selected: exposed }));
    expect(f.findMeshes).toHaveLength(records.length);
    f.findMeshes.forEach((record, index) => expect(record).toBe(records[index]));
    expect(f.scene.userData).toMatchObject({ inspectionOnly: true, removedLayers: 17, visibleLayers: 0, findSelection: 7 });
    expect(f.findStage.userData.find).toBe(selected);
    expect(f.findStage.userData.columnIndices).toEqual([7]);
    expect(Object.keys(f.scene.userData).sort()).toEqual(['findLook', 'findSelection', 'inspectionOnly', 'removedLayers', 'visibleLayers']);
    expect(Object.keys(f.findStage.userData).sort()).toEqual(['columnIndices', 'find', 'look']);
    expect(JSON.stringify(find)).toBe(beforeFind);
  });
});
