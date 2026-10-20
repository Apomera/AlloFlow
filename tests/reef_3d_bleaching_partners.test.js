import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Lane G2: the animals that farm algae in their tissue (magnificent anemone,
// giant clam) and the living Porites head of the Christmas tree worms bleach in
// a heatwave; the soft coral (Dendronephthya) and the sea fan (Annella) have no
// algae partners and never do, and the barrel sponge stays as it is.
// REEF3D_SPECIES_SOURCE / REEF3D_EXPLORE_SOURCE point at scratch copies for mutation checks.
vi.setConfig({ testTimeout: 120000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const SPECIES = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
const EXPLORE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const TOOL = readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8');
const S = (() => { const w = {}; new Function('window', SPECIES)(w); return w.Reef3DSpecies; })();

const PARTNERS = ['magnificent_anemone', 'giant_clam', 'christmas_tree_worm'];
const NO_PARTNERS = ['soft_coral', 'sea_fan', 'barrel_sponge'];
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const srgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
// Saturation as seen (sRGB) of a linear colour: a pastel stays below 0.2, living pigment is far above.
const sat = (lc) => { const c = lc.map((v) => srgb(Math.min(1, v))), mx = Math.max(...c), mn = Math.min(...c); return mx > 0 ? (mx - mn) / mx : 0; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) * (v - m)))); };
function build(id, o, fn) { const h = S.create(THREE, id, Object.assign({ seed: 9, quality: 'low' }, o)); try { return fn(h); } finally { h.dispose(); } }
const part = (h, name) => h.root.getObjectByName(h.root.userData.speciesId + '-' + name);
function meshes(h) { const out = []; h.root.traverse((m) => { if (m.isMesh) out.push(m); }); return out; }
// Everything about the shape: names, vertex positions, indices, uvs and instance placements.
function shape(h) {
  return meshes(h).map((m) => ({ name: m.name, pos: Array.from(m.geometry.attributes.position.array), index: m.geometry.index ? Array.from(m.geometry.index.array) : null,
    uv: m.geometry.attributes.uv ? Array.from(m.geometry.attributes.uv.array) : null, inst: m.isInstancedMesh ? Array.from(m.instanceMatrix.array) : null }));
}
function vertexColours(m) { const c = m.geometry.attributes.color, out = []; for (let i = 0; i < c.count; i++) out.push([c.getX(i), c.getY(i), c.getZ(i)]); return out; }
// Each instance as seen: mean vertex colour times its instance colour (all linear).
function instanceColours(m) {
  const v = vertexColours(m), avg = [0, 1, 2].map((k) => mean(v.map((c) => c[k]))), a = m.instanceColor.array, out = [];
  for (let i = 0; i < m.count; i++) out.push([avg[0] * a[i * 3], avg[1] * a[i * 3 + 1], avg[2] * a[i * 3 + 2]]);
  return out;
}
function tipColours(m) {
  // The finger's tip half: vertices above half its unit length.
  const p = m.geometry.attributes.position, v = vertexColours(m), out = [];
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.6) out.push(v[i]);
  return out;
}
function texels(tex) { const d = tex.image.data, out = []; for (let i = 0; i < d.length; i += 4) out.push([lin(d[i] / 255), lin(d[i + 1] / 255), lin(d[i + 2] / 255)]); return out; }
const sheen = (mat) => { const sh = { uniforms: {}, vertexShader: '#include <common>', fragmentShader: '#include <common>' }; mat.onBeforeCompile(sh); return { a: sh.uniforms.reefSheenA.value.toArray(), b: sh.uniforms.reefSheenB.value.toArray(), k: sh.uniforms.reefSheenK.value }; };
const sig = (m) => { const t = m.material; return [!!t.map, !!t.bumpMap, !!t.normalMap, !!t.roughnessMap, !!t.vertexColors, t.side, t.alphaTest, !!m.isInstancedMesh, !!m.instanceColor, t.customProgramCacheKey ? t.customProgramCacheKey() : ''].join(); };
function digest(h) {
  return JSON.stringify(meshes(h).map((m) => {
    const t = m.material, maps = ['map', 'bumpMap', 'normalMap'].map((k) => (t[k] && t[k].image && t[k].image.data ? Array.from(t[k].image.data.filter((_, i) => i % 97 === 0)) : null));
    return [m.name, Array.from(m.geometry.attributes.position.array), m.geometry.attributes.color ? Array.from(m.geometry.attributes.color.array) : null,
      m.instanceColor ? Array.from(m.instanceColor.array) : null, maps, t.roughness, sheen(t)];
  }));
}

