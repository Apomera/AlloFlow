import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
const report = 'reports/evolab-living-island';

// Read the tool's actual render arguments. r128 installs render on each renderer
// instance, so a constructor wrapper is needed rather than a prototype method.
// This runs only in the harness and never asks a canvas for a new GL context.
const probes = `
document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%}</style>');
(function () {
  var Original = THREE.WebGLRenderer;
  window.__islandRender = null;
  THREE.WebGLRenderer = new Proxy(Original, {
    construct: function (target, args, newTarget) {
      var renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene, camera) {
        var result = render.apply(this, arguments);
        if (scene && scene.isScene && scene.getObjectByName('Archipelago organisms')) {
          var previous = window.__islandRender;
          window.__islandRender = { scene: scene, camera: camera, canvas: renderer.domElement,
            renders: previous && previous.canvas === renderer.domElement ? previous.renders + 1 : 1 };
        }
        return result;
      };
      return renderer;
    }
  });
  window.__islandMeasurement = function () {
    var hit = window.__islandRender;
    if (!hit || !hit.canvas.isConnected) return null;
    var scene = hit.scene, camera = hit.camera, T = THREE;
    var terrain = [], shores = [], scenery = [], groups = [], allGroups = [], visibleTerrain = [], visibleShores = [], visibleScenery = [];
    scene.traverse(function (node) {
      if (/^Archipelago terrain [0-2]$/.test(node.name)) terrain.push(node);
      if (/^Archipelago shore [0-2]$/.test(node.name)) shores.push(node);
      if (/^Archipelago scenery [0-2]$/.test(node.name)) scenery.push(node);
    });
    scene.traverseVisible(function (node) {
      if (/^Archipelago terrain [0-2]$/.test(node.name)) visibleTerrain.push(node);
      if (/^Archipelago shore [0-2]$/.test(node.name)) visibleShores.push(node);
      if (/^Archipelago scenery [0-2]$/.test(node.name)) visibleScenery.push(node);
    });
    var organisms = scene.getObjectByName('Archipelago organisms');
    if (organisms) organisms.traverse(function (node) {
      if (node !== organisms && Number.isInteger(node.userData.id) &&
          Number.isInteger(node.userData.island) && /^(birds|plants)$/.test(node.userData.species)) allGroups.push(node);
    });
    if (organisms) organisms.traverseVisible(function (node) {
      if (node !== organisms && Number.isInteger(node.userData.id) &&
          Number.isInteger(node.userData.island) && /^(birds|plants)$/.test(node.userData.species)) groups.push(node);
    });
    var bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity,
      minZ: Infinity, maxZ: -Infinity, points: 0 };
    function include(mesh) {
      var positions = mesh.geometry && mesh.geometry.getAttribute('position');
      if (!positions) return;
      var point = new T.Vector3();
      for (var i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera);
        bounds.minX = Math.min(bounds.minX, point.x); bounds.maxX = Math.max(bounds.maxX, point.x);
        bounds.minY = Math.min(bounds.minY, point.y); bounds.maxY = Math.max(bounds.maxY, point.y);
        bounds.minZ = Math.min(bounds.minZ, point.z); bounds.maxZ = Math.max(bounds.maxZ, point.z);
        bounds.points++;
      }
    }
    visibleTerrain.forEach(include);
    visibleShores.forEach(include);
    var sceneryMeshes = 0;
    visibleScenery.forEach(function (group) { group.traverseVisible(function (node) {
      if (node.isMesh) { include(node); sceneryMeshes++; }
    }); });
    var bodyMeshes = 0;
    groups.forEach(function (group) { group.traverseVisible(function (node) {
      if (node.isMesh) { include(node); bodyMeshes++; }
    }); });
    function outline(mesh) {
      var positions = mesh.geometry.getAttribute('position'), points = [], point = new T.Vector3();
      // Each ring has 96 segments plus its repeated seam vertex. Read the outer
      // ring from the geometry, including the mesh's real world transform.
      for (var i = positions.count - 97; i < positions.count - 1; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        points.push({ x: point.x, z: point.z });
      }
      return points;
    }
    function area(points) {
      var sum = 0;
      for (var i = 0; i < points.length; i++) { var a = points[i], b = points[(i + 1) % points.length]; sum += a.x * b.z - b.x * a.z; }
      return Math.abs(sum) / 2;
    }
    function inside(point, polygon) {
      var contained = false;
      for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        var a = polygon[i], b = polygon[j];
        if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) contained = !contained;
      }
      return contained;
    }
    var polygons = {}, centers = {};
    terrain.forEach(function (mesh) {
      var island = Number(mesh.name.split(' ').pop()), point = new T.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'), 0).applyMatrix4(mesh.matrixWorld);
      polygons[island] = outline(mesh); centers[island] = { x: point.x, z: point.z };
    });
    function coastFraction(point, island) {
      var center = centers[island], polygon = polygons[island], dx = point.x - center.x, dz = point.z - center.z, nearest = Infinity;
      // Intersect the measured coastline with a ray from its actual centre.
      // This never invokes the production landscape or scenic placement RNG.
      for (var i = 0; i < polygon.length; i++) {
        var a = polygon[i], b = polygon[(i + 1) % polygon.length], ex = b.x - a.x, ez = b.z - a.z, determinant = dx * ez - dz * ex;
        if (Math.abs(determinant) < 1e-10) continue;
        var ax = a.x - center.x, az = a.z - center.z, t = (ax * ez - az * ex) / determinant, u = (ax * dz - az * dx) / determinant;
        if (t > 0 && u >= 0 && u <= 1) nearest = Math.min(nearest, t);
      }
      return 1 / nearest;
    }
    var sceneryDetails = scenery.map(function (group) {
      var island = group.userData.island, meshCount = 0, visibleMeshCount = 0, outside = 0;
      group.traverse(function (node) {
        if (!node.isMesh) return;
        meshCount++;
        var positions = node.geometry.getAttribute('position'), point = new T.Vector3();
        for (var i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
          if (!inside(point, polygons[island])) outside++;
        }
      });
      group.traverseVisible(function (node) { if (node.isMesh) visibleMeshCount++; });
      return { island: island, scenery: group.userData.scenery, uuid: group.uuid, visible: group.visible,
        meshCount: meshCount, visibleMeshCount: visibleMeshCount, outsideCoastVertices: outside,
        features: group.children.map(function (feature) {
          var point = new T.Vector3().setFromMatrixPosition(feature.matrixWorld);
          return { name: feature.name, visible: feature.visible, position: point.toArray(), coastFraction: coastFraction(point, island), insideCoast: inside(point, polygons[island]) };
        }) };
    }).sort(function (a, b) { return a.island - b.island; });
    var bodies = allGroups.map(function (group) {
      var parts = [];
      group.traverse(function (mesh) {
        if (!mesh.isMesh || !/^(Seedwing (tail|beak)|Shellseed (leaves|pod|seam))$/.test(mesh.name)) return;
        var size = new T.Box3().setFromBufferAttribute(mesh.geometry.getAttribute('position')).getSize(new T.Vector3()).multiply(mesh.scale);
        parts.push({ name: mesh.name, scale: mesh.scale.toArray(), size: size.toArray() });
      });
      return { id: group.userData.id, species: group.userData.species, island: group.userData.island, visible: groups.indexOf(group) !== -1, parts: parts };
    }).sort(function (a, b) { return a.id - b.id; });
    var outsideCoast = groups.filter(function (group) {
      var point = new T.Vector3().setFromMatrixPosition(group.matrixWorld);
      return !inside(point, polygons[group.userData.island] || []);
    }).map(function (group) { return group.userData; });
    var box = hit.canvas.getBoundingClientRect();
    return { renders: hit.renders, bounds: bounds, bodyMeshes: bodyMeshes, sceneryMeshes: sceneryMeshes,
      canvas: { width: box.width, height: box.height },
      camera: { aspect: camera.aspect, position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(), fov: camera.fov, near: camera.near, far: camera.far },
      terrain: terrain.map(function (mesh) { return { island: Number(mesh.name.split(' ').pop()),
        vertices: mesh.geometry.getAttribute('position').count, area: area(polygons[Number(mesh.name.split(' ').pop())]) }; }).sort(function (a, b) { return a.island - b.island; }),
      visibleTerrain: visibleTerrain.map(function (mesh) { return Number(mesh.name.split(' ').pop()); }).sort(),
      visibleShores: visibleShores.map(function (mesh) { return Number(mesh.name.split(' ').pop()); }).sort(),
      shoreCount: shores.length,
      scenery: sceneryDetails,
      bodies: bodies,
      residents: groups.map(function (group) { return { id: group.userData.id,
        species: group.userData.species, island: group.userData.island }; }).sort(function (a, b) { return a.id - b.id; }),
      outsideCoast: outsideCoast };
  };
  window.__islandPickPoint = function (kind, island) {
    var hit = window.__islandRender;
    if (!hit) return null;
    var T = THREE, terrain = [], residents = [], sceneryMeshes = [], targets = [], candidates = [];
    hit.scene.traverseVisible(function (node) {
      if (/^Archipelago terrain [0-2]$/.test(node.name)) terrain.push(node);
      if (node.isMesh) {
        var parent = node.parent;
        while (parent && !parent.userData.scenery) parent = parent.parent;
        if (parent) sceneryMeshes.push(node);
      }
    });
    var organisms = hit.scene.getObjectByName('Archipelago organisms');
    if (organisms) organisms.traverseVisible(function (node) {
      if (Number.isInteger(node.userData.id)) residents.push(node);
    });
    // Raycaster itself does not respect visible=false on descendants. Only
    // measured visible scenery meshes may participate in picking.
    targets = terrain.concat(residents, sceneryMeshes);
    if (kind === 'terrain') {
      var mesh = terrain.filter(function (node) { return node.name === 'Archipelago terrain ' + island; })[0];
      if (!mesh) return null;
      var positions = mesh.geometry.getAttribute('position'), indices = mesh.geometry.index;
      // Real triangle centres in the outer inland band, away from most bodies.
      for (var ring = 27; ring >= 20; ring--) for (var segment = 0; segment < 96; segment += 3) {
        var triangle = (ring * 96 + segment) * 6, point = new T.Vector3();
        for (var vertex = 0; vertex < 3; vertex++) point.add(new T.Vector3().fromBufferAttribute(positions, indices.getX(triangle + vertex)));
        candidates.push(point.multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld));
      }
    } else if (kind === 'scenery') sceneryMeshes.forEach(function (mesh) {
      var parent = mesh.parent;
      while (parent && !parent.userData.scenery) parent = parent.parent;
      if (!parent || parent.userData.island !== island) return;
      var positions = mesh.geometry.getAttribute('position');
      candidates.push(new T.Box3().setFromBufferAttribute(positions).getCenter(new T.Vector3()).applyMatrix4(mesh.matrixWorld));
      // Flat fern and tussock pieces may have their bounding-box centre in a
      // gap. Include actual rendered vertices to find an exposed scenic part.
      for (var vertex = 0; vertex < positions.count; vertex += 3) candidates.push(new T.Vector3().fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld));
    });
    else residents.filter(function (node) { return node.userData.island === island; }).forEach(function (group) {
      group.traverseVisible(function (mesh) {
        if (!mesh.isMesh) return;
        var point = new T.Box3().setFromBufferAttribute(mesh.geometry.getAttribute('position')).getCenter(new T.Vector3());
        candidates.push(point.applyMatrix4(mesh.matrixWorld));
      });
    });
    var raycaster = new T.Raycaster(), box = hit.canvas.getBoundingClientRect();
    for (var i = 0; i < candidates.length; i++) {
      var point = candidates[i].clone().project(hit.camera);
      if (Math.abs(point.x) >= .95 || Math.abs(point.y) >= .95 || Math.abs(point.z) >= 1) continue;
      raycaster.setFromCamera(new T.Vector2(point.x, point.y), hit.camera);
      var intersections = raycaster.intersectObjects(targets, true);
      if (!intersections.length) continue;
      var picked = intersections[0].object;
      while (picked && !Number.isInteger(picked.userData.id) && !picked.userData.terrain && !picked.userData.scenery) picked = picked.parent;
      if (!picked || picked.userData.island !== island || (kind === 'terrain' ? !picked.userData.terrain : kind === 'scenery' ? !picked.userData.scenery : !Number.isInteger(picked.userData.id))) continue;
      return { x: box.left + (point.x + 1) / 2 * box.width,
        y: box.top + (1 - point.y) / 2 * box.height, id: picked.userData.id, island: island };
    }
    return null;
  };
})();
`;

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab',
  width: 1380, height: 980, layout: 'document', appStyles: true, probes });

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Resident = { id: number; species: string; island: number };
type PopulationLayer = 'all' | 'birds' | 'plants';
type BodyPart = { name: string; scale: number[]; size: number[] };
type Body = Resident & { visible: boolean; parts: BodyPart[] };
type Scenery = {
  island: number; scenery: boolean; uuid: string; visible: boolean;
  meshCount: number; visibleMeshCount: number; outsideCoastVertices: number;
  features: { name: string; visible: boolean; position: number[]; coastFraction: number; insideCoast: boolean }[];
};
type Measurement = {
  renders: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number; points: number };
  bodyMeshes: number;
  sceneryMeshes: number;
  canvas: { width: number; height: number };
  camera: { aspect: number; position: number[]; quaternion: number[]; fov: number; near: number; far: number };
  terrain: { island: number; vertices: number; area: number }[];
  visibleTerrain: number[];
  visibleShores: number[];
  shoreCount: number;
  scenery: Scenery[];
  bodies: Body[];
  residents: Resident[];
  outsideCoast: Resident[];
};

