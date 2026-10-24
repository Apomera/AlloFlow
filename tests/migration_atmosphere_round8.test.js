import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing atmosphere source section: ' + start);
  return source.slice(first, last);
}
const flightSpeedValues = new Function(
  section('  var SPECIES = [', '  // Resolve model behaviour') +
  section('  function migrNum(', '  // Sibling of migrNum') +
  section('  function migrFlightSpeedValues(', '  function migrFlightInvestigationSnapshot(') +
  '\nreturn migrFlightSpeedValues;'
)();

function canvasDocument() {
  const canvases = [];
  return {
    canvases,
    createElement(tag) {
      if (tag !== 'canvas') throw new Error('Unexpected element: ' + tag);
      const calls = [];
      const gradient = (kind, args) => {
        const value = { kind, args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } };
        calls.push(value); return value;
      };
      const context = {
        calls,
        createLinearGradient(...args) { return gradient('linear', args); },
        createRadialGradient(...args) { return gradient('radial', args); },
        fillRect(...args) { calls.push({ kind: 'fill', args, style: this.fillStyle }); }
      };
      const canvas = { width: 0, height: 0, context, getContext: () => context };
      canvases.push(canvas); return canvas;
    }
  };
}
function atmosphere() {
  const document = canvasDocument();
  const api = new Function('document', section('      function createMigrationStarfield(', '      function initMigrationFlightScene(') +
    '\nreturn { createMigrationStarfield, createMigrationCloudDeck, createMigrationStudyLighting };')(document);
  return { document, ...api };
}
const backdrop = new Function('engine', 'study', section('          engine.updateStudyBackdrop = function(study) {', '          engine.rebuildFlock =') +
  '\nengine.updateStudyBackdrop(study);');
const motion = new Function('engineNow', 'live', 'reducedMotionRef', 'species', 'delta',
  section('          var moving = !live.flightPaused', '          // Revisit starts'));
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') +
  '\nreturn disposeMigrationObject;')();

function skyFixture() {
  const api = atmosphere();
  const scene = new THREE.Scene(), engine = {}, renderer = { setClearColor: vi.fn() };
  const deck = api.createMigrationCloudDeck(THREE);
  engine.movers = deck.clouds;
  new Function('THREE', 'document', 'scene', 'engine', 'renderer', 'createMigrationStarfield', 'createMigrationStudyLighting', 'cloudMat', 'cirrusMat', 'riverDetailMat',
    section('          // ── Sky dome ──', '          // ── Land belt ──'))(
    THREE, api.document, scene, engine, renderer, api.createMigrationStarfield, api.createMigrationStudyLighting, deck.material, { opacity: 0.24 }, { opacity: 0.26 });
  return { ...api, deck, scene, engine, renderer };
}
function lobeBoxes(cloud) {
  const lobes = cloud.children[0], matrix = new THREE.Matrix4();
  lobes.geometry.computeBoundingBox();
  return Array.from({ length: lobes.count }, (_, index) => {
    lobes.getMatrixAt(index, matrix);
    return lobes.geometry.boundingBox.clone().applyMatrix4(matrix);
  });
}

