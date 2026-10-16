import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = {};
Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(scope);

function crestTriangles(bird) {
  const geometry = bird.head.getObjectByName('woodland-head-plumage').geometry;
  const { position, featherInfo } = geometry.attributes, triangles = [];
  for (let index = 0; index < geometry.index.count; index += 3) {
    const ids = [0, 1, 2].map(offset => geometry.index.array[index + offset]);
    const feather = featherInfo.getY(ids[0]);
    if (feather > -1600) continue;
    const vertices = ids.map(id => new THREE.Vector3().fromBufferAttribute(position, id));
    const normal = new THREE.Vector3().crossVectors(
      vertices[1].clone().sub(vertices[0]), vertices[2].clone().sub(vertices[0])
    ).normalize();
    triangles.push({
      feather, vertices, normal,
      min: [0, 1, 2].map(axis => Math.min(...vertices.map(vertex => vertex.getComponent(axis)))),
      max: [0, 1, 2].map(axis => Math.max(...vertices.map(vertex => vertex.getComponent(axis))))
    });
  }
  return triangles;
}

function crossesPlaneInsideTriangle(a, b) {
  const distances = a.vertices.map(vertex => b.normal.dot(vertex.clone().sub(b.vertices[0])));
  if (Math.min(...distances) > -1e-8 || Math.max(...distances) < 1e-8) return false;
  const triangle = new THREE.Triangle(...b.vertices);
  for (let edge = 0; edge < 3; edge++) {
    const next = (edge + 1) % 3;
    if (distances[edge] * distances[next] >= -1e-16) continue;
    const contact = a.vertices[edge].clone().lerp(a.vertices[next],
      distances[edge] / (distances[edge] - distances[next]));
    if (triangle.containsPoint(contact)) return true;
  }
  return false;
}

function crossingFeathers(triangles) {
  const crossings = new Set();
  for (let i = 0; i < triangles.length; i++) for (let j = i + 1; j < triangles.length; j++) {
    const a = triangles[i], b = triangles[j];
    if (a.feather === b.feather || a.min.some((minimum, axis) => minimum > b.max[axis] || a.max[axis] < b.min[axis])) continue;
    if (crossesPlaneInsideTriangle(a, b) || crossesPlaneInsideTriangle(b, a))
      crossings.add([a.feather, b.feather].sort((x, y) => x - y).join(':'));
  }
  return [...crossings];
}

describe('cardinal crest feather separation', () => {
  it.each(['low', 'high'])('keeps overlapping vanes from crossing during rest and flight recovery (%s)', quality => {
    const bird = scope.AvianWoodlandBirds.create(THREE, 'northernCardinal', { quality });
    try {
      for (const [name, pose] of [
        ['rest', {}],
        ['flight', { flight: 1, phase: 1.6, effort: .8 }],
        ['landing', { flight: .6, landing: .8, phase: 1.6, effort: .4 }],
        ['settle', { landingSettle: .8, flight: 0 }]
      ]) {
        bird.update(pose);
        expect(crossingFeathers(crestTriangles(bird)), `${quality} ${name} crossing feather pairs`).toEqual([]);
      }
    } finally { bird.dispose(); }
  });
});