async function mountExpedition(page: Page, noGl = false) {
  // Make a fixed fixture with the public scientific model before mounting 3D.
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?.evoArchipelagoModel);
  const world = await page.evaluate(() => (window as any).StemLab.evoArchipelagoModel.create(2026));
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } }, undefined, { expectCanvas: !noGl });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', noGl ? 'fallback' : 'ready');
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
  await expect(page.locator('[data-archipelago-populations]')).toHaveAttribute('data-archipelago-populations', 'all');
  await expect(page.locator('[data-archipelago-scenery]')).toHaveAttribute('data-archipelago-scenery', 'true');
  await expect(page.getByRole('button', { name: 'Both species', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Habitat scenery', exact: true })).toHaveAttribute('aria-pressed', 'true');
  if (!noGl) {
    expectFramed(await measure(page), world, 0);
    await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
    await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'overview');
  }
  return world;
}

async function measure(page: Page): Promise<Measurement> {
  await page.waitForFunction(() => !!(window as any).__islandMeasurement());
  return page.evaluate(() => (window as any).__islandMeasurement());
}

async function biologicalSnapshot(page: Page) {
  return page.evaluate(() => JSON.stringify({
    world: (window as any).__toolData.evoLab.archipelago,
    storedWorld: localStorage.getItem('evoLab.archipelago.v1'),
    islands: (window as any).StemLab.evoArchipelagoModel.islands,
    distances: (window as any).StemLab.evoArchipelagoModel.distances,
  }));
}

function expectedResidents(world: any, island?: number, layer: PopulationLayer = 'all', generation = world.generation): Resident[] {
  return world.history[generation].demes.flatMap((deme: any, i: number) =>
    island !== undefined && i !== island ? [] : (layer === 'all' ? ['birds', 'plants'] : [layer]).flatMap(species =>
      deme[species].map((organism: any) => ({ id: organism.id, species, island: i })))).sort((a: Resident, b: Resident) => a.id - b.id);
}

// Reconstruct the former renderer's outer 64-segment ring independently. Calling
// evoIslandLandscape.coast here would let a changed production helper certify itself.
function formerTerrainArea(seed: number, island: number) {
  const phase = (((seed + island * 103) >>> 0) % 997) / 997 * Math.PI * 2;
  const points = Array.from({ length: 64 }, (_, i) => {
    const angle = i / 64 * Math.PI * 2;
    const bay = Math.atan2(Math.sin(angle - .35), Math.cos(angle - .35));
    const headland = Math.atan2(Math.sin(angle - 2.8), Math.cos(angle - 2.8));
    const coast = Math.max(7.4, 10 * (1 + .11 * Math.sin(3 * angle + phase) + .07 * Math.cos(5 * angle - phase)
      + .025 * Math.sin(11 * angle + phase) - .22 * Math.exp(-bay * bay / .10) + .16 * Math.exp(-headland * headland / .20)));
    return { x: Math.cos(angle) * coast * .55, z: Math.sin(angle) * coast * .55 * .8 };
  });
  return Math.abs(points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p.x * next.z - next.x * p.z;
  }, 0)) / 2;
}

