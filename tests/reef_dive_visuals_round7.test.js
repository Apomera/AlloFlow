// Round 7, water with depth and a grounded reef: a distant reef and far schools drawn by the
// backdrop's own program, a water gradient shared with the haze, a surface that shimmers from
// below, sand that fades before the drop-off, and shade where rock and colonies meet the ground.
// These pin what was added, what it may not cost, and that reef health still drives what shows.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { THREE, SOURCE, runtime, site, cleanup } from './helpers/reef_dive_harness.js';

vi.setConfig({ testTimeout: 60000 });
afterEach(() => cleanup());

const marker = 'function createSubstrateTexture(T) {';
const scope = {};
new Function('window', SOURCE.replace(marker, 'global.__round7 = { farMelt: farMelt, waterDepthTerms: waterDepthTerms };\n  ' + marker))(scope);
const { farMelt, waterDepthTerms } = scope.__round7;

const named = (t, name) => t.scene.getObjectByName(name);
const ringOf = (t) => named(t, 'reef-explore-distant-reef');
const backOf = (t) => named(t, 'reef-explore-backdrop');
const count = (text, part) => text.split(part).length - 1;
function compile(t, material, lib = 'standard') {
  const l = THREE.ShaderLib[lib];
  const shader = { uniforms: THREE.UniformsUtils.clone(l.uniforms), vertexShader: l.vertexShader, fragmentShader: l.fragmentShader };
  material.onBeforeCompile(shader, t.renderer);
  return shader;
}
const HEALTH = {
  healthy: { coralCover: 0.55, bleaching: 0, algae: 0.05 },
  heatwave: { coralCover: 0.45, bleaching: 0.6, algae: 0.08 },
  damaged: { coralCover: 0.12, bleaching: 0.05, algae: 0.35 }
};
const FISH = (n) => [{ id: 'blue_tang', count: n }];
function fleckVerts(ring) {
  const a = ring.geometry.attributes.reefDistant; let n = 0;
  for (let i = 0; i < a.count; i++) if (Math.abs(a.getX(i) - 0.9) < 1e-5) n++;
  return n;
}
// Mean height of the crest rows above their base rows: each ring column is four vertices.
function meanCrest(ring, columns) {
  const p = ring.geometry.attributes.position; let sum = 0;
  for (let k = 0; k < columns; k++) sum += p.getY(k * 4 + 3) - p.getY(k * 4);
  return sum / columns;
}

