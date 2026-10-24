import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

// Parts that share a material draw as one batch mesh, so a lofted
// fish draws in 2 calls (was 6), a turtle in 5 (was 10), a school in 5 (was 6). This
// suite pins those counts, the part names the dive, the tool and the other suites
// read, the batch rig contract, the material families (each one shader program) and
// that the CPU-deformed models (rays, octopus, turtle paddles) stay deterministic.
// Self-contained: REEF3D_SPECIES_SOURCE points a mutation check at a scratch copy.
vi.setConfig({ testTimeout: 300000 });

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const TIERS = ['low', 'high'];
const MOTION = { speed: 0.3, turn: 0.25, current: { x: 0.05, z: -0.03, strength: 0.7 } };
const RAYS = ['bluespotted_stingray', 'reef_manta'], TURTLES = ['green_turtle', 'hawksbill_turtle'];
const SCHOOLS = ['anthias', 'blue_green_chromis', 'bluestripe_snapper', 'bumphead_parrotfish'];
// These fish have their own rigs rather than the shared lofted-fish anatomy.
const CUSTOM_FISH = ['spotted_garden_eel', 'banded_pipefish', 'spotted_seahorse', 'ribbon_eel'];
const LOFTED = S.ids.filter((id) => S.info(id).group === 'fish' && !RAYS.includes(id) && !CUSTOM_FISH.includes(id));

function visible(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
// Every object that is one draw call (a visible mesh, line or point cloud).
function drawables(root) {
  const out = [];
  root.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine) && o.geometry && o.geometry.attributes.position && visible(o)) out.push(o); });
  return out;
}
function uniformsOf(material) {
  const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <emissivemap_fragment>' };
  material.onBeforeCompile(shader, { capabilities: { isWebGL2: true } });
  return shader;
}
// The batch meshes' parts: [{ mesh, range }] for a part name, in drawing order.
function ranges(root, name) {
  const out = [];
  root.traverse((m) => { if (m.isMesh && m.geometry.userData.batch) m.geometry.userData.batch.forEach((r) => { if (r.part === name) out.push({ mesh: m, range: r }); }); });
  return out;
}
const rows = (rig, at) => [0, 1, 2].map((k) => [rig[at + k * 4], rig[at + k * 4 + 1], rig[at + k * 4 + 2], rig[at + k * 4 + 3]]);
const matRows = (m) => [0, 1, 2].map((k) => [m.elements[k], m.elements[k + 4], m.elements[k + 8], m.elements[k + 12]]);
const IDENTITY = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
const sameRows = (a, b, eps) => a.every((r, i) => r.every((v, j) => Math.abs(v - b[i][j]) <= eps));

// Calls per model today (both tiers agree), healthy at seed 3; schools of 12.
const CALLS = {
  clownfish: 2, blue_tang: 2, parrotfish: 2, bumphead_parrotfish: 2, moorish_idol: 2, threadfin_butterflyfish: 2, emperor_angelfish: 2, anthias: 2, blue_green_chromis: 2,
  lionfish: 2, peacock_grouper: 2, humphead_wrasse: 2, cleaner_wrasse: 2, clown_triggerfish: 2, porcupinefish: 2, yellow_boxfish: 2, giant_moray: 2, whitetip_reef_shark: 2,
  bluespotted_stingray: 3, bluestripe_snapper: 2, oriental_sweetlips: 2, reef_manta: 3, green_turtle: 5, hawksbill_turtle: 5, magnificent_anemone: 2, giant_clam: 3,
  crown_of_thorns: 1, blue_sea_star: 1, long_spined_urchin: 2, nudibranch: 2, cleaner_shrimp: 2, christmas_tree_worm: 2, day_octopus: 2, sea_cucumber: 1, sea_fan: 2,
  barrel_sponge: 1, soft_coral: 2, brain_coral: 1, staghorn_coral: 1, table_coral: 1, mushroom_coral: 1, boulder_coral: 1, cauliflower_coral: 1, foliose_coral: 1,
  reef_star: 2, reef_ball: 3, coral_tree_nursery: 2,
  firefish: 2, copperband_butterflyfish: 2, spotted_garden_eel: 2, banded_pipefish: 2, yellow_longnose_butterflyfish: 2,
  pajama_cardinalfish: 2, banggai_cardinalfish: 2, giant_triton: 2, blue_velvet_headshield_slug: 2, regal_angelfish: 2,
  mandarin_dragonet: 2, harlequin_shrimp: 2, spotted_seahorse: 2, bennetts_feather_star: 2, peacock_mantis_shrimp: 2, ribbon_eel: 2
};
const EXACT = { reef_manta: 3, bluespotted_stingray: 3, green_turtle: 5, hawksbill_turtle: 5, day_octopus: 2 };

