import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync('stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;

function channelRange(texture, channel) {
  const d = texture.image.data;
  let min = 255, max = 0;
  for (let i = channel; i < d.length; i += 4) { min = Math.min(min, d[i]); max = Math.max(max, d[i]); }
  return max - min;
}

describe('Reef fish close-up surfaces', () => {
  it('preserves colour and geometry without derivative-dependent maps on WebGL1 fallback', () => {
    for (const id of ['clownfish', 'reef_manta', 'green_turtle', 'day_octopus', 'brain_coral']) {
      const h = S.create(THREE, id, { quality: 'low', seed: 7, derivatives: false });
      const reference = S.create(THREE, id, { quality: 'low', seed: 7 });
      try {
        expect(h.radius, id + ' same silhouette').toBe(reference.radius);
        h.root.traverse((mesh) => {
          if (!mesh.isMesh) return;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of materials) {
            expect(mat.bumpMap, id + ' no unsupported bump shader').toBeNull();
            expect(mat.normalMap, id + ' no unsupported normal shader').toBeNull();
            expect(mat.extensions?.derivatives, id + ' no derivative extension request').not.toBe(true);
          }
          const original = reference.root.getObjectByName(mesh.name);
          if (original?.isMesh && original.material.map) {
            expect(mesh.material.map.image.data, id + ' pigmentation retained').toEqual(original.material.map.image.data);
          }
        });
      } finally { h.dispose(); reference.dispose(); }
    }
    const school = S.createSchool(THREE, 'anthias', 8, { derivatives: false });
    try {
      school.root.traverse((mesh) => {
        if (!mesh.isMesh) return;
        expect(mesh.material.bumpMap).toBeNull();
        expect(mesh.material.extensions?.derivatives).not.toBe(true);
      });
    } finally { school.dispose(); }
  });

  it('keeps pigmentation in sRGB and relief in linear space, shared with roughness', () => {
    for (const id of ['clownfish', 'blue_tang', 'parrotfish', 'whitetip_reef_shark']) {
      const h = S.create(THREE, id, { quality: 'high', seed: 7 });
      try {
        const mat = h.root.getObjectByName(id + '-body').material;
        expect(mat.map.encoding, id).toBe(THREE.sRGBEncoding);
        expect(mat.bumpMap.encoding, id).toBe(THREE.LinearEncoding);
        expect(mat.roughnessMap, id).toBe(mat.bumpMap);
        expect(channelRange(mat.bumpMap, 0), id).toBeGreaterThan(5);
        expect(channelRange(mat.bumpMap, 1), id).toBeGreaterThan(2);
        expect(mat.bumpScale / S.info(id).lengthM, id).toBeLessThan(0.003);
        expect(mat.transparent, id).toBe(false);
      } finally { h.dispose(); }
    }
  });

  it('omits derivative calls when fallback is explicitly requested on a capable renderer', () => {
    const h = S.create(THREE, 'clownfish', { derivatives: false });
    try {
      for (const part of ['fins', 'tail']) {
        const mat = h.root.getObjectByName('clownfish-' + part).material;
        const shader = {
          uniforms: {},
          vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',
          fragmentShader: '#define GL_OES_standard_derivatives 1\n#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>'
        };
        mat.onBeforeCompile(shader, { capabilities: { isWebGL2: true } });
        expect(shader.fragmentShader).not.toMatch(/\b(?:fwidth|dFdx|dFdy)\s*\(/);
      }
    } finally { h.dispose(); }
  });

  it('gives the smooth-skinned shark much less surface relief than a large-scaled parrotfish', () => {
    const shark = S.create(THREE, 'whitetip_reef_shark', { quality: 'high' });
    const parrot = S.create(THREE, 'parrotfish', { quality: 'high' });
    try {
      const a = shark.root.getObjectByName('whitetip_reef_shark-body').material;
      const b = parrot.root.getObjectByName('parrotfish-body').material;
      expect(channelRange(a.bumpMap, 0)).toBeLessThan(channelRange(b.bumpMap, 0) * 0.65);
      expect(a.bumpScale / S.info('whitetip_reef_shark').lengthM).toBeLessThan(b.bumpScale / S.info('parrotfish').lengthM);
    } finally { shark.dispose(); parrot.dispose(); }
  });

  it('curves the fin membranes while keeping their depth smaller than the fish body', () => {
    for (const id of ['clownfish', 'blue_tang', 'parrotfish']) {
      const h = S.create(THREE, id, { quality: 'high' });
      try {
        const body = h.root.getObjectByName(id + '-body').geometry.boundingBox;
        const tail = h.root.getObjectByName(id + '-tail').geometry.boundingBox;
        const fin = h.root.getObjectByName(id + '-pectoral').geometry.boundingBox;
        expect(tail.max.z - tail.min.z, id + ' caudal camber').toBeGreaterThan(0);
        expect(fin.max.z - fin.min.z, id + ' pectoral camber').toBeGreaterThan(0);
        expect(fin.max.z - fin.min.z, id + ' membrane thinness').toBeLessThan((body.max.z - body.min.z) * 0.2);
      } finally { h.dispose(); }
    }
  });
});
