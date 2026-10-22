import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const sourcePath = process.env.MIGRATION_TIP_LINKS_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked-tip source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const factories = new Function(section('      function createMigrationMarkedWingPose(', '      function initMigrationFlightScene(') + '\nreturn { pose: createMigrationMarkedWingPose, path: createMigrationWingtipPath };')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const tau = Math.PI * 2;
const species = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'];
function fixture(id = 'canada_goose') {
  const scene = new THREE.Scene(), flock = new THREE.Group(); scene.add(flock);
  flock.position.set(0.4, 1.2, -1); flock.rotation.y = 0.04;
  const bird = createFlyer(THREE, { id }, 2); bird.position.set(0.7, 0.5, -5); flock.add(bird);
  const onClear = vi.fn(), root = factories.pose(THREE, onClear); scene.add(root);
  const links = root.getObjectByName('migration-marked-wingtip-links');
  const f = { scene, flock, bird, root, links, onClear,
    pose(phase, rendered = true) {
      bird.userData.applyWingPhase(phase);
      if (rendered) bird.userData.lastRenderedWingPhase = phase;
      scene.updateMatrixWorld(true);
    },
    mark(phase = Math.PI / 2) { f.pose(phase); expect(root.capturePose(bird, id, 2)).toBe(true); },
    update(enabled = true, mode = 'study', dark = false, flyer = bird) {
      root.updatePose(flyer, mode, dark, enabled); scene.updateMatrixWorld(true);
    }
  };
  f.pose(0); return f;
}
function tips(f) {
  const inverse = f.bird.matrixWorld.clone().invert();
  return [0, 1].map(side => {
    let mesh = f.bird.userData.primaries[side];
    if (!mesh) f.bird.userData.wings[side].traverse(part => { if (part.name === 'migration-monarch-forewing') mesh = part; });
    const vertices = mesh.geometry.attributes.position, limit = mesh.geometry.userData.monarchBoundaryVertexCount || vertices.count;
    let chosen = 0;
    for (let i = 1; i < limit; i++) if (vertices.getX(i) > vertices.getX(chosen) || (vertices.getX(i) === vertices.getX(chosen) && vertices.getZ(i) > vertices.getZ(chosen))) chosen = i;
    return new THREE.Vector3().fromBufferAttribute(vertices, chosen).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
  });
}
function outline(root) { return Array.from(root.geometry.attributes.position.array.slice(0, root.geometry.drawRange.count * 3)); }
function segments(f) {
  return Array.from({ length: f.links.userData.segmentCount }, (_, index) => ({
    side: f.links.userData.segmentSides[index],
    marked: new THREE.Vector3().fromBufferAttribute(f.links.geometry.attributes.position, index * 2),
    current: new THREE.Vector3().fromBufferAttribute(f.links.geometry.attributes.position, index * 2 + 1)
  }));
}
function resources(root) {
  const result = new Set(); root.traverse(node => { if (node.geometry) result.add(node.geometry); if (node.material) result.add(node.material); }); return result;
}
function expectHidden(f) {
  expect(f.links.visible).toBe(false); expect(f.links.geometry.drawRange.count).toBe(0);
  expect(f.links.userData.segmentCount).toBe(0); expect(f.links.userData.segmentSides).toEqual([-1, -1]);
}