function expectFramed(frame: Measurement, world: any, island?: number, layer: PopulationLayer = 'all', scenery = true, generation = world.generation) {
  expect(frame.visibleTerrain).toEqual(island === undefined ? [0, 1, 2] : [island]);
  expect(frame.visibleShores).toEqual(frame.visibleTerrain);
  expect(frame.residents).toEqual(expectedResidents(world, island, layer, generation));
  expect(frame.bodies.map(({ id, species, island }) => ({ id, species, island }))).toEqual(expectedResidents(world, undefined, 'all', generation));
  expect(frame.bodies.filter(body => body.visible).map(({ id, species, island }) => ({ id, species, island }))).toEqual(frame.residents);
  expect(frame.scenery.filter(group => group.visible).map(group => group.island)).toEqual(scenery ? frame.visibleTerrain : []);
  if (scenery) expect(frame.sceneryMeshes).toBeGreaterThan(0);
  else expect(frame.sceneryMeshes).toBe(0);
  expect(frame.outsideCoast).toEqual([]);
  expect(frame.bodyMeshes).toBeGreaterThan(frame.residents.length * 2);
  expect(frame.bounds.points).toBeGreaterThan(3200);
  for (const value of Object.values(frame.bounds)) expect(Number.isFinite(value)).toBe(true);
  expect(frame.bounds.minX).toBeGreaterThan(-.99);
  expect(frame.bounds.maxX).toBeLessThan(.99);
  expect(frame.bounds.minY).toBeGreaterThan(-.99);
  expect(frame.bounds.maxY).toBeLessThan(.99);
  expect(frame.bounds.minZ).toBeGreaterThan(-1);
  expect(frame.bounds.maxZ).toBeLessThan(1);
  const width = (frame.bounds.maxX - frame.bounds.minX) / 2;
  const height = (frame.bounds.maxY - frame.bounds.minY) / 2;
  // Oblique overview angles compress the three-island footprint; it should
  // still occupy more than half a dimension while every body remains in view.
  expect(Math.max(width, height)).toBeGreaterThan(.50);
  expect(frame.camera.aspect).toBeCloseTo(frame.canvas.width / frame.canvas.height, 4);
}

