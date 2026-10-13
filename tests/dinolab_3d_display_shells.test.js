import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_DISPLAY_SHELL_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const start = source.indexOf('// DINO_DISPLAY_SHELL_START');
const end = source.indexOf('// DINO_DISPLAY_SHELL_END', start);
if (start < 0 || end < start) throw new Error('Dino display shell marker missing');
const { dinoDisplayShellGeometry, dinoFrillGeometry, dinoPlateGeometry } = new Function(source.slice(start, end) + '\nreturn {dinoDisplayShellGeometry,dinoFrillGeometry,dinoPlateGeometry};')();

// Check topology through actual triangles, not only the helper's metadata.
function inspectShell(geometry, scale) {
  const p = geometry.attributes.position, normal = geometry.attributes.normal, uv = geometry.attributes.uv;
  expect(geometry.index).toBeTruthy();
  expect(p.count).toBeLessThanOrEqual(geometry.userData.dinoDisplayShell.feature === 'frill' ? 2200 : 1200);
  expect(normal.count).toBe(p.count); expect(uv.count).toBe(p.count);
  const vertices = [], keys = new Map(), edges = new Map(), used = new Set();
  const tolerance = scale * 1e-7;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i), n = new THREE.Vector3().fromBufferAttribute(normal, i);
    expect(Number.isFinite(v.x + v.y + v.z + n.x + n.y + n.z)).toBe(true);
    expect(n.length()).toBeCloseTo(1, 5);
    expect(uv.getX(i)).toBeGreaterThanOrEqual(-1e-6); expect(uv.getX(i)).toBeLessThanOrEqual(1 + 1e-6);
    expect(uv.getY(i)).toBeGreaterThanOrEqual(-1e-6); expect(uv.getY(i)).toBeLessThanOrEqual(1 + 1e-6);
    expect(geometry.boundingBox.containsPoint(v)).toBe(true);
    expect(v.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + tolerance);
    const key = v.toArray().map(x => Math.round(x / tolerance)).join(',');
    if (!keys.has(key)) keys.set(key, keys.size);
    vertices.push({ point: v, weld: keys.get(key) });
  }
  let volume = 0;
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const [a, b, c] = [vertices[index[i]], vertices[index[i + 1]], vertices[index[i + 2]]];
    const cross = new THREE.Vector3().subVectors(b.point, a.point).cross(new THREE.Vector3().subVectors(c.point, a.point));
    expect(cross.lengthSq()).toBeGreaterThan(Math.pow(scale, 4) * 1e-18);
    volume += a.point.dot(new THREE.Vector3().crossVectors(b.point, c.point)) / 6;
    for (const [from, to] of [[a.weld, b.weld], [b.weld, c.weld], [c.weld, a.weld]]) {
      expect(from).not.toBe(to); used.add(from); used.add(to);
      const low = Math.min(from, to), high = Math.max(from, to), key = low + ':' + high;
      const edge = edges.get(key) || { count: 0, orientation: 0 };
      edge.count++; edge.orientation += from === low ? 1 : -1; edges.set(key, edge);
    }
  }
  for (const edge of edges.values()) { expect(edge.count).toBe(2); expect(edge.orientation).toBe(0); }
  expect(used.size - edges.size + index.length / 3).toBe(2);
  expect(volume).toBeGreaterThan(Math.pow(scale, 3) * 1e-6);
  return { volume, vertices, edges };
}

describe('Dino Lab rounded display shell topology', () => {
  for (const scale of [0.03, 1, 12]) {
    it('closes a clockwise outline with outward faces at scale ' + scale, () => {
      const thickness = 0.06 * scale;
      const shell = dinoDisplayShellGeometry(THREE, (r, angle) => new THREE.Vector3(Math.cos(angle) * r * scale, -Math.sin(angle) * r * scale, 0), new THREE.Vector3(0, 0, 1), thickness);
      const result = inspectShell(shell, scale);
      expect(result.volume).toBeLessThan(Math.PI * scale * scale * thickness * 1.2);
      const p = shell.attributes.position, n = shell.attributes.normal;
      const top = [], bottom = [], rim = [];
      for (let i = 0; i < p.count; i++) {
        if (Math.hypot(p.getX(i), p.getY(i)) < scale * 1e-7) (p.getZ(i) > 0 ? top : bottom).push(i);
        if (Math.hypot(p.getX(i), p.getY(i)) > scale * 0.999) rim.push(i);
      }
      expect(top).toHaveLength(1); expect(bottom).toHaveLength(1); expect(rim).toHaveLength(64);
      expect(n.getZ(top[0])).toBeGreaterThan(0.99); expect(n.getZ(bottom[0])).toBeLessThan(-0.99);
      for (const i of rim) { expect(Math.abs(p.getZ(i))).toBeLessThan(scale * 1e-7); expect(Math.abs(n.getZ(i))).toBeLessThan(1e-4); }
      expect(shell.userData.dinoDisplayShell.thicknessIsInterpretive).toBe(true);
      shell.dispose();
    });
  }
});