describe('the distant reef', () => {
  it('is one mesh with the backdrop\'s own material: one draw call, no new program, on both tiers', () => {
    for (const quality of ['high', 'low']) {
      const t = runtime({ quality }), ring = ringOf(t), back = backOf(t);
      let meshes = 0; t.scene.traverse((o) => { if (o.name === 'reef-explore-distant-reef') meshes++; });
      expect(meshes, quality).toBe(1);
      expect(ring.material, quality).toBe(back.material);
      expect(back.material.depthWrite).toBe(false);
      expect(ring.renderOrder, 'after the floor, so it shades only the pixels it shows').toBeGreaterThan(0);
      expect(ring.isInstancedMesh).toBeFalsy();
      expect(ring.castShadow).toBe(false);
      const tris = ring.geometry.index.count / 3;
      expect(tris, quality + ' triangles').toBeLessThan(quality === 'high' ? 12000 : 6000);
      // The sphere is the same program with the attribute at zero.
      expect(Array.from(back.geometry.attributes.reefDistant.array).every((v) => v === 0)).toBe(true);
    }
  });

  it('cannot be picked, counted or mistaken for an organism', () => {
    const t = runtime({ quality: 'low', site: site({ population: FISH(10) }) }), ring = ringOf(t), hits = [], p = ring.geometry.attributes.position, eye = new THREE.Vector3(0, -12, 0);
    // Straight at the shoulder of every tenth column: a mesh that could be picked would answer.
    for (let k = 0; k < 200; k += 10) {
      const to = new THREE.Vector3(p.getX(k * 4 + 1), p.getY(k * 4 + 1), p.getZ(k * 4 + 1)).sub(eye).normalize();
      ring.raycast(new THREE.Raycaster(eye, to), hits);
    }
    expect(hits).toEqual([]);
    expect(ring.userData.decorative).toBe(true);
    expect(ring.userData.uid).toBeUndefined();
    expect(ring.userData.speciesId).toBeUndefined();
    let up = ring.parent; while (up) { expect(up.name).not.toBe('reef-explore-organisms'); up = up.parent; }
  });

  it('stands lower and plainer on a reef that has lost its coral', () => {
    for (const [quality, columns] of [['high', 361], ['low', 201]]) {
      const crest = (health) => meanCrest(ringOf(runtime({ quality, site: site({ health }) })), columns);
      const healthy = crest(HEALTH.healthy), damaged = crest(HEALTH.damaged);
      expect(healthy, quality).toBeGreaterThan(1);
      expect(damaged, quality + ' damaged against healthy').toBeLessThan(healthy * 0.6);
    }
  });

  // Each ring column is four vertices: base, shoulder, upper shoulder, crest. The shoulder holds its strength.
  function crests(t, quality) {
    const ring = ringOf(t), p = ring.geometry.attributes.position, a = ring.geometry.attributes.reefDistant, columns = quality === 'high' ? 361 : 201, layers = quality === 'high' ? 3 : 2, out = [];
    for (let l = 0; l < layers; l++) {
      const row = [];
      for (let k = 0; k < columns; k++) { const v = (l * columns + k) * 4; row.push({ top: p.getY(v + 3), above: p.getY(v + 3) - p.getY(v), shown: a.getX(v + 1) }); }
      out.push(row);
    }
    return out;
  }
  const SHALLOW = [[5104, 7], [5101, 9], [5102, 9], [5103, 8], [7, 5], [11, 6], [5104, 5]];

  it('never runs a crest dead level across the view, wherever the seabed is shallow', () => {
    // The flaw this guards: a crest pressed against the water above a shallow seabed saturates to one height,
    // and from a raised camera that is a straight dark band with a flat top across the whole frame.
    for (const quality of ['high', 'low']) for (const [seed, depthM] of SHALLOW) {
      const W = quality === 'high' ? 30 : 17; // about 30 degrees of the ring, wider than half the view
      crests(runtime({ quality, site: site({ seed, depthM, health: HEALTH.healthy }) }), quality).forEach((row, l) => {
        for (let k = 0; k + W <= row.length; k++) {
          const part = row.slice(k, k + W);
          if (!part.every((c) => c.shown > 0.05)) continue;
          const tops = part.map((c) => c.top), range = Math.max(...tops) - Math.min(...tops);
          expect(range, quality + ' seed ' + seed + ' depth ' + depthM + ' layer ' + l + ' column ' + k).toBeGreaterThan(0.3);
        }
      });
    }
  });

  it('fades out where little water stands above the seabed, instead of pressing against it', () => {
    let checked = 0;
    for (const [seed, depthM] of SHALLOW) {
      const ring = ringOf(runtime({ quality: 'low', site: site({ seed, depthM, health: HEALTH.healthy }) })), p = ring.geometry.attributes.position, a = ring.geometry.attributes.reefDistant;
      for (let k = 0; k < 2 * 201; k++) {
        const v = k * 4, room = -1.4 - p.getY(v);
        if (room < 3) { expect(a.getX(v + 1), 'seed ' + seed + ' column ' + k).toBeLessThan(0.12); checked++; }
      }
    }
    expect(checked, 'these sites do have a shallow side').toBeGreaterThan(20);
  });

  it('has the broken outline of ridges and knolls, not domes', () => {
    // Local highs along the crest, in the stretches that show. A smooth dome has one.
    for (const quality of ['high', 'low']) {
      crests(runtime({ quality, site: site({ seed: 5101, depthM: 9, health: HEALTH.healthy }) }), quality).forEach((row, l) => {
        let highs = 0, shown = 0;
        for (let k = 1; k < row.length - 1; k++) {
          if (row[k].shown <= 0.05) continue;
          shown++;
          if (row[k].above > row[k - 1].above && row[k].above > row[k + 1].above) highs++;
        }
        expect(shown, quality + ' layer ' + l).toBeGreaterThan(20);
        expect(shown / highs, quality + ' layer ' + l + ' columns per high').toBeLessThan(quality === 'high' ? 16 : 12);
      });
    }
  });

  it('stays a pale haze: at most about a quarter off the water colour at full strength, a little more red', () => {
    const tint = backOf(runtime({ quality: 'low', site: site({ health: HEALTH.healthy }) })).material.uniforms.reefDistantTint.value;
    expect(tint.y).toBeGreaterThanOrEqual(0.78); expect(tint.z).toBeGreaterThanOrEqual(0.8); expect(tint.x).toBeGreaterThanOrEqual(0.7);
  });

  it('never reaches the surface', () => {
    for (const quality of ['high', 'low']) {
      const p = ringOf(runtime({ quality })).geometry.attributes.position;
      let top = -Infinity; for (let i = 0; i < p.count; i++) top = Math.max(top, p.getY(i));
      expect(top, quality).toBeLessThan(-1);
    }
  });

  it('stays outside the area a diver can reach', () => {
    const p = ringOf(runtime({ quality: 'high', site: site({ population: FISH(10) }) })).geometry.attributes.position;
    for (let i = 0; i < p.count; i++) expect(Math.max(Math.abs(p.getX(i)), Math.abs(p.getZ(i))), 'vertex ' + i).toBeGreaterThan(29.5 + 8);
  });

  it('fades with the real distance from the eye and stays in view past the far plane', () => {
    const v = backOf(runtime({ quality: 'low' })).material.vertexShader;
    expect(v).toContain('vReefDistant=reefDistant.x*exp(-length(vReefDir)*0.013)');
    // Melted floor beyond 38 m is plain water and must not cut the far reef; anything nearer still hides it.
    expect(v).toContain('vec4 reefNearest=projectionMatrix*vec4(0.0,0.0,-38.0,1.0);gl_Position.z=min(gl_Position.z,gl_Position.w*reefNearest.z/reefNearest.w);');
    expect(v).toContain('viewMatrix*w');
  });

  it('pales with bleaching and still follows the vision modes through the backdrop colour', () => {
    const tint = (health) => backOf(runtime({ quality: 'low', site: site({ health }) })).material.uniforms.reefDistantTint.value;
    const healthy = tint(HEALTH.healthy), hot = tint(HEALTH.heatwave);
    expect(hot.x).toBeGreaterThan(healthy.x); expect(hot.y).toBeGreaterThan(healthy.y); expect(hot.z).toBeGreaterThan(healthy.z);
    // It multiplies the water colour, so a dimmed backdrop dims it too.
    expect(backOf(runtime({ quality: 'low' })).material.fragmentShader).toContain('*mix(vec3(1.0),reefDistantTint,vReefDistant)');
  });

  it('is disposed with the dive', () => {
    const t = runtime({ quality: 'low' }), ring = ringOf(t); let gone = 0;
    ring.geometry.addEventListener('dispose', () => { gone++; });
    t.controller.dispose();
    expect(gone).toBe(1);
  });
});