function expectSceneryBounded(frame: Measurement) {
  expect(frame.scenery.map(group => group.island)).toEqual([0, 1, 2]);
  for (const group of frame.scenery) {
    expect(group.scenery).toBe(true);
    expect(group.features).toHaveLength(22);
    expect(group.meshCount).toBeGreaterThan(group.features.length);
    expect(group.meshCount).toBeLessThanOrEqual(110);
    expect(group.outsideCoastVertices).toBe(0);
    for (const feature of group.features) {
      expect(feature.insideCoast).toBe(true);
      for (const coordinate of feature.position) expect(Number.isFinite(coordinate)).toBe(true);
      expect(feature.coastFraction).toBeGreaterThan(.78);
      expect(feature.coastFraction).toBeLessThan(.91);
    }
    if (group.visible) expect(group.visibleMeshCount).toBeGreaterThan(0);
    else expect(group.visibleMeshCount).toBe(0);
  }
}

function sceneryLayout(frame: Measurement) {
  // UUIDs prove the static groups survive filter changes; measured positions
  // prove visual layout remains independent of the scientific random stream.
  return frame.scenery.map(group => ({ island: group.island, uuid: group.uuid,
    meshCount: group.meshCount, features: group.features.map(({ name, position, coastFraction, insideCoast }) => ({ name, position, coastFraction, insideCoast })) }));
}