describe('Dino Lab curved skull frill volume', () => {
  for (const scale of [0.03, 1, 12]) {
    for (const bow of [0, 0.13]) {
      it('keeps a closed symmetric frill with a noncollapsed lower rim at scale ' + scale + ', bow ' + bow, () => {
        const height = scale, width = scale * 0.82, shell = dinoFrillGeometry(THREE, height, width, bow * scale);
        const result = inspectShell(shell, scale);
        expect(result.volume).toBeLessThan(height * width * shell.userData.dinoDisplayShell.thickness * 5);
        const points = new Set(result.vertices.map(v => v.point.toArray().map(x => Math.round(x / (scale * 1e-6))).join(',')));
        for (const { point: v } of result.vertices) expect(points.has([v.x, v.y, -v.z].map(x => Math.round(x / (scale * 1e-6))).join(','))).toBe(true);
        // The common outer rim still follows the established polar outline.
        const sides = 128, p = shell.attributes.position, outerStart = 1 + 8 * sides;
        for (let side = 0; side < sides; side++) {
          const angle = side / sides * Math.PI * 2, edge = 1 + 0.025 * Math.cos(angle * 14);
          const y = Math.max(-height * 0.48, Math.sin(angle) * height * edge), i = outerStart + side;
          expect(p.getY(i)).toBeCloseTo(y, 5); expect(p.getZ(i)).toBeCloseTo(Math.cos(angle) * width * edge, 5);
          expect(p.getX(i)).toBeCloseTo(y * 0.60 + bow * scale, 5);
        }
        expect(shell.userData.dinoDisplayShell.feature).toBe('frill');
        expect(shell.userData.dinoDisplayShell.thickness).toBeLessThan(Math.min(height, width) * 0.05);
        shell.dispose();
      });
    }
  }
});

function establishedPlate(width, height) {
  const shape = new THREE.Shape(); shape.moveTo(-width * 0.28, 0);
  shape.quadraticCurveTo(-width * 0.60, height * 0.28, -width * 0.28, height * 0.68);
  shape.quadraticCurveTo(-width * 0.10, height * 0.91, width * 0.06, height);
  shape.quadraticCurveTo(width * 0.40, height * 0.65, width * 0.48, height * 0.34);
  shape.lineTo(width * 0.28, 0); shape.closePath(); return shape;
}

describe('Dino Lab curved dorsal plate volume', () => {
  for (const scale of [0.03, 1, 12]) {
    it('retains the asymmetric plate outline and closes its rounded edge at scale ' + scale, () => {
      const width = scale * 0.7, height = scale * 1.2, thickness = scale * 0.07;
      const shell = dinoPlateGeometry(THREE, width, height, thickness), result = inspectShell(shell, scale);
      expect(result.volume).toBeLessThan(width * height * thickness * 1.5);
      const p = shell.attributes.position, outline = establishedPlate(width, height).getSpacedPoints(64).slice(0, 64), outerStart = 1 + 8 * 64;
      for (let side = 0; side < 64; side++) {
        const i = outerStart + side;
        expect(p.getX(i)).toBeCloseTo(outline[side].x, 5); expect(p.getY(i)).toBeCloseTo(outline[side].y, 5);
        expect(p.getZ(i)).toBeCloseTo(0, 6);
      }
      expect(p.getX(outerStart)).toBeCloseTo(-width * 0.28, 5); expect(p.getY(outerStart)).toBeCloseTo(0, 5);
      expect(shell.boundingBox.max.y).toBeGreaterThan(height * 0.975);
      expect(shell.boundingBox.max.y).toBeLessThanOrEqual(height * 1.001);
      expect(shell.userData.dinoDisplayShell.feature).toBe('dorsal-plate');
      expect(shell.userData.dinoDisplayShell.thicknessIsInterpretive).toBe(true);
      shell.dispose();
    });
  }
});