describe('Lane G2: animals with algae partners bleach, the rest do not', () => {
  it('says which health states each model can show', () => {
    for (const id of S.ids) {
      const states = S.info(id).healthStates, group = S.info(id).group;
      if (group === 'coral') expect(states, id).toEqual(['healthy', 'bleached', 'dead']);
      else if (PARTNERS.includes(id)) expect(states, id).toEqual(['healthy', 'bleached']);
      else expect(states, id).toEqual(['healthy']);
    }
    // info() hands out copies.
    S.info('giant_clam').healthStates.push('dead'); expect(S.info('giant_clam').healthStates).toEqual(['healthy', 'bleached']);
    // Same seed, same bleached model.
    for (const id of PARTNERS) expect(build(id, { seed: 6, health: 'bleached' }, digest), id + ' deterministic').toBe(build(id, { seed: 6, health: 'bleached' }, digest));
  });

  it('bleaches the anemone: white tentacles and oral disc with a pastel tint, the column keeps its colour, the same shape', () => {
    for (const quality of ['low', 'high']) for (const seed of [1, 2, 3, 4, 5, 9]) {
      const healthy = build('magnificent_anemone', { seed, quality }, (h) => ({ shape: shape(h), tent: instanceColours(part(h, 'tentacles')), tips: tipColours(part(h, 'tentacles')), col: vertexColours(part(h, 'column')) }));
      build('magnificent_anemone', { seed, quality, health: 'bleached' }, (h) => {
        const tag = 'anemone ' + quality + ' seed ' + seed;
        expect(shape(h), tag + ' same column, disc, tentacles and placement').toEqual(healthy.shape);
        const tent = instanceColours(part(h, 'tentacles')), tips = tipColours(part(h, 'tentacles'));
        expect(healthy.tips.filter((c) => sat(c) > 0.25).length / healthy.tips.length, tag + ' living tips are coloured').toBeGreaterThan(0.5);
        expect(tent.filter((c) => sat(c) > 0.2).length, tag + ' no pigment left in the tentacles').toBe(0);
        expect(tips.filter((c) => sat(c) > 0.2).length, tag + ' no pigment left at the tips').toBe(0);
        expect(mean(tent.map(lum)), tag + ' white tentacles').toBeGreaterThan(Math.max(0.55, mean(healthy.tent.map(lum)) * 1.2));
        // A faint pastel tint at the tips, not a dead grey.
        expect(Math.max(...tips.map(sat)), tag + ' pastel tint').toBeGreaterThan(0.05);
        const s = sheen(part(h, 'tentacles').material);
        expect(s.k, tag + ' pastel sheen').toBeGreaterThan(0.15);
        expect(Math.min(...s.a), tag + ' sheen is pastel (pale), not saturated').toBeGreaterThan(0.6);
        // Column (host pigment) unchanged; every changed vertex is the white oral disc.
        const col = vertexColours(part(h, 'column')), same = col.filter((c, i) => c.every((v, k) => v === healthy.col[i][k])), changed = col.filter((c, i) => !c.every((v, k) => v === healthy.col[i][k]));
        expect(same.length / col.length, tag + ' the column keeps its colour').toBeGreaterThan(0.4);
        expect(mean(same.map(sat)), tag + ' and that colour is strong').toBeGreaterThan(0.4);
        expect(changed.length, tag + ' the disc changes').toBeGreaterThan(10);
        expect(changed.filter((c) => sat(c) > 0.2).length, tag + ' the disc turns white').toBe(0);
      });
    }
  });

  it('bleaches the clam mantle to a pale cream-white with a faint ghost of its pattern; the shell and shape stay', () => {
    for (const quality of ['low', 'high']) for (const seed of [1, 2, 3, 4, 5, 9]) {
      const healthy = build('giant_clam', { seed, quality }, (h) => ({ shape: shape(h), shell: digest({ root: part(h, 'shell') }), mantle: texels(part(h, 'mantle').material.map), siphon: vertexColours(part(h, 'siphon')), relief: Array.from(part(h, 'mantle').material.bumpMap.image.data) }));
      build('giant_clam', { seed, quality, health: 'bleached' }, (h) => {
        const tag = 'clam ' + quality + ' seed ' + seed, mantle = texels(part(h, 'mantle').material.map), siphon = vertexColours(part(h, 'siphon'));
        expect(shape(h), tag + ' same shell, mantle and siphon').toEqual(healthy.shape);
        expect(digest({ root: part(h, 'shell') }), tag + ' the shell is unchanged').toBe(healthy.shell);
        expect(Array.from(part(h, 'mantle').material.bumpMap.image.data), tag + ' mantle folds kept').toEqual(healthy.relief);
        expect(mean(healthy.mantle.map(sat)), tag + ' living mantle is vivid').toBeGreaterThan(0.5);
        expect(mantle.filter((c) => sat(c) > 0.2).length, tag + ' no vivid pigment left').toBe(0);
        expect(mean(mantle.map(sat)), tag + ' pale').toBeLessThan(0.2);
        expect(mean(mantle.map(lum)), tag + ' light').toBeGreaterThan(Math.max(0.45, mean(healthy.mantle.map(lum)) * 1.4));
        // The pattern fades but does not vanish (contrast relative to the mantle's brightness).
        const contrast = (list) => sd(list.map(lum)) / mean(list.map(lum)), ghost = contrast(mantle);
        expect(ghost, tag + ' a faint pattern survives').toBeGreaterThan(0.08);
        expect(ghost, tag + ' and it is faded').toBeLessThan(0.6 * contrast(healthy.mantle));
        expect(mean(siphon.map(sat)), tag + ' pale siphon').toBeLessThan(mean(healthy.siphon.map(sat)) * 0.5);
        expect(sheen(part(h, 'mantle').material).k, tag + ' pastel sheen').toBeGreaterThan(0.1);
      });
    }
  });

  it('bleaches the worms\' living Porites head while the worms keep their own colours', () => {
    for (const quality of ['low', 'high']) for (const seed of [1, 4, 9]) {
      const healthy = build('christmas_tree_worm', { seed, quality }, (h) => ({ shape: shape(h), head: vertexColours(part(h, 'coral-head')), worms: Array.from(part(h, 'worms').instanceColor.array) }));
      build('christmas_tree_worm', { seed, quality, health: 'bleached' }, (h) => {
        const tag = 'worms ' + quality + ' seed ' + seed, head = vertexColours(part(h, 'coral-head'));
        expect(shape(h), tag + ' same head and crowns').toEqual(healthy.shape);
        expect(Array.from(part(h, 'worms').instanceColor.array), tag + ' crowns keep their colours').toEqual(healthy.worms);
        expect(mean(healthy.head.map(sat)), tag + ' living Porites is brown').toBeGreaterThan(0.25);
        expect(head.filter((c) => sat(c) > 0.2).length, tag + ' no pigment left').toBe(0);
        expect(mean(head.map(lum)), tag + ' stark white').toBeGreaterThan(0.55);
        expect(sheen(part(h, 'coral-head').material).k, tag + ' pastel sheen').toBeGreaterThan(0.1);
      });
    }
  });

  it('keeps Dendronephthya, the sea fan and the barrel sponge exactly as they are in a heatwave, and ignores "dead" for the animals', () => {
    for (const id of NO_PARTNERS) for (const quality of ['low', 'high']) {
      const healthy = build(id, { seed: 4, quality }, digest);
      for (const health of ['bleached', 'dead']) expect(build(id, { seed: 4, quality, health }, digest), id + ' ' + quality + ' ' + health).toBe(healthy);
    }
    for (const id of PARTNERS) expect(build(id, { seed: 4, health: 'dead' }, digest), id + ' dead is not a state it shows').toBe(build(id, { seed: 4 }, digest));
  });

  it('adds no material family or shader program: bleaching only changes colours, maps and uniforms', () => {
    const fams = (health) => { const set = new Set(); for (const id of S.ids) for (const quality of ['low', 'high']) build(id, { seed: 3, quality, health }, (h) => meshes(h).forEach((m) => set.add(sig(m)))); return set; };
    // Nine families (the corals suite allows up to ten), one program cache key, as before this lane.
    const healthy = fams('healthy'), all = new Set([...healthy, ...fams('bleached'), ...fams('dead')]);
    expect(all.size, 'the same material families as before').toBe(9);
    expect(new Set([...all].map((k) => k.split(',').pop())), 'one shader patch').toEqual(new Set(['reef3d-species-v5|d']));
    for (const id of PARTNERS) for (const quality of ['low', 'high']) {
      const a = build(id, { seed: 3, quality }, (h) => meshes(h).map(sig)), b = build(id, { seed: 3, quality, health: 'bleached' }, (h) => meshes(h).map(sig));
      expect(b, id + ' ' + quality).toEqual(a);
    }
  });

  it('shares the bleached clam mantle texture between clams and releases it with the last one', () => {
    const a = S.create(THREE, 'giant_clam', { seed: 3, health: 'bleached' }), b = S.create(THREE, 'giant_clam', { seed: 3, health: 'bleached' });
    const ta = part(a, 'mantle').material.map, tb = part(b, 'mantle').material.map;
    expect(tb, 'one texture object for the same palette').toBe(ta);
    const healthy = S.create(THREE, 'giant_clam', { seed: 3 });
    expect(part(healthy, 'mantle').material.map, 'a healthy clam keeps its own map').not.toBe(ta);
    let disposed = 0; ta.addEventListener('dispose', () => disposed++);
    a.dispose(); expect(disposed, 'still used by the second clam').toBe(0);
    b.dispose(); expect(disposed, 'released with the last clam').toBe(1);
    healthy.dispose();
  });
});

