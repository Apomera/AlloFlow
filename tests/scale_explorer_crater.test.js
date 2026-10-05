import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const source = fs.readFileSync(process.env.SCALE_CRATER_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace(
  "  window.StemLab.registerTool('scaleExplorer', {",
  "  window.craterChecks = { sites: CRATER_SITES, route: CRATER_ROUTE, point: craterPoint, view: craterRouteView, index: craterRouteIndex, number: craterRouteNumber, details: atlasDetails, notes: readObservations, drafts: readObservationDrafts, backup: notebookBackup, parse: readNotebookBackup, items: ITEMS, limit: inspectionLimit };\n  window.StemLab.registerTool('scaleExplorer', {"
), sandbox);
const crater = sandbox.window.craterChecks;
const plain = value => JSON.parse(JSON.stringify(value));
const details = () => crater.details('chicxulub', (key, fallback) => fallback);
const route = ['surface', 'sediment', 'peak-ring', 'impactites', 'melt', 'basement', 'borehole'];
const T = createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));

function model() {
  const resources = new Set();
  const context = {
    T,
    CRATER_SITES: crater.sites,
    craterPoint: crater.point,
    track: value => (resources.add(value), value)
  };
  context.sphere = context.track(new T.SphereGeometry(.5, 32, 24));
  context.grainTexture = context.track(new T.Texture());
  context.material = (color, options) => {
    const material = context.track(new T.MeshStandardMaterial(Object.assign({ color, roughness: .78, metalness: 0 }, options || {})));
    material.color.convertSRGBToLinear();
    material.emissive.convertSRGBToLinear();
    return material;
  };
  context.mesh = (group, geometry, material, x, y, z, sx, sy, sz) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.scale.set(sx || 1, sy || sx || 1, sz || sx || 1);
    group.add(mesh);
    return mesh;
  };
  context.ball = (group, material, x, y, z, sx, sy, sz) => context.mesh(group, context.sphere, material, x, y, z, sx, sy, sz);
  context.rod = (group, a, b, radius, material) => {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const midpoint = start.clone().add(end).multiplyScalar(.5);
    const mesh = context.mesh(group, context.track(new T.CylinderGeometry(radius, radius, start.distanceTo(end), 8, 1)), material, ...midpoint.toArray());
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.sub(start).normalize());
    return mesh;
  };
  context.tube = (group, points, radius, material) => context.mesh(group, context.track(new T.TubeGeometry(
    new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point))), Math.max(16, points.length * 4), radius, 10, false
  )), material);
  context.random = seed => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const start = source.indexOf('  function craterModel(g)');
  const end = source.indexOf('    function model(item)', start);
  if (start < 0 || end < 0) throw new Error('Crater renderer functions were not found in the checked source.');
  vm.runInNewContext(source.slice(start, end), context);
  const group = new T.Group();
  context.craterModel(group);
  group.updateMatrixWorld(true);
  return { group, data: group.userData.crater, resources, paint: context.craterPaint };
}

