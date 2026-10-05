import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(process.env.DINO_TERRAIN_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous terrain display seam: ' + start);
  return text.slice(a, b);
}
const dino3D = bounded(source, '  function makeDinoVoxelDig3D(React) {', '  var DinoVoxelDig3DStable = null;');
const engine = bounded(dino3D, '// DINO_VOXEL_TERRAIN_RENDER_ENGINE_START', '// DINO_VOXEL_TERRAIN_RENDER_ENGINE_END');
const rng = bounded(source, '  function mulberry32(seed) {', '  // ═');
const findDisplay = bounded(dino3D, '        function syncFindDisplay(p, find) {', '        // DINO_VOXEL_FIND_PLATE_ENGINE_START');
const sedimentBuild = bounded(dino3D, '            var sediment = makeTerrainSediment(THREE)', '            var groundMaterial =');
const dispose = bounded(dino3D, '        function dispose() {', "        setStatus('loading');");
const sync = bounded(dino3D, '        function sync() {', '        function dispose() {');
const sandbox = { console, module: { exports: {} } }; sandbox.exports = sandbox.module.exports;
vm.runInNewContext(readFileSync(process.env.DINO_TERRAIN_THREE || 'vendor/three-r128/three.min.js', 'utf8'), sandbox);
const THREE = sandbox.module.exports;

function fixture() {
  const textures = [], canvases = [], writes = [], scene = new THREE.Scene();
  const siteLights = [new THREE.HemisphereLight('#e7eff1', '#77604a', .50), new THREE.DirectionalLight('#fff0d1', 1.15), new THREE.DirectionalLight('#c3dce6', .22)];
  siteLights[1].position.set(-6, 12, 8); siteLights[2].position.set(7, 5, -8); siteLights.forEach(light => scene.add(light));
  let shadowUpdate = false; Object.defineProperty(siteLights[1].shadow, 'needsUpdate', { get() { return shadowUpdate; }, set(value) { shadowUpdate = value; writes.push(value); } });
  const document = { createElement(type) {
    if (type !== 'canvas') throw Error('Only a retained procedural atlas canvas is expected');
    const commands = [], canvas = { width: 0, height: 0, commands };
    const ink = { fillStyle: '', save() { commands.push(['save']); }, restore() { commands.push(['restore']); },
      beginPath() { commands.push(['beginPath']); }, rect(...args) { commands.push(['rect', ...args]); }, clip() { commands.push(['clip']); },
      fillRect(...args) { commands.push(['fillRect', this.fillStyle, ...args]); } };
    canvas.getContext = type => { if (type !== '2d') throw Error('Unexpected atlas context'); return ink; }; canvases.push(canvas); return canvas;
  } };
  const findLighting = new THREE.Group(), findStage = new THREE.Group();
  const findAmbient = new THREE.AmbientLight('#ffffff', .5), findKey = new THREE.DirectionalLight('#ffffff', 1.15), findFill = new THREE.DirectionalLight('#ffffff', .22);
  findLighting.add(findAmbient, findKey, findFill); scene.add(findLighting, findStage);
  const findOutlineMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' }), surface = new THREE.MeshStandardMaterial({ color: '#e8d7b6' });
  const findMesh = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), surface); findMesh.castShadow = true;
  const findMeshes = [{ index: 7, mesh: findMesh, surface, castShadow: true }];
  const build = new Function('THREE', 'document', 'scene', 'textures', 'siteLights', 'findLighting', 'findStage', 'findAmbient', 'findKey', 'findFill', 'findOutlineMaterial', 'findMeshes',
    'var lastTerrainLook=null;function digVoxelFindLook(value){return value==="raking"||value==="outline"?value:"surface";}\n' + rng + '\n' + engine + '\n' + findDisplay +
    '\nreturn {makeTerrainSediment,syncTerrainDisplay,syncFindDisplay,digVoxelTerrainLook};');
  const api = build(THREE, document, scene, textures, siteLights, findLighting, findStage, findAmbient, findKey, findFill, findOutlineMaterial, findMeshes);
  return { api, scene, textures, canvases, siteLights, writes, findLighting, findStage, findAmbient, findKey, findFill, findMesh, findOutlineMaterial, surface, document };
}
function uvRecords(geometry) {
  const uv = geometry.attributes.uv, normal = geometry.attributes.normal;
  return Array.from({ length: uv.count }, (_, i) => ({ normal: [normal.getX(i), normal.getY(i), normal.getZ(i)], uv: [uv.getX(i), uv.getY(i)] }));
}
function lightsState(lights) { return lights.map(light => ({ uuid: light.uuid, intensity: light.intensity, position: light.position.toArray(), visible: light.visible, color: light.color.toArray(), target: light.target?.position.toArray() })); }