describe('far schools follow the site', () => {
  it('come from the site\'s own schools: more schools, more specks; none means none', () => {
    const specks = (population, quality = 'low') => fleckVerts(ringOf(runtime({ quality, site: site({ population }) })));
    expect(specks([]), 'no fish at all').toBe(0);
    expect(specks([{ id: 'parrotfish', count: 12 }]), 'fish that do not school').toBe(0);
    expect(specks(FISH(0)), 'a school counted at zero').toBe(0);
    const few = specks(FISH(2)), many = specks(FISH(10));
    expect(few).toBeGreaterThan(0);
    expect(many).toBeGreaterThan(few * 2);
    // Capped: one screenful of specks, however large the count.
    expect(specks(FISH(60))).toBeLessThanOrEqual(8 * 22 * 4);
    expect(specks(FISH(60), 'high')).toBeLessThanOrEqual(8 * 34 * 4);
  });

  it('stand still under reduced motion, and stop when the preference comes on mid-dive', () => {
    const clock = (x) => backOf(x).material.uniforms.reefStillClock.value;
    const still = runtime({ quality: 'low', reducedMotion: true }), start = clock(still);
    still.controller.setPaused(false); still.run(2);
    expect(clock(still), 'never moves under the preference').toBe(start);
    const moving = runtime({ quality: 'low', reducedMotion: false }), begun = clock(moving);
    moving.run(2);
    expect(clock(moving), 'runs without it').toBeGreaterThan(begun);
    moving.controller.setReducedMotion(true); moving.controller.setPaused(false);
    const held = clock(moving); moving.run(2);
    expect(clock(moving), 'stops when it comes on').toBe(held);
    // Both decorative motions read this clock and no other time.
    const v = backOf(moving).material.vertexShader;
    expect(v).toContain('float a=reefStillClock*0.05+reefDistant.z;');
    expect(v).not.toContain('reefCausticTime');
    const f = compile(moving, named(moving, 'reef-explore-surface').material, 'basic');
    expect(f.uniforms.reefStillClock).toBe(backOf(moving).material.uniforms.reefStillClock);
    const lace = f.fragmentShader.slice(f.fragmentShader.indexOf('if(reefSeaBelow>0.0){'), f.fragmentShader.indexOf('reefSeaGlow=pow('));
    for (const moves of ['reefCausticTime', 'reefSeaP', 'reefSeaSwell', 'reefSeaCross']) expect(lace, moves).not.toContain(moves);
  });
});