function expectBodyCues(frame: Measurement, world: any, generation = world.generation) {
  const organisms = world.history[generation].demes.flatMap((deme: any) => ['birds', 'plants'].flatMap(species => deme[species]));
  const trait = (id: number) => { const organism = organisms.find((item: any) => item.id === id); return (organism.genes[0] + organism.genes[1]) / 2; };
  const birds = frame.bodies.filter(body => body.species === 'birds');
  const plants = frame.bodies.filter(body => body.species === 'plants');
  for (const bird of birds) {
    expect(bird.parts.filter(part => part.name === 'Seedwing tail')).toHaveLength(1);
    expect(bird.parts.filter(part => part.name === 'Seedwing beak')).toHaveLength(1);
    expect(bird.parts.every(part => part.name.startsWith('Seedwing '))).toBe(true);
  }
  for (const plant of plants) {
    expect(plant.parts.filter(part => part.name === 'Shellseed leaves').length).toBeGreaterThanOrEqual(2);
    expect(plant.parts.filter(part => part.name === 'Shellseed pod')).toHaveLength(1);
    expect(plant.parts.filter(part => part.name === 'Shellseed seam')).toHaveLength(6);
    expect(plant.parts.every(part => part.name.startsWith('Shellseed '))).toBe(true);
    const pod = plant.parts.find(part => part.name === 'Shellseed pod')!;
    expect(pod.size).toEqual(plants[0].parts.find(part => part.name === 'Shellseed pod')!.size);
    const seams = plant.parts.filter(part => part.name === 'Shellseed seam');
    expect(seams.map(part => part.scale[0])).toEqual(seams.map(() => seams[0].scale[0]));
    for (const seam of seams) expect(seam.scale[2]).toBe(seam.scale[0]);
  }
  for (const [population, partName] of [[birds, 'Seedwing beak'], [plants, 'Shellseed seam']] as const) {
    const sorted = [...population].sort((a, b) => trait(a.id) - trait(b.id));
    expect(trait(sorted[sorted.length - 1].id) - trait(sorted[0].id)).toBeGreaterThan(.1);
    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1].parts.find(part => part.name === partName)!;
      const current = sorted[index].parts.find(part => part.name === partName)!;
      if (trait(sorted[index].id) > trait(sorted[index - 1].id) + 1e-12) expect(current.size[0]).toBeGreaterThan(previous.size[0]);
      else expect(current.size[0]).toBeCloseTo(previous.size[0], 10);
    }
  }
}

async function scienceControls(page: Page) {
  return page.evaluate(() => JSON.stringify({
    species: document.querySelector('[data-arch-diversity]')?.getAttribute('data-arch-diversity'),
    selected: document.querySelector('[data-arch-inspector]')?.getAttribute('data-arch-inspector'),
    resident: (document.querySelector('#ea-resident') as HTMLSelectElement)?.value,
    settings: Array.from(document.querySelectorAll('.ea-controls input')).map(input => {
      const control = input as HTMLInputElement;
      return { id: control.id, value: control.value, checked: control.checked, disabled: control.disabled };
    }),
  }));
}

async function populationAction(page: Page, layer: PopulationLayer, keyboard = false) {
  const label = { all: 'Both species', birds: 'Seedwing birds only', plants: 'Shellseed plants only' }[layer];
  const frame = await cameraAction(page, label, keyboard);
  await expect(page.locator('[data-archipelago-populations]')).toHaveAttribute('data-archipelago-populations', layer);
  for (const [value, name] of Object.entries({ all: 'Both species', birds: 'Seedwing birds only', plants: 'Shellseed plants only' })) {
    await expect(page.getByRole('group', { name: 'Visible populations', exact: true }).getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', String(value === layer));
  }
  return frame;
}

async function sceneryAction(page: Page, enabled: boolean, keyboard = false) {
  const frame = await cameraAction(page, 'Habitat scenery', keyboard);
  await expect(page.locator('[data-archipelago-scenery]')).toHaveAttribute('data-archipelago-scenery', String(enabled));
  await expect(page.getByRole('button', { name: 'Habitat scenery', exact: true })).toHaveAttribute('aria-pressed', String(enabled));
  return frame;
}

async function expectAccessible(page: Page) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]);
}

async function expectVisibleCounts(page: Page, world: any, island?: number, layer: PopulationLayer = 'all', generation = world.generation) {
  const residents = expectedResidents(world, island, layer, generation);
  await expect(page.locator('[data-habitat-counts]')).toHaveText('Visible residents · G' + generation +
    ' · Seedwing birds: ' + residents.filter(resident => resident.species === 'birds').length +
    ' · Shellseed plants: ' + residents.filter(resident => resident.species === 'plants').length);
}

async function cameraAction(page: Page, label: string, keyboard = false) {
  const before = await measure(page);
  const control = page.getByRole('button', { name: label, exact: true });
  await expect(control).toBeEnabled();
  if (keyboard) { await control.focus(); await page.keyboard.press('Enter'); }
  else await control.click();
  await page.waitForFunction(previous => (window as any).__islandRender?.renders > previous, before.renders);
  return measure(page);
}

function projectedSize(frame: Measurement) {
  return Math.max(frame.bounds.maxX - frame.bounds.minX, frame.bounds.maxY - frame.bounds.minY);
}

async function expectNoOverflow(page: Page) {
  const size = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
}