describe('Dino terrain sediment atlas', () => {
  it('retains the exact r128 box positions, normals, indices, groups and physical bounds', () => {
    const f = fixture(), sediment = f.api.makeTerrainSediment(THREE), baseline = new THREE.BoxGeometry(1.062, .508, 1.062);
    for (const attribute of ['position', 'normal']) expect([...sediment.geometry.attributes[attribute].array]).toEqual([...baseline.attributes[attribute].array]);
    expect([...sediment.geometry.index.array]).toEqual([...baseline.index.array]); expect(sediment.geometry.groups).toEqual(baseline.groups);
    sediment.geometry.computeBoundingBox(); baseline.computeBoundingBox(); expect(sediment.geometry.boundingBox.min.toArray()).toEqual(baseline.boundingBox.min.toArray()); expect(sediment.geometry.boundingBox.max.toArray()).toEqual(baseline.boundingBox.max.toArray());
    expect(sediment.geometry.attributes.position.count).toBe(24);
  });
  it('assigns only the positive top face to the granular tile with padded UV bounds', () => {
    const f = fixture(), sediment = f.api.makeTerrainSediment(THREE), top = uvRecords(sediment.geometry).filter(record => record.normal[1] > .5);
    expect(top).toHaveLength(4);
    expect([...new Set(top.map(record => record.uv[0]))].sort()).toEqual([16 / 512, 240 / 512]);
    expect([...new Set(top.map(record => record.uv[1]))].sort()).toEqual([16 / 256, 240 / 256]);
  });
  it('assigns all four walls and the hidden bottom to the separate padded wall tile', () => {
    const f = fixture(), sediment = f.api.makeTerrainSediment(THREE), sides = uvRecords(sediment.geometry).filter(record => record.normal[1] <= .5);
    expect(sides).toHaveLength(20);
    expect([...new Set(sides.map(record => record.uv[0]))].sort()).toEqual([272 / 512, 496 / 512]);
    expect([...new Set(sides.map(record => record.uv[1]))].sort()).toEqual([16 / 256, 240 / 256]);
  });
  it('preserves each original face orientation while mapping its UV island', () => {
    const f = fixture(), sediment = f.api.makeTerrainSediment(THREE), original = new THREE.BoxGeometry(1.062, .508, 1.062), expected = original.attributes.uv;
    for (const [index, record] of uvRecords(sediment.geometry).entries()) {
      const left = record.normal[1] > .5 ? 0 : 256;
      expect((record.uv[0] * 512 - left - 16) / 224).toBe(expected.getX(index));
      expect((record.uv[1] * 256 - 16) / 224).toBe(expected.getY(index));
    }
  });
  it('uses one sRGB color atlas and a separate linear neutral height atlas on one opaque material', () => {
    const f = fixture(), sediment = f.api.makeTerrainSediment(THREE);
    expect(f.textures).toEqual([sediment.colorMap, sediment.heightMap]); expect(sediment.colorMap).not.toBe(sediment.heightMap);
    expect(sediment.material.map).toBe(sediment.colorMap); expect(sediment.material.bumpMap).toBe(sediment.heightMap); expect(sediment.material.bumpScale).toBe(.020);
    expect(sediment.colorMap.encoding).toBe(THREE.sRGBEncoding); expect(sediment.heightMap.encoding).toBe(THREE.LinearEncoding);
    expect(sediment.material.type).toBe('MeshStandardMaterial'); expect(sediment.material.transparent).toBe(false); expect(sediment.material.opacity).toBe(1); expect(sediment.material.depthWrite).toBe(true);
    expect(sediment.material.roughness).toBe(.94); expect(sediment.material.metalness).toBe(0);
  });
  it('builds two fixed-size retained atlases with independent color and height imagery', () => {
    const f = fixture(), sediment = f.api.makeTerrainSediment(THREE);
    expect(f.canvases).toHaveLength(2);
    for (const texture of f.textures) { expect(texture.image.width).toBe(512); expect(texture.image.height).toBe(256); expect(texture.generateMipmaps).toBe(true); }
    expect(sediment.colorMap.image).not.toBe(sediment.heightMap.image); expect(sediment.colorMap.name).toBe('dino-sediment-color-atlas'); expect(sediment.heightMap.name).toBe('dino-sediment-height-atlas');
    expect(sediment.heightMap.image.commands.filter(command => command[0] === 'fillRect' && command[1] === '#808080')).toEqual([['fillRect', '#808080', 0, 0, 256, 256], ['fillRect', '#808080', 256, 0, 256, 256]]);
  });
  it('uses clipped neutral grain rather than continuous fake geological beds', () => {
    const f = fixture(), sediment = f.api.makeTerrainSediment(THREE), commands = sediment.colorMap.image.commands;
    expect(commands.filter(command => command[0] === 'rect')).toEqual([['rect', 0, 0, 256, 256], ['rect', 256, 0, 256, 256]]);
    const grains = commands.filter(command => command[0] === 'fillRect' && String(command[1]).startsWith('rgba'));
    expect(grains).toHaveLength(3800); expect(grains.every(command => command[4] < 8 && command[5] < 3)).toBe(true);
    const topGrains = grains.slice(0, 2200), wallGrains = grains.slice(2200);
    expect(topGrains.every(command => command[4] === command[5])).toBe(true); expect(wallGrains.every(command => command[4] > command[5])).toBe(true);
  });
  it('generates exactly the same grain and UVs in independent engines', () => {
    const a = fixture(), b = fixture(), sa = a.api.makeTerrainSediment(THREE), sb = b.api.makeTerrainSediment(THREE);
    expect(sa.colorMap.image.commands).toEqual(sb.colorMap.image.commands); expect(sa.heightMap.image.commands).toEqual(sb.heightMap.image.commands);
    expect([...sa.geometry.attributes.uv.array]).toEqual([...sb.geometry.attributes.uv.array]); expect(sa.atlas.fixedSeed).toBe(20867);
  });
  it('keeps the actual batch at capacity96 with one retained material and testable atlas metadata', () => {
    const f = fixture(), calls = [], pickers = [];
    const window = { StemLab: { makeVoxelBatch(_three, options) { calls.push(options); return { mesh: new THREE.InstancedMesh(options.geometry, options.material, options.capacity), addTo(scene) { scene.add(this.mesh); } }; } } };
    const build = new Function('THREE', 'window', 'makeTerrainSediment', 'scene', 'pickers', 'var batch;\n' + sedimentBuild + '\nreturn batch;');
    const batch = build(THREE, window, f.api.makeTerrainSediment, f.scene, pickers);
    expect(calls).toHaveLength(1); expect(calls[0].capacity).toBe(96); expect(batch.mesh.instanceMatrix.count).toBe(96); expect(Array.isArray(batch.mesh.material)).toBe(false);
    expect(pickers).toEqual([batch.mesh]); expect(batch.mesh.userData.sedimentAtlas).toMatchObject({ width: 512, height: 256, tileSize: 256, padding: 16, topFace: '+Y', otherFaces: 'wall', fixedSeed: 20867, colorEncoding: 'sRGB', heightEncoding: 'linear', bumpScale: .020 });
  });
  it('disposes both owned atlas textures once through the actual retained engine cleanup', () => {
    const f = fixture(); f.api.makeTerrainSediment(THREE); const disposal = [];
    f.textures.forEach(texture => texture.addEventListener('dispose', () => disposal.push(texture.name)));
    const actualDispose = new Function('scene', 'textures',
      'var alive=true,raf=0,poseTimer=0,observer=null,intersection=null,cleanups=[],engineRef={current:{}},instanced=[],batch=null,world=null,geometries=[],materials=[],renderer=null;' +
      'var findPlateTarget=null,findPlateCameras=[],findPlatePixels=[],findPlateCanvases=[],findPlateObserved=null,findPlateVisible=false;\n' + dispose + '\nreturn dispose;')(f.scene, f.textures);
    actualDispose(); expect(disposal.sort()).toEqual(['dino-sediment-color-atlas', 'dino-sediment-height-atlas']);
  });
});