describe('J1 species batches: draw calls', () => {
  it('draws every model in the calls it takes today, on both tiers, and no more in all', () => {
    let total = 0;
    for (const quality of TIERS) {
      for (const id of S.ids) for (const health of S.info(id).healthStates) {
        const h = S.create(THREE, id, { seed: 3, quality, health }), n = drawables(h.root).length;
        try {
          expect(CALLS[id], id + ' is pinned').toBeDefined();
          if (LOFTED.includes(id)) expect(n, id + ' ' + quality + ': body + one batch of fins, tail, pectorals and eyes').toBe(2);
          else if (EXACT[id]) expect(n, id + ' ' + quality).toBe(EXACT[id]);
          else expect(n, id + ' ' + quality + ' ' + health).toBeLessThanOrEqual(CALLS[id]);
          if (health === 'healthy') total += n;
        } finally { h.dispose(); }
      }
      for (const id of SCHOOLS) {
        const h = S.createSchool(THREE, id, 12, { seed: 3, quality }), n = drawables(h.root).length;
        try { expect(n, id + ' school ' + quality + ': body, fins with eyes, tail, two pectorals').toBe(5); total += n; } finally { h.dispose(); }
      }
    }
    // Sixteen added specimens each use two draws per tier; the original limits stay fixed.
    expect(total, 'all models and schools on both tiers').toBeLessThanOrEqual(226 + 16 * 2 * TIERS.length);
  });
});

