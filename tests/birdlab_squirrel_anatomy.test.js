import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_mammals.js', 'utf8');
function create(quality = 'low') {
  const scope = {}, scene = new THREE.Scene();
  new Function('window', source)(scope);
  const mammals = scope.BirdLab3DMammals.create(THREE, scene, { quality, seed: 42 });
  mammals.setMode('free'); return { mammals, scene };
}
function topology(geometry) {
  const positions = geometry.attributes.position, ids = [], vertices = [], byPosition = new Map(), links = [], edges = new Map();
  for (let i = 0; i < positions.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(positions, i), key = vertex.toArray().map(v => Math.round(v * 1e7)).join(',');
    if (!byPosition.has(key)) { byPosition.set(key, vertices.length); vertices.push(vertex); links.push(new Set()); }
    ids.push(byPosition.get(key));
  }
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const face = [ids[index[i]], ids[index[i + 1]], ids[index[i + 2]]];
    if (new Set(face).size < 3) continue;
    for (let e = 0; e < 3; e++) {
      const a = face[e], b = face[(e + 1) % 3]; links[a].add(b); links[b].add(a);
      const key = [Math.min(a, b), Math.max(a, b)].join(','); edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  const seen = new Set(), components = [];
  for (let i = 0; i < vertices.length; i++) if (!seen.has(i)) {
    const stack = [i], component = []; seen.add(i);
    while (stack.length) {
      const vertex = stack.pop(); component.push(vertices[vertex]);
      for (const neighbor of links[vertex]) if (!seen.has(neighbor)) { seen.add(neighbor); stack.push(neighbor); }
    }
    components.push(component);
  }
  components.sort((a, b) => b.length - a.length); return { components, edges };
}

describe('Eastern gray squirrel continuous anatomy', () => {
  it('joins the rump, shoulders and neck in one watertight surface at both quality levels', () => {
    for (const quality of ['low', 'high']) {
      const { mammals } = create(quality);
      try {
        const mesh = mammals.root.getObjectByName('squirrel-body-fur'), result = topology(mesh.geometry);
        expect(result.components).toHaveLength(1);
        for (const incidence of result.edges.values()) expect(incidence).toBe(2);
        const vertices = result.components[0];
        const rear = vertices.filter(v => v.z > -.015 && v.z < .025), waist = vertices.filter(v => v.z > .06 && v.z < .09);
        expect(Math.max(...rear.map(v => Math.abs(v.x)))).toBeGreaterThan(.05);
        expect(Math.max(...waist.map(v => Math.abs(v.x)))).toBeLessThan(.041);
        expect(mesh.geometry.attributes.position.count).toBeLessThan(800);
      } finally { mammals.dispose(); }
    }
  });

  it('tapers the skull into a narrow muzzle, seats two eyes, and keeps shorter ears attached to the skull', () => {
    const { mammals } = create('high');
    try {
      const head = mammals.root.getObjectByName('squirrel-head-fur'), skull = topology(head.geometry).components[0];
      const cheekWidth = Math.max(...skull.filter(v => v.z < .025).map(v => Math.abs(v.x)));
      const muzzleWidth = Math.max(...skull.filter(v => v.z > .043).map(v => Math.abs(v.x)));
      expect(muzzleWidth).toBeLessThan(cheekWidth * .5);
      // The lower muzzle still meets the unchanged food-to-mouth contact.
      const mouth = new THREE.Vector3(0, -.023, .052);
      expect(Math.min(...skull.map(v => v.distanceTo(mouth)))).toBeLessThan(.004);
      const eyeMesh = mammals.root.getObjectByName('squirrel-two-eyes-and-nose'), parts = topology(eyeMesh.geometry).components;
      expect(parts).toHaveLength(3);
      const boxes = parts.map(part => new THREE.Box3().setFromPoints(part)), eyes = boxes.filter(box => box.max.z < .03);
      expect(eyes).toHaveLength(2);
      expect(eyes.every(box => box.getSize(new THREE.Vector3()).y < .009)).toBe(true);
      const ears = mammals.root.getObjectByName('squirrel-rounded-ears').geometry.attributes.position;
      let earMax = -Infinity, earMin = Infinity;
      for (let i = 0; i < ears.count; i++) { earMax = Math.max(earMax, ears.getY(i)); earMin = Math.min(earMin, ears.getY(i)); }
      expect(earMax).toBeLessThan(.040); expect(earMin).toBeLessThan(.014);
      const body = mammals.root.getObjectByName('squirrel-body-fur');
      body.updateMatrixWorld(true);
      // An inward ray crosses the body before the shoulder/hip pivot: both
      // proximal joints begin inside the muscular contour, not beside it.
      for (const anchor of [[.029, -.008, .112], [.037, -.006, -.002]]) {
        const local = new THREE.Vector3(...anchor), start = body.localToWorld(new THREE.Vector3(.20, local.y, local.z));
        const inward = new THREE.Vector3(-1, 0, 0).transformDirection(body.matrixWorld);
        const hit = new THREE.Raycaster(start, inward).intersectObject(body)[0]; expect(hit).toBeTruthy();
        expect(body.worldToLocal(hit.point.clone()).x).toBeGreaterThan(local.x);
      }
    } finally { mammals.dispose(); }
  });

  it('uses tapered muscle sleeves with intact, finite normals without adding draw calls', () => {
    const { mammals } = create();
    try {
      const upper = mammals.root.getObjectByName('squirrel-upper-front-left'), parts = topology(upper.geometry).components;
      expect(parts).toHaveLength(1);
      const vertices = parts[0];
      const proximal = Math.max(...vertices.filter(v => v.y < -.4 && v.y > -.9).map(v => Math.hypot(v.x, v.z)));
      const distal = Math.max(...vertices.filter(v => v.y > .5).map(v => Math.hypot(v.x, v.z)));
      expect(proximal).toBeGreaterThan(distal * 1.4);
      const normals = upper.geometry.attributes.normal;
      for (let i = 0; i < normals.count; i++) expect(new THREE.Vector3().fromBufferAttribute(normals, i).length()).toBeCloseTo(1, 5);
      expect(upper.scale.x).toBeGreaterThan(.012);
      const meshes = []; mammals.root.traverse(object => { if (object.isMesh) meshes.push(object); });
      expect(meshes).toHaveLength(18);
      expect(new Set(meshes.map(mesh => mesh.material)).size).toBe(2);
    } finally { mammals.dispose(); }
  });
});