describe('Migration crisp starfield and volumetric cloud atmosphere', () => {
  it('constructs one deterministic finite upper-sky Points buffer with graded brightness', () => {
    const api = atmosphere();
    const first = api.createMigrationStarfield(THREE), second = api.createMigrationStarfield(THREE);
    expect(first.isPoints).toBe(true);
    expect(first.name).toBe('migration-night-stars');
    expect(first.userData.decorative).toBe(true);
    expect(first.visible).toBe(false);
    const positions = first.geometry.attributes.position, colors = first.geometry.attributes.color;
    expect(positions.count).toBe(1100);
    expect(colors.count).toBe(positions.count);
    expect(Array.from(positions.array)).toEqual(Array.from(second.geometry.attributes.position.array));
    expect(Array.from(colors.array)).toEqual(Array.from(second.geometry.attributes.color.array));
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    const point = new THREE.Vector3(), quadrants = new Set(), brightnesses = [];
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i);
      expect(point.length()).toBeCloseTo(390, 3);
      expect(point.y).toBeGreaterThan(23.3);
      expect(point.y).toBeLessThanOrEqual(390);
      quadrants.add([Math.sign(point.x), Math.sign(point.z)].join(','));
      expect(colors.getX(i)).toBeLessThanOrEqual(colors.getZ(i));
      brightnesses.push(colors.getZ(i));
    }
    expect(quadrants.size).toBe(4);
    expect(Math.max(...brightnesses) - Math.min(...brightnesses)).toBeGreaterThan(0.75);
  });

  it('uses one small round alpha sprite with transparent corners and a stable screen size', () => {
    const api = atmosphere(), stars = api.createMigrationStarfield(THREE), material = stars.material;
    expect(api.document.canvases).toHaveLength(1);
    const sprite = api.document.canvases[0], radial = sprite.context.calls.find(call => call.kind === 'radial');
    expect([sprite.width, sprite.height]).toEqual([32, 32]);
    expect(radial.args).toEqual([16, 16, 0, 16, 16, 15]);
    expect(radial.stops[0]).toEqual([0, 'rgba(255,255,255,1)']);
    expect(radial.stops.at(-1)).toEqual([1, 'rgba(255,255,255,0)']);
    expect(sprite.context.calls.filter(call => call.kind === 'fill')).toHaveLength(1);
    expect(material.map.isCanvasTexture).toBe(true);
    expect(material.map.image).toBe(sprite);
    expect(material.map.minFilter).toBe(THREE.LinearFilter);
    expect(material.map.generateMipmaps).toBe(false);
    expect(material.size).toBe(2.4);
    expect(material.sizeAttenuation).toBe(false);
    expect(material.vertexColors).toBe(true);
    expect(material.transparent).toBe(true);
    expect(material.alphaTest).toBeGreaterThan(0);
    expect(material.depthWrite).toBe(false);
    expect(material.fog).toBe(false);
  });

  it('repaints only a compact gradient on theme changes and never paints duplicate stars into the dome', () => {
    const { document, engine, renderer } = skyFixture();
    const dome = document.canvases[0];
    expect([dome.width, dome.height]).toEqual([16, 512]);
    engine.applyTheme(false);
    expect(engine.studyLighting.userData.active).toBe(false);
    expect(engine.nightStars.visible).toBe(false);
    const fillsAfterDay = dome.context.calls.filter(call => call.kind === 'fill').length;
    engine.applyTheme(false);
    expect(dome.context.calls.filter(call => call.kind === 'fill')).toHaveLength(fillsAfterDay);
    engine.applyTheme(true);
    expect(engine.nightStars.visible).toBe(true);
    expect(dome.context.calls.filter(call => call.kind === 'fill')).toHaveLength(fillsAfterDay + 1);
    expect(dome.context.calls.every(call => call.kind === 'fill' || call.kind === 'linear')).toBe(true);
    expect(renderer.setClearColor).toHaveBeenCalledTimes(2);
  });

  it('preserves the actual star geometry, texture and positions through repeated theme and Study changes', () => {
    const { engine } = skyFixture();
    const stars = engine.nightStars, geometry = stars.geometry, material = stars.material, map = material.map;
    const positions = Array.from(geometry.attributes.position.array), colors = Array.from(geometry.attributes.color.array);
    for (let i = 0; i < 30; i++) { engine.applyTheme(!!(i % 2)); backdrop(engine, !!(i % 3)); }
    expect(stars.geometry).toBe(geometry);
    expect(stars.material).toBe(material);
    expect(stars.material.map).toBe(map);
    expect(Array.from(geometry.attributes.position.array)).toEqual(positions);
    expect(Array.from(geometry.attributes.color.array)).toEqual(colors);
    expect(engine.movers.includes(stars)).toBe(false);
  });

  it('builds fourteen instanced cloud volumes sharing one sphere geometry and one opaque fogged material', () => {
    const { createMigrationCloudDeck } = atmosphere(), deck = createMigrationCloudDeck(THREE);
    expect(deck.clouds).toHaveLength(14);
    const geometries = new Set(), materials = new Set();
    deck.clouds.forEach((cloud, index) => {
      expect(cloud.name).toBe('migration-cumulus-cloud');
      expect(cloud.children).toHaveLength(1);
      const lobes = cloud.children[0];
      expect(lobes.isInstancedMesh).toBe(true);
      expect(lobes.name).toBe('migration-cloud-lobes');
      expect(lobes.count).toBe(7 + index % 3);
      expect(lobes.userData.baseCount).toBe(3);
      expect(lobes.userData.crownCount).toBe(lobes.count - 3);
      expect(lobes.frustumCulled).toBe(false);
      expect(Array.from(lobes.instanceMatrix.array).every(Number.isFinite)).toBe(true);
      expect(lobes.geometry.attributes.position.count).toBe(117);
      expect(cloud.userData.onGround).toBe(false);
      expect(cloud.userData.baseZ).toBe(cloud.position.z);
      geometries.add(lobes.geometry); materials.add(lobes.material);
    });
    expect(geometries.size).toBe(1);
    expect(materials.size).toBe(1);
    expect([...materials][0]).toBe(deck.material);
    expect(deck.material.transparent).toBe(false);
    expect(deck.material.depthWrite).toBe(true);
    expect(deck.material.fog).toBe(true);
  });

  it('gives every cloud broad low bases, taller irregular crowns and clear space around the birds', () => {
    const { createMigrationCloudDeck } = atmosphere(), deck = createMigrationCloudDeck(THREE);
    const silhouettes = new Set();
    deck.clouds.forEach(cloud => {
      const boxes = lobeBoxes(cloud), base = boxes.slice(0, 3), crown = boxes.slice(3);
      const baseTop = Math.max(...base.map(box => box.max.y));
      const crownTop = Math.max(...crown.map(box => box.max.y));
      expect(crownTop - baseTop).toBeGreaterThan(1);
      base.forEach(box => expect(box.max.x - box.min.x).toBeGreaterThan((box.max.y - box.min.y) * 1.8));
      expect(new Set(crown.map(box => Math.round(box.max.y * 100))).size).toBeGreaterThan(2);
      const cloudBox = boxes.reduce((box, lobe) => box.union(lobe), new THREE.Box3());
      const height = cloudBox.max.y - cloudBox.min.y, width = cloudBox.max.x - cloudBox.min.x;
      expect(height / width).toBeGreaterThan(0.38);
      expect(height / width).toBeLessThan(0.8);
      silhouettes.add([width, height].map(value => value.toFixed(3)).join(','));
      cloud.updateMatrixWorld(true);
      const worldBox = cloudBox.applyMatrix4(cloud.matrixWorld);
      expect(worldBox.min.y).toBeGreaterThan(10);
      expect(worldBox.intersectsBox(new THREE.Box3(new THREE.Vector3(-4, -2, -20), new THREE.Vector3(4, 4, 12)))).toBe(false);
    });
    expect(silhouettes.size).toBe(14);
  });

  it('uses repeatable cloud shapes without cloning a geometry for each lobe or rebuild', () => {
    const { createMigrationCloudDeck } = atmosphere();
    const first = createMigrationCloudDeck(THREE), second = createMigrationCloudDeck(THREE);
    first.clouds.forEach((cloud, index) => {
      expect(Array.from(cloud.children[0].instanceMatrix.array)).toEqual(Array.from(second.clouds[index].children[0].instanceMatrix.array));
      expect(cloud.position.toArray()).toEqual(second.clouds[index].position.toArray());
    });
    // Each engine owns its resources, so teardown cannot poison a later scene.
    expect(first.clouds[0].children[0].geometry).not.toBe(second.clouds[0].children[0].geometry);
    expect(first.material).not.toBe(second.material);
  });

  it.each(['paused', 'reduced motion'])('keeps cloud placement and instance buffers stable under %s', mode => {
    const { createMigrationCloudDeck, createMigrationStarfield } = atmosphere();
    const deck = createMigrationCloudDeck(THREE), stars = createMigrationStarfield(THREE);
    const engine = { movers: deck.clouds, time: 0, flown: 0 };
    const placement = deck.clouds.map(cloud => cloud.position.toArray());
    const matrices = deck.clouds.map(cloud => Array.from(cloud.children[0].instanceMatrix.array));
    const starBuffer = Array.from(stars.geometry.attributes.position.array);
    for (let frame = 0; frame < 60; frame++) motion(engine, { flightPaused: mode === 'paused', flightWind: 8, flightSpeedValues: flightSpeedValues('canada_goose', 8) },
      { current: mode === 'reduced motion' }, { speed: 40 }, 1 / 60);
    expect(engine.time).toBe(0);
    expect(engine.flown).toBe(0);
    deck.clouds.forEach((cloud, index) => {
      expect(cloud.position.toArray()).toEqual(placement[index]);
      expect(Array.from(cloud.children[0].instanceMatrix.array)).toEqual(matrices[index]);
    });
    expect(Array.from(stars.geometry.attributes.position.array)).toEqual(starBuffer);
  });

  it('drifts cloud groups with airspeed while retaining their buffers and the fixed night sky', () => {
    const { createMigrationCloudDeck, createMigrationStarfield } = atmosphere();
    const deck = createMigrationCloudDeck(THREE), stars = createMigrationStarfield(THREE);
    const streaks = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    streaks.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -10, 0, 0, -12.4]), 3));
    const engine = { movers: deck.clouds, streaks, time: 0, flown: 0 };
    const before = deck.clouds.map(cloud => cloud.position.z), buffers = deck.clouds.map(cloud => cloud.children[0].instanceMatrix);
    const starBuffer = Array.from(stars.geometry.attributes.position.array);
    motion(engine, { flightPaused: false, flightWind: 25, flightSpeedValues: flightSpeedValues('canada_goose', 25) }, { current: false }, { speed: 40 }, 0.05);
    deck.clouds.forEach((cloud, index) => {
      expect(cloud.position.z - before[index]).toBeCloseTo(40 * 0.39 * 0.05 * cloud.userData.drift, 10);
      expect(cloud.children[0].instanceMatrix).toBe(buffers[index]);
    });
    expect(Array.from(stars.geometry.attributes.position.array)).toEqual(starBuffer);
    expect(stars.position.toArray()).toEqual([0, 0, 0]);
  });

  it('hides decorative stars and clouds in Study and restores the correct day or night corridor', () => {
    const { engine, deck } = skyFixture();
    engine.applyTheme(true); backdrop(engine, false);
    expect(engine.nightStars.visible).toBe(true);
    expect(deck.clouds.every(cloud => cloud.visible)).toBe(true);
    expect(deck.material.color.getHex()).toBe(0x7182aa);
    backdrop(engine, true);
    expect(engine.nightStars.visible).toBe(false);
    expect(deck.clouds.every(cloud => !cloud.visible)).toBe(true);
    engine.applyTheme(false); backdrop(engine, true);
    expect(engine.nightStars.visible).toBe(false);
    backdrop(engine, false);
    expect(engine.nightStars.visible).toBe(false);
    expect(deck.clouds.every(cloud => cloud.visible)).toBe(true);
    expect(deck.material.color.getHex()).toBe(0xf6fbff);
    expect(deck.material.opacity).toBe(1);
    engine.applyTheme(true); backdrop(engine, false);
    expect(engine.nightStars.visible).toBe(true);
  });

  it('releases the star sprite, point buffer and point material through the existing scene lifecycle', () => {
    const { createMigrationStarfield } = atmosphere(), stars = createMigrationStarfield(THREE);
    const scene = new THREE.Scene(); scene.add(stars);
    const events = { geometry: 0, material: 0, texture: 0 };
    stars.geometry.addEventListener('dispose', () => events.geometry++);
    stars.material.addEventListener('dispose', () => events.material++);
    stars.material.map.addEventListener('dispose', () => events.texture++);
    dispose(scene);
    expect(events).toEqual({ geometry: 1, material: 1, texture: 1 });
  });
});