test('desktop reset frames enlarged coastlines and actual residents while turning and visiting every island', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const world = await mountExpedition(page);
  const original = await biologicalSnapshot(page);
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'overview');
  let frame = await measure(page);
  expectFramed(frame, world);
  expect(frame.terrain).toHaveLength(3);
  expect(frame.shoreCount).toBe(3);
  for (const terrain of frame.terrain) {
    expect(terrain.vertices).toBe(33 * 97);
    expect(terrain.area / formerTerrainArea(world.seed, terrain.island)).toBeGreaterThan(1.60);
  }
  const contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost);
  expect(contexts).toHaveLength(1);
  expect(contexts[0].createdBy).toBe('page');
  expect(contexts[0].draws).toBeGreaterThan(0);

  for (let turn = 0; turn < 6; turn++) {
    frame = await cameraAction(page, 'Turn view right');
    expectFramed(frame, world);
  }
  frame = await cameraAction(page, 'Reset view');
  expectFramed(frame, world);
  await page.locator('.ea-scene-wrap').screenshot({ path: report + '/island-framing-desktop.png' });

  await page.locator('[data-archipelago-scene] canvas').scrollIntoViewIfNeeded();
  const terrainPoint = await page.evaluate(() => (window as any).__islandPickPoint('terrain', 1));
  expect(terrainPoint, 'an exposed triangle on Tide must be clickable').not.toBeNull();
  await page.mouse.click(terrainPoint.x, terrainPoint.y);
  await expect(page.locator('[data-arch-island="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
  await page.waitForFunction(() => JSON.stringify((window as any).__islandMeasurement()?.visibleTerrain) === '[1]');
  expectFramed(await measure(page), world, 1);
  const organismPoint = await page.evaluate(() => (window as any).__islandPickPoint('organism', 1));
  expect(organismPoint, 'a body in the focused habitat must be exposed above the terrain').not.toBeNull();
  await page.mouse.click(organismPoint.x, organismPoint.y);
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(organismPoint.id));
  expectFramed(await measure(page), world, 1);

  for (const island of [0, 1, 2]) {
    await page.locator('[data-arch-island="' + island + '"]').click();
    await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
    frame = await cameraAction(page, 'Reset view');
    expectFramed(frame, world, island);
    await page.locator('.ea-scene-wrap').screenshot({ path: report + '/habitat-' + ['ember', 'tide', 'mist'][island] + '.png' });
    for (let turn = 0; turn < 4; turn++) expectFramed(await cameraAction(page, 'Turn view left'), world, island);
    expectFramed(await cameraAction(page, 'Reset view'), world, island);
  }
  await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'overview');
  expectFramed(await cameraAction(page, 'Reset view'), world);
  expect(await biologicalSnapshot(page)).toBe(original);
  expect(await page.evaluate(() => (window as any).StemLab.evoArchipelagoModel.islands.map((island: any) => [island.x, island.z]))).toEqual([[-12, 2], [0, 6], [13, -3]]);
  await expectNoOverflow(page);
  expect(errors).toEqual([]);
});

test('phone and resized camera views fit actual bodies; native zoom controls visibly magnify and reset', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const world = await mountExpedition(page);
  const original = await biologicalSnapshot(page);
  expectFramed(await measure(page), world);
  await expectNoOverflow(page);

  for (const island of [0, 1, 2]) {
    await page.locator('[data-arch-island="' + island + '"]').focus();
    await page.keyboard.press('Enter');
    expectFramed(await cameraAction(page, 'Reset view', true), world, island);
    expectFramed(await cameraAction(page, 'Turn view right', true), world, island);
  }
  const reset = await cameraAction(page, 'Reset view', true);
  const resetZoom = Number(await page.locator('[data-archipelago-zoom]').getAttribute('data-archipelago-zoom'));
  expect(Number.isFinite(resetZoom)).toBe(true);
  const zoomed = await cameraAction(page, 'Zoom in', true);
  expect(projectedSize(zoomed)).toBeGreaterThan(projectedSize(reset) * 1.05);
  expect(zoomed.camera.position).not.toEqual(reset.camera.position);
  const zoomedOut = await cameraAction(page, 'Zoom out', true);
  expect(projectedSize(zoomedOut)).toBeLessThan(projectedSize(zoomed) * .96);
  const restored = await cameraAction(page, 'Reset view', true);
  expectFramed(restored, world, 2);
  expect(projectedSize(restored)).toBeCloseTo(projectedSize(reset), 5);
  expect(restored.camera.position).toEqual(reset.camera.position);
  expect(Number(await page.locator('[data-archipelago-zoom]').getAttribute('data-archipelago-zoom'))).toBe(resetZoom);
  await page.locator('.ea-scene-wrap').screenshot({ path: report + '/island-framing-phone.png' });
  expectFramed(await populationAction(page, 'plants', true), world, 2, 'plants');
  expectFramed(await sceneryAction(page, false, true), world, 2, 'plants', false);
  expectFramed(await populationAction(page, 'birds', true), world, 2, 'birds', false);
  expectFramed(await sceneryAction(page, true, true), world, 2, 'birds');
  expectFramed(await populationAction(page, 'all', true), world, 2);
  await expectVisibleCounts(page, world, 2);
  await page.locator('.ea-scene-wrap').screenshot({ path: report + '/habitat-phone.png' });

  await page.getByRole('button', { name: 'View whole archipelago', exact: true }).focus();
  await page.keyboard.press('Enter');
  expectFramed(await cameraAction(page, 'Reset view', true), world);
  for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 900 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => {
      const frame = (window as any).__islandMeasurement();
      const host = document.querySelector('[data-archipelago-scene]')?.getBoundingClientRect();
      return frame && host && Math.abs(frame.canvas.width - host.width) < 1 &&
        Math.abs(frame.camera.aspect - host.width / host.height) < .001;
    });
    expectFramed(await cameraAction(page, 'Reset view'), world);
    expectFramed(await cameraAction(page, 'Turn view left'), world);
    await page.getByRole('button', { name: 'Focus selected island', exact: true }).click();
    expectFramed(await cameraAction(page, 'Reset view'), world, 2);
    await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
    await expectNoOverflow(page);
  }
  // A new target should fit automatically, even after a learner magnifies a habitat.
  await page.getByRole('button', { name: 'Focus selected island', exact: true }).click();
  await cameraAction(page, 'Zoom in', true);
  await page.locator('[data-arch-island="0"]').click();
  await expect(page.locator('[data-archipelago-zoom]')).toHaveAttribute('data-archipelago-zoom', '1');
  expectFramed(await measure(page), world, 0);
  await cameraAction(page, 'Zoom in', true);
  await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
  await expect(page.locator('[data-archipelago-zoom]')).toHaveAttribute('data-archipelago-zoom', '1');
  expectFramed(await measure(page), world);
  expect(await biologicalSnapshot(page)).toBe(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(1);
});