describe('Dino retained site lighting', () => {
  it('normalizes only the explicit raking token and safely defaults all other inputs', () => {
    const f = fixture(); expect(f.api.digVoxelTerrainLook('raking')).toBe('raking');
    for (const input of ['daylight', 'outline', 'surface', 'RAKING', '', null, undefined, 1, {}, ['raking']]) expect(f.api.digVoxelTerrainLook(input)).toBe('daylight');
  });
  it('preserves the exact original daylight lights, colors, targets and positions', () => {
    const f = fixture(), before = lightsState(f.siteLights); f.api.syncTerrainDisplay({});
    expect(lightsState(f.siteLights)).toEqual(before); expect(f.scene.userData.terrainLook).toBe('daylight'); expect(f.writes).toEqual([true]);
  });
  it('reconfigures the three existing lights for raking without adding resources', () => {
    const f = fixture(), before = f.siteLights.map(light => light.uuid), children = [...f.scene.children].map(child => child.uuid);
    f.api.syncTerrainDisplay({ terrainLook: 'raking' }); expect(f.scene.userData.terrainLook).toBe('raking');
    expect(f.siteLights.map(light => light.uuid)).toEqual(before); expect([...f.scene.children].map(child => child.uuid)).toEqual(children); expect(f.textures).toEqual([]);
    expect(f.siteLights.map(light => light.intensity)).toEqual([.30, 1.10, .18]); expect([...f.siteLights[1].position.toArray()]).toEqual([-6, 2.8, 8]);
    expect([...f.siteLights[2].position.toArray()]).toEqual([7, 5, -8]);
  });
  it('refreshes the shadow only when the normalized lighting choice changes', () => {
    const f = fixture(); f.api.syncTerrainDisplay({ terrainLook: 'raking' }); f.api.syncTerrainDisplay({ terrainLook: 'raking' });
    expect(f.writes).toEqual([true]); f.api.syncTerrainDisplay({ terrainLook: 'daylight' }); expect(f.writes).toEqual([true, true]);
    f.api.syncTerrainDisplay({ terrainLook: 'invalid' }); expect(f.writes).toEqual([true, true]);
  });
  it('restores the original daylight state after an explicit look change', () => {
    const f = fixture(), original = lightsState(f.siteLights); f.api.syncTerrainDisplay({ terrainLook: 'raking' }); f.api.syncTerrainDisplay({ terrainLook: 'daylight' });
    expect(lightsState(f.siteLights)).toEqual(original); expect(f.scene.userData.terrainLook).toBe('daylight');
  });
  it('does not consult hidden layout, observations, progress or camera during display changes', () => {
    const f = fixture(), p = { terrainLook: 'raking' };
    for (const key of ['site', 'state', 'focus', 'pose', 'camera', 'comparison', 'action']) Object.defineProperty(p, key, { get() { throw Error('Display accessed ' + key); } });
    Object.freeze(p); f.api.syncTerrainDisplay(p); expect(f.scene.userData.terrainLook).toBe('raking');
    expect([...f.siteLights[1].position.toArray()]).toEqual([-6, 2.8, 8]);
  });
  it('keeps Find raking independent from the retained site daylight choice', () => {
    const f = fixture(); f.api.syncTerrainDisplay({ terrainLook: 'daylight' }); const site = lightsState(f.siteLights);
    f.api.syncFindDisplay({ findMode: true, findLook: 'raking' }, { selected: { index: 7 } });
    expect(f.scene.userData.terrainLook).toBe('daylight'); expect(f.scene.userData.findLook).toBe('raking'); expect(f.findKey.intensity).toBe(1.7);
    expect([...f.findKey.position.toArray()]).toEqual([-6, 2.3, 4]);
    expect(lightsState(f.siteLights).map(({ visible, ...rest }) => rest)).toEqual(site.map(({ visible, ...rest }) => rest)); expect(f.siteLights.every(light => !light.visible)).toBe(true);
  });
  it('retains chosen site raking through Find outline and restores it on return', () => {
    const f = fixture(); f.api.syncTerrainDisplay({ terrainLook: 'raking' }); const chosen = lightsState(f.siteLights);
    f.api.syncFindDisplay({ findMode: true, findLook: 'outline' }, { selected: { index: 7 } }); expect(f.findMesh.material).toBe(f.findOutlineMaterial);
    f.api.syncTerrainDisplay({ terrainLook: 'raking' }); f.api.syncFindDisplay({ findMode: false, findLook: 'outline' }, { selected: { index: 7 } });
    expect(lightsState(f.siteLights)).toEqual(chosen); expect(f.scene.userData.terrainLook).toBe('raking'); expect(f.findLighting.visible).toBe(false); expect(f.findMesh.material).toBe(f.surface);
  });
  it('works in section with identical display parameters and no selected-row dependency', () => {
    const a = fixture(), b = fixture(); a.api.syncTerrainDisplay({ terrainLook: 'raking', inspect: false, focus: 0 }); b.api.syncTerrainDisplay({ terrainLook: 'raking', inspect: true, focus: 23 });
    expect(a.siteLights.map(light => ({ intensity: light.intensity, position: light.position.toArray() }))).toEqual(b.siteLights.map(light => ({ intensity: light.intensity, position: light.position.toArray() })));
  });
  it('has an explicit retained sync dependency and keeps lighting outside Find and target invalidation seams', () => {
    expect(dino3D).toMatch(/engineRef\.current\.sync\(\);[^\n]+props\.terrainLook/);
    expect(sync).toContain('syncStrokeComparison(p);\n          syncCheckpointGuides(p);\n          syncTerrainDisplay(p);');
    expect(findDisplay).not.toContain('syncTerrainDisplay');
    expect(bounded(dino3D, '          var currentView = viewKey(p)', '          var sectionRow =')).not.toContain('syncTerrainDisplay');
  });
});