// ---- The dive: which organisms are built bleached ----------------------------------------------
const toolWin = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
new Function('window', TOOL)(toolWin);
const X = toolWin.__RR_TEST_EXPORTS__.coralReef;
const SITES = Object.fromEntries(X.EXPLORE_SITES.map((s) => [s.id, s]));
const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });
// The real species registry (info, healthStates) with cheap stand-in models. Each
// model holds an InstancedMesh so every organism gets its own create() call.
function loggingSpecies(log, real) {
  function model(T, id, opts) {
    const g = new T.BoxGeometry(0.2, 0.2, 0.2), m = new T.MeshStandardMaterial(), root = new T.Group(), im = new T.InstancedMesh(g, m, 1);
    root.userData.speciesId = id; im.userData.speciesId = id; root.add(im);
    return { root, radius: 0.2, update() {}, dispose() { g.dispose(); m.dispose(); } };
  }
  return { version: S.version, ids: S.ids.slice(), info: S.info,
    create(T, id, opts) { log.push({ id, health: opts.health }); return real ? S.create(T, id, opts) : model(T, id, opts); },
    createSchool(T, id, count, opts) { log.push({ id, health: opts.health, school: count }); return real ? S.createSchool(T, id, count, opts) : model(T, id, opts); } };
}
function dive(site, { quality = 'low', real = false } = {}) {
  class Renderer {
    constructor() { this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio() {} setSize() {} render(scene) { this.scene = scene; } dispose() {} forceContextLoss() {}
  }
  let renderer = null; const log = [];
  const local = { innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error() {} }, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, performance: { now: () => 1000 }, setTimeout: () => 1, clearTimeout() {} };
  new Function('window', EXPLORE)(local);
  local.Reef3DSpecies = loggingSpecies(log, real);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const ctl = local.Reef3DExplore.mount(canvas, { quality, site, THREE: { ...THREE, WebGLRenderer: function () { renderer = new Renderer(); return renderer; } } });
  cleanups.push(() => { ctl.dispose(); canvas.remove(); });
  return { log, scene: () => renderer.scene };
}
const heat = SITES.heatwave;
function crowd(health, n = 30) {
  return { seed: heat.seed, depthM: heat.depthM, health, restoration: null,
    population: ['magnificent_anemone', 'giant_clam', 'christmas_tree_worm', 'soft_coral', 'sea_fan', 'barrel_sponge', 'brain_coral'].map((id) => ({ id, count: n })) };
}
const statesOf = (log, id) => log.filter((e) => e.id === id).map((e) => e.health);
const share = (list) => list.filter((h) => h === 'bleached').length / Math.max(1, list.length);