describe('J1 species batches: the part-name contract', () => {
  // [id, name, kind]: 'mesh' = getObjectByName(id + '-' + name) is a drawn mesh; 'node' = that
  // object exists (a pivot or holder); 'range' = a batch mesh draws a part of that name (n times).
  const PARTS = [];
  for (const id of LOFTED) {
    PARTS.push([id, 'body', 'mesh'], [id, 'fins', 'mesh'], [id, 'detail', 'range']);
    if (id === 'giant_moray') PARTS.push([id, 'jaw-pivot', 'node'], [id, 'jaw', 'range']);
    else PARTS.push([id, 'tail-pivot', 'node'], [id, 'tail', 'range'], [id, 'pectoral', 'range', 2], [id, 'pectoral-pivot', 'node']);
  }
  PARTS.push(['bluespotted_stingray', 'tail-pivot', 'node'], ['bluespotted_stingray', 'tail', 'range'], ['reef_manta', 'tail-pivot', 'node'], ['reef_manta', 'tail', 'range'],
    ['reef_manta', 'cephalic-left-pivot', 'node'], ['reef_manta', 'cephalic-right-pivot', 'node'], ['reef_manta', 'cephalic-left', 'range'], ['reef_manta', 'cephalic-right', 'range']);
  for (const id of RAYS) PARTS.push([id, 'disc-top', 'mesh'], [id, 'disc-bottom', 'mesh'], [id, 'detail', 'mesh']);
  for (const id of TURTLES) {
    for (const n of ['carapace', 'plastron', 'head']) PARTS.push([id, n, 'mesh']);
    for (const n of ['head-pivot', 'tail', 'front-flipper', 'rear-flipper', 'front-flipper-pivot', 'rear-flipper-pivot']) PARTS.push([id, n, 'node']);
    PARTS.push([id, 'neck', 'range'], [id, 'eyes', 'range'], [id, 'tail', 'range'], [id, 'front-flipper', 'range', 2], [id, 'rear-flipper', 'range', 2]);
  }
  PARTS.push(['magnificent_anemone', 'column', 'mesh'], ['magnificent_anemone', 'tentacles', 'mesh'], ['giant_clam', 'shell', 'mesh'], ['giant_clam', 'mantle', 'mesh'], ['giant_clam', 'siphon', 'mesh'],
    ['christmas_tree_worm', 'coral-head', 'mesh'], ['christmas_tree_worm', 'worms', 'mesh'], ['sea_fan', 'fan', 'mesh'], ['sea_fan', 'trunk', 'mesh'], ['barrel_sponge', 'sponge', 'mesh'],
    ['soft_coral', 'stalks', 'mesh'], ['soft_coral', 'polyps', 'mesh'], ['long_spined_urchin', 'test', 'mesh'], ['long_spined_urchin', 'spines', 'mesh'],
    ['crown_of_thorns', 'body', 'mesh'], ['blue_sea_star', 'body', 'mesh'], ['sea_cucumber', 'body', 'mesh'],
    ['day_octopus', 'body', 'mesh'], ['day_octopus', 'arms', 'range'], ['day_octopus', 'suckers', 'mesh'], ['day_octopus', 'eyes', 'range'],
    ['cleaner_shrimp', 'body', 'mesh'], ['cleaner_shrimp', 'antennae-pivot', 'node'], ['cleaner_shrimp', 'legs', 'range'], ['cleaner_shrimp', 'tail-fan', 'range'], ['cleaner_shrimp', 'antennae', 'range'],
    ['nudibranch', 'body', 'mesh'], ['nudibranch', 'rhinophores', 'node'], ['nudibranch', 'gills-pivot', 'node'], ['nudibranch', 'rhinophores', 'range'], ['nudibranch', 'gills', 'range'],
    ['reef_star', 'frame', 'mesh'], ['reef_star', 'ties', 'range'], ['reef_star', 'corals', 'mesh'], ['reef_ball', 'shell', 'mesh'], ['reef_ball', 'rims', 'mesh'], ['reef_ball', 'corals', 'mesh'],
    ['coral_tree_nursery', 'tree', 'node'], ['coral_tree_nursery', 'fragments', 'mesh']);
  for (const id of ['brain_coral', 'staghorn_coral', 'table_coral', 'mushroom_coral', 'boulder_coral', 'cauliflower_coral', 'foliose_coral']) PARTS.push([id, 'colony', 'mesh']);

  for (const [id, names] of Object.entries({
    spotted_garden_eel: ['body','detail'],
    banded_pipefish: ['body','fins'],
    spotted_seahorse: ['body-tail-holdfast','fins'],
    ribbon_eel: ['forebody-support','head-fin-detail'],
    giant_triton: ['shell','animal'],
    blue_velvet_headshield_slug: ['body-headshield','soft-margins'],
    harlequin_shrimp: ['body-legs-tail','front-appendages'],
    bennetts_feather_star: ['disc-cirri-perch','feathered-crown'],
    peacock_mantis_shrimp: ['shell-fixed-appendages','eyes-antennules']
  })) for (const name of names) PARTS.push([id, name, 'mesh']);
  for (const [id, names] of Object.entries({
    banded_pipefish: ['eyes-mouth','tail','dorsal','pectoral'],
    spotted_seahorse: ['dorsal-fin','pectoral-left','pectoral-right'],
    ribbon_eel: ['nostrils-gills-snout','eyes','lower-jaw-three-chin-projections','continuous-fin-margins'],
    giant_triton: ['foot-head','tentacle-far','tentacle-near'],
    blue_velvet_headshield_slug: ['parapodium-left','parapodium-right','posterior-lobe-left','posterior-lobe-right'],
    harlequin_shrimp: ['claw-left','antennule-left','claw-right','antennule-right'],
    peacock_mantis_shrimp: ['eye-left','antennule-left','eye-right','antennule-right']
  })) for (const name of names) PARTS.push([id, name, 'range']);

  it('finds every named part as a mesh, a node or a batch range, on both tiers', () => {
    expect(new Set(PARTS.map((p) => p[0])).size, 'every model is covered').toBe(S.ids.length);
    for (const quality of TIERS) for (const id of S.ids) {
      const h = S.create(THREE, id, { seed: 5, quality });
      try {
        for (const [pid, name, kind, n] of PARTS) {
          if (pid !== id) continue;
          const tag = id + ' ' + quality + ' ' + kind + ' ' + name, o = h.root.getObjectByName(id + '-' + name);
          if (kind === 'mesh') { expect(o && o.isMesh, tag).toBe(true); expect(drawables(h.root).includes(o), tag + ' is drawn').toBe(true); }
          else if (kind === 'node') expect(o, tag).toBeTruthy();
          else expect(ranges(h.root, name).length, tag).toBe(n || 1);
        }
        const pivots = []; h.root.traverse((o) => { if (o.userData.part === 'pectoral-pivot') pivots.push(o); });
        if (LOFTED.includes(id) && id !== 'giant_moray') expect(pivots.length, id + ' two pectoral pivots').toBe(2);
        for (const m of drawables(h.root)) expect(m.userData.speciesId, id + ' ' + m.name).toBe(id);
      } finally { h.dispose(); }
    }
  });

  it('keeps a school as the instanced meshes the dive\'s crowd borrows', () => {
    for (const id of SCHOOLS) {
      const h = S.createSchool(THREE, id, 9, { seed: 4 });
      try {
        expect(h.meshes.map((m) => m.userData.part), id).toEqual(['body', 'fins', 'tail', 'pectoral-left', 'pectoral-right']);
        for (const m of h.meshes) {
          expect(m.isInstancedMesh && !!m.instanceColor && !!m.geometry.attributes.reefSchoolBeat, id + ' ' + m.name).toBe(true);
          expect(h.root.getObjectByName(id + '-' + m.userData.part), id + ' ' + m.userData.part).toBe(m);
        }
        expect(ranges(h.root, 'detail').length, id + ' eyes in the fins batch').toBe(1);
      } finally { h.dispose(); }
    }
  });
});