test('without WebGL phone residents remain keyboard accessible and the camera toolbar is accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
      return type.includes('webgl') ? null : (get as any).call(this, type, ...args);
    } as any;
  });
  const world = await mountExpedition(page, true);
  const original = await biologicalSnapshot(page);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toEqual([]);
  for (const label of ['Turn view left', 'Turn view right', 'Zoom in', 'Zoom out', 'Reset view', 'Both species', 'Seedwing birds only', 'Shellseed plants only', 'Habitat scenery']) {
    const button = page.getByRole('button', { name: label, exact: true });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
    expect(await button.evaluate(element => element.tagName)).toBe('BUTTON');
  }
  await page.locator('[data-arch-island="2"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#ea-resident').focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(world.history[0].demes[2].birds[0].id));
  expect(await biologicalSnapshot(page)).toBe(original);
  await expectAccessible(page);
  await expectNoOverflow(page);
});

test('habitat layers reveal exact residents and schematic inherited cues without changing the expedition', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const world = await mountExpedition(page);
  const original = await biologicalSnapshot(page);
  const initial = await measure(page), layout = sceneryLayout(initial);
  expectFramed(initial, world);
  expectSceneryBounded(initial);
  expectBodyCues(initial, world);
  await expectVisibleCounts(page, world);
  const caption = page.locator('.ea-stage-caption');
  await expect(caption).toContainText('schematic cues');
  await expect(caption).toContainText('exact values in the inspector');
  await expect(caption).toContainText('rocks and vegetation are scenery');
  const layers = page.getByRole('group', { name: 'Visible populations', exact: true });
  await expect(layers.getByRole('button')).toHaveCount(3);
  for (const label of ['Both species', 'Seedwing birds only', 'Shellseed plants only', 'Habitat scenery']) {
    const button = page.getByRole('button', { name: label, exact: true });
    await expect(button).toBeEnabled();
    expect(await button.evaluate(element => element.tagName)).toBe('BUTTON');
  }

  for (const island of [0, 1, 2]) {
    await page.locator('[data-arch-island="' + island + '"]').click();
    expectFramed(await cameraAction(page, 'Reset view'), world, island);
    const controls = await scienceControls(page);
    for (const layer of ['birds', 'plants', 'all'] as const) {
      const frame = await populationAction(page, layer);
      expectFramed(frame, world, island, layer);
      await expectVisibleCounts(page, world, island, layer);
      expect(sceneryLayout(frame)).toEqual(layout);
      expect(await scienceControls(page)).toBe(controls);
      expect(await biologicalSnapshot(page)).toBe(original);
    }
    const bare = await sceneryAction(page, false);
    expectFramed(bare, world, island, 'all', false);
    expect(sceneryLayout(bare)).toEqual(layout);
    expect(await scienceControls(page)).toBe(controls);
    expect(await biologicalSnapshot(page)).toBe(original);
    const dressed = await sceneryAction(page, true);
    expectFramed(dressed, world, island);
    expectSceneryBounded(dressed);
    expect(sceneryLayout(dressed)).toEqual(layout);
    expect(await scienceControls(page)).toBe(controls);
    expect(await biologicalSnapshot(page)).toBe(original);
  }

  await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
  expectFramed(await cameraAction(page, 'Reset view'), world);
  await page.locator('[data-archipelago-scene] canvas').scrollIntoViewIfNeeded();
  const sceneryPoint = await page.evaluate(() => (window as any).__islandPickPoint('scenery', 1));
  expect(sceneryPoint, 'an exposed visible scenic mesh on Tide must select its island').not.toBeNull();
  await page.mouse.click(sceneryPoint.x, sceneryPoint.y);
  await expect(page.locator('[data-arch-island="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
  expectFramed(await cameraAction(page, 'Reset view'), world, 1);

  // View controls leave the scientific species and inspector selected. A new
  // resident choice must make that actual resident visible in either direction.
  const bird = world.history[0].demes[1].birds[0];
  expectFramed(await populationAction(page, 'plants'), world, 1, 'plants');
  await page.locator('#ea-resident').selectOption(String(bird.id));
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(bird.id));
  await expect(page.locator('[data-archipelago-populations]')).toHaveAttribute('data-archipelago-populations', 'birds');
  expectFramed(await measure(page), world, 1, 'birds');
  const selectedControls = await scienceControls(page);
  expectFramed(await populationAction(page, 'plants'), world, 1, 'plants');
  expect(await scienceControls(page)).toBe(selectedControls);
  await page.getByRole('group', { name: 'Choose a species', exact: true }).getByRole('button', { name: 'Shellseed plants', exact: true }).click();
  expectFramed(await populationAction(page, 'birds'), world, 1, 'birds');
  const plant = world.history[0].demes[1].plants[0];
  await page.locator('#ea-resident').selectOption(String(plant.id));
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(plant.id));
  await expect(page.locator('[data-archipelago-populations]')).toHaveAttribute('data-archipelago-populations', 'plants');
  expectFramed(await measure(page), world, 1, 'plants');
  expect(await biologicalSnapshot(page)).toBe(original);
  expectFramed(await populationAction(page, 'all'), world, 1);

  // Calculate the authorized scientific advance before touching the button.
  // Any scenic/filter RNG consumption would make the complete next world differ.
  const next = await page.evaluate(() => (window as any).StemLab.evoArchipelagoModel.step((window as any).__toolData.evoLab.archipelago));
  expect(await biologicalSnapshot(page)).toBe(original);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  await expect(page.locator('[data-arch-generation]')).toHaveAttribute('data-arch-generation', '1');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(next);
  expectFramed(await cameraAction(page, 'Reset view'), next, 1);
  const advanced = await biologicalSnapshot(page), newFrame = await measure(page);
  expectBodyCues(newFrame, next);
  expect(sceneryLayout(newFrame)).toEqual(layout);
  await expectVisibleCounts(page, next, 1);
  expect(newFrame.bodies.map(body => body.id)).not.toEqual(initial.bodies.map(body => body.id));
  for (const species of ['birds', 'plants']) {
    const cue = species === 'birds' ? 'Seedwing beak' : 'Shellseed seam';
    expect(newFrame.bodies.filter(body => body.species === species).map(body => body.parts.find(part => part.name === cue)!.size[0]))
      .not.toEqual(initial.bodies.filter(body => body.species === species).map(body => body.parts.find(part => part.name === cue)!.size[0]));
  }
  for (const layer of ['birds', 'plants', 'all'] as const) {
    expectFramed(await populationAction(page, layer), next, 1, layer);
    await expectVisibleCounts(page, next, 1, layer);
    expect(await biologicalSnapshot(page)).toBe(advanced);
  }
  expectFramed(await sceneryAction(page, false), next, 1, 'all', false);
  expectFramed(await sceneryAction(page, true), next, 1);
  expect(await biologicalSnapshot(page)).toBe(advanced);

  // An ancestor is absent from G1. Visiting its birth frame must reveal its
  // species even though the selected ID stays the same during the frame change.
  await page.getByRole('group', { name: 'Choose a species', exact: true }).getByRole('button', { name: 'Seedwing birds', exact: true }).click();
  const newborn = next.history[1].demes[1].birds[0], parentId = newborn.parents[0];
  await page.locator('#ea-resident').selectOption(String(newborn.id));
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(newborn.id));
  expectFramed(await populationAction(page, 'plants'), next, 1, 'plants');
  await page.locator('.ea-inspector').getByRole('button', { name: new RegExp('^#' + parentId + ' · ') }).click();
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(parentId));
  await expect(page.locator('[data-archipelago-populations]')).toHaveAttribute('data-archipelago-populations', 'plants');
  const parent = await page.evaluate(id => (window as any).StemLab.evoArchipelagoModel.find((window as any).__toolData.evoLab.archipelago, id), parentId);
  await page.getByRole('button', { name: 'Visit this individual’s birth generation', exact: true }).click();
  await expect(page.locator('[data-arch-generation]')).toHaveAttribute('data-arch-generation', '0');
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(parentId));
  await expect(page.locator('[data-archipelago-populations]')).toHaveAttribute('data-archipelago-populations', 'birds');
  expectFramed(await cameraAction(page, 'Reset view'), next, parent.island, 'birds', true, 0);
  expect(await biologicalSnapshot(page)).toBe(advanced);
  await page.getByRole('button', { name: 'Return to present', exact: true }).click();
  await expect(page.locator('[data-arch-generation]')).toHaveAttribute('data-arch-generation', '1');
  expectFramed(await cameraAction(page, 'Reset view'), next, parent.island, 'birds');
  expect(await biologicalSnapshot(page)).toBe(advanced);
  await expectAccessible(page);
  await expectNoOverflow(page);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(1);
  expect(errors).toEqual([]);
});