describe('Migration marked-to-current wingtip comparison links', () => {
  it.each(species)('connects frozen and current actual %s outer vertices in body coordinates', id => {
    const f = fixture(id); f.mark(); const marked = tips(f), frozen = outline(f.root);
    expect(f.root.userData.tipSources).toHaveLength(2); expect(f.root.userData.markedTipPositions).toHaveLength(6);
    f.pose(3 * Math.PI / 2); const current = tips(f); f.update();
    expect(f.links.visible).toBe(true); expect(f.links.userData.segmentCount).toBe(2);
    expect(f.links.geometry.drawRange.count).toBe(4); expect(outline(f.root)).toEqual(frozen);
    for (const segment of segments(f)) {
      expect(segment.marked.distanceTo(marked[segment.side])).toBeLessThan(0.000001);
      expect(segment.current.distanceTo(current[segment.side])).toBeLessThan(0.000001);
      const descriptor = f.root.userData.tipSources[segment.side];
      const node = f.bird.getObjectByProperty('uuid', descriptor.nodeUuid);
      expect(descriptor.geometryUuid).toBe(node.geometry.uuid);
      if (id === 'monarch') {
        expect(node.name).toBe('migration-monarch-forewing');
        expect(descriptor.vertexIndex).toBeLessThan(node.geometry.userData.monarchBoundaryVertexCount);
      } else expect(node.name).toBe('migration-primary-feathers');
    }
  });

  it('stores the normalized actually-rendered phase and clears it with temporary source metadata', () => {
    const f = fixture(); const sourceList = f.root.userData.tipSources, markedList = f.root.userData.markedTipPositions;
    for (const phase of [-tau - Math.PI / 3, 7 * tau + Math.PI / 4, 0]) {
      f.mark(phase);
      expect(f.root.userData.capturedPhase).toBeGreaterThanOrEqual(0); expect(f.root.userData.capturedPhase).toBeLessThan(tau);
      expect(Math.cos(f.root.userData.capturedPhase)).toBeCloseTo(Math.cos(phase), 12);
      expect(Math.sin(f.root.userData.capturedPhase)).toBeCloseTo(Math.sin(phase), 12);
      f.root.clearPose(); expect(f.root.userData.capturedPhase).toBeNull();
      expect(sourceList).toBe(f.root.userData.tipSources); expect(markedList).toBe(f.root.userData.markedTipPositions);
      expect(sourceList).toEqual([]); expect(markedList).toEqual([]); expectHidden(f);
    }
  });

  it('retains useful outline capture without a finite rendered phase', () => {
    const f = fixture();
    for (const phase of [undefined, NaN, Infinity]) {
      f.bird.userData.lastRenderedWingPhase = phase;
      expect(f.root.capturePose(f.bird, 'canada_goose', 2)).toBe(true);
      expect(f.root.userData.capturedPhase).toBeNull(); expect(f.root.userData.captured).toBe(true);
      expect(f.root.geometry.drawRange.count).toBeGreaterThan(100);
    }
  });

  it('does not read a queued engine offset or temporary cycle sampling as the captured phase', () => {
    const f = fixture(); f.pose(1.13);
    const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 900); camera.position.set(6, 5, 3); camera.lookAt(f.bird.position); camera.updateMatrixWorld(true);
    const pathRoot = factories.path(THREE); f.scene.add(pathRoot);
    pathRoot.updatePath(true, 'study', f.bird, 'canada_goose', 2, camera, false, 390, 1.13);
    expect(f.bird.userData.lastRenderedWingPhase).toBe(1.13);
    const before = tips(f); expect(f.root.capturePose(f.bird, 'canada_goose', 2)).toBe(true);
    expect(f.root.userData.capturedPhase).toBeCloseTo(1.13, 12);
    f.root.userData.markedTipPositions.forEach((value, index) => expect(value).toBeCloseTo(before[Math.floor(index / 3)].getComponent(index % 3), 12));
  });

  it('keeps zero-length links hidden and packs only the changed right side without losing dashed-side identity', () => {
    const f = fixture(); f.mark(); f.update(); expectHidden(f);
    const leftJoints = [f.bird.userData.wings[0], f.bird.userData.wrists[0], f.bird.userData.primaries[0]].filter(Boolean).map(node => ({ node, rotation: node.rotation.clone() }));
    f.pose(3 * Math.PI / 2); for (const joint of leftJoints) joint.node.rotation.copy(joint.rotation);
    // Leave child world matrices stale deliberately; updatePose must refresh the
    // actual source chain before reading current endpoints.
    f.update(); expect(f.links.userData.segmentCount).toBe(1); expect(f.links.userData.segmentSides).toEqual([1, -1]);
    const segment = segments(f)[0]; expect(segment.current.distanceTo(tips(f)[1])).toBeLessThan(0.000001);
    expect(f.links.geometry.attributes.lineDistance.getX(0)).toBe(0);
    expect(f.links.geometry.attributes.lineDistance.getX(1)).toBeCloseTo(segment.marked.distanceTo(segment.current), 6);
    const shade = new THREE.Color(0x240c01), color = f.links.geometry.attributes.color;
    expect(color.getX(0)).toBeCloseTo(shade.r, 6); expect(color.getY(0)).toBeCloseTo(shade.g, 6); expect(color.getZ(0)).toBeCloseTo(shade.b, 6);
  });

  it('requires an explicitly enabled Study comparison and preserves the old three-argument API', () => {
    const f = fixture(); f.mark(); f.pose(3 * Math.PI / 2);
    for (const [enabled, mode] of [[false, 'study'], [undefined, 'study'], ['true', 'study'], [true, 'chase'], [true, 'aerial']]) {
      f.update(true); expect(f.links.visible).toBe(true);
      f.root.updatePose(f.bird, mode, false, enabled); expectHidden(f);
    }
    f.root.updatePose(f.bird, 'study', false); expectHidden(f); expect(f.root.visible).toBe(true);
  });

  it('follows body motion without altering frozen outline or marked-tip coordinates', () => {
    const f = fixture(); f.mark(); const frozen = outline(f.root), marked = [...f.root.userData.markedTipPositions];
    f.pose(3 * Math.PI / 2); f.update(); const local = segments(f).map(segment => [segment.marked.clone(), segment.current.clone()]);
    f.flock.position.set(3, 5, -7); f.flock.rotation.set(0.1, -0.3, 0.05); f.bird.position.set(2, 1, -9); f.bird.rotation.y = 0.2;
    f.scene.updateMatrixWorld(true); f.update();
    expect(outline(f.root)).toEqual(frozen); expect(f.root.userData.markedTipPositions).toEqual(marked);
    expect(f.root.matrix.elements).toEqual(f.bird.matrixWorld.elements);
    segments(f).forEach((segment, index) => {
      expect(segment.marked.distanceTo(local[index][0])).toBeLessThan(0.000001);
      expect(segment.current.distanceTo(local[index][1])).toBeLessThan(0.000001);
      const expectedWorld = segment.current.clone().applyMatrix4(f.bird.matrixWorld);
      const linkWorld = segment.current.clone().applyMatrix4(f.links.matrixWorld);
      expect(expectedWorld.distanceTo(linkWorld)).toBeLessThan(0.000001);
    });
  });

  it('updates day and night contrast with the same side scheme as the path and preserves all pooled resources', () => {
    const f = fixture(); f.mark(); f.pose(3 * Math.PI / 2);
    const pool = resources(f.root), segmentSides = f.links.userData.segmentSides;
    const buffers = ['position', 'color', 'lineDistance'].map(name => f.links.geometry.attributes[name]);
    expect(pool.size).toBe(6); expect(buffers.reduce((sum, attribute) => sum + attribute.array.byteLength, 0)).toBe(112);
    for (const dark of [false, true, true, false]) {
      f.update(true, 'study', dark); const colors = f.links.geometry.attributes.color;
      for (const [index, segment] of segments(f).entries()) {
        const shade = new THREE.Color((dark ? [0x67e8f9, 0xfbbf24] : [0x021016, 0x240c01])[segment.side]);
        for (let endpoint = 0; endpoint < 2; endpoint++) {
          expect(colors.getX(index * 2 + endpoint)).toBeCloseTo(shade.r, 6);
          expect(colors.getY(index * 2 + endpoint)).toBeCloseTo(shade.g, 6);
          expect(colors.getZ(index * 2 + endpoint)).toBeCloseTo(shade.b, 6);
        }
      }
      expect(resources(f.root)).toEqual(pool); expect(f.links.userData.segmentSides).toBe(segmentSides);
      buffers.forEach((attribute, index) => expect(f.links.geometry.attributes[['position', 'color', 'lineDistance'][index]]).toBe(attribute));
    }
    expect(f.links.material.vertexColors).toBe(true); expect(f.links.material.depthTest).toBe(false); expect(f.links.material.depthWrite).toBe(false);
    expect(f.links.renderOrder).toBe(5); expect(f.root.renderOrder).toBe(6); expect(f.links.children).toHaveLength(0);
    const distances = f.links.geometry.attributes.lineDistance;
    expect(distances.getX(0)).toBe(0); expect(distances.getX(1)).toBe(0); expect(distances.getX(3)).toBeGreaterThan(0);
  });

  it('clears links and source metadata for replaced flyers, failed captures and explicit clear without disposing the pool', () => {
    const f = fixture(); f.mark(); f.pose(3 * Math.PI / 2); f.update(); const pool = resources(f.root);
    const other = createFlyer(THREE, { id: 'monarch' }, 0); f.root.updatePose(other, 'study', false, true);
    expectHidden(f); expect(f.root.userData.tipSources).toEqual([]); expect(f.root.userData.markedTipPositions).toEqual([]);
    expect(f.root.userData.capturedPhase).toBeNull(); expect(f.onClear).toHaveBeenCalledTimes(1);
    f.mark(); f.pose(3 * Math.PI / 2); f.update(); expect(f.root.capturePose(null, '', -1)).toBe(false); expectHidden(f);
    f.mark(); f.root.clearPose(); expectHidden(f); expect(resources(f.root)).toEqual(pool);
  });

  it('hides stale geometry sources instead of connecting to a replaced tip mesh', () => {
    const f = fixture(); f.mark(); f.pose(3 * Math.PI / 2); f.update();
    const node = f.bird.userData.primaries[1], original = node.geometry; node.geometry = original.clone();
    f.update(); expectHidden(f); expect(f.root.userData.captured).toBe(true); node.geometry.dispose(); node.geometry = original;
  });

  it('retains the original outline when a custom model has no compatible pair of anatomical tip anchors', () => {
    const f = fixture(); f.bird.userData.primaries = [];
    expect(f.root.capturePose(f.bird, 'canada_goose', 2)).toBe(true); expect(f.root.geometry.drawRange.count).toBeGreaterThan(100);
    expect(f.root.userData.tipSources).toEqual([]); f.update(); expectHidden(f);
  });

  it('retains exactly six scene-owned resources across capture, step and clear, then disposes each once', () => {
    const f = fixture(); const pool = resources(f.root), counts = new Map([...pool].map(resource => [resource, 0]));
    for (const resource of pool) resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
    const positions = f.links.geometry.attributes.position, sides = f.links.userData.segmentSides;
    for (let index = 0; index < 16; index++) {
      f.mark(index * Math.PI / 4); f.pose((index + 3) * Math.PI / 4); f.update(); f.root.clearPose();
      expect(resources(f.root)).toEqual(pool); expect(f.links.geometry.attributes.position).toBe(positions); expect(f.links.userData.segmentSides).toBe(sides);
    }
    expect([...counts.values()]).toEqual([0, 0, 0, 0, 0, 0]); dispose(f.scene); expect([...counts.values()]).toEqual([1, 1, 1, 1, 1, 1]);
  });
});