describe('Scale Explorer buried Chicxulub geology', () => {
  it('provides seven cited landmarks with a fixed 180 km horizontal reference', () => {
    expect(plain(crater.route)).toEqual(route);
    const all = details();
    expect(all).toHaveLength(7);
    expect(all.map(detail => detail.id)).toEqual(route);
    for (const detail of all) {
      expect(detail.craterSite).toBe(true);
      expect(detail.marker).toBe(false);
      expect(detail.at.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...detail.view)).toBeCloseTo(1, 9);
      expect(detail.zoom).toBeGreaterThanOrEqual(1);
      expect(detail.zoom).toBeLessThanOrEqual(5);
      expect(detail.source).toMatch(/^https:\/\//);
    }
    expect(all[0].cutaway).toBe(false);
    expect(all.slice(1).every(detail => detail.cutaway === true)).toBe(true);
    expect(crater.items.find(item => item.id === 'chicxulub')).toMatchObject({ size: 180000, dim: 'across' });
    expect(crater.limit('chicxulub')).toBe(5);
  });

  it('bounds the route without coercing malformed inputs or ambiguous landmark IDs', () => {
    expect([0, 1, 2.4, 2.5, 7, 100].map(crater.number)).toEqual([1, 1, 2, 3, 7, 7]);
    expect([null, undefined, '7', NaN, Infinity, {}, []].map(crater.number)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(route.map(crater.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(['peak-ring ', 'PEAK-RING', null, {}, 2].map(crater.index)).toEqual([0, 0, 0, 0, 0]);
    expect(crater.point('nonexistent')).toBeNull();
  });

  it('returns detached coordinates and distinct views of each geological layer', () => {
    const original = plain(crater.sites);
    const views = route.map((id, index) => crater.view(index + 1));
    expect(new Set(views.map(view => view.at.join(','))).size).toBe(7);
    for (const view of views) {
      expect(Math.hypot(...view.view)).toBeCloseTo(1, 9);
      view.at[0] = 99;
      view.view[0] = 99;
    }
    expect(plain(crater.sites)).toEqual(original);
    expect(crater.view(3).at[0]).not.toBe(99);
  });

  it('preserves an exact borehole observation and rejects nonexistent strata', () => {
    const raw = [
      { itemId: 'chicxulub', detailId: 'borehole', cutaway: true, zoom: 4, note: 'The drill core samples the buried peak ring.' },
      { itemId: 'chicxulub', detailId: 'nonexistent' }
    ];
    const notes = plain(crater.notes(raw));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ itemId: 'chicxulub', detailId: 'borehole', size: 180000, zoom: 4, cutaway: true, note: raw[0].note });
    const parsed = crater.parse(crater.backup({ observations: notes }));
    expect(parsed.error).toBeUndefined();
    expect(plain(parsed.notebook.observations)).toEqual(notes);
    expect(plain(crater.drafts({ 'chicxulub:borehole': 'A local geological record.', 'chicxulub:nonexistent': 'Invalid.' })))
      .toEqual({ 'chicxulub:borehole': 'A local geological record.' });
  });

  it('builds a buried ring and measured core with native inspection targets', () => {
    const { data } = model();
    expect(data.stats).toMatchObject({ diameterMeters: 180000, peakRingDiameterMeters: 80000, verticalExaggeration: 15, ringReliefMeters: 400, boreholeDepthMeters: 1334.69 });
    for (const id of route) expect(data.meshes.some(mesh => mesh.userData.craterDetailId === id), id).toBe(true);
    expect(data.landmarks.map(landmark => landmark.id)).toEqual(route);
    expect(data.stats.triangles).toBeGreaterThan(1000);
    expect(data.stats.triangles).toBeLessThan(180000);
    expect(data.stats.drawables).toBeLessThan(80);
  });

  it('keeps every geometry finite, tracked, and compatible with WebGL 1 indices', () => {
    const { group, resources } = model();
    const geometries = new Set();
    group.traverse(mesh => { if (mesh.geometry) geometries.add(mesh.geometry); });
    for (const geometry of geometries) {
      expect(resources.has(geometry)).toBe(true);
      if (geometry.index) expect(geometry.index.array.BYTES_PER_ELEMENT).toBe(2);
      const positions = geometry.attributes.position, normals = geometry.attributes.normal;
      for (let index = 0; index < positions.count; index++) {
        if (!Number.isFinite(positions.getX(index) + positions.getY(index) + positions.getZ(index))) throw new Error('Invalid crater vertex.');
        if (Math.abs(Math.hypot(normals.getX(index), normals.getY(index), normals.getZ(index)) - 1) > .001) throw new Error('Invalid crater normal.');
      }
    }
  });

  it('reveals an actual section while keeping horizontal width and GPU resources stable', () => {
    const { group, data, resources, paint } = model();
    const resourceCount = resources.size;
    const identities = data.meshes.map(mesh => [mesh.geometry.uuid, mesh.material.uuid]);
    expect(group.userData).toMatchObject({ dimension: 'x', extent: 1, measureCenter: 0 });
    const bounds = new T.Box3().setFromObject(group);
    expect(bounds.min.x).toBeGreaterThanOrEqual(-.505);
    expect(bounds.max.x).toBeLessThanOrEqual(.505);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(1, 3);
    expect(data.cover.visible).toBe(true);
    expect(data.inside.visible).toBe(false);
    paint(data, true, 'peak-ring');
    expect(data.cutaway).toBe(true);
    expect(data.detailId).toBe('peak-ring');
    expect(data.cover.visible).toBe(false);
    expect(data.inside.visible).toBe(true);
    expect(data.cutEdge.visible).toBe(true);
    const materialVersions = data.meshes.map(mesh => mesh.material.version);
    for (let index = 0; index < 100; index++) paint(data, true, 'peak-ring');
    expect(data.meshes.map(mesh => mesh.material.version)).toEqual(materialVersions);
    for (let index = 0; index < 1000; index++) paint(data, index % 2 === 0, route[index % 7]);
    expect(resources.size).toBe(resourceCount);
    expect(data.meshes.map(mesh => [mesh.geometry.uuid, mesh.material.uuid])).toEqual(identities);
    paint(data, false, '');
    expect(data.cover.visible).toBe(true);
    expect(data.inside.visible).toBe(false);
    expect(data.cutEdge.visible).toBe(false);
    expect(group.userData.extent).toBe(1);
    const restored = new T.Box3().setFromObject(group);
    expect(restored.min.x).toBe(bounds.min.x);
    expect(restored.max.x).toBe(bounds.max.x);
    group.scale.setScalar(3);
    group.rotation.y = .7;
    group.updateMatrixWorld(true);
    expect(group.localToWorld(new T.Vector3(.5, 0, 0)).distanceTo(group.localToWorld(new T.Vector3(-.5, 0, 0)))).toBeCloseTo(3, 10);
    expect(crater.items.find(item => item.id === 'grand-canyon').size / crater.items.find(item => item.id === 'chicxulub').size).toBeCloseTo(446000 / 180000, 10);
  });

  it('tracks and disposes all custom geological GPU resources', () => {
    const { resources } = model();
    let disposed = 0;
    for (const resource of resources) {
      resource.addEventListener('dispose', () => disposed++);
      resource.dispose();
    }
    expect(disposed).toBe(resources.size);
  });
});