describe('the open water', () => {
  it('runs the same depth terms in the backdrop and the far haze, so a melting reef lands on the colour behind it', () => {
    const back = backOf(runtime({ quality: 'low' })).material.fragmentShader;
    expect(back).toContain(waterDepthTerms('column', 'd', 'topColor', 'bottomColor'));
    for (const high of [true, false]) expect(farMelt(high)).toContain(waterDepthTerms('reefFarWater', 'reefWaterRay', 'reefBackTop', 'reefBackBottom'));
    // Darker below eye level, lighter on the sun's side and toward the surface; no texture.
    const terms = waterDepthTerms('c', 'd', 't', 'b');
    expect(terms).toContain('smoothstep(-0.62,-0.02,d.y)');
    expect(terms).toContain('reefSunSide');
    expect(terms).not.toContain('texture2D');
  });

  it('points the sun side at the scene\'s real sun', () => {
    const sun = new THREE.Vector3(0.42, 1, 0.3), len = Math.hypot(sun.x, sun.z);
    expect(waterDepthTerms('c', 'd', 't', 'b')).toContain('vec2(' + (sun.x / len).toFixed(3) + ',' + (sun.z / len).toFixed(3) + ')');
  });

  it('lets bright sand go into the water sooner than rock, so the seabed fades instead of stopping', () => {
    for (const quality of ['high', 'low']) {
      const t = runtime({ quality }), floor = compile(t, named(t, 'reef-explore-floor').material).fragmentShader, rock = compile(t, named(t, 'reef-explore-bommies').material).fragmentShader;
      expect(floor, quality).toContain('if(reefFarMelt>0.0)gl_FragColor.rgb=mix(gl_FragColor.rgb,reefFarWater,smoothstep(17.0,33.0,reefOpticalDistance)*reefSandW');
      expect(rock, quality).not.toContain('smoothstep(17.0,33.0,reefOpticalDistance)');
      expect(floor.indexOf('vec3 reefFarWater'), 'the far water exists before sand uses it').toBeLessThan(floor.indexOf('smoothstep(17.0,33.0,reefOpticalDistance)'));
    }
  });
});