describe('J1 species batches: the rig contract', () => {
  it('gives a batch material the rig and its geometry reefPart, and every other material neither', () => {
    for (const quality of TIERS) for (const id of S.ids) {
      const h = S.create(THREE, id, { seed: 2, quality });
      try {
        for (const m of drawables(h.root)) {
          const U = uniformsOf(m.material).uniforms, g = m.geometry, part = g.attributes.reefPart, tag = id + ' ' + quality + ' ' + m.name;
          expect(U.reefBatch, tag + ' every species material says whether it is a batch').toBeTruthy();
          if (!U.reefBatch.value) { expect(U.reefRig, tag + ' has no rig').toBeUndefined(); continue; }
          expect(U.reefRig.value.length, tag + ' four slots of five rows').toBe(80);
          expect(part && part.itemSize, tag + ' reefPart').toBe(4);
          const table = g.userData.batch;
          expect(table.reduce((n, r) => n + r.count, 0), tag + ' ranges cover the geometry').toBe(g.attributes.position.count);
          expect(Math.max(...table.map((r) => r.slot)), tag + ' at most four slots').toBeLessThanOrEqual(4);
          for (const r of table) for (let i = r.first; i < r.first + r.count; i++) expect(part.getW(i), tag + ' ' + r.part).toBe(r.slot);
        }
        h.root.traverse((m) => { if (m.isMesh && m.geometry.userData.batch && !m.geometry.attributes.reefPart) expect(uniformsOf(m.material).uniforms.reefBatch.value, id + ' ' + m.name + ' a CPU-written batch needs no rig').toBe(0); });
      } finally { h.dispose(); }
    }
  });

  it('stores each slot part at its rest pose, gives it the right switches, and hands the shader its pivot every update', () => {
    const v = new THREE.Vector3();
    for (const quality of TIERS) for (const id of S.ids) {
      const h = S.create(THREE, id, { seed: 2, quality });
      try {
        const batches = drawables(h.root).filter((m) => m.geometry.attributes.reefPart);
        for (const step of [null, 2.4, 13.7]) {
          if (step !== null) h.update(1 / 60, step, MOTION);
          for (const m of batches) {
            const rig = uniformsOf(m.material).uniforms.reefRig.value, g = m.geometry, part = g.attributes.reefPart, pos = g.attributes.position;
            const siblings = m.parent.children.filter((c) => c !== m);
            for (const r of g.userData.batch) {
              if (!r.slot) continue;
              const at = (r.slot - 1) * 20, now = rows(rig, at), tag = id + ' ' + quality + ' ' + r.part + ' t ' + step;
              // Its pose is a pivot beside the batch (the node its own mesh hung on), or none.
              const pivot = siblings.find((c) => { c.updateMatrix(); return sameRows(matRows(c.matrix), now, 1e-6); });
              expect(!!pivot || sameRows(now, IDENTITY, 0), tag + ' slot pose is its pivot\'s').toBe(true);
              if (step === null) for (let i = r.first; i < r.first + r.count; i += 7) {
                v.set(part.getX(i), part.getY(i), part.getZ(i));
                const w = [0, 1, 2].map((k) => now[k][0] * v.x + now[k][1] * v.y + now[k][2] * v.z + now[k][3]);
                expect(Math.hypot(w[0] - pos.getX(i), w[1] - pos.getY(i), w[2] - pos.getZ(i)), tag + ' rest position = pose x own frame').toBeLessThan(1e-6);
              }
              const bend = rig[at + 16], rough = rig[at + 17], rays = rig[at + 18], eye = rig[at + 19], flexW = rig[at + 15];
              if (LOFTED.includes(id) && (r.part === 'tail' || r.part === 'pectoral')) { expect(bend, tag + ' membrane on a pivot: no bend').toBe(0); expect(flexW, tag + ' membrane flex').toBeCloseTo(0.42, 6); }
              // Pipefish fins use their authored pivot/bending rig, without the lofted membrane flex.
              if (id === 'banded_pipefish' && ['tail', 'dorsal', 'pectoral'].includes(r.part)) {
                expect(bend, tag).toBe(r.part === 'pectoral' ? 1 : 0); expect(flexW, tag).toBe(0);
                expect(rays, tag).toBe(1); expect(eye, tag).toBe(0);
              }
              if (r.part === 'detail' || r.part === 'jaw') { expect([bend, rough, rays, eye].map((x) => +x.toFixed(4)), tag + ' eyes and details: bend, own roughness, no rays, wet eye').toEqual([1, 0.57, 0, 1]); }
              if (id === 'day_octopus' && r.part === 'eyes') expect(rough, tag).toBeCloseTo(0.15, 6);
              if (TURTLES.includes(id) && r.part === 'eyes') expect(rough, tag).toBeCloseTo(0.2, 6);
              if (id === 'reef_star' && r.part === 'ties') expect(rough, tag).toBeCloseTo(0.5, 6);
            }
          }
        }
      } finally { h.dispose(); }
    }
  });

  it('measures a fish\'s placement radius with each part where its own mesh hung', () => {
    const inv = new THREE.Matrix4(), m = new THREE.Matrix4(), v = new THREE.Vector3();
    for (const quality of TIERS) for (const id of LOFTED) {
      const h = S.create(THREE, id, { seed: 6, quality });
      try {
        h.root.updateMatrixWorld(true); inv.copy(h.root.matrixWorld).invert();
        let r = 0.01;
        h.root.traverse((o) => {
          if (!o.isMesh) return;
          const g = o.geometry, p = g.attributes.position, part = g.attributes.reefPart, table = g.userData.batch || [{ slot: 0, first: 0, count: p.count }];
          const rig = part ? uniformsOf(o.material).uniforms.reefRig.value : null;
          for (const rg of table) {
            let frame = null;
            // A slot's pose (float32 in the rig) is the pivot its own mesh hung on.
            if (rg.slot) { const now = rows(rig, (rg.slot - 1) * 20); frame = sameRows(now, IDENTITY, 0) ? null : o.parent.children.find((c) => c !== o && sameRows(matRows(c.matrix), now, 1e-6)); }
            m.multiplyMatrices(inv, frame ? frame.matrixWorld : o.matrixWorld);
            for (let i = rg.first; i < rg.first + rg.count; i++) {
              if (frame) v.set(part.getX(i), part.getY(i), part.getZ(i)); else v.fromBufferAttribute(p, i);
              r = Math.max(r, v.applyMatrix4(m).length());
            }
          }
        });
        expect(h.radius, id + ' ' + quality).toBe(r);
      } finally { h.dispose(); }
    }
  });
});