describe('Lane G2: the dive bleaches the partners at the site\'s rate', () => {
  it('bleaches about the site\'s share of anemones, clams and worm heads, and never the soft coral, fan or sponge', () => {
    const t = dive(crowd(heat.health));
    for (const id of PARTNERS) {
      const list = statesOf(t.log, id);
      expect(list.length, id + ' one build per organism').toBe(30);
      expect(new Set(list), id + ' only healthy or bleached').toEqual(new Set(['healthy', 'bleached']));
      expect(Math.abs(share(list) - heat.health.bleaching), id + ' bleached share ' + share(list)).toBeLessThan(0.2);
    }
    for (const id of NO_PARTNERS) expect(statesOf(t.log, id).every((h) => h === 'healthy'), id + ' never bleached').toBe(true);
    // The corals keep their own rule, dead colonies included.
    const coral = t.log.filter((e) => e.id === 'brain_coral').map((e) => e.health);
    expect(coral.some((h) => h === 'bleached')).toBe(true);
  });

  it('follows the bleaching share from none to all, deterministically', () => {
    const none = dive(crowd({ coralCover: 0.55, bleaching: 0, algae: 0.05 }, 12)), all = dive(crowd({ coralCover: 0.45, bleaching: 1, algae: 0.08 }, 12));
    for (const id of PARTNERS) {
      expect(statesOf(none.log, id).every((h) => h === 'healthy'), id + ' none bleached on a cool reef').toBe(true);
      expect(statesOf(all.log, id).every((h) => h === 'bleached'), id + ' all bleached when every coral is').toBe(true);
    }
    for (const id of NO_PARTNERS) expect(statesOf(all.log, id).every((h) => h === 'healthy'), id).toBe(true);
    const a = dive(crowd(heat.health, 12)), b = dive(crowd(heat.health, 12));
    expect(a.log.map((e) => e.id + e.health)).toEqual(b.log.map((e) => e.id + e.health));
  });

  it('shows bleached anemones, clams and worm heads at the real heatwave site, and none at the healthy site', () => {
    const pop = (s) => ({ seed: s.seed, depthM: s.depthM, health: s.health, population: X.populationFor(s), restoration: s.restoration ? { kind: s.restoration.kind, units: s.restoration.units, yearsSince: 5 } : null });
    const hw = dive(pop(heat), { real: true }), ok = dive(pop(SITES.healthy));
    const partners = (log) => log.filter((e) => PARTNERS.includes(e.id));
    expect(partners(hw.log).length).toBeGreaterThanOrEqual(6);
    expect(partners(hw.log).some((e) => e.health === 'bleached'), 'some partners bleached in the heatwave').toBe(true);
    expect(hw.log.filter((e) => e.id === 'magnificent_anemone').some((e) => e.health === 'bleached'), 'a white anemone to find').toBe(true);
    expect(statesOf(hw.log, 'soft_coral').every((h) => h === 'healthy'), 'Dendronephthya stays colourful').toBe(true);
    expect(partners(ok.log).every((e) => e.health === 'healthy'), 'nothing bleached on the healthy reef').toBe(true);
    // In the scene, a bleached anemone really is white on top and its column still coloured.
    const anemones = []; hw.scene().traverse((o) => { if (o.name === 'magnificent_anemone-tentacles') anemones.push(instanceColours(o)); });
    expect(anemones.length).toBe(hw.log.filter((e) => e.id === 'magnificent_anemone').length);
    const white = anemones.filter((cols) => cols.every((c) => sat(c) < 0.25)).length;
    expect(white, 'white anemones in the scene').toBe(statesOf(hw.log, 'magnificent_anemone').filter((h) => h === 'bleached').length);
  });
});