describe('cost: math whose result cannot show is skipped', () => {
  it('skips the backdrop window only where it is truly zero', () => {
    const f = backOf(runtime({ quality: 'low' })).material.fragmentShader;
    const m = f.match(/if\(d\.y>([\d.]+)\)\{/), w = f.match(/window=smoothstep\(([\d.]+),[\d.]+,d\.y\+swell\*([\d.]+)\+ripple\*([\d.]+)\)/);
    expect(m).toBeTruthy(); expect(w).toBeTruthy();
    // swell and ripple run from -1 to 1, so the smoothstep's input can exceed d.y by their two weights at most.
    expect(+m[1]).toBeLessThanOrEqual(+w[1] - +w[2] - +w[3]);
    expect(f.indexOf('float window=0.0;')).toBeLessThan(f.indexOf('float swell='));
    // Everything using the swell stays inside the test; the scatter and the sun, which start lower, stay out.
    expect(f.indexOf('column+=topColor*silver*window*0.065;}')).toBeLessThan(f.indexOf('vec3 scatter='));
  });

  it('starts the sand after the haze on both tiers, so the far water is always worked out first', () => {
    for (const high of [true, false]) {
      const [a] = farMelt(high).match(/smoothstep\(([\d.]+),([\d.]+),reefOpticalDistance\)/).slice(1).map(Number);
      expect(a, String(high)).toBeLessThan(17);
      expect(farMelt(high)).toContain('if(reefFarMelt>0.0){');
    }
  });

  it('keeps derivatives out of the surface branch', () => {
    const t = runtime({ quality: 'low' }), f = compile(t, named(t, 'reef-explore-surface').material, 'basic').fragmentShader;
    const from = f.indexOf('if(reefSeaBelow>0.0){'), to = f.indexOf('}', f.indexOf('vec3(1.0,0.97,0.86)*reefSeaGlow'));
    expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
    expect(f.slice(from, to)).not.toContain('fwidth');
  });
});

describe('the surface from below', () => {
  const surface = (quality = 'low') => { const t = runtime({ quality }); return { t, shader: compile(t, named(t, 'reef-explore-surface').material, 'basic') }; };

  it('melts away before the far plane, so no straight line crosses the water', () => {
    const { t, shader } = surface(), m = shader.fragmentShader.match(/1\.0-smoothstep\(([\d.]+),([\d.]+),length\(reefWaterEye-vReefWorld\)\)/);
    expect(m).toBeTruthy();
    expect(+m[2]).toBeLessThan(t.renderer.camera.far);
  });

  it('shimmers and glows only from below and inside the window, dimmed for fluorescence', () => {
    const f = surface().shader.fragmentShader;
    expect(f).toContain('float reefSeaBelow=step(reefWaterEye.y,vReefWorld.y)*reefWindow*smoothstep(0.62,0.90,reefSeaUp);');
    expect(f).toContain('reefSeaBelow*mix(1.0,0.14,reefVision.y)');
    expect(f).not.toContain('texture2D(reefCaustic');
  });

  it('only uses derivatives behind the guard, so a device without them still draws it', () => {
    let guarded = 0;
    surface().shader.fragmentShader.split('\n').forEach((line) => {
      if (line.includes('#ifdef REEF_DERIVATIVES')) guarded = 1;
      else if (guarded && line.includes('#endif')) guarded = 0;
      else if (line.includes('fwidth(')) expect(guarded, line).toBe(1);
    });
  });
});

describe('a grounded reef', () => {
  const place = (source, quality = 'high') => runtime({ quality }, source);
  function without(text) { expect(count(SOURCE, text), text).toBe(1); return SOURCE.replace(text, ''); }

  it('darkens the ground where a bommie meets it, and only there', () => {
    const a = named(place(SOURCE), 'reef-explore-floor').geometry.attributes.color.array;
    const b = named(place(without('col[v] *= shade; col[v + 1] *= shade; col[v + 2] *= shade;')), 'reef-explore-floor').geometry.attributes.color.array;
    expect(a.length).toBe(b.length);
    let changed = 0, deepest = 1;
    for (let i = 0; i < a.length; i += 3) {
      expect(a[i + 1], 'never brighter').toBeLessThanOrEqual(b[i + 1] + 1e-6);
      if (a[i + 1] < b[i + 1] - 1e-6) { changed++; deepest = Math.min(deepest, a[i + 1] / b[i + 1]); }
    }
    expect(changed).toBeGreaterThan(0);
    expect(changed, 'a ring around rock, not the whole floor').toBeLessThan(a.length / 3 * 0.5);
    expect(deepest).toBeLessThan(0.75);
    expect(deepest, 'shade, not a black hole').toBeGreaterThan(0.2);
  });

  it('darkens a colony\'s foot on every detail tier, leaving its crown alone', () => {
    const a = place(SOURCE), b = place(without('col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);'));
    let checked = 0;
    a.scene.traverse((o) => {
      if (!o.userData || o.userData.kind !== 'rock') return;
      const twin = b.scene.getObjectByName(o.name), g = o.geometry, ca = g.attributes.color, cb = twin.geometry.attributes.color, py = g.attributes.position;
      g.computeBoundingBox();
      const lo = g.boundingBox.min.y, hi = g.boundingBox.max.y;
      let foot = 1, crown = 0;
      for (let i = 0; i < py.count; i++) {
        const ratio = ca.getY(i) / Math.max(1e-6, cb.getY(i)), h = (py.getY(i) - lo) / (hi - lo);
        if (h < 0.03) foot = Math.min(foot, ratio);
        if (h > 0.5) crown = Math.max(crown, ratio);
      }
      expect(foot, o.name + ' foot').toBeLessThan(0.65);
      expect(crown, o.name + ' crown').toBeCloseTo(1, 4);
      checked++;
    });
    expect(checked, 'near, middle and far rock').toBeGreaterThanOrEqual(2);
  });

  it('shades the foot of a bommie and keeps every vertex where it was', () => {
    const a = named(place(SOURCE), 'reef-explore-bommies').geometry.attributes, b = named(place(without('col.setXYZ(i, col.getX(i) * footK, col.getY(i) * footK, col.getZ(i) * footK);')), 'reef-explore-bommies').geometry.attributes;
    expect(Array.from(a.position.array)).toEqual(Array.from(b.position.array));
    let darker = 0;
    for (let i = 0; i < a.color.count; i++) { expect(a.color.getY(i)).toBeLessThanOrEqual(b.color.getY(i) + 1e-6); if (a.color.getY(i) < b.color.getY(i) * 0.9) darker++; }
    expect(darker).toBeGreaterThan(0);
  });

  it('keeps the contact layer in one draw call and in step with the sediment puffs that share its program', () => {
    let layers = 0; const t = runtime({ quality: 'low' });
    t.scene.traverse((o) => { if (o.name === 'reef-explore-contact-shade') layers++; });
    expect(layers).toBe(1);
    // Darker, not bluer: a teal shade would turn warm rock grey under it.
    const shade = t.scene.getObjectByName('reef-explore-contact-shade').material.color;
    expect(shade.b).toBeLessThanOrEqual(shade.r);
    // Both patches compile under the key 'contact', so whichever compiles first serves both.
    expect(count(SOURCE, "(1.0-smoothstep(11.0,19.0,length(reefWaterEye-vReefContactWorld)));")).toBe(2);
    expect(SOURCE).not.toContain('smoothstep(8.0,13.0,length(reefWaterEye-vReefContactWorld))');
  });

  it('gives rock its joints without one more texture read, and fades them before they can alias', () => {
    for (const quality of ['high', 'low']) {
      const t = runtime({ quality }), f = compile(t, named(t, 'reef-explore-bommies').material).fragmentShader;
      expect(count(f, 'texture2D(reefSubstrateMap'), quality + ' three triplanar reads and one metre-scale read').toBe(4);
      expect(f).toContain('float reefJoint=');
      expect(f).toContain('(1.0-smoothstep(13.0,24.0,length(vViewPosition)))');
    }
  });
});