describe('J1 species batches: one shader patch, the same programs', () => {
  // Every species material family today: [type, map, bumpMap, normalMap, roughnessMap, alphaMap,
  // vertexColors, side, alphaTest, transparent, instanced, instanceColor, cache key]. A family is
  // one shader program; a new one stalls the first frame that shows it on a school laptop.
  // The cucumber roughness maps and pipefish flag-tail texture add two explicit families.
  const FAMILIES = [
    'MeshStandardMaterial,false,true,false,true,false,true,0,0,false,false,false,reef3d-species-v7|d',
    'MeshStandardMaterial,true,true,false,true,false,true,2,0,false,false,false,reef3d-species-v7|d',
    'MeshStandardMaterial,false,false,false,false,false,true,0,0,false,false,false,reef3d-species-v7|d',
    'MeshStandardMaterial,false,false,false,false,false,true,0,0,false,true,true,reef3d-species-v7|d',
    'MeshStandardMaterial,false,false,false,false,false,true,2,0,false,false,false,reef3d-species-v7|d',
    'MeshStandardMaterial,false,false,false,false,false,true,2,0,false,true,true,reef3d-species-v7|d',
    'MeshStandardMaterial,true,false,false,false,false,false,2,0.42,false,false,false,reef3d-species-v7|d',
    'MeshStandardMaterial,true,false,true,false,false,true,0,0,false,false,false,reef3d-species-v7|d',
    'MeshStandardMaterial,true,false,true,false,false,true,2,0,false,false,false,reef3d-species-v7|d',
    'MeshStandardMaterial,true,true,false,false,false,true,2,0,false,false,false,reef3d-species-v7|d',
    'MeshStandardMaterial,true,true,false,true,false,false,0,0,false,false,false,reef3d-species-v7|d',
    'MeshStandardMaterial,true,true,false,true,false,false,0,0,false,true,true,reef3d-species-v7|d'
  ];
  const sig = (m) => { const t = m.material; return [t.type, !!t.map, !!t.bumpMap, !!t.normalMap, !!t.roughnessMap, !!t.alphaMap, !!t.vertexColors, t.side, t.alphaTest, !!t.transparent, !!m.isInstancedMesh, !!m.instanceColor, t.customProgramCacheKey()].join(); };
  it('draws every model and school with the fixed material families', () => {
    const seen = new Set();
    for (const quality of TIERS) {
      for (const id of S.ids) for (const health of S.info(id).healthStates) { const h = S.create(THREE, id, { seed: 3, quality, health }); drawables(h.root).forEach((m) => seen.add(sig(m))); h.dispose(); }
      for (const id of SCHOOLS) { const h = S.createSchool(THREE, id, 6, { seed: 3, quality }); drawables(h.root).forEach((m) => seen.add(sig(m))); h.dispose(); }
    }
    for (const s of seen) expect(FAMILIES, 'a new material family: ' + s).toContain(s);
  });

  it('carries the batch path in the one shared patch', () => {
    const fish = S.create(THREE, 'clownfish', { seed: 1 }), shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    try {
      fish.root.getObjectByName('clownfish-fins').material.onBeforeCompile(shader);
      const v = shader.vertexShader, f = shader.fragmentShader;
      expect(v).toMatch(/uniform vec4 reefRig\[20\];attribute vec4 reefPart;/);
      expect(v).toMatch(/reefPos=reefPart\.xyz;/);
      expect(v, 'a slot part bends and flexes in its own frame').toMatch(/float reefFinPhase=reefPhase\*reefFlex\.x\+reefFlex\.y-reefSwim\.z\*reefPos\.x;/);
      expect(v, 'its normal turns with the pivot').toMatch(/if\(reefRigged>0\.5\)objectNormal=vec3\(dot\(reefTo0\.xyz,objectNormal\),dot\(reefTo1\.xyz,objectNormal\),dot\(reefTo2\.xyz,objectNormal\)\);/);
      expect(v, 'its position follows the pivot').toMatch(/transformed=vec3\(dot\(reefTo0,reefT1\),dot\(reefTo1,reefT1\),dot\(reefTo2,reefT1\)\);/);
      expect(f).toMatch(/if\(reefRaysOn>0\.5\)\{/);
      expect(f).toMatch(/if\(reefEyeOn>0\.5\)\{/);
      expect(f).toMatch(/if\(vReefRough>=0\.0\)roughnessFactor=vReefRough;/);
    } finally { fish.dispose(); }
  });
});

describe('J1 species batches: CPU-deformed models stay deterministic', () => {
  const ATTS = ['position', 'normal', 'color'];
  const buffers = (h) => { h.root.updateMatrixWorld(true); const out = []; drawables(h.root).forEach((m) => { out.push(Array.from(m.matrixWorld.elements)); ATTS.forEach((a) => { if (m.geometry.attributes[a]) out.push(Array.from(m.geometry.attributes[a].array)); }); }); return out; };
  const equal = (a, b) => a.length === b.length && a.every((x, i) => x.length === b[i].length && x.every((v, j) => v === b[i][j]));
  it('gives the same buffers at the same times whatever the update cadence, and moves between them', () => {
    for (const quality of TIERS) for (const id of ['reef_manta', 'bluespotted_stingray', 'day_octopus', 'green_turtle']) {
      const a = S.create(THREE, id, { seed: 9, quality }), b = S.create(THREE, id, { seed: 9, quality });
      try {
        let t = 0, last = null;
        for (const at of [0.4, 3.1, 17.9, 44.25]) {
          while (t < at) { t = Math.min(at, t + 1 / 60); a.update(1 / 60, t, MOTION); }
          b.update(at, at, MOTION);
          const x = buffers(a), y = buffers(b);
          expect(equal(x, y), id + ' ' + quality + ' t ' + at + ': same buffers, every cadence').toBe(true);
          if (last) expect(equal(last, x), id + ' ' + quality + ' t ' + at + ' moved').toBe(false);
          last = x;
        }
      } finally { a.dispose(); b.dispose(); }
    }
  });

  it('keeps unit normals and boxes that hold the moving parts', () => {
    const v = new THREE.Vector3();
    for (const quality of TIERS) for (const id of ['reef_manta', 'bluespotted_stingray', 'day_octopus', 'green_turtle', 'hawksbill_turtle']) {
      const h = S.create(THREE, id, { seed: 9, quality });
      try {
        for (const t of [1.3, 7.7, 21.9]) {
          h.update(1 / 60, t, MOTION);
          for (const m of drawables(h.root)) {
            const n = m.geometry.attributes.normal, p = m.geometry.attributes.position, box = m.geometry.boundingBox;
            let off = 0; for (let i = 0; i < n.count; i++) { const l = Math.hypot(n.getX(i), n.getY(i), n.getZ(i)); if (l > 0 && Math.abs(l - 1) > 1e-5) off++; }
            expect(off, id + ' ' + quality + ' ' + m.name + ' unit normals').toBe(0);
            // The batches the update writes (the rays' detail, the turtle's paddles) keep
            // boxes on their moving parts (within float rounding); the octopus keeps the
            // arms' starting box, as its own meshes did.
            if (box && /-(detail|flippers)$/.test(m.name)) { const b = box.clone().expandByScalar(1e-6); let out = 0; for (let i = 0; i < p.count; i++) if (!b.containsPoint(v.fromBufferAttribute(p, i))) out++; expect(out, id + ' ' + quality + ' ' + m.name + ' box holds every vertex').toBe(0); }
          }
        }
      } finally { h.dispose(); }
    }
  });

  it('flashes the octopus to its pale display and back', () => {
    const h = S.create(THREE, 'day_octopus', { seed: 9, quality: 'low' }), col = () => Array.from(h.root.getObjectByName('day_octopus-body').geometry.attributes.color.array);
    try {
      h.update(1 / 60, 0.5, MOTION); const mottled = col();
      h.update(1 / 60, Math.PI / 2 / 0.22, MOTION); const display = col();
      h.update(1 / 60, 0.6, MOTION); const back = col();
      expect(display, 'the pale display changes the colours').not.toEqual(mottled);
      expect(back, 'and the mottled pattern returns').toEqual(mottled);
    } finally { h.dispose(); }
  });
});
